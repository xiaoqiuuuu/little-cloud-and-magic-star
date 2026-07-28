#!/usr/bin/env bash

set -euo pipefail

DEFAULT_SOURCE_DB="/www/wwwroot/backend/db.sqlite"
DEFAULT_TARGET_DB="/www/wwwroot/little-cloud-and-magic-star/backend/quiz.db"

source_db="$DEFAULT_SOURCE_DB"
target_db="$DEFAULT_TARGET_DB"
apply_changes=false

usage() {
  cat <<'EOF'
Usage:
  sync_xcdh_messages.sh [--source PATH] [--target PATH] [--apply]

Options:
  --source PATH  Legacy SQLite database.
  --target PATH  Current project SQLite database.
  --apply        Back up the target and import pending rows.
  -h, --help     Show this help.

Without --apply, the script only reports how many rows would be imported.
EOF
}

die() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

while (($# > 0)); do
  case "$1" in
    --source)
      (($# >= 2)) || die "--source requires a path"
      source_db=$2
      shift 2
      ;;
    --target)
      (($# >= 2)) || die "--target requires a path"
      target_db=$2
      shift 2
      ;;
    --apply)
      apply_changes=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "unknown argument: $1"
      ;;
  esac
done

command -v sqlite3 >/dev/null 2>&1 || die "sqlite3 is not installed"
[[ -f "$source_db" ]] || die "source database not found: $source_db"
[[ -r "$source_db" ]] || die "source database is not readable: $source_db"
[[ -f "$target_db" ]] || die "target database not found: $target_db"
[[ -r "$target_db" ]] || die "target database is not readable: $target_db"

if [[ "$apply_changes" == true ]]; then
  [[ -w "$target_db" ]] || die "target database is not writable: $target_db"
  [[ -w "$(dirname "$target_db")" ]] || die "target directory is not writable: $(dirname "$target_db")"
fi

require_table() {
  local database=$1
  local label=$2
  local table_count

  table_count=$(sqlite3 -batch -noheader "$database" \
    "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'xcdh_messages';")
  [[ "$table_count" == "1" ]] || die "$label database has no xcdh_messages table"
}

require_columns() {
  local database=$1
  local label=$2
  shift 2

  local column
  local column_count
  for column in "$@"; do
    column_count=$(sqlite3 -batch -noheader "$database" \
      "SELECT COUNT(*) FROM pragma_table_info('xcdh_messages') WHERE name = '$column';")
    [[ "$column_count" == "1" ]] || die "$label xcdh_messages is missing column: $column"
  done
}

require_table "$source_db" "source"
require_table "$target_db" "target"
require_columns "$source_db" "source" username content x y
require_columns "$target_db" "target" username content x y click_count created_at

sql_quote() {
  printf "%s" "${1//\'/\'\'}"
}

source_sql=$(sql_quote "$source_db")

read_counts() {
  sqlite3 -batch -noheader -separator '|' "$target_db" <<SQL
.bail on
.timeout 10000
ATTACH DATABASE '$source_sql' AS legacy;
SELECT
  (SELECT COUNT(*) FROM legacy.xcdh_messages),
  (SELECT COUNT(*) FROM main.xcdh_messages),
  (
    SELECT COUNT(*)
    FROM legacy.xcdh_messages AS legacy_message
    WHERE NOT EXISTS (
      SELECT 1
      FROM main.xcdh_messages AS current_message
      WHERE current_message.username IS legacy_message.username
        AND current_message.content IS legacy_message.content
        AND current_message.x IS legacy_message.x
        AND current_message.y IS legacy_message.y
    )
  );
DETACH DATABASE legacy;
SQL
}

counts=$(read_counts)
IFS='|' read -r source_count target_count pending_count <<<"$counts"

printf 'Source: %s\n' "$source_db"
printf 'Target: %s\n' "$target_db"
printf 'Source rows: %s\n' "$source_count"
printf 'Target rows before sync: %s\n' "$target_count"
printf 'Pending rows: %s\n' "$pending_count"

if [[ "$apply_changes" != true ]]; then
  printf 'Dry run only. Re-run with --apply to create a backup and import these rows.\n'
  exit 0
fi

if [[ "$pending_count" == "0" ]]; then
  printf 'Nothing to import. The target database was not changed.\n'
  exit 0
fi

timestamp=$(date '+%Y%m%d_%H%M%S')
backup_db="${target_db}.before_xcdh_sync_${timestamp}_$$.bak"
backup_sql=$(sql_quote "$backup_db")

sqlite3 -batch "$target_db" <<SQL
.bail on
.timeout 10000
.backup '$backup_sql'
SQL

[[ -s "$backup_db" ]] || die "backup was not created: $backup_db"

inserted_count=$(sqlite3 -batch -noheader "$target_db" <<SQL
.bail on
.timeout 10000
ATTACH DATABASE '$source_sql' AS legacy;
BEGIN IMMEDIATE;
INSERT INTO main.xcdh_messages (
  username,
  content,
  x,
  y,
  click_count,
  created_at
)
SELECT
  legacy_message.username,
  legacy_message.content,
  legacy_message.x,
  legacy_message.y,
  0,
  CURRENT_TIMESTAMP
FROM legacy.xcdh_messages AS legacy_message
WHERE NOT EXISTS (
  SELECT 1
  FROM main.xcdh_messages AS current_message
  WHERE current_message.username IS legacy_message.username
    AND current_message.content IS legacy_message.content
    AND current_message.x IS legacy_message.x
    AND current_message.y IS legacy_message.y
);
SELECT changes();
COMMIT;
DETACH DATABASE legacy;
SQL
)

target_count_after=$(sqlite3 -batch -noheader "$target_db" \
  "SELECT COUNT(*) FROM xcdh_messages;")

printf 'Inserted rows: %s\n' "$inserted_count"
printf 'Target rows after sync: %s\n' "$target_count_after"
printf 'Backup: %s\n' "$backup_db"
