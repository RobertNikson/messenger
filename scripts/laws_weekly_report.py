#!/usr/bin/env python3
"""Create a concise weekly report from collected JSONL records.

Usage:
  laws_weekly_report.py --in PATH --from YYYY-MM-DD --to YYYY-MM-DD

Outputs plain text to stdout.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
from collections import defaultdict


def iso_date(s: str) -> dt.date:
    return dt.date.fromisoformat(s)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="in_path", required=True)
    ap.add_argument("--from", dest="date_from", required=True)
    ap.add_argument("--to", dest="date_to", required=True)
    args = ap.parse_args()

    d_from = iso_date(args.date_from)
    d_to = iso_date(args.date_to)

    by_theme = defaultdict(list)
    seen = set()

    with open(args.in_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                r = json.loads(line)
            except Exception:
                continue
            pd = r.get("publishDate")
            eo = r.get("eoNumber")
            if not pd or not eo:
                continue
            try:
                d = iso_date(pd)
            except Exception:
                continue
            if d < d_from or d > d_to:
                continue
            if eo in seen:
                continue
            seen.add(eo)
            title = (r.get("title") or "").strip()
            url = (r.get("url") or "").strip()
            themes = r.get("themes") or []
            if not themes:
                themes = ["прочее"]
            for t in themes:
                by_theme[t].append((pd, title, url))

    # sort
    for t in list(by_theme.keys()):
        by_theme[t].sort(key=lambda x: x[0], reverse=True)

    total = sum(len(v) for v in by_theme.values())
    if total == 0:
        print(f"За период {d_from.isoformat()} — {d_to.isoformat()} изменений по заданным темам не нашла (по официальным публикациям).")
        return 0

    print(f"Официальная сводка публикаций (publication.pravo.gov.ru) за {d_from.isoformat()} — {d_to.isoformat()}:")

    for theme in sorted(by_theme.keys()):
        items = by_theme[theme]
        if not items:
            continue
        print(f"\n{theme}:")
        for pd, title, url in items[:25]:
            # 'без воды' — только документ + короткое пояснение (по названию)
            # Пока без семантического пересказа: многие документы уже содержат смысл в заголовке.
            print(f"- {title} — {url}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
