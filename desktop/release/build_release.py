#!/usr/bin/env python3
"""Build a clean Linux bundle from tracked sources and public config only."""
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tarfile

ROOT = Path(__file__).resolve().parents[2]
VERSION = "1.0.0"


def validate_public(config):
    from urllib.parse import urlsplit
    url = urlsplit(config.get("url", ""))
    if url.scheme != "https" or not url.netloc or url.path or url.query or url.fragment or url.username or url.password:
        raise ValueError("Expected an HTTPS Supabase origin")
    key = config.get("key", "")
    if key.startswith("sb_publishable_"):
        return config
    try:
        claims = json.loads(base64.urlsafe_b64decode(key.split(".")[1] + "=="))
        if claims["role"] == "anon":
            return config
    except (ValueError, IndexError, KeyError):
        pass
    raise ValueError("Only public publishable/anon keys may enter release assets")


def public_config():
    # Only explicitly public fields are copied. Never read session.json or installed connection.js.
    env = {}
    for line in (ROOT / ".env.local").read_text().splitlines() if (ROOT / ".env.local").exists() else []:
        if "=" in line and not line.lstrip().startswith("#"):
            key, value = line.split("=", 1)
            env[key.strip()] = value.strip().strip("\"'")
    url = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or env.get("NEXT_PUBLIC_SUPABASE_URL", "")
    key = (os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") or env.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
           or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY") or env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", ""))
    return validate_public({"url": url.rstrip("/"), "key": key, "web_url": "https://taskflow-ruddy-one.vercel.app/", "notifications": False})


def build(output):
    folder = output / f"TaskFlow-Widgets-{VERSION}-Linux"
    if folder.exists():
        shutil.rmtree(folder)
    folder.mkdir(parents=True)
    tracked = subprocess.check_output(["git", "ls-files", "desktop/kde-widget", "desktop/release"], cwd=ROOT, text=True).splitlines()
    for filename in tracked:
        relative = Path(filename).relative_to("desktop")
        target = folder / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / filename, target)
    shutil.copy2(ROOT / "desktop/release/install.sh", folder / "install.sh")
    shutil.copy2(ROOT / "desktop/release/RELEASE-README.md", folder / "README.md")
    (folder / "install.sh").chmod(0o755)
    (folder / "release/public-config.json").write_text(json.dumps(public_config(), indent=2))
    archive = output / (folder.name + ".tar.gz")
    with tarfile.open(archive, "w:gz") as stream:
        stream.add(folder, arcname=folder.name)
    return archive


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    archive = build(args.output)
    (args.output / "SHA256SUMS-Linux.txt").write_text(hashlib.sha256(archive.read_bytes()).hexdigest() + "  " + archive.name + "\n")
    print(archive)
