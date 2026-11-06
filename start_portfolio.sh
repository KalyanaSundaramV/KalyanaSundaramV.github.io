#!/usr/bin/env sh
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Please install Node.js LTS from https://nodejs.org/"
  exit 1
fi
node server.cjs --open
