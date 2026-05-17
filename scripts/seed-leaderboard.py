#!/usr/bin/env python3
"""
Seed the live leaderboard with 100 random entries per level for visual testing.

Reads FTP creds from env (FTP_HOST / FTP_USER / FTP_PASS) or `.ftp-credentials`,
generates a realistic distribution of names + scores + dates + submission
timestamps, sorts them by (moves asc, submitted asc) to match the live sort
behaviour, and uploads as `leaderboard-data.json` next to leaderboard.php.

To wipe the seed later: ssh / cPanel File Manager delete `leaderboard-data.json`
or run scripts/deploy-ftp.py (it wipes the dir before redeploying).
"""

import argparse
import ftplib
import io
import json
import os
import random
import socket
import ssl
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CREDS_FILE = ROOT / ".ftp-credentials"

# Score distribution per level — centred well above par to look realistic, with
# a long tail toward poor scores. Floor at par (verified BFS-optimal).
# Level 10 ("Final field") has no verified par; we use a generous mean for seeding.
LEVELS = {
    1:  {"par": 14, "mean": 22, "stdev": 6},   # Swap the rows
    2:  {"par": 24, "mean": 33, "stdev": 7},   # Hollow square
    3:  {"par": 26, "mean": 35, "stdev": 7},   # Single file
    4:  {"par": 26, "mean": 35, "stdev": 7},   # Twin grays
    5:  {"par": 32, "mean": 44, "stdev": 9},   # Narrow tower
    6:  {"par": 34, "mean": 46, "stdev": 9},   # Bottleneck
    7:  {"par": 42, "mean": 56, "stdev": 11},  # Crosshatch
    8:  {"par": 44, "mean": 58, "stdev": 11},  # The arena
    9:  {"par": 49, "mean": 64, "stdev": 12},  # Mind the grays
    10: {"par": 70, "mean": 90, "stdev": 16},  # Final field (par unknown)
}

NAMES = [
    # short, common first names — mix of styles
    "Alex", "Sam", "Jordan", "Taylor", "Casey", "Riley", "Morgan", "Quinn",
    "Avery", "Cameron", "Luna", "Phoenix", "Sky", "River", "Zen", "Echo",
    "Skylar", "Rowan", "Ember", "Sage", "Wren", "Iris", "Nova", "Pixel",
    "Cipher", "Vector", "Lumin", "Atlas", "Orion", "Vega", "Aria", "Soren",
    "Mika", "Kai", "Noa", "Niko", "Eva", "Ada", "Otto", "Pip", "Sol", "Yuki",
    "Anya", "Beatrix", "Mira", "Indigo", "Jules", "Hana", "Tegan", "Reese",
    "Devi", "Ezra", "Maya", "Hugo", "Cleo", "Theo", "Nori", "Olin",
    "Ruth", "Levi", "Jude", "Saoirse", "Cy", "Bo", "Ren", "Lou", "Quill",
    "Dax", "Rex", "Pax", "Asa", "Ozzy", "Wes", "Fin", "Cass",
    "Cobalt", "Pearl", "Sable", "Onyx", "Sasha", "Tao", "Mia", "Leo", "Zee",
    "Bram", "Kit", "Robin", "Charlie", "Andie", "Coda", "Rae", "Stevie",
    "Nikita", "Daisy", "Calla", "Florin", "Apex", "Glitch", "Misa", "Yara",
    "Mochi", "Quill", "Pebble", "Vesper", "Lark", "Juno",
]


def load_credentials():
    creds = {
        "host": os.environ.get("FTP_HOST"),
        "user": os.environ.get("FTP_USER"),
        "password": os.environ.get("FTP_PASS"),
        "port": int(os.environ.get("FTP_PORT", "21")),
    }
    if CREDS_FILE.exists():
        for line in CREDS_FILE.read_text().splitlines():
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
            elif k == "port":
                creds["port"] = int(v)
    missing = [k for k in ("host", "user", "password") if not creds[k]]
    if missing:
        print(f"✕ Missing FTP credentials: {missing}")
        print(f"  Set FTP_HOST, FTP_USER, FTP_PASS env vars, or create {CREDS_FILE}.")
        sys.exit(2)
    return creds


