#!/usr/bin/env python3
"""Query the protected production log API without exposing its API key."""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request


DEFAULT_URL = "https://feiyinluguo.cn/__ops/logs"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--source", choices=("app", "nginx-error", "nginx-access"), default="app"
    )
    parser.add_argument("--since", choices=("15m", "1h", "6h", "24h", "3d"), default="1h")
    parser.add_argument(
        "--level", choices=("all", "warning", "error", "critical"), default="error"
    )
    parser.add_argument("--limit", type=int, default=200)
    parser.add_argument("--json", action="store_true", help="print the complete JSON response")
    args = parser.parse_args()

    if not 1 <= args.limit <= 500:
        raise SystemExit("--limit must be between 1 and 500")

    api_key = os.getenv("PROD_LOG_API_KEY")
    if not api_key:
        raise SystemExit("PROD_LOG_API_KEY is not configured in this execution environment")

    base_url = os.getenv("PROD_LOG_API_URL", DEFAULT_URL)
    query = urllib.parse.urlencode(
        {
            "source": args.source,
            "since": args.since,
            "level": args.level,
            "limit": args.limit,
        }
    )
    request = urllib.request.Request(
        f"{base_url}?{query}",
        headers={"X-Log-API-Key": api_key, "Accept": "application/json"},
    )

    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            payload = json.load(response)
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")
        raise SystemExit(f"Log API returned HTTP {exc.code}: {detail}") from None
    except urllib.error.URLError as exc:
        raise SystemExit(f"Log API request failed: {exc.reason}") from None

    if args.json:
        json.dump(payload, sys.stdout, ensure_ascii=False, indent=2)
        print()
        return

    print(
        f"source={payload['source']} since={payload['since']} level={payload['level']} "
        f"count={payload['count']} truncated={payload['truncated']}"
    )
    for line in payload["lines"]:
        print(line)


if __name__ == "__main__":
    main()
