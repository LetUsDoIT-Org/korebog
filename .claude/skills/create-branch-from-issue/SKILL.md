---
name: create-branch-from-issue
description: Create a properly named branch from dev for a GitHub issue. Handles branch naming, upstream tracking, and PR creation. Use when user says "create branch", "start work on issue", or provides an issue number to work on.
model: claude-sonnet-4-6
---

# Create Branch From Issue

Create a branch for a GitHub issue following consistent naming conventions.

**Announce:** "I'm using the create-branch-from-issue skill to create a branch for this issue."

## Auto-Detection

```bash
REMOTE=$(git remote get-url origin)
ORG=$(echo "$REMOTE" | sed -E 's/.*[:/]([^/]+)\/[^/]+(\.git)?$/\1/')
REPO=$(echo "$REMOTE" | sed -E 's/.*[:/][^/]+\/([^/]+)(\.git)?$/\1/')
```

## Branch Naming

Format: `{type}/{issue-number}-{slug-from-title}`

| Issue Type | Branch Prefix |
|-----------|--------------|
| Feature | `feature/` |
| Bug | `bug/` |
| Task | `task/` |
| Story | `feature/` |

**Slug rules:** lowercase, hyphens for spaces, remove special chars, max 50 chars.

## Workflow

### 1. Fetch Latest Dev and Verify Sync

```bash
git fetch origin dev
```

Then verify local dev matches remote dev:

```bash
LOCAL_DEV=$(git rev-parse dev)
REMOTE_DEV=$(git rev-parse origin/dev)
```

- If `$LOCAL_DEV == $REMOTE_DEV` → local dev is up to date, proceed to step 2.
- If they differ → ask user: `Your local dev is behind origin/dev. Please run: git pull origin dev` — wait for confirmation, then re-verify.

### 2. Look Up Issue

```bash
gh issue view {number} --repo "$ORG/$REPO" --json title,body,issueType,state,labels
```

**If not found**, check other repos in the same org. Issues may live in a different repo than the code:
```bash
# List org repos and try each
gh repo list "$ORG" --limit 20 --json name
```

**Common pattern:** PRs and issues share the number space per repo. If you find a PR instead of an issue, check other repos.

### 2b. Surface Sibling Issues by Area

Read the issue's `area:*` label (Havemakker repos carry exactly one). If present, list the other
open issues on the **same surface** so related work can be batched into this branch:

```bash
gh issue list --repo "$ORG/$REPO" --state open --label "<area:*>" --json number,title,labels --limit 30
```

Parse the JSON from the result (do **not** use `--jq '... | ...'` — the global bash hook blocks
`|` even inside jq strings). Present the siblings compactly, sorted by priority label, e.g.:

```
You're starting #215 (area:chat). Other open chat issues you might fold in:
  P1  #228 Give AI plant chat access to user's plant photos
  P1  #140 AI summary and Q&A over logbook notes
  P2  #301 Allow using chat before care info has loaded
```

This is **informational** — don't auto-add them to the branch. Just make the user aware so they
can decide whether to bundle. If the issue has no `area:*` label, skip this step (and mention the
label is missing — `create-issue` should have set it).

### 3. Create Branch

```bash
git checkout -b {type}/{issue-number}-{slug} origin/dev
```

Ask user to set upstream:
```
Please run: git push -u origin {type}/{issue-number}-{slug}
```

### 4. Report Success

```
Branch created:
- Branch: {branch-name}
- Based on: origin/dev
- Issue: #{number} — {title}

Ready to start development!
When done, ask me to create a PR.
```

## Creating PR (When User Asks Later)

After user has committed and pushed:

```bash
gh pr create \
  --repo "$ORG/$REPO" \
  --title "#{issue-number}: {issue-title}" \
  --head {branch-name} \
  --base dev \
  --draft \
  --body "Resolves #{issue-number}

{issue-description}

## Changes
- [ ] TODO

## Testing
- [ ] TODO"
```

## Commit Workflow

When implementation is complete, **you create the commit** (don't tell user to commit):

```bash
git add <files>
git commit -m "$(cat <<'EOF'
feat: implement feature description

Implements #123
EOF
)"
```

Prefixes: `feat:`, `fix:`, `chore:` — include `Implements #123` or `Fixes #123`.

Then ask user to push: `git push`

## Cross-Repository Issues

When an issue lives in a different repo than the code:
- Branch is created in the code repo (where you're working)
- PR references the issue with full path: `{org}/{other-repo}#123`
- Use `Resolves {org}/{other-repo}#123` in PR body

## Red Flags

**Never:**
- Create branch without fetching dev first
- Skip verifying local dev matches remote dev
- Create PR to main (always dev)
- Tell user to commit — YOU create the commit
- Give up after checking only one repo for the issue

**Always:**
- Surface sibling issues sharing the issue's `area:*` label before creating the branch
- Fetch dev and verify local matches remote before creating branch
- Use `{type}/{number}-{slug}` format
- Create branch from `origin/dev`
- Ask user to push with `-u` flag after branch creation
- Create draft PRs targeting dev
