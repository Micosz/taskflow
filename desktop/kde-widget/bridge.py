#!/usr/bin/env python3
"""TaskFlow's loopback-only KDE companion. Python standard library only."""
import argparse
import datetime as dt
import hmac
import html
import json
import os
from pathlib import Path
import subprocess
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


class CloudError(Exception):
    def __init__(self, message, status=502):
        super().__init__(message)
        self.status = status


def save_private(path, value):
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    temporary = path.with_suffix(".tmp")
    fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as stream:
        json.dump(value, stream, ensure_ascii=False)
    os.chmod(temporary, 0o600)
    temporary.replace(path)


def due_at(task):
    # Match the web app: a date without a time is due at the end of that day.
    return dt.datetime.fromisoformat(
        task["due_date"] + "T" + (task.get("due_time") or "23:59:59")
    )


def reminder_key(user_id, task):
    return f'{user_id}:{task["id"]}:{task["due_date"]}:{task.get("due_time")}'


class Workspace:
    def __init__(self, config, state_dir):
        self.config = config
        self.path = state_dir / "session.json"
        self.lock = threading.RLock()
        self.session = None
        self.tasks = []
        self.notified = set()
        self.last_sync = None
        self.online = False
        if self.path.exists():
            data = json.loads(self.path.read_text())
            self.session = data.get("session")
            self.tasks = data.get("tasks", []) if self.session else []
            self.notified = set(data.get("notified", [])) if self.session else set()
            self.last_sync = data.get("last_sync") if self.session else None

    def persist(self):
        save_private(self.path, {"session": self.session, "tasks": self.tasks,
                                 "notified": sorted(self.notified),
                                 "last_sync": self.last_sync})

    def cloud(self, method, path, body=None, authenticated=True):
        headers = {"apikey": self.config["key"], "Content-Type": "application/json"}
        if authenticated:
            if not self.session:
                raise CloudError("กรุณาเข้าสู่ระบบ", 401)
            headers["Authorization"] = "Bearer " + self.session["access_token"]
        if method == "PATCH":
            headers["Prefer"] = "return=representation"
        request = urllib.request.Request(
            self.config["url"] + path, headers=headers, method=method,
            data=None if body is None else json.dumps(body).encode())
        try:
            with urllib.request.urlopen(request, timeout=12) as response:
                raw = response.read()
                return json.loads(raw) if raw else None
        except urllib.error.HTTPError as error:
            status = error.code
            error.close()
            # Never return upstream bodies: they can contain credentials or user data.
            message = "เข้าสู่ระบบไม่สำเร็จ ตรวจอีเมล รหัสผ่าน และการยืนยันอีเมล"
            if authenticated:
                message = "ซิงก์ไม่สำเร็จ กรุณาลองอีกครั้ง"
            raise CloudError(message, status) from None
        except (urllib.error.URLError, TimeoutError, OSError):
            raise CloudError("เชื่อมต่อไม่ได้ กำลังแสดงข้อมูลที่เก็บไว้ล่าสุด") from None

    def clear(self):
        self.session = None
        self.tasks = []
        self.notified.clear()
        self.last_sync = None
        self.online = False
        self.persist()

    def accept_session(self, data):
        self.session = {
            "access_token": data["access_token"],
            "refresh_token": data["refresh_token"],
            "expires_at": time.time() + data["expires_in"],
            "user": {"id": data["user"]["id"], "email": data["user"].get("email", "")},
        }
        self.persist()  # Save rotated refresh tokens before the next network operation.

    def ensure_session(self):
        if not self.session:
            raise CloudError("กรุณาเข้าสู่ระบบ", 401)
        if self.session["expires_at"] <= time.time() + 60:
            try:
                data = self.cloud("POST", "/auth/v1/token?grant_type=refresh_token",
                                  {"refresh_token": self.session["refresh_token"]}, False)
                self.accept_session(data)
            except CloudError as error:
                if error.status in (400, 401, 403):
                    self.clear()
                    raise CloudError("เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง", 401) from None
                raise

    def login(self, email, password):
        with self.lock:
            # Preserve the current account if a replacement login fails.
            data = self.cloud("POST", "/auth/v1/token?grant_type=password",
                              {"email": email, "password": password}, False)
            self.clear()
            self.accept_session(data)
            return self.sync()

    def sync(self):
        with self.lock:
            if not self.session:
                return self.snapshot()
            try:
                self.ensure_session()
                user = self.cloud("GET", "/auth/v1/user")
                if user["id"] != self.session["user"]["id"]:
                    self.clear()
                    raise CloudError("กรุณาเข้าสู่ระบบอีกครั้ง", 401)
                query = urllib.parse.urlencode({
                    "select": "id,title,category,due_date,due_time,completed,description",
                    "user_id": "eq." + user["id"], "completed": "eq.false",
                    "order": "due_date.asc,due_time.asc.nullslast,id.asc",
                })
                # Page explicitly: PostgREST's default 1,000-row limit must not hide tasks.
                tasks = []
                offset = 0
                while True:
                    page = self.cloud("GET", f"/rest/v1/tasks?{query}&limit=500&offset={offset}")
                    tasks.extend(page)
                    if len(page) < 500:
                        break
                    offset += len(page)
                self.tasks = tasks
                self.last_sync = dt.datetime.now().isoformat(timespec="seconds")
                self.online = True
                active_keys = {reminder_key(user["id"], task) for task in tasks}
                self.notified.intersection_update(active_keys)
                self.persist()
            except CloudError as error:
                self.online = False
                if error.status in (401, 403):
                    self.clear()
                raise
            return self.snapshot()

    def complete(self, task_id):
        with self.lock:
            self.ensure_session()
            uuid.UUID(task_id)
            query = urllib.parse.urlencode({"id": "eq." + task_id,
                "user_id": "eq." + self.session["user"]["id"]})
            rows = self.cloud("PATCH", "/rest/v1/tasks?" + query, {"completed": True})
            if not rows:
                raise CloudError("ไม่พบงานนี้ กรุณารีเฟรช", 404)
            # Keep the successful mutation even if the follow-up fetch is offline.
            self.tasks = [task for task in self.tasks if task["id"] != task_id]
            self.persist()
            try:
                return self.sync()
            except CloudError:
                return self.snapshot()

    def snapshot(self):
        with self.lock:
            return {"signedIn": bool(self.session),
                    "email": self.session["user"]["email"] if self.session else "",
                    "tasks": self.tasks, "online": self.online,
                    "lastSync": self.last_sync, "webUrl": self.config.get("web_url", "")}

    def reminders(self, now=None, notify=None):
        now = now or dt.datetime.now()
        notify = notify or send_notification
        with self.lock:
            if not self.session or not self.online or not self.config.get("notifications", True):
                return
            user_id = self.session["user"]["id"]
            for task in self.tasks:
                if task.get("completed"):
                    continue
                due = due_at(task)
                remaining = (due - now).total_seconds()
                key = reminder_key(user_id, task)
                # Catch a just-missed deadline after waking, without flooding old overdue tasks.
                if -300 <= remaining <= 3600 and key not in self.notified:
                    body = f'{html.escape(task["title"])}\n{html.escape(task["category"])} · {due:%d/%m %H:%M}'
                    if notify("TaskFlow · ใกล้ถึงกำหนดส่ง", body):
                        self.notified.add(key)
                        self.persist()


