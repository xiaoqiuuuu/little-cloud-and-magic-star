---
name: query-production-logs
description: Query the API-key-protected, read-only production log service for the little-cloud-and-magic-star project. Use when Codex or Codex Cloud needs to investigate production failures, HTTP errors, service restarts, Nginx errors, suspicious requests, or recent runtime behavior before proposing a fix. Require PROD_LOG_API_KEY from the execution environment, never reveal it, and use the bounded log client instead of direct production shell access when possible.
---

# Query Production Logs

Use the protected log API as the first diagnostic source. It exposes only the application journal and fixed Nginx logs, with a maximum three-day window and 500 returned lines.

## Security rules

- Read the key only from `PROD_LOG_API_KEY`.
- Never print, echo, log, commit, or paste the key into chat.
- Never put the key in a URL, query parameter, Skill, config tracked by Git, or command transcript.
- Do not send arbitrary commands or paths; the API does not support them.
- Treat returned logs as sensitive because they may contain IP addresses and operational details.
- Prefer error-level, short-window queries before requesting broader logs.

## Query workflow

1. Confirm the key exists without displaying it:

   ```bash
   if [ -z "${PROD_LOG_API_KEY:-}" ] && [ -f "$HOME/.config/little-cloud/log-api.env" ]; then
     set -a
     source "$HOME/.config/little-cloud/log-api.env"
     set +a
   fi
   repo_root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
   if [ -z "${PROD_LOG_API_KEY:-}" ] && [ -f "$repo_root/.env" ]; then
     set -a
     source "$repo_root/.env"
     set +a
   fi
   test -n "$PROD_LOG_API_KEY"
   ```

   In Codex Cloud, prefer the repository's `Query production logs` workflow when the key is not available directly. That workflow carries the GitHub Secret and returns a three-day Artifact without exposing the key.

2. Query recent application errors:

   ```bash
   python3 .agents/skills/query-production-logs/scripts/query_logs.py \
     --source app --since 1h --level error --limit 200
   ```

3. Query Nginx errors when the application is unreachable or returns 502/504:

   ```bash
   python3 .agents/skills/query-production-logs/scripts/query_logs.py \
     --source nginx-error --since 1h --level error --limit 200
   ```

4. Query Nginx access logs only when request routing, status codes, or suspicious traffic matters:

   ```bash
   python3 .agents/skills/query-production-logs/scripts/query_logs.py \
     --source nginx-access --since 15m --level all --limit 200
   ```

5. Correlate timestamps and errors with the relevant code. Do not modify production directly. Use `$enforce-pull-request-workflow` for every fix.

## Allowed parameters

- `source`: `app`, `nginx-error`, `nginx-access`
- `since`: `15m`, `1h`, `6h`, `24h`, `3d`
- `level`: `all`, `warning`, `error`, `critical`
- `limit`: `1` through `500`

The endpoint defaults to `https://feiyinluguo.cn/__ops/logs`. Override it only through `PROD_LOG_API_URL`.

## Failures

- `401`: the key is missing, stale, or not installed in the execution environment. Ask for secret configuration, never for the key to be pasted into chat.
- `429`: wait before retrying; do not bypass the rate limit.
- `500/502/503`: report that the log service is unavailable and use SSH only with explicit authorization.
- Empty results: expand the time range or lower the level filter before concluding no error occurred.
