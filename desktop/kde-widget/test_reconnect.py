"""Run real QML clients against a temporarily unavailable fake companion."""
import json
import os
from pathlib import Path
import shutil
import signal
import time
import subprocess
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


@unittest.skipUnless(shutil.which("plasmawindowed") and shutil.which("dbus-run-session"), "Plasma runtime required for QML integration")
class ReconnectTests(unittest.TestCase):
    def test_all_widgets_recover_without_replaying_writes(self):
        calls = {}
        reports = {}
        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *args): pass
            def respond(self):
                if self.path == "/report":
                    data = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
                    reports[data["name"]] = data
                    self.send_response(200); self.end_headers(); return
                client = self.headers["Authorization"]
                calls.setdefault(client, []).append((self.command, self.path))
                if len(calls[client]) <= 2:
                    self.send_response(503); self.end_headers(); return
                raw = json.dumps({"signedIn": True, "tasks": [], "todos": [], "online": True, "todoOnline": True, "email": "test@example.invalid"}).encode()
                self.send_response(200); self.send_header("Content-Length", str(len(raw))); self.end_headers(); self.wfile.write(raw)
            do_GET = respond
            do_POST = respond
        server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.addCleanup(server.server_close)
        self.addCleanup(server.shutdown)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        source = Path(__file__).resolve().parent
        with tempfile.TemporaryDirectory() as temporary:
            temp = Path(temporary)
            processes = []
            for name in ("plasmoid", "calendar-plasmoid", "todo-plasmoid"):
                plugin_id = "com.github.micosz.recovery." + name
                package = temp / "data/plasma/plasmoids" / plugin_id
                shutil.copytree(source / name, package)
                metadata = package / "metadata.json"
                info = json.loads(metadata.read_text()); info["KPlugin"]["Id"] = plugin_id
                metadata.write_text(json.dumps(info))
                ui = package / "contents/ui"
                for component in (source / "plasmoid/contents/ui").glob("*.qml"):
                    if component.name != "main.qml": shutil.copy2(component, ui / component.name)
                (ui / "connection.js").write_text(f'var baseUrl = "http://127.0.0.1:{server.server_port}"; var token = "{name}";')
                main = ui / "main.qml"
                text = main.read_text()
                report = json.dumps(f"http://127.0.0.1:{server.server_port}/report")
                text = text[:text.rfind("}")] + f'''
    Timer {{ interval: 9000; running: true; onTriggered: {{
        var probe = new XMLHttpRequest(); probe.open("POST", {report});
        probe.setRequestHeader("Content-Type", "application/json");
        probe.send(JSON.stringify({{name:"{name}",loaded:root.loaded,attempts:reconnect.attempts}}));
    }} }}
}}
'''
                main.write_text(text)
                env = dict(os.environ, XDG_DATA_HOME=str(temp / "data"), XDG_CONFIG_HOME=str(temp / "config"), QT_QPA_PLATFORM="offscreen", QT_QUICK_BACKEND="software", QT_FORCE_STDERR_LOGGING="1")
                processes.append(subprocess.Popen(["dbus-run-session", "--", "plasmawindowed", plugin_id], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True))
            try:
                deadline = time.monotonic() + 15
                while len(reports) < 3 and time.monotonic() < deadline:
                    time.sleep(0.1)
                self.assertEqual(set(reports), {"plasmoid", "calendar-plasmoid", "todo-plasmoid"}, reports)
                for name, report in reports.items():
                    self.assertTrue(report["loaded"], report)
                    self.assertEqual(report["attempts"], 0, report)
                    self.assertEqual(calls["Bearer " + name][1:3], [("GET", "/state"), ("GET", "/state")])
            finally:
                for process in processes:
                    try: os.killpg(process.pid, signal.SIGTERM)
                    except ProcessLookupError: pass
                    process.wait(timeout=5)



if __name__ == "__main__":
    unittest.main()
