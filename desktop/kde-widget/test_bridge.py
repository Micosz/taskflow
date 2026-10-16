"""Contract checks with a fake cloud; no real accounts or mutations."""
import datetime as dt
import json
import os
from pathlib import Path
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer

from bridge import CloudError, Workspace, due_at, make_handler
from install import read_env, systemd_quote


TASK = {"id": "00000000-0000-0000-0000-000000000001", "title": "Report", "category": "CS361",
        "due_date": "2026-10-13", "due_time": "15:00:00", "completed": False}


class BridgeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name)
        self.workspace = Workspace({"url": "https://example.supabase.co", "key": "public"}, self.directory)
        self.session = {"access_token": "access", "refresh_token": "refresh", "expires_in": 3600,
                        "user": {"id": "owner", "email": "owner@example.org"}}
        self.workspace.accept_session(self.session)

    def test_todo_sync_is_owner_scoped_paginated_and_persisted(self):
        calls = []
        todo = {"id": TASK["id"], "title": "จดไว้", "completed": False}
        def cloud(method, path, body=None, authenticated=True):
            if path == "/auth/v1/user": return {"id": "owner"}
            calls.append(path)
            self.assertIn("user_id=eq.owner", path)
            return [dict(todo, id=str(i)) for i in range(500)] if "offset=0" in path else [todo]
        self.workspace.cloud = cloud
        result = self.workspace.sync_todos()
        self.assertEqual(len(result["todos"]), 501)
        self.assertTrue(result["todoOnline"])
        self.assertIn("offset=500", calls[-1])
        self.assertEqual(len(Workspace(self.workspace.config, self.directory).todos), 501)
        self.workspace.clear()
        self.assertEqual(self.workspace.snapshot()["todos"], [])

    def test_todo_writes_have_no_deadlines_and_survive_offline_refetch(self):
        todo = {"id": TASK["id"], "title": "Reminder", "completed": False}
        def cloud(method, path, body=None, authenticated=True):
            if method == "POST":
                self.assertEqual(body, {"user_id": "owner", "title": "Reminder"})
                return [todo]
            if method == "PATCH":
                self.assertIn("user_id=eq.owner", path)
                return [dict(todo, completed=body["completed"])]
            raise CloudError("offline")
        self.workspace.cloud = cloud
        self.assertEqual(self.workspace.save_todo(title=" Reminder ")["todos"], [todo])
        self.assertTrue(self.workspace.save_todo(todo_id=TASK["id"], completed=True)["todos"][0]["completed"])
        self.assertFalse(self.workspace.save_todo(todo_id=TASK["id"], completed=False)["todos"][0]["completed"])
        for title in [" ", "x"*241, None]:
            with self.assertRaises(ValueError): self.workspace.save_todo(title=title)

    def test_invalid_todo_auth_clears_cached_todos_without_exposing_tokens(self):
        self.workspace.todos = [{"id": "private"}]
        def denied(*args): raise CloudError("expired", 401)
        self.workspace.cloud = denied
        with self.assertRaises(CloudError): self.workspace.sync_todos()
        snapshot = self.workspace.snapshot()
        self.assertFalse(snapshot["signedIn"])
        self.assertEqual(snapshot["todos"], [])
        self.assertNotIn("refresh_token", json.dumps(snapshot))

    def test_utf8_cache_roundtrip(self):
        self.workspace.tasks = [dict(TASK, title="ทำรายงานภาษาไทย 📝", description="ทบทวนก่อนส่ง")]
        self.workspace.persist()
        self.assertEqual(Workspace(self.workspace.config, self.directory).tasks, self.workspace.tasks)

    def test_refresh_rotates_and_persists_before_fetch(self):
        self.workspace.session["expires_at"] = time.time() - 1
        requests = []
        def cloud(method, path, body=None, authenticated=True):
            requests.append(path)
            if "grant_type=refresh_token" in path:
                self.assertEqual(body, {"refresh_token": "refresh"})
                return dict(self.session, refresh_token="rotated")
            self.assertEqual(json.loads(self.workspace.path.read_text())["session"]["refresh_token"], "rotated")
            return {"id": "owner"} if path == "/auth/v1/user" else [TASK]
        self.workspace.cloud = cloud
        state = self.workspace.sync()
        self.assertTrue(state["online"])
        self.assertIn("user_id=eq.owner", requests[-1])
        self.assertNotIn("access_token", json.dumps(state))
        if os.name != "nt":
            self.assertEqual(self.workspace.path.stat().st_mode & 0o777, 0o600)

    def test_offline_cache_survives_but_invalid_auth_clears(self):
        self.workspace.tasks = [TASK]
        self.workspace.persist()
        def offline(*args):
            raise CloudError("offline")
        self.workspace.cloud = offline
        with self.assertRaises(CloudError): self.workspace.sync()
        self.assertEqual(self.workspace.snapshot()["tasks"], [TASK])
        def expired(*args):
            raise CloudError("expired", 401)
        self.workspace.cloud = expired
        with self.assertRaises(CloudError): self.workspace.sync()
        self.assertFalse(self.workspace.snapshot()["signedIn"])
        self.assertEqual(Workspace(self.workspace.config, self.directory).tasks, [])

    def test_switch_account_does_not_leak_old_tasks_or_reminders(self):
        self.workspace.tasks = [TASK]
        self.workspace.notified = {"old"}
        def cloud(method, path, body=None, authenticated=True):
            if "grant_type=password" in path:
                return dict(self.session, user={"id": "new", "email": "new@example.org"})
            if path == "/auth/v1/user": return {"id": "new"}
            return []
        self.workspace.cloud = cloud
        state = self.workspace.login("new@example.org", "password")
        self.assertEqual(state["tasks"], [])
        self.assertEqual(self.workspace.notified, set())

    def test_completion_survives_failed_refetch(self):
        self.workspace.tasks = [TASK]
        def cloud(method, path, body=None, authenticated=True):
            if method == "PATCH":
                self.assertEqual(body, {"completed": True})
                self.assertIn("user_id=eq.owner", path)
                return [dict(TASK, completed=True)]
            raise CloudError("offline")
        self.workspace.cloud = cloud
        self.assertEqual(self.workspace.complete(TASK["id"])["tasks"], [])

    def test_reminders_dedupe_restart_and_reschedule(self):
        self.workspace.tasks = [TASK]
        self.workspace.online = True
        sent = []
        notify = lambda title, body: sent.append(body) or True
        now = dt.datetime(2026, 10, 13, 14, 30)
        self.workspace.reminders(now, notify)
        self.workspace.reminders(now, notify)
        restored = Workspace(self.workspace.config, self.directory)
        restored.online = True
        restored.reminders(now, notify)
        self.assertEqual(len(sent), 1)
        restored.tasks = [dict(TASK, due_time="15:15:00")]
        restored.reminders(now, notify)
        self.assertEqual(len(sent), 2)
        self.assertEqual(due_at(dict(TASK, due_time=None)).hour, 23)

    def test_completed_old_overdue_and_offline_never_notify(self):
        sent = []
        self.workspace.online = True
        self.workspace.tasks = [dict(TASK, completed=True), dict(TASK, due_date="2026-10-12")]
        self.workspace.reminders(dt.datetime(2026, 10, 13, 14, 30), lambda *a: sent.append(a))
        self.workspace.online = False
        self.workspace.tasks = [TASK]
        self.workspace.reminders(dt.datetime(2026, 10, 13, 14, 30), lambda *a: sent.append(a))
        self.assertEqual(sent, [])

    def test_http_requires_secret_and_rejects_browser_origin_and_rebinding(self):
        server = ThreadingHTTPServer(("127.0.0.1", 0), make_handler(self.workspace, "secret", 0))
        port = server.server_port
        server.RequestHandlerClass = make_handler(self.workspace, "secret", port)
        self.addCleanup(server.server_close)
        self.addCleanup(server.shutdown)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        url = f"http://127.0.0.1:{port}/state"
        for headers in ({}, {"Authorization": "Bearer secret", "Origin": "https://attacker.test"},
                        {"Authorization": "Bearer secret", "Host": "attacker.test"}):
            with self.assertRaises(urllib.error.HTTPError) as caught:
                urllib.request.urlopen(urllib.request.Request(url, headers=headers))
            caught.exception.close()
        with urllib.request.urlopen(urllib.request.Request(url, headers={"Authorization": "Bearer secret"})) as response:
            self.assertNotIn("refresh_token", response.read().decode())

    def test_env_parser_does_not_execute_shell_and_unit_escapes_paths(self):
        path = self.directory / ".env.local"
        path.write_text('export NEXT_PUBLIC_SUPABASE_URL="https://example.supabase.co"\n# ignored\nKEY=$(touch /tmp/no)\n')
        self.assertEqual(read_env(path)["KEY"], "$(touch /tmp/no)")
        self.assertEqual(systemd_quote('/tmp/a b%$"'), '"/tmp/a b%%$$\\""')

    def test_pagination_does_not_hide_tasks_over_cloud_row_limit(self):
        calls = []
        def cloud(method, path, body=None, authenticated=True):
            if path == "/auth/v1/user": return {"id": "owner"}
            calls.append(path)
            return [dict(TASK, id=str(index)) for index in range(500)] if "offset=0" in path else [TASK]
        self.workspace.cloud = cloud
        self.assertEqual(len(self.workspace.sync()["tasks"]), 501)
        self.assertIn("offset=500", calls[-1])


if __name__ == "__main__":
    unittest.main()
