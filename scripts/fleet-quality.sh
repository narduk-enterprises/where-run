#!/bin/bash
# Fleet quality scan — runs lint + typecheck on all local fleet apps in parallel.
#
# Usage:
#   pnpm quality:fleet                    # full scan, 6 parallel workers
#   pnpm quality:fleet -- --fix           # auto-fix lint issues first
#   pnpm quality:fleet -- --no-pull       # skip git pull
#   pnpm quality:fleet -- --jobs 10       # 10 parallel workers
#   pnpm quality:fleet -- --filter=NAME   # scan a single app

set -uo pipefail

FLEET_DIR="${FLEET_DIR:-$HOME/new-code/template-apps}"
RESULTS_DIR=$(mktemp -d)
LOG_DIR=$(mktemp -d)
PROGRESS_FILE="$LOG_DIR/_progress.log"
touch "$PROGRESS_FILE"

DO_FIX=false
DO_PULL=true
FILTER=""
MAX_JOBS=6

for arg in "$@"; do
  case $arg in
    --fix)        DO_FIX=true ;;
    --no-pull)    DO_PULL=false ;;
    --filter=*)   FILTER="${arg#*=}" ;;
    --jobs)       ;; # handled below
    --)           ;;
    *)
      # Handle --jobs N (two-arg form)
      if [ "${PREV_ARG:-}" = "--jobs" ]; then
        MAX_JOBS="$arg"
      fi
      ;;
  esac
  PREV_ARG="$arg"
done

# Also handle --jobs=N
for arg in "$@"; do
  case $arg in
    --jobs=*) MAX_JOBS="${arg#*=}" ;;
  esac
done

WORKER_PIDS=()

cleanup() {
  for pid in "${WORKER_PIDS[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      pkill -TERM -P "$pid" 2>/dev/null || true
      kill -TERM "$pid" 2>/dev/null || true
    fi
  done
  [ -n "${TAIL_PID:-}" ] && kill "$TAIL_PID" 2>/dev/null || true
  wait 2>/dev/null
  # Keep results dir for inspection, clean logs
  rm -rf "$LOG_DIR"
}

trap cleanup INT TERM
trap 'rm -rf "$LOG_DIR"' EXIT

