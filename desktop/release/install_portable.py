"""Install the portable widget under the current Linux user. No root changes."""
import os
from pathlib import Path
import shutil
import subprocess
import sys

source = Path(__file__).resolve().parent
home = Path.home()
data = Path(os.environ.get("XDG_DATA_HOME", home / ".local/share"))
config = Path(os.environ.get("XDG_CONFIG_HOME", home / ".config"))
target = data / "taskflow-portable"
target.mkdir(parents=True, exist_ok=True, mode=0o700)
for filename in ["portable.py", "public-config.json"]:
    shutil.copy2(source / filename, target / filename)
# Same-directory import works in source and frozen Windows builds.
shutil.copy2(source.parent / "kde-widget/bridge.py", target / "bridge.py")
command = '"' + sys.executable.replace('"', '\\"') + '" "' + str(target / "portable.py").replace('"', '\\"').replace('%', '%%') + '"'
entry = '[Desktop Entry]\nType=Application\nName=TaskFlow Widgets\nComment=Tasks and calendar\nExec=' + command + '\nIcon=view-calendar\nTerminal=false\nCategories=Office;\n'
for location in [data / "applications/taskflow-widgets.desktop", config / "autostart/taskflow-widgets.desktop"]:
    location.parent.mkdir(parents=True, exist_ok=True)
    location.write_text(entry)
shutil.copy2(source / "uninstall.sh", target / "uninstall.sh")
subprocess.Popen([sys.executable, str(target / "portable.py")], start_new_session=True)
print('Installed TaskFlow Widgets. It starts on login. Use your existing account.')
