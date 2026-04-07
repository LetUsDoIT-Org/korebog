#!/bin/bash
# Sync Claude Code config from base repo
BASEDIR="$(cd "$(dirname "$0")/../LetUsDoIT" && pwd)"
exec "$BASEDIR/sync-claude.sh" "$(cd "$(dirname "$0")" && pwd)"