# Auto-discover fleet apps
REPOS=()
for d in "$FLEET_DIR"/*/; do
  [ -d "$d" ] || continue
  repo=$(basename "$d")
  if [[ -n "$FILTER" && "$repo" != "$FILTER" ]]; then
    continue
  fi
  if [ -f "$d/apps/web/package.json" ] || [ -f "$d/package.json" ]; then
    REPOS+=("$repo")
  fi
done

if [ ${#REPOS[@]} -eq 0 ]; then
  echo "No fleet apps found in $FLEET_DIR"
  exit 1
fi

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Fleet Quality — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "║  Apps: ${#REPOS[@]}  |  Workers: $MAX_JOBS"
[ "$DO_FIX" = true ]  && echo "║  Auto-fix: ON"
[ "$DO_PULL" = false ] && echo "║  Git pull: SKIPPED"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

START_TIME=$(date +%s)

# Live progress
tail -f "$PROGRESS_FILE" &
TAIL_PID=$!

run_quality() {
  local repo=$1
  local result_file="$RESULTS_DIR/$repo.txt"
  local log_file="$LOG_DIR/$repo.log"
  local app_path="$FLEET_DIR/$repo"
  local app_start
  app_start=$(date +%s)

  progress() { echo "$1" >> "$PROGRESS_FILE"; }

  {
    if [ ! -d "$app_path" ]; then
      echo "FAIL | $repo | Directory missing" > "$result_file"
      progress "  ❌ $repo — directory missing"
      return
    fi

    cd "$app_path"
    progress "  ▶  $repo"

    # Smart pull
    if [ "$DO_PULL" = true ]; then
      if [[ -z $(git status --porcelain) ]]; then
        git pull --rebase origin main 2>/dev/null >/dev/null || true
      fi
    fi

    # Build eslint plugins
    if grep -q "build:plugins" package.json 2>/dev/null; then
      pnpm run build:plugins 2>&1 >/dev/null || true
    fi

    if [ ! -d "apps/web" ]; then
      echo "FAIL | $repo | No apps/web directory" > "$result_file"
      progress "  ❌ $repo — no apps/web ($(( $(date +%s) - app_start ))s)"
      return
    fi

    cd apps/web

    # Auto-fix if requested
    if [ "$DO_FIX" = true ]; then
      pnpm run lint --fix 2>&1 >/dev/null || true
    fi

    # Run lint and typecheck IN PARALLEL within this worker
    local lint_file="$LOG_DIR/${repo}_lint.tmp"
    local tc_file="$LOG_DIR/${repo}_tc.tmp"

    pnpm run lint > "$lint_file" 2>&1 &
    local lint_pid=$!
    pnpm run typecheck > "$tc_file" 2>&1 &
    local tc_pid=$!

    wait "$lint_pid" 2>/dev/null; local lint_exit=$?
    wait "$tc_pid" 2>/dev/null; local tc_exit=$?

    local LINT_OUT
    LINT_OUT=$(cat "$lint_file" 2>/dev/null || echo "")
    local TC_OUT
    TC_OUT=$(cat "$tc_file" 2>/dev/null || echo "")
    rm -f "$lint_file" "$tc_file"

    local COMBINED="$LINT_OUT"$'\n'"$TC_OUT"

    # Parse issues
    local LINT_ISSUES
    LINT_ISSUES=$(echo "$COMBINED" | grep -E '[0-9]+:[0-9]+\s+(warning|error)\s' | grep -vE 'node_modules|ELIFECYCLE|Command failed' || true)
    local TS_ERRORS
    TS_ERRORS=$(echo "$COMBINED" | grep -E 'TS[0-9]+:' | grep -v 'node_modules' || true)
    local DETAILS
    DETAILS=$(printf '%s\n%s' "$LINT_ISSUES" "$TS_ERRORS" | grep -v '^$' | head -n 8)

    local WARN_COUNT=0 ERR_COUNT=0 TS_COUNT=0
    if [ -n "$LINT_ISSUES" ]; then
      WARN_COUNT=$(echo "$LINT_ISSUES" | grep -c 'warning' 2>/dev/null | tr -d '[:space:]')
      ERR_COUNT=$(echo "$LINT_ISSUES" | grep -c 'error' 2>/dev/null | tr -d '[:space:]')
    fi
    if [ -n "$TS_ERRORS" ]; then
      TS_COUNT=$(echo "$TS_ERRORS" | grep -c 'TS[0-9]' 2>/dev/null | tr -d '[:space:]')
    fi
    local TOTAL_ISSUES=$((WARN_COUNT + ERR_COUNT + TS_COUNT))

    local duration=$(( $(date +%s) - app_start ))

    if [ "$TOTAL_ISSUES" -gt 0 ]; then
      if [ "$ERR_COUNT" -gt 0 ] || [ "$TS_COUNT" -gt 0 ]; then
        echo "FAIL | $repo | ${ERR_COUNT} errors, ${TS_COUNT} TS errors, ${WARN_COUNT} warnings" > "$result_file"
      else
        echo "FAIL | $repo | $WARN_COUNT warnings" > "$result_file"
      fi
      echo "$DETAILS" >> "$result_file"
      progress "  ❌ $repo — ${TOTAL_ISSUES} issues (${duration}s)"
    elif [ $lint_exit -ne 0 ] || [ $tc_exit -ne 0 ]; then
      echo "FAIL | $repo | Exit code lint=$lint_exit tc=$tc_exit" > "$result_file"
      progress "  ❌ $repo — exit lint=$lint_exit tc=$tc_exit (${duration}s)"
    else
      echo "PASS | $repo | 0" > "$result_file"
      progress "  ✅ $repo (${duration}s)"
    fi

  } > "$log_file" 2>&1
}

# Launch workers with throttling
RUNNING=0

for repo in "${REPOS[@]}"; do
  run_quality "$repo" &
  WORKER_PIDS+=($!)
  RUNNING=$((RUNNING + 1))

  while [ "$RUNNING" -ge "$MAX_JOBS" ]; do
    wait -n 2>/dev/null || true
    RUNNING=$((RUNNING - 1))
  done
done

# Wait for all remaining workers
for pid in "${WORKER_PIDS[@]}"; do
  wait "$pid" 2>/dev/null || true
done

# Stop progress tailer
sleep 0.3
kill "$TAIL_PID" 2>/dev/null || true
wait "$TAIL_PID" 2>/dev/null || true

END_TIME=$(date +%s)
TOTAL_DURATION=$((END_TIME - START_TIME))

# Summary table
echo ""
echo "════════════════════════════════════════════════════════════════════════"
echo "  FLEET QUALITY RESULTS — ${TOTAL_DURATION}s total (${MAX_JOBS}x parallel)"
echo "════════════════════════════════════════════════════════════════════════"
PASS=0; FAIL=0
for repo in "${REPOS[@]}"; do
  file="$RESULTS_DIR/$repo.txt"
  if [ -f "$file" ]; then
    line=$(head -n 1 "$file")
    status_part="${line#*| $repo | }"
    if [[ "$line" == PASS* ]]; then
      status_icon="✅"
      PASS=$((PASS + 1))
    else
      status_icon="❌"
      FAIL=$((FAIL + 1))
    fi
    printf "  %s %-35s | %s\n" "$status_icon" "$repo" "$status_part"
  else
    printf "  ❌ %-35s | ERROR: No result\n" "$repo"
    FAIL=$((FAIL + 1))
  fi
done
echo "════════════════════════════════════════════════════════════════════════"
echo ""
echo "  ✅ Passed: $PASS / ${#REPOS[@]}"
echo "  ❌ Failed: $FAIL / ${#REPOS[@]}"

if [ $FAIL -gt 0 ]; then
  echo ""
  echo "  Failure details:"
  for repo in "${REPOS[@]}"; do
    file="$RESULTS_DIR/$repo.txt"
    if grep -q "^FAIL" "$file" 2>/dev/null; then
      echo ""
      echo "  ━━━ $repo ━━━"
      tail -n +2 "$file" | sed 's/^/  /'
    fi
  done
  echo ""
  rm -rf "$RESULTS_DIR"
  exit 1
fi

rm -rf "$RESULTS_DIR"
