#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

REPO_PATH=""
DATA_PATH="$PROJECT_ROOT/data/commit-days.json"
DRY_RUN=false

usage() {
  cat <<EOF
Usage: $(basename "$0") --repo <path> [--data <path>] [--dry-run]

Options:
  --repo <path>    Path to the Git repository where commits will be created (required)
  --data <path>    Path to the JSON file (default: data/commit-days.json)
  --dry-run        Show what would be done without executing commits
  -h, --help       Show this help message
EOF
  exit 1
}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      REPO_PATH="$2"
      shift 2
      ;;
    --data)
      DATA_PATH="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -h|--help)
      usage
      ;;
    *)
      echo "Error: unknown argument '$1'"
      usage
      ;;
  esac
done

# Validate required params
if [[ -z "$REPO_PATH" ]]; then
  echo "Error: --repo is required"
  usage
fi

# Validate dependencies
for cmd in jq git; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "Error: '$cmd' is required but not installed."
    exit 1
  fi
done

# Validate repo path
if [[ ! -d "$REPO_PATH/.git" ]]; then
  echo "Error: '$REPO_PATH' is not a valid Git repository"
  exit 1
fi

# Validate JSON file
if [[ ! -f "$DATA_PATH" ]]; then
  echo "Error: JSON file not found at '$DATA_PATH'"
  exit 1
fi

TOTAL_DAYS=$(jq 'length' "$DATA_PATH")
TOTAL_COMMITS=$(jq '[.[].quantity] | add' "$DATA_PATH")

echo "=== Backfill Commits ==="
echo "Repo:    $REPO_PATH"
echo "Data:    $DATA_PATH"
echo "Days:    $TOTAL_DAYS"
echo "Commits: $TOTAL_COMMITS"
echo "Dry run: $DRY_RUN"
echo "========================"

cd "$REPO_PATH"

CONTRIB_FILE="contributions.txt"
COMMITS_DONE=0

for i in $(seq 0 $((TOTAL_DAYS - 1))); do
  DATE=$(jq -r ".[$i].date" "$DATA_PATH")
  QUANTITY=$(jq -r ".[$i].quantity" "$DATA_PATH")
  DAY_NUM=$((i + 1))

  if $DRY_RUN; then
    echo "[$DAY_NUM/$TOTAL_DAYS] $DATE — $QUANTITY commits"
    COMMITS_DONE=$((COMMITS_DONE + QUANTITY))
    continue
  fi

  for j in $(seq 1 "$QUANTITY"); do
    MINUTE=$(printf "%02d" $(( (j - 1) % 60 )))
    HOUR=$(( 9 + (j - 1) / 60 ))
    COMMIT_DATE="${DATE}T$(printf "%02d" $HOUR):${MINUTE}:00"

    if [[ -f "$CONTRIB_FILE" ]] && [[ -s "$CONTRIB_FILE" ]] && (( j % 2 == 0 )); then
      sed -i '' '$d' "$CONTRIB_FILE" 2>/dev/null || sed -i '$d' "$CONTRIB_FILE"
    else
      echo "$COMMIT_DATE" >> "$CONTRIB_FILE"
    fi

    git add "$CONTRIB_FILE"
    GIT_AUTHOR_DATE="$COMMIT_DATE" GIT_COMMITTER_DATE="$COMMIT_DATE" \
      git commit -m "chore: contribution $DATE" --quiet

    COMMITS_DONE=$((COMMITS_DONE + 1))
  done

  echo "[$DAY_NUM/$TOTAL_DAYS] $DATE — $QUANTITY commits (total: $COMMITS_DONE/$TOTAL_COMMITS)"
done

echo ""
echo "Done! $COMMITS_DONE commits created."

if ! $DRY_RUN; then
  echo "Pushing to remote..."
  git push
  echo "Push complete."
fi
