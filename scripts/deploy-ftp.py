#!/usr/bin/env python3
"""
Deploy Lumin Chess to a Bluehost (or any) FTP host.

Reads credentials from environment variables OR a `.ftp-credentials` file at
the project root (key=value lines, never commit). Connects via FTPS by
default, falls back to plain FTP if TLS isn't supported. Lists/wipes the
target directory and uploads `web-deploy/index.html` + `web-deploy/leaderboard.php`.

Usage:
    # Via env vars
    export FTP_HOST=ftp.100fold.ai
    export FTP_USER=...
    export FTP_PASS=...
    python3 scripts/deploy-ftp.py

    # Via credentials file
    cat > .ftp-credentials <<'EOF'
    host=ftp.100fold.ai
    user=...
    pass=...
    path=public_html/website_eb50e76f
    EOF
    python3 scripts/deploy-ftp.py

    # Preview without making changes
    python3 scripts/deploy-ftp.py --dry-run
"""

import argparse
import ftplib
import os
import re
import shutil
import socket
import ssl
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WEB_DEPLOY = ROOT / "web-deploy"
CREDS_FILE = ROOT / ".ftp-credentials"
UPLOAD_FILES = ["index.html", "leaderboard.php", ".htaccess"]
# Server-side files that must survive a deploy (the leaderboard JSON in
# particular — wiping it on every push would erase players' scores).
PRESERVE_FILES = {"leaderboard-data.json"}
# Bluehost FTP users created with a "Directory" set are chrooted there on login —
# i.e., the FTP root IS public_html/website_eb50e76f, so no cd is needed by default.
# Override with FTP_PATH or path=... in .ftp-credentials if you want to cd somewhere.
DEFAULT_PATH = ""


def load_credentials():
    creds = {
        "host": os.environ.get("FTP_HOST"),
        "user": os.environ.get("FTP_USER"),
        "password": os.environ.get("FTP_PASS"),
        "path": os.environ.get("FTP_PATH"),
        "port": int(os.environ.get("FTP_PORT", "21")),
        "tls": os.environ.get("FTP_TLS", "1") == "1",
    }
    if CREDS_FILE.exists():
        with CREDS_FILE.open() as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                k, v = k.strip(), v.strip()
                if k == "host" and not creds["host"]:
                    creds["host"] = v
                elif k == "user" and not creds["user"]:
                    creds["user"] = v
                elif k == "pass" and not creds["password"]:
                    creds["password"] = v
                elif k == "path" and not creds["path"]:
                    creds["path"] = v
                elif k == "port":
                    creds["port"] = int(v)
                elif k == "tls":
                    creds["tls"] = v.lower() in ("1", "true", "yes")
    if creds["path"] is None:
        creds["path"] = DEFAULT_PATH
    missing = [k for k in ("host", "user", "password") if not creds[k]]
    if missing:
        print(f"✕ Missing FTP credentials: {missing}")
        print(f"  Set FTP_HOST, FTP_USER, FTP_PASS env vars, or create {CREDS_FILE}.")
        sys.exit(2)
    return creds


def connect(creds):
    """Try FTPS first; fall back to plain FTP on TLS failure."""
    if creds["tls"]:
        try:
            ftp = ftplib.FTP_TLS()
            ftp.connect(creds["host"], creds["port"], timeout=30)
            ftp.login(creds["user"], creds["password"])
            ftp.prot_p()  # encrypt data channel
            ftp.set_pasv(True)
            print(f"✓ Connected to {creds['host']}:{creds['port']} via FTPS")
            return ftp
        except (ftplib.error_perm, ftplib.error_temp, ssl.SSLError, socket.error, OSError, TimeoutError) as e:
            print(f"⚠  FTPS failed ({type(e).__name__}: {e}); falling back to plain FTP.")
            creds["tls"] = False
    ftp = ftplib.FTP()
    ftp.connect(creds["host"], creds["port"], timeout=30)
    ftp.login(creds["user"], creds["password"])
    ftp.set_pasv(True)
    print(f"✓ Connected to {creds['host']}:{creds['port']} via plain FTP")
    return ftp


def ensure_remote_path(ftp, path):
    """cwd to path, creating intermediate dirs as needed. Empty path = stay put."""
    if not path or path in (".", "/"):
        print(f"  pwd (chrooted root): {ftp.pwd()}")
        return
    parts = path.strip("/").split("/")
    for part in parts:
        try:
            ftp.cwd(part)
        except ftplib.error_perm:
            ftp.mkd(part)
            ftp.cwd(part)
            print(f"  + mkdir {part}")
    print(f"  pwd: {ftp.pwd()}")


