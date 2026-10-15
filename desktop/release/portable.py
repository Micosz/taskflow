#!/usr/bin/env python3
"""Portable Windows / non-KDE Linux widget. No third-party Python runtime libraries."""
import argparse
import calendar
import datetime as dt
import json
import os
from pathlib import Path
import queue
import shutil
import sys
import threading
import tempfile
import tkinter as tk
from tkinter import messagebox
import webbrowser

# The release builder ships only the bridge source, never an installed account folder.
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "kde-widget"))
from bridge import Workspace, CloudError, save_private

WEB_URL = "https://taskflow-ruddy-one.vercel.app/"
VERSION = "1.0.0"
SETTINGS_KEYS = {"task_geometry", "calendar_geometry", "language"}


def data_dir():
    if sys.platform == "win32":
        return Path(os.environ.get("LOCALAPPDATA", Path.home() / "AppData/Local")) / "TaskFlowWidget"
    return Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local/share")) / "taskflow-portable"


def bundled_config():
    base = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))
    return json.loads((base / "public-config.json").read_text(encoding="utf-8"))


def read_settings(path):
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return {k: v for k, v in raw.items() if k in SETTINGS_KEYS and isinstance(v, str)}
    except (OSError, ValueError, AttributeError):
        return {}


def install_windows():
    if sys.platform != "win32" or not getattr(sys, "frozen", False):
        raise RuntimeError("Install.cmd is for the packaged Windows executable.")
    import winreg
    target = data_dir() / "TaskFlowWidget.exe"
    target.parent.mkdir(parents=True, exist_ok=True)
    if Path(sys.executable).resolve() != target.resolve():
        shutil.copy2(sys.executable, target)
    # Current-user startup only. Uninstall.cmd removes this exact value.
    with winreg.CreateKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Run") as key:
        winreg.SetValueEx(key, "TaskFlowWidget", 0, winreg.REG_SZ, '"' + str(target) + '"')
    os.startfile(target)


def uninstall_windows():
    import winreg
    with winreg.CreateKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Run") as key:
        try:
            winreg.DeleteValue(key, "TaskFlowWidget")
        except FileNotFoundError:
            pass
    messagebox.showinfo("TaskFlow", "Startup disabled. Close TaskFlow, then delete %LOCALAPPDATA%\\TaskFlowWidget to remove the app. Cloud data is retained.")


