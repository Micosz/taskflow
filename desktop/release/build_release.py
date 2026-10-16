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
VERSION = json.loads((ROOT / "package.json").read_text())["version"]


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
    if not url and not key:
        return validate_public(json.loads((ROOT / "desktop/release/public-settings.json").read_text()))
    return validate_public({"url": url.rstrip("/"), "key": key, "web_url": "https://taskflow-ruddy-one.vercel.app/", "notifications": False})


def build(output):
    folder = output / f"TaskFlow-Widgets-{VERSION}-Linux"
    if folder.exists():
        shutil.rmtree(folder)
    folder.mkdir(parents=True)
    tracked = subprocess.check_output(["git", "ls-files", "desktop/kde-widget", "desktop/release"], cwd=ROOT, text=True).splitlines()
    for filename in tracked:
        relative = Path(filename).relative_to("desktop")
        if relative.name.startswith("test_"):
            continue
        if relative.parts[0] == "release" and relative.name not in {"portable.py", "public-settings.json", "configure_kde.py", "install_portable.py", "uninstall.sh"}:
            continue
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


def windows_version_file(path):
    version_tuple = tuple(int(part) for part in VERSION.split(".")) + (0,)
    text = f"""VSVersionInfo(
 ffi=FixedFileInfo(filevers={version_tuple!r}, prodvers={version_tuple!r}, mask=0x3f, flags=0, OS=0x40004, fileType=1, subtype=0, date=(0,0)),
 kids=[StringFileInfo([StringTable('040904B0',[
  StringStruct('CompanyName','Micosz'), StringStruct('ProductName','TaskFlow Widgets'),
  StringStruct('FileVersion','{VERSION}'), StringStruct('ProductVersion','{VERSION}'),
  StringStruct('OriginalFilename','TaskFlowWidget.exe')])]),
  VarFileInfo([VarStruct('Translation',[1033,1200])])])
"""
    path.write_text(text, encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path)
    parser.add_argument("--windows-version-file", type=Path)
    args = parser.parse_args()
    if args.windows_version_file:
        windows_version_file(args.windows_version_file)
        raise SystemExit(0)
    if not args.output:
        parser.error("--output is required for Linux bundles")
    args.output.mkdir(parents=True, exist_ok=True)
    archive = build(args.output)
    (args.output / "SHA256SUMS-Linux.txt").write_text(hashlib.sha256(archive.read_bytes()).hexdigest() + "  " + archive.name + "\n")
    print(archive)