def list_remote(ftp):
    try:
        return [n for n in ftp.nlst() if n not in (".", "..")]
    except ftplib.error_perm as e:
        if "550" in str(e):  # empty dir
            return []
        raise


def wipe_remote(ftp, dry_run=False):
    names = list_remote(ftp)
    if not names:
        print(f"  (empty already)")
        return
    for name in names:
        # Persistent server-side state (e.g. leaderboard-data.json) must survive.
        if name in PRESERVE_FILES:
            print(f"  (kept): {name}")
            continue
        # File first; if that errors, treat as directory and recurse.
        try:
            if dry_run:
                print(f"  would delete: {name}")
            else:
                ftp.delete(name)
                print(f"  - {name}")
        except ftplib.error_perm:
            try:
                ftp.cwd(name)
                wipe_remote(ftp, dry_run=dry_run)
                ftp.cwd("..")
                if dry_run:
                    print(f"  would rmdir: {name}/")
                else:
                    ftp.rmd(name)
                    print(f"  - {name}/")
            except ftplib.error_perm as e:
                print(f"  ! couldn't remove {name}: {e}")


# Bump APP_VERSION in the source index.html. Skipped on --dry-run so test runs
# don't pollute the version history. We bump BEFORE upload so the deployed
# bundle, the source file on disk, and any APK built afterward all show the
# same version — no drift between web, source, and APK.
def bump_source_version():
    src = ROOT / "index.html"
    content = src.read_text()
    pattern = r"var APP_VERSION = 'v(\d+)\.(\d+)';"
    match = re.search(pattern, content)
    if not match:
        print("⚠  APP_VERSION not found in index.html — skipping bump")
        return None
    major = int(match.group(1))
    minor = int(match.group(2)) + 1
    new_version = f"v{major}.{minor}"
    src.write_text(re.sub(pattern, f"var APP_VERSION = '{new_version}';", content, count=1))
    return new_version


def refresh_web_deploy():
    """Re-run build-web.sh so web-deploy/ reflects the current source."""
    script = ROOT / "scripts" / "build-web.sh"
    subprocess.run([str(script)], check=True, cwd=str(ROOT))


def upload_files(ftp, dry_run=False):
    for name in UPLOAD_FILES:
        local = WEB_DEPLOY / name
        if not local.exists():
            print(f"  ! missing local file: {local} (skipping)")
            continue
        size = local.stat().st_size
        if dry_run:
            print(f"  would upload: {name} ({size} bytes)")
            continue
        with local.open("rb") as f:
            ftp.storbinary(f"STOR {name}", f)
        print(f"  + {name}  ({size} bytes)")


def main():
    parser = argparse.ArgumentParser(description="FTP deploy Lumin Chess web bundle")
    parser.add_argument("--dry-run", action="store_true",
                        help="Connect and list, but do not delete or upload")
    args = parser.parse_args()

    if not WEB_DEPLOY.exists():
        print(f"✕ {WEB_DEPLOY} missing. Run ./scripts/build-web.sh first.")
        sys.exit(1)

    creds = load_credentials()
    print(f"  target: {creds['user']}@{creds['host']}:{creds['port']} → /{creds['path'].strip('/')}/")
    print(f"  files:  {', '.join(UPLOAD_FILES)}")
    if args.dry_run:
        print(f"  mode:   dry-run\n")
    else:
        print()
        # Bump FIRST so the version label in the uploaded bundle, the version
        # left in source, and any APK built right after this deploy all match.
        new_version = bump_source_version()
        if new_version:
            print(f"  source APP_VERSION bumped → {new_version} (this deploy)")
        # Re-stage web-deploy/ so it picks up the bumped source.
        refresh_web_deploy()

    ftp = connect(creds)
    try:
        ensure_remote_path(ftp, creds["path"])
        existing = list_remote(ftp)
        if existing:
            print(f"▸ {len(existing)} item(s) to wipe: {existing}")
        else:
            print(f"▸ target dir is empty")
        wipe_remote(ftp, dry_run=args.dry_run)
        print(f"▸ uploading {len(UPLOAD_FILES)} file(s)")
        upload_files(ftp, dry_run=args.dry_run)
        print()
        if args.dry_run:
            print("✓ dry-run complete (no changes made)")
        else:
            print("✓ deploy complete")
    finally:
        try:
            ftp.quit()
        except Exception:
            pass


if __name__ == "__main__":
    main()
