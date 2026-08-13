#!/usr/bin/env bash
set -euo pipefail

PERSONAL_REPO_URL="https://github.com/mahfuz-alam0/pos-v2.git"

current_url=$(git remote get-url personal 2>/dev/null || true)

if [ -z "$current_url" ]; then
  echo "no remote 'personal' found, nothing to do"
elif [ "$current_url" != "$PERSONAL_REPO_URL" ]; then
  echo "remote 'personal' points to '$current_url', not '$PERSONAL_REPO_URL' — refusing to remove"
  exit 1
else
  git remote remove personal
  echo "removed remote 'personal' ($PERSONAL_REPO_URL)"
fi
