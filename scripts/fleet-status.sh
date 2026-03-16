#!/bin/bash
# Fleet status scan — checks the git status of all local fleet app clones
# Usage: pnpm run status:fleet [--filter=NAME]

FLEET_DIR="${FLEET_DIR:-/Users/narduk/new-code/template-apps}"

# Flags
FILTER=""

for arg in "$@"; do
  case $arg in
    --filter=*) FILTER="${arg#*=}" ;;
  esac
done

# Auto-discover fleet apps
REPOS=()
for d in "$FLEET_DIR"/*/; do
  [ -d "$d" ] || continue
  repo=$(basename "$d")
  if [[ -n "$FILTER" && "$repo" != "$FILTER" ]]; then
    continue
  fi

  if [ -d "$d/.git" ]; then
    REPOS+=("$repo")
  fi
done

if [ ${#REPOS[@]} -eq 0 ]; then
  echo "No fleet apps found in $FLEET_DIR"
  exit 1
fi

echo "🔍 Checking git status for ${#REPOS[@]} fleet apps..."
echo "════════════════════════════════════════════════════════════════════════"

DIRTY_COUNT=0
CLEAN_COUNT=0

# Summary table
for repo in "${REPOS[@]}"; do
  app_path="$FLEET_DIR/$repo"

  cd "$app_path" || continue

  if [[ -n $(git status --porcelain) ]]; then
    printf "  🔴 %-35s | Dirty\n" "$repo"
    DIRTY_COUNT=$((DIRTY_COUNT + 1))
  else
    printf "  🟢 %-35s | Clean\n" "$repo"
    CLEAN_COUNT=$((CLEAN_COUNT + 1))
  fi
done

echo "════════════════════════════════════════════════════════════════════════"
echo ""
echo "🟢 Clean: $CLEAN_COUNT"
echo "🔴 Dirty: $DIRTY_COUNT"

if [ $DIRTY_COUNT -gt 0 ]; then
  echo ""
  echo "Run 'git status' or 'git diff' in the dirty directories above to see changes."
  exit 1
fi
