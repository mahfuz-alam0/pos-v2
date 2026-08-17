#!/usr/bin/env bash
# Push the current branch to a personal GitHub repo via a temporary remote,
# then remove that remote so it never lingers in `git remote -v`.
#
# Usage:
#   ./scripts/push-to-personal.sh [--force|-f] [repo-url] [branch]
#
# Defaults:
#   repo-url -> https://github.com/mahfuz-alam0/pos-v2 (private personal repo)
#   branch   -> current branch

set -euo pipefail

FORCE=""
ARGS=()
for arg in "$@"; do
  case "$arg" in
    --force|-f)
      FORCE="--force"
      ;;
    *)
      ARGS+=("$arg")
      ;;
  esac
done

REPO_URL="${ARGS[0]:-https://github.com/mahfuz-alam0/pos-v2}"
BRANCH="${ARGS[1]:-$(git rev-parse --abbrev-ref HEAD)}"
REMOTE_NAME="personal-temp"

cleanup() {
  if git remote get-url "$REMOTE_NAME" >/dev/null 2>&1; then
    git remote remove "$REMOTE_NAME"
    echo "Removed temporary remote '$REMOTE_NAME'."
  fi
}
trap cleanup EXIT

# Start clean in case a previous run left the remote behind.
if git remote get-url "$REMOTE_NAME" >/dev/null 2>&1; then
  git remote remove "$REMOTE_NAME"
fi

git remote add "$REMOTE_NAME" "$REPO_URL"

echo "Pushing branch '$BRANCH' to $REPO_URL ..."
git push $FORCE "$REMOTE_NAME" "$BRANCH"

echo "Push complete."
echo "Remotes after cleanup:"
git remote -v
