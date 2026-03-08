#!/usr/bin/env python3
"""Collect official RF legal publications for a given publish date range.

Source: publication.pravo.gov.ru API (official publication).
Writes JSONL records to an output file.

Usage:
  laws_collect.py --from YYYY-MM-DD --to YYYY-MM-DD --out PATH

Notes:
- Date range is inclusive on API side; we additionally filter by [from, to].
- Network can be flaky; script uses retries/timeouts.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

API_BASE = "http://publication.pravo.gov.ru/api"

THEMES: dict[str, re.Pattern] = {
    "ИТ/интернет/VPN": re.compile(
        r"\bVPN\b|ВПН|интернет|связ|роскомнадзор|ограничен\w*\s+доступ|блокиров|" 
        r"критическ\w*\s+информационн\w*\s+инфраструктур|\bКИИ\b|персональн\w*\s+данн",
        re.I,
    ),
    "Крипта/майнинг": re.compile(r"крипто|цифров(ая|ой)\s+валют|майнинг|блокчейн", re.I),
    "Энергетика": re.compile(r"энергет|электроэнерг|теплоснаб|газ|нефть|уголь|тариф", re.I),
    "Иркутская область": re.compile(r"Иркутск|Иркутск(ая|ой)\s+област|Приангар", re.I),
}


def http_get_json(url: str, timeout: int = 30, retries: int = 3, backoff: float = 0.6):
    last_err = None
    for i in range(retries):
        try:
            with urllib.request.urlopen(url, timeout=timeout) as r:
                data = r.read()
            return json.loads(data)
        except Exception as e:
            last_err = e
            time.sleep(backoff * (2**i))
    raise last_err  # type: ignore


def iso_date(s: str) -> dt.date:
    return dt.date.fromisoformat(s)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--from", dest="date_from", required=True)
    ap.add_argument("--to", dest="date_to", required=True)
    ap.add_argument("--out", dest="out_path", required=True)
    ap.add_argument("--max-pages", type=int, default=5)
    ap.add_argument("--items-per-page", type=int, default=100)
    args = ap.parse_args()

    d_from = iso_date(args.date_from)
    d_to = iso_date(args.date_to)

    os.makedirs(os.path.dirname(args.out_path) or ".", exist_ok=True)

    seen_eo: set[str] = set()
    # if file exists, avoid duplicates
    if os.path.exists(args.out_path):
        try:
            with open(args.out_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        obj = json.loads(line)
                        eo = obj.get("eoNumber")
                        if eo:
                            seen_eo.add(eo)
                    except Exception:
                        continue
        except Exception:
            pass

    new_items = 0

    # Strategy: query by broad blocks to avoid keyword-only bias, then theme-filter locally.
    blocks = ["president", "assembly", "government", "federal_authorities", "subjects"]

    for block in blocks:
        params = {
            "Block": block,
            "PublishDateFrom": d_from.isoformat(),
            "PublishDateTo": d_to.isoformat(),
            "itemsPerPage": str(args.items_per_page),
            "currentPage": "1",
        }
        url = f"{API_BASE}/Documents?{urllib.parse.urlencode(params)}"
        try:
            first = http_get_json(url, timeout=40)
        except Exception:
            continue

        pages_total = int(first.get("pagesTotalCount", 1) or 1)

        def process_page(obj: dict):
            nonlocal new_items
            for it in obj.get("items", []) or []:
                eo = it.get("eoNumber")
                pd = (it.get("publishDateShort") or "")[:10]
                if not eo or not pd:
                    continue
                try:
                    d = iso_date(pd)
                except Exception:
                    continue
                if d < d_from or d > d_to:
                    continue
                if eo in seen_eo:
                    continue

                # Enrich
                doc_url = f"{API_BASE}/Document?{urllib.parse.urlencode({'eoNumber': eo})}"
                try:
                    doc = http_get_json(doc_url, timeout=40)
                except Exception:
                    doc = {}

                title = (doc.get("complexName") or it.get("complexName") or doc.get("name") or it.get("name") or "").strip()
                if not title:
                    continue

                matched = [name for name, rx in THEMES.items() if rx.search(title)]
                if not matched:
                    continue

                record = {
                    "publishDate": pd,
                    "eoNumber": eo,
                    "title": title.replace("\n", " ").strip(),
                    "block": block,
                    "themes": matched,
                    "url": f"http://publication.pravo.gov.ru/Document/View/{eo}",
                }

                with open(args.out_path, "a", encoding="utf-8") as f:
                    f.write(json.dumps(record, ensure_ascii=False) + "\n")

                seen_eo.add(eo)
                new_items += 1

        process_page(first)

        for p in range(2, min(pages_total, args.max_pages) + 1):
            params["currentPage"] = str(p)
            urlp = f"{API_BASE}/Documents?{urllib.parse.urlencode(params)}"
            try:
                obj = http_get_json(urlp, timeout=40)
            except Exception:
                break
            process_page(obj)

    print(json.dumps({"ok": True, "new": new_items, "from": args.date_from, "to": args.date_to, "out": args.out_path}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
