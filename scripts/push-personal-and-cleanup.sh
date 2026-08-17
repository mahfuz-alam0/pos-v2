#!/usr/bin/env bash
set -euo pipefail

# Edit this before running:
PERSONAL_REPO_URL="https://github.com/mahfuz-alam0/pos-v2.git"

branch=$(git rev-parse --abbrev-ref HEAD)

if git remote get-url personal >/dev/null 2>&1; then
  echo "remote 'personal' already exists, using it"
else
  git remote add personal "$PERSONAL_REPO_URL"
  echo "added remote 'personal' -> $PERSONAL_REPO_URL"
fi

git push personal "$branch"

git remote remove personal
echo "removed remote 'personal' ($PERSONAL_REPO_URL)"
