#!/usr/bin/env python3
"""Install/update the companion for the current KDE user; never needs sudo."""
import argparse
import json
import os
from pathlib import Path
import secrets
import shutil
import subprocess
import sys
import urllib.parse

from bridge import save_private


PLUGIN = "com.github.micosz.taskflow"
CALENDAR_PLUGIN = "com.github.micosz.taskflow.calendar"


def read_env(path):
    values = {}
    if path.exists():
        for line in path.read_text().splitlines():
            line = line.strip()
            if line.startswith("export "):
                line = line[7:]
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                values[key.strip()] = value.strip().strip("\"'")
    return values


def systemd_quote(value):
    # ExecStart has its own quoting rules, not shell rules. Escape specifiers too.
    return '"' + str(value).replace("\\", "\\\\").replace('"', '\\"').replace("%", "%%").replace("$", "$$") + '"'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--web-url", help="Deployed TaskFlow URL (or set it inside the widget)")
    parser.add_argument("--no-notifications", action="store_true")
    parser.add_argument("--uninstall", action="store_true", help="Remove widget/service; retain private account data")
    parser.add_argument("--purge", action="store_true", help="With --uninstall, also erase local session/cache/config")
    args = parser.parse_args()
    source = Path(__file__).resolve().parent
    data = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local/share"))
    config_home = Path(os.environ.get("XDG_CONFIG_HOME", Path.home() / ".config"))
    state_home = Path(os.environ.get("XDG_STATE_HOME", Path.home() / ".local/state"))
    app = data / "taskflow-widget"
    widget = data / "plasma/plasmoids" / PLUGIN
    calendar = data / "plasma/plasmoids" / CALENDAR_PLUGIN
    config_path = config_home / "taskflow-widget/config.json"
    unit = config_home / "systemd/user/taskflow-widget.service"
    if not shutil.which("systemctl") or not shutil.which("kpackagetool6"):
        parser.error("KDE Plasma 6, systemctl and Python 3 are required.")
    if args.uninstall:
        subprocess.run(["systemctl", "--user", "disable", "--now", "taskflow-widget.service"], check=False)
        unit.unlink(missing_ok=True)
        shutil.rmtree(app, ignore_errors=True)
        shutil.rmtree(widget, ignore_errors=True)
        shutil.rmtree(calendar, ignore_errors=True)
        if args.purge:
            shutil.rmtree(config_path.parent, ignore_errors=True)
            shutil.rmtree(state_home / "taskflow-widget", ignore_errors=True)
        subprocess.run(["systemctl", "--user", "daemon-reload"], check=True)
        print("Removed TaskFlow widget/service. Remove its desktop tile through KDE if still visible.")
        return
    if args.purge:
        parser.error("--purge requires --uninstall")
    previous = json.loads(config_path.read_text()) if config_path.exists() else {}
    env = read_env(source.parent.parent / ".env.local")
    url = (os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or env.get("NEXT_PUBLIC_SUPABASE_URL") or previous.get("url", "")).rstrip("/")
    key = (os.environ.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") or env.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
           or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY") or env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY") or previous.get("key", ""))
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != "https" or not parsed.netloc or parsed.path or parsed.username or parsed.password or parsed.query or parsed.fragment or not key:
        parser.error("Set public Supabase URL/key in the project's .env.local or environment. URL must be an HTTPS origin.")
    # Reject JWT service-role keys rather than granting a desktop client unrestricted access.
    if key.startswith("sb_secret_"):
        parser.error("Use a publishable/anon key, never a Supabase secret key.")
    if key.count(".") == 2:
        import base64
        try:
            claims = json.loads(base64.urlsafe_b64decode(key.split(".")[1] + "=="))
            if claims.get("role") != "anon":
                parser.error("Only the public anon JWT key is supported.")
        except (ValueError, UnicodeError):
            parser.error("Invalid public key.")
    web_url = args.web_url if args.web_url is not None else previous.get("web_url", "")
    if web_url and urllib.parse.urlparse(web_url).scheme not in ("http", "https"):
        parser.error("--web-url must start with http:// or https://")
    config = {"url": url, "key": key, "token": previous.get("token") or secrets.token_urlsafe(32),
              "port": previous.get("port", 38471), "web_url": web_url,
              "notifications": not args.no_notifications}
    # A changed Supabase project must never reuse the old project's account/cache.
    if previous.get("url") and previous["url"] != url:
        subprocess.run(["systemctl", "--user", "stop", "taskflow-widget.service"], check=False)
        shutil.rmtree(state_home / "taskflow-widget", ignore_errors=True)
    save_private(config_path, config)
    app.mkdir(parents=True, exist_ok=True, mode=0o700)
    shutil.copy2(source / "bridge.py", app / "bridge.py")
    shutil.copytree(source / "plasmoid", widget, dirs_exist_ok=True)
    os.chmod(widget, 0o700)
    connection = widget / "contents/ui/connection.js"
    connection.write_text("// Generated locally. Do not share this file.\nvar baseUrl = "
                          + json.dumps(f'http://127.0.0.1:{config["port"]}') + ";\nvar token = "
                          + json.dumps(config["token"]) + ";\n")
    os.chmod(connection, 0o600)
    shutil.copytree(source / "calendar-plasmoid", calendar, dirs_exist_ok=True)
    os.chmod(calendar, 0o700)
    for component in ("WidgetTheme.qml", "WidgetButton.qml", "WidgetField.qml", "GlassSurface.qml"):
        shutil.copy2(source / "plasmoid/contents/ui" / component, calendar / "contents/ui" / component)
    shutil.copy2(connection, calendar / "contents/ui/connection.js")
    os.chmod(calendar / "contents/ui/connection.js", 0o600)
    unit.parent.mkdir(parents=True, exist_ok=True)
    unit.write_text("[Unit]\nDescription=TaskFlow desktop widget companion\n"
                    "After=graphical-session.target\nPartOf=graphical-session.target\n\n"
                    "[Service]\nType=simple\nExecStart=" + systemd_quote(sys.executable)
                    + " " + systemd_quote(app / "bridge.py") + " --config " + systemd_quote(config_path)
                    + "\nRestart=on-failure\nRestartSec=5\nUMask=0077\nNoNewPrivileges=yes\n\n"
                    "[Install]\nWantedBy=graphical-session.target\n")
    subprocess.run(["systemctl", "--user", "daemon-reload"], check=True)
    subprocess.run(["systemctl", "--user", "enable", "taskflow-widget.service"], check=True)
    subprocess.run(["systemctl", "--user", "restart", "taskflow-widget.service"], check=True)
    print("Installed TaskFlow. Right-click desktop/panel → Add Widgets → TaskFlow.")
    print("Sign in inside the widget with your existing TaskFlow email/password.")
    print("Calendar: Add Widgets → TaskFlow Calendar (same account/companion).")
    print("Preview: plasmawindowed " + PLUGIN)


if __name__ == "__main__":
    main()
