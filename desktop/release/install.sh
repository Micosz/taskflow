#!/usr/bin/env bash
set -euo pipefail
release_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$release_dir"
command -v python3 >/dev/null || { echo 'Install Python 3 first (Ubuntu: sudo apt install python3; Fedora/RHEL: sudo dnf install python3).'; exit 1; }
python3 -c 'import sys; assert sys.version_info >= (3,10), "Python 3.10+ required"'
if command -v plasmashell >/dev/null && command -v kpackagetool6 >/dev/null && [[ "${1:-}" != '--portable' ]]; then
    python3 release/configure_kde.py
else
    python3 -c 'import tkinter' 2>/dev/null || {
        echo 'Tk is required. Ubuntu/Debian: sudo apt install python3-tk'
        echo 'Fedora/RHEL: sudo dnf install python3-tkinter'
        echo 'Then run ./install.sh again.'
        exit 1
    }
    python3 release/install_portable.py
fi