def send_notification(title, body):
    try:
        return subprocess.run(["notify-send", "--app-name=TaskFlow", "--icon=view-task",
                               "--", title, body], timeout=5, check=False,
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0
    except (OSError, subprocess.TimeoutExpired):
        return False


def make_handler(workspace, token, port):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass  # Do not log passwords, tokens, or task contents.

        def reply(self, status, payload):
            raw = json.dumps(payload, ensure_ascii=False).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)

        def authorized(self):
            # A browser page must not operate the companion via DNS rebinding or CORS.
            if self.headers.get("Host") != f"127.0.0.1:{port}" or self.headers.get("Origin"):
                self.reply(403, {"error": "Forbidden"})
                return False
            supplied = self.headers.get("Authorization", "")
            if not hmac.compare_digest(supplied, "Bearer " + token):
                self.reply(401, {"error": "Unauthorized"})
                return False
            return True

        def do_GET(self):
            if self.authorized():
                self.reply(200, workspace.snapshot()) if self.path == "/state" else self.reply(404, {})

        def do_POST(self):
            if not self.authorized():
                return
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if not 0 <= length <= 16384:
                    raise ValueError()
                body = json.loads(self.rfile.read(length) or b"{}")
                if not isinstance(body, dict):
                    raise ValueError()
                if self.path == "/login":
                    email, password = body.get("email"), body.get("password")
                    if not isinstance(email, str) or not isinstance(password, str) or not email or not password:
                        raise ValueError()
                    result = workspace.login(email, password)
                elif self.path == "/logout":
                    with workspace.lock:
                        # Supabase local logout ends only this companion's session.
                        try:
                            if workspace.session:
                                workspace.cloud("POST", "/auth/v1/logout?scope=local")
                        except CloudError:
                            pass
                        workspace.clear()
                    result = workspace.snapshot()
                elif self.path == "/refresh":
                    result = workspace.sync()
                elif self.path == "/complete":
                    task_id = body.get("id")
                    if not isinstance(task_id, str):
                        raise ValueError()
                    result = workspace.complete(task_id)
                else:
                    self.reply(404, {})
                    return
                self.reply(200, result)
            except (ValueError, TypeError):
                self.reply(400, {"error": "ข้อมูลไม่ถูกต้อง"})
            except CloudError as error:
                self.reply(error.status, {"error": str(error), "state": workspace.snapshot()})

    return Handler


def poll(workspace, stop):
    while not stop.is_set():
        try:
            workspace.sync()
            workspace.reminders()
        except CloudError:
            pass
        stop.wait(30)


def main():
    parser = argparse.ArgumentParser()
    default = Path(os.environ.get("XDG_CONFIG_HOME", Path.home() / ".config")) / "taskflow-widget"
    parser.add_argument("--config", type=Path, default=default / "config.json")
    args = parser.parse_args()
    config = json.loads(args.config.read_text())
    url = urllib.parse.urlparse(config["url"])
    if url.scheme != "https" or not url.netloc or url.username or url.password or url.query or url.fragment:
        parser.error("Supabase URL must be an HTTPS origin")
    config["url"] = config["url"].rstrip("/")
    state_dir = Path(os.environ.get("XDG_STATE_HOME", Path.home() / ".local/state")) / "taskflow-widget"
    workspace = Workspace(config, state_dir)
    port = config.get("port", 38471)
    server = ThreadingHTTPServer(("127.0.0.1", port), make_handler(workspace, config["token"], port))
    server.daemon_threads = True
    stop = threading.Event()
    threading.Thread(target=poll, args=(workspace, stop), daemon=True).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        stop.set()
        server.server_close()


if __name__ == "__main__":
    main()
