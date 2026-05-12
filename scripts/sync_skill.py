#!/usr/bin/env python3
"""
Sync the EasyPay SKILL.md mirror on the landing site.

Fetches SKILL.md from upstream (EasyPay-Labs/easypay-skill), normalises EOL/BOM,
writes the mirror at .well-known/agent-skills/easypay/SKILL.md, recomputes the
sha256 digest and updates .well-known/agent-skills/index.json.

Runnable by anyone with Python 3.10+; no third-party deps.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
import urllib.request
from pathlib import Path

DEFAULT_SOURCE = "https://raw.githubusercontent.com/EasyPay-Labs/easypay-skill/main/SKILL.md"
REPO_ROOT = Path(__file__).resolve().parent.parent
MIRROR_PATH = REPO_ROOT / ".well-known" / "agent-skills" / "easypay" / "SKILL.md"
INDEX_PATH = REPO_ROOT / ".well-known" / "agent-skills" / "index.json"


def fetch(url: str) -> bytes:
    with urllib.request.urlopen(url, timeout=30) as resp:
        if resp.status != 200:
            print(f"ERROR: GET {url} returned HTTP {resp.status}", file=sys.stderr)
            sys.exit(1)
        return resp.read()


def normalise(body: bytes) -> bytes:
    if body.startswith(b"\xef\xbb\xbf"):
        body = body[3:]
    body = body.replace(b"\r\n", b"\n").replace(b"\r", b"\n")
    return body


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-url", default=DEFAULT_SOURCE)
    args = parser.parse_args()

    print(f"Fetching {args.source_url}")
    raw = fetch(args.source_url)
    normalised = normalise(raw)
    digest_hex = hashlib.sha256(normalised).hexdigest()
    digest = f"sha256:{digest_hex}"

    MIRROR_PATH.parent.mkdir(parents=True, exist_ok=True)
    prev_bytes = MIRROR_PATH.read_bytes() if MIRROR_PATH.exists() else None
    changed = prev_bytes != normalised
    MIRROR_PATH.write_bytes(normalised)
    print(f"  Mirror: {MIRROR_PATH.relative_to(REPO_ROOT)} "
          f"({len(normalised)} bytes, {'updated' if changed else 'unchanged'})")
    print(f"  Digest: {digest}")

    if not INDEX_PATH.exists():
        print(f"ERROR: {INDEX_PATH.relative_to(REPO_ROOT)} not found — create the index first",
              file=sys.stderr)
        return 1

    with INDEX_PATH.open("r", encoding="utf-8") as f:
        index = json.load(f)

    skills = index.get("skills") or []
    target = next((s for s in skills if s.get("name") == "easypay"), None)
    if target is None:
        print("ERROR: no skills entry with name='easypay' in index.json", file=sys.stderr)
        return 1

    old_digest = target.get("digest")
    target["digest"] = digest

    new_text = json.dumps(index, indent=2, ensure_ascii=False) + "\n"
    INDEX_PATH.write_text(new_text, encoding="utf-8", newline="\n")
    if old_digest != digest:
        print(f"  Index:  digest {old_digest} -> {digest}")
    else:
        print(f"  Index:  digest unchanged")

    return 0


if __name__ == "__main__":
    sys.exit(main())
