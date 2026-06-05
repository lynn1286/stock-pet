#!/usr/bin/env python3
"""根据 Release 产物生成 Tauri updater 所需的 latest.json。"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[2]
BUNDLES = ROOT / "bundles"
CONF = ROOT / "src-tauri" / "tauri.conf.json"


def release_url(repo: str, tag: str, filename: str) -> str:
    return f"https://github.com/{repo}/releases/download/{tag}/{quote(filename)}"


def add_platform(
    platforms: dict,
    key: str,
    archive: Path,
    repo: str,
    tag: str,
) -> None:
    sig = Path(f"{archive}.sig")
    if not sig.is_file():
        return
    platforms[key] = {
        "url": release_url(repo, tag, archive.name),
        "signature": sig.read_text(encoding="utf-8").strip(),
    }


def main() -> int:
    conf = json.loads(CONF.read_text(encoding="utf-8"))
    version = conf["version"]
    tag = f"v{version}"
    repo = os.environ.get("GITHUB_REPOSITORY", "lynn1286/stock-pet")

    platforms: dict[str, dict[str, str]] = {}

    for archive in BUNDLES.rglob("aarch64-apple-darwin-*.app.tar.gz"):
        add_platform(platforms, "darwin-aarch64", archive, repo, tag)
        break

    for archive in BUNDLES.rglob("x86_64-apple-darwin-*.app.tar.gz"):
        add_platform(platforms, "darwin-x86_64", archive, repo, tag)
        break

    for archive in BUNDLES.rglob("*-setup.exe"):
        if archive.name.endswith(".sig"):
            continue
        add_platform(platforms, "windows-x86_64", archive, repo, tag)
        break

    if not platforms:
        print("No updater signatures found, skip latest.json")
        return 0

    payload = {
        "version": version,
        "notes": f"会盯盘的桌宠 v{version}",
        "pub_date": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "platforms": platforms,
    }
    out = BUNDLES / "latest.json"
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {out} with platforms: {', '.join(platforms)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
