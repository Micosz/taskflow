#!/usr/bin/env bash
set -euo pipefail
# Retain account state/preferences and all cloud data. Quit widget windows first.
rm -f -- "${XDG_CONFIG_HOME:-$HOME/.config}/autostart/taskflow-widgets.desktop" "${XDG_DATA_HOME:-$HOME/.local/share}/applications/taskflow-widgets.desktop"
echo 'Startup and launcher removed. Close TaskFlow, then remove ~/.local/share/taskflow-portable if you also want to erase local account/cache/preferences.'
echo 'For KDE: python3 kde-widget/install.py --uninstall (from the extracted Linux release).'
