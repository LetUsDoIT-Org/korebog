#!/bin/bash
# Sync GitHub skills from LetUsDoIT base repo
BASEDIR="$(cd "$(dirname "$0")/../LetUsDoIT" && pwd)"
exec "$BASEDIR/sync-skills.sh" "$(cd "$(dirname "$0")" && pwd)"