def make_name():
    base = random.choice(NAMES)
    r = random.random()
    if r < 0.18:
        return (base + str(random.randint(1, 99)))[:20]
    if r < 0.26:
        # all-caps initials
        return "".join(random.choices("ABCDEFGHJKLMNPQRSTUVWXYZ", k=random.randint(2, 4)))
    return base[:20]


def generate_level(level_id, count=100):
    cfg = LEVELS[level_id]
    now_ms = int(time.time() * 1000)
    span_ms = 14 * 24 * 3600 * 1000  # spread across the last 14 days
    entries = []
    used_submitted = set()
    for _ in range(count):
        # Truncated normal: floor at par, occasional outlier
        moves = max(cfg["par"], int(round(random.gauss(cfg["mean"], cfg["stdev"]))))
        # Cap at a sensible ceiling so scores stay realistic-looking
        moves = min(moves, cfg["par"] * 4)
        # Unique submitted timestamps (ms resolution but tie-prone with 100 entries)
        while True:
            submitted = now_ms - random.randint(0, span_ms)
            if submitted not in used_submitted:
                used_submitted.add(submitted)
                break
        entries.append({
            "name": make_name(),
            "moves": moves,
            "date": time.strftime("%Y-%m-%d", time.gmtime(submitted / 1000)),
            "submitted": submitted,
        })
    # Match the live sort: moves asc, then submitted asc.
    entries.sort(key=lambda e: (e["moves"], e["submitted"]))
    return entries


def connect(creds):
    try:
        ftp = ftplib.FTP_TLS()
        ftp.connect(creds["host"], creds["port"], timeout=30)
        ftp.login(creds["user"], creds["password"])
        ftp.prot_p()
        ftp.set_pasv(True)
        print(f"✓ Connected to {creds['host']} via FTPS")
        return ftp
    except (ftplib.error_perm, ftplib.error_temp, ssl.SSLError, OSError, socket.error) as e:
        print(f"⚠  FTPS failed ({type(e).__name__}: {e}); falling back to plain FTP.")
        ftp = ftplib.FTP()
        ftp.connect(creds["host"], creds["port"], timeout=30)
        ftp.login(creds["user"], creds["password"])
        ftp.set_pasv(True)
        return ftp


def main():
    parser = argparse.ArgumentParser(description="Seed the live leaderboard with random data")
    parser.add_argument("--per-level", type=int, default=100, help="Entries per level (default 100)")
    parser.add_argument("--seed", type=int, default=42, help="RNG seed for reproducibility")
    parser.add_argument("--dry-run", action="store_true", help="Print the payload, don't upload")
    args = parser.parse_args()

    random.seed(args.seed)
    data = {str(lv): generate_level(lv, args.per_level) for lv in LEVELS}
    payload = json.dumps(data, indent=2)
    print(f"Generated {sum(len(v) for v in data.values())} entries across {len(data)} levels  ({len(payload)} bytes)")
    print(f"Sample (Level 1, top 5):")
    for i, e in enumerate(data["1"][:5]):
        print(f"  #{i+1:3d}  {e['name']:20s}  moves={e['moves']:3d}  date={e['date']}")

    if args.dry_run:
        print("\n--dry-run: no upload")
        return

    creds = load_credentials()
    ftp = connect(creds)
    try:
        ftp.storbinary("STOR leaderboard-data.json", io.BytesIO(payload.encode("utf-8")))
        print(f"✓ Uploaded leaderboard-data.json ({len(payload)} bytes)")
    finally:
        try: ftp.quit()
        except Exception: pass


if __name__ == "__main__":
    main()
