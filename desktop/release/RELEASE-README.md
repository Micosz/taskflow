# TaskFlow Widgets — v1.1.0

After reinstalling your OS, download this release again, install, and sign in to the
same TaskFlow account. Cloud tasks return from Supabase. Guest-only browser data
is not a cloud backup: move it into your account before erasing your OS.

## Linux: Ubuntu/Debian, Fedora/RHEL family

Extract `TaskFlow-Widgets-1.1.0-Linux.tar.gz`, open a terminal in its folder, run:

```bash
./install.sh
```

Requires Python 3.10+. No Node.js, source checkout, Supabase admin key, or sudo for
the installer. The release includes the app's public Supabase configuration.
It never includes a password, a session, or a private loopback credential.

- KDE **Plasma 6**: installs the original TaskFlow, TaskFlow Calendar and TaskFlow Todo widgets.
  Right-click desktop → Add Widgets → add any/all three. Sign in in either widget.
  Includes glass background, task completion, cached offline work and deadline reminders.
- GNOME, other desktops, or Plasma 5: opens three portable windows: Tasks, Calendar and Todo.
  Native title bars let you move, resize and minimize; positions are saved on exit.
  For this version surfaces are opaque and there are no native deadline notifications.
- Force portable mode: `./install.sh --portable`.
- If Python/Tk is missing, the installer prints the needed package command.
  Ubuntu/Debian: `sudo apt install python3 python3-tk`.
  Fedora/RHEL: `sudo dnf install python3 python3-tkinter` (Python 3.10+ required;
  older RHEL installations may need a newer Python with its matching Tk package).
- Portable widgets start next login and appear in your app menu. KDE uses a user service.
- To remove portable startup: `bash release/uninstall.sh`. KDE:
  `python3 kde-widget/install.py --uninstall`. Local account data is retained unless
  explicitly removed. Neither command deletes cloud tasks.

## Windows 10/11 x64

Extract `TaskFlow-Widgets-1.1.0-Windows-x64.zip` into a normal folder (not inside the zip).
Double-click `Install.cmd`. It installs only for your account under
`%LOCALAPPDATA%\TaskFlowWidget` and starts automatically at sign-in. No Python, Node,
admin privileges, or separate service is required. To try without installing,
run `TaskFlowWidget.exe` directly.

Sign in with your existing TaskFlow email/password. Three movable/resizable windows
show unfinished tasks, a calendar, and undated Todo. Add Todo reminders, complete
them, and show completed reminders to reopen them. Completion syncs to your account; the app
refreshes every 30 seconds and keeps the last successful tasks offline. Use Web to
add/edit tasks or edit/delete undated Todo. Closing any window quits all three; launch
TaskFlowWidget.exe again to reopen. Windows uses an opaque background in v1.1.0;
KDE's wallpaper blur is specific to Plasma. There are no native deadline notifications
on Windows in this release. MFA/CAPTCHA sign-in is not supported by either desktop client.

The executable is unsigned. Verify SHA256SUMS against the release files; if Windows
blocks it, don't bypass security warnings blindly. Build from the supplied source or
use the website if your machine's policy disallows unsigned programs.

Uninstall: run `Uninstall.cmd` from the extracted release to remove startup, close
TaskFlow windows, then delete `%LOCALAPPDATA%\TaskFlowWidget`. Cloud data remains.

## Preferences and restoring a new computer

Portable widgets: Settings → Export settings saves language, size and window position.
Put that JSON in your own backed-up folder, and use Settings → Restore settings after
reinstalling. This file excludes login tokens, passwords, task titles and cached data.
KDE widgets retry a missing companion automatically at 2/4/8 seconds, capped at
15 seconds; only state reads are retried, never writes. After updating, log out/in
once if Plasma still has the old QML loaded.

KDE retains its normal Plasma appearance configuration; after an OS reinstall, re-add
and position the widgets manually. This release does not back up the whole desktop layout.

Account tokens and offline task data are stored under your OS user account, not an
encrypted keyring. Do not share the installed app data folders. Use your normal OS
account protections. A fresh computer requires a new login; restoring a preferences
file does not restore credentials. The portable client is intended to run once per user.

## Verification limits

The shared cloud/auth bridge has automated tests. Linux KDE was installed and rendered
on Fedora. Windows builds and Tk window smoke checks run in GitHub Actions on Windows;
Ubuntu runs the portable smoke check under Xvfb. These checks do not establish actual
Windows or Ubuntu desktop appearance, notification behavior, or a live account login.
Fedora/RHEL package compatibility follows the standard Python/Tk requirements; a fresh
installation on every distribution has not been tested.
