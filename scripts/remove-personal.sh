#!/usr/bin/env bash
set -euo pipefail

if git remote get-url personal >/dev/null 2>&1; then
  git remote remove personal
  echo "removed remote 'personal'"
else
  echo "no remote 'personal' found, nothing to do"
fi
