#!/bin/sh
set -eu

PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
LOCAL_NODE_BIN="$PROJECT_DIR/.node-runtime/bin"

if [ -x "$LOCAL_NODE_BIN/node" ] && [ -x "$LOCAL_NODE_BIN/npm" ]; then
  PATH="$LOCAL_NODE_BIN:$PATH"
  export PATH
elif ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Node.js and npm were not found. Install Node.js 24 or restore the project's .node-runtime folder." >&2
  exit 1
fi

cd "$PROJECT_DIR"
exec npm run dev -- --webpack --hostname 127.0.0.1