class Widgets:
    bg = "#101510"
    fg = "#f1efe7"
    muted = "#b4bdb0"
    accent = "#b7c3ac"

    def __init__(self, root, workspace, folder):
        self.root, self.workspace, self.folder = root, workspace, folder
        self.settings = read_settings(folder / "preferences.json")
        self.jobs, self.results = queue.Queue(), queue.Queue()
        self.busy = False
        self.state = workspace.snapshot()
        self.error = ""
        self.selected = dt.date.today()
        self.month = self.selected.replace(day=1)
        self.windows = []
        self.frames = []
        self.root.withdraw()
        self.make_window("TaskFlow", "task_geometry", "380x520+60+80")
        self.make_window("TaskFlow Calendar", "calendar_geometry", "380x560+470+80")
        threading.Thread(target=self.worker, daemon=True).start()
        self.render()
        self.submit(self.workspace.sync)
        self.root.after(150, self.drain)
        self.root.after(30000, self.poll)

    def tr(self, th, en):
        return th if self.settings.get("language", "th") == "th" else en

    def button(self, parent, text, command, **kw):
        return tk.Button(parent, text=text, command=command, bg="#253021", fg=self.fg,
                         activebackground="#35432f", activeforeground=self.fg,
                         relief="flat", bd=0, padx=9, pady=6, cursor="hand2", **kw)

    def label(self, parent, text, **kw):
        return tk.Label(parent, text=text, bg=self.bg, fg=kw.pop("fg", self.fg),
                        font=("Segoe UI", 10), **kw)

    def make_window(self, title, setting, default):
        win = tk.Toplevel(self.root)
        win.title(title)
        win.configure(bg=self.bg)
        win.minsize(330, 440)
        try:
            win.geometry(self.settings.get(setting, default))
        except tk.TclError:
            win.geometry(default)
        # Native title bars retain move/resize/minimize and never force always-on-top over games.
        win.protocol("WM_DELETE_WINDOW", self.close)
        win.bind("<Configure>", lambda event: self.save_geometry(win, setting) if event.widget == win else None)
        header = tk.Frame(win, bg=self.bg)
        header.pack(fill="x", padx=16, pady=(14, 8))
        self.label(header, title).pack(side="left")
        self.button(header, "TH / EN", self.toggle_language).pack(side="right")
        self.button(header, "↻", lambda: self.submit(self.workspace.sync)).pack(side="right", padx=4)
        frame = tk.Frame(win, bg=self.bg)
        frame.pack(fill="both", expand=True, padx=16)
        footer = tk.Frame(win, bg=self.bg)
        footer.pack(fill="x", padx=16, pady=10)
        self.button(footer, "Web ↗", lambda: webbrowser.open(WEB_URL)).pack(side="left")
        self.button(footer, "Settings", self.preferences).pack(side="right")
        self.windows.append(win)
        self.frames.append(frame)

    def save_geometry(self, win, key):
        self.settings[key] = win.geometry()

    def close(self):
        save_private(self.folder / "preferences.json", self.settings)
        self.root.destroy()

    def toggle_language(self):
        self.settings["language"] = "en" if self.settings.get("language", "th") == "th" else "th"
        save_private(self.folder / "preferences.json", self.settings)
        self.render()

    def preferences(self):
        from tkinter import filedialog
        dialog = tk.Toplevel(self.root)
        dialog.title("TaskFlow settings")
        dialog.configure(bg=self.bg)
        self.label(dialog, self.tr("สำรองเฉพาะภาษา ขนาด และตำแหน่ง ไม่รวมบัญชี", "Backup language, size and position only; no account tokens."), wraplength=360).pack(padx=18, pady=16)
        def export():
            name = filedialog.asksaveasfilename(defaultextension=".json", initialfile="taskflow-preferences.json", parent=dialog)
            if name:
                Path(name).write_text(json.dumps({k: v for k,v in self.settings.items() if k in SETTINGS_KEYS}, ensure_ascii=False, indent=2), encoding="utf-8")
        def restore():
            name = filedialog.askopenfilename(filetypes=[("JSON", "*.json")], parent=dialog)
            if name:
                restored = read_settings(Path(name))
                self.settings.update(restored)
                for win, key in zip(self.windows, ["task_geometry", "calendar_geometry"]):
                    if key in restored:
                        try:
                            win.geometry(restored[key])
                        except tk.TclError:
                            pass
                save_private(self.folder / "preferences.json", self.settings)
                self.render()
        self.button(dialog, "Export settings", export).pack(fill="x", padx=18, pady=4)
        self.button(dialog, "Restore settings", restore).pack(fill="x", padx=18, pady=4)
        self.button(dialog, self.tr("ออกจากบัญชี", "Sign out"), lambda: (dialog.destroy(), self.submit(self.workspace.clear))).pack(fill="x", padx=18, pady=12)

    def worker(self):
        while True:
            action = self.jobs.get()
            try:
                action()
                self.results.put("")
            except CloudError as exc:
                self.results.put(str(exc))
            except Exception:
                self.results.put("TaskFlow could not save or load data. Check your connection and retry.")
            finally:
                del action

    def submit(self, action):
        if self.busy:
            return
        self.busy = True
        self.error = ""
        self.jobs.put(action)

    def drain(self):
        try:
            self.error = self.results.get_nowait()
            self.busy = False
            self.state = self.workspace.snapshot()
            self.render()
        except queue.Empty:
            pass
        self.root.after(150, self.drain)

    def poll(self):
        self.submit(self.workspace.sync)
        self.root.after(30000, self.poll)

    def render(self):
        for frame in self.frames:
            for child in frame.winfo_children():
                child.destroy()
        if not self.state["signedIn"]:
            frame = self.frames[0]
            self.label(frame, self.tr("เข้าสู่บัญชี TaskFlow เดิม", "Sign in to your TaskFlow account")).pack(anchor="w", pady=8)
            self.label(frame, "Email").pack(anchor="w", pady=(12, 3))
            email = tk.Entry(frame, bg="#182018", fg=self.fg, insertbackground=self.fg)
            email.pack(fill="x", ipady=8)
            self.label(frame, "Password").pack(anchor="w", pady=(12, 3))
            password = tk.Entry(frame, show="•", bg="#182018", fg=self.fg, insertbackground=self.fg)
            password.pack(fill="x", ipady=8)
            def login():
                mail, secret = email.get().strip(), password.get()
                if not mail or not secret or self.busy:
                    return
                password.delete(0, "end")
                self.submit(lambda: self.workspace.login(mail, secret))
            password.bind("<Return>", lambda _: login())
            self.button(frame, self.tr("เข้าสู่ระบบ", "Sign in"), login).pack(fill="x", pady=18)
            self.label(self.frames[1], self.tr("เข้าสู่ระบบใน widget TaskFlow ก่อน", "Sign in in the TaskFlow widget first."), wraplength=300).pack(pady=22)
        else:
            self.render_tasks(self.frames[0], self.state["tasks"])
            self.render_calendar(self.frames[1])
        if self.error:
            for frame in self.frames:
                self.label(frame, self.error, fg="#ffa18e", wraplength=300).pack(side="bottom", pady=8)

    def render_tasks(self, frame, tasks):
        self.label(frame, self.tr("งานที่ยังไม่เสร็จ", "Unfinished scheduled work"), fg=self.accent).pack(anchor="w", pady=(0, 8))
        canvas = tk.Canvas(frame, bg=self.bg, highlightthickness=0, height=100)
        scrollbar = tk.Scrollbar(frame, orient="vertical", command=canvas.yview)
        scrollbar.pack(side="right", fill="y")
        canvas.pack(fill="both", expand=True)
        inner = tk.Frame(canvas, bg=self.bg)
        item = canvas.create_window((0, 0), window=inner, anchor="nw")
        inner.bind("<Configure>", lambda _: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.bind("<Configure>", lambda e: canvas.itemconfigure(item, width=e.width))
        canvas.configure(yscrollcommand=scrollbar.set)
        if not tasks:
            self.label(inner, self.tr("ไม่มีงานค้างส่ง 🎉", "No unfinished work 🎉")).pack(pady=14)
        for task in tasks:
            row = tk.Frame(inner, bg=self.bg)
            row.pack(fill="x", pady=7)
            self.button(row, "✓", lambda task_id=task["id"]: self.submit(lambda: self.workspace.complete(task_id))).pack(side="right")
            self.label(row, task["title"], anchor="w", justify="left", wraplength=240).pack(fill="x")
            due = task["due_date"] + (" · " + task["due_time"][:5] if task.get("due_time") else "")
            self.label(row, due, fg=self.accent).pack(anchor="w")
            if task.get("description"):
                self.label(row, task["description"], fg=self.muted, wraplength=240, justify="left").pack(anchor="w")

    def shift(self, amount):
        year, month = divmod(self.month.year * 12 + self.month.month - 1 + amount, 12)
        self.month = dt.date(year, month + 1, 1)
        self.render()

    def pick(self, day):
        self.selected = day
        self.render()

    def render_calendar(self, frame):
        toolbar = tk.Frame(frame, bg=self.bg)
        toolbar.pack(fill="x", pady=4)
        self.button(toolbar, "‹", lambda: self.shift(-1)).pack(side="left")
        self.button(toolbar, "›", lambda: self.shift(1)).pack(side="right")
        self.label(toolbar, self.month.strftime("%B %Y")).pack(pady=6)
        grid = tk.Frame(frame, bg=self.bg)
        grid.pack(fill="x")
        days = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"] if self.settings.get("language", "th") == "th" else ["M", "T", "W", "T", "F", "S", "S"]
        for col, day in enumerate(days):
            grid.columnconfigure(col, weight=1)
            self.label(grid, day, fg=self.muted).grid(row=0, column=col)
        marked = {task["due_date"] for task in self.state["tasks"]}
        for index, day in enumerate(calendar.Calendar().itermonthdates(self.month.year, self.month.month)):
            label = str(day.day) + (" ·" if day.isoformat() in marked else "")
            button = self.button(grid, label, lambda d=day: self.pick(d))
            if day == self.selected:
                button.configure(bg=self.accent, fg=self.bg)
            elif day.month != self.month.month:
                button.configure(fg=self.muted)
            button.grid(row=index // 7 + 1, column=index % 7, sticky="ew", padx=1, pady=2)
        self.button(frame, self.tr("วันนี้", "Today"), self.today).pack(anchor="e", pady=6)
        self.label(frame, self.selected.isoformat(), fg=self.accent).pack(anchor="w", pady=6)
        self.render_tasks(frame, [task for task in self.state["tasks"] if task["due_date"] == self.selected.isoformat()])

    def today(self):
        self.selected = dt.date.today()
        self.month = self.selected.replace(day=1)
        self.render()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--install", action="store_true")
    parser.add_argument("--uninstall", action="store_true")
    parser.add_argument("--smoke-test", action="store_true", help="Construct both windows without connecting to the cloud, then exit")
    args = parser.parse_args()
    if args.install:
        install_windows()
        return
    if args.uninstall:
        uninstall_windows()
        return
    temporary = tempfile.TemporaryDirectory() if args.smoke_test else None
    folder = Path(temporary.name) if temporary else data_dir()
    folder.mkdir(parents=True, exist_ok=True)
    workspace = Workspace(bundled_config(), folder / "state")
    if args.smoke_test:
        workspace.sync = workspace.snapshot  # No auth or network in smoke tests.
    root = tk.Tk()
    callback_errors = []
    def callback_failed(kind, value, traceback):
        callback_errors.append(value)
        root.quit()
    if args.smoke_test:
        root.report_callback_exception = callback_failed
    app = Widgets(root, workspace, folder)
    if args.smoke_test:
        def preview_calendar():
            workspace.session = {"user": {"email": "smoke@example.invalid"}}
            workspace.tasks = [{"id": "smoke", "title": "TaskFlow calendar preview", "due_date": dt.date.today().isoformat(), "due_time": "18:00:00", "category": "Demo", "description": "No live account or network"}]
            app.state = workspace.snapshot()
            app.render()
        root.after(200, preview_calendar)
        root.after(700, app.close)
    root.mainloop()
    if temporary:
        temporary.cleanup()
    if callback_errors:
        raise callback_errors[0]


if __name__ == "__main__":
    try:
        main()
    except Exception:
        if "--smoke-test" in sys.argv:
            raise
        messagebox.showerror("TaskFlow", "TaskFlow could not start or install. Close existing widgets and try again. Check the release README for requirements.")
        raise
