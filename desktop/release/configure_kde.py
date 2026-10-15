"""Inject only release public settings into the existing KDE installer."""
import json
import os
from pathlib import Path
import subprocess
import sys

source = Path(__file__).resolve().parent
config = json.loads((source / "public-config.json").read_text())
env = dict(os.environ, NEXT_PUBLIC_SUPABASE_URL=config["url"],
           NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=config["key"])
subprocess.run([sys.executable, str(source.parent / "kde-widget/install.py"),
                "--web-url", config["web_url"]], env=env, check=True)
