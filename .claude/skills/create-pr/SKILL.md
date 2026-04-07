---
name: create-pr
description: Create a pull request with accurate descriptions. Supports feature→dev and dev→main. Use when user says "create pr", "/pr", "make a pr", or "pull request".
model: sonnet
---

# Create Pull Request

Create PRs with accurate descriptions using a **create-first, describe-second** approach.

**Announce:** "I'm using the create-pr skill to create a pull request."

## Auto-Detection

Detect org and repo (separate Bash calls, no pipes):
```bash
gh repo view --json owner --jq '.owner.login'
```
```bash
gh repo view --json name --jq '.name'
```
```bash
git branch --show-current
```

## Branch Targets

Determine head and base from context:

| Current branch | Head | Base | Title prefix |
|---------------|------|------|-------------|
| `dev` | `dev` | `main` | "Release:" |
| `feature/*`, `bug/*`, `task/*` | current branch | `dev` | from commits |
| User specifies | as specified | as specified | from commits |

If the user says "from X to Y", use those. Otherwise infer from the table above.

## Why Create-First

- Local git refs may be stale — Claude cannot fetch
- GitHub automatically calculates the exact diff when a PR is created
- Reading the PR's commits gives the authoritative list

## Workflow

### Step 1: Create PR with Placeholder

```bash
gh pr create --repo "$ORG/$REPO" --title "PR: $HEAD to $BASE" --head "$HEAD" --base "$BASE" --body "Generating description..."
```

Extract the PR number from the returned URL.

### Step 2: Read PR Commits

```bash
gh pr view <pr-number> --repo "$ORG/$REPO" --json commits
```

### Step 3: Generate Description

**Categorize commits:**
- `feat:` → Features
- `fix:` → Bug Fixes
- `docs:` → Documentation
- `test:` → Tests
- `refactor:`, `chore:` → Technical changes

**PR Title:**
- Single feature/fix: use that commit message
- Multiple changes: summary like "feat: [main feature] and fixes"
- dev→main: "Release: [summary]"

**PR Body:**
```markdown
## Summary

### Features
- [list feat: commits]

### Bug Fixes
- [list fix: commits]

### Technical
- [list other commits if relevant]

## Test plan
- [ ] [relevant test items]

Closes #[issue-number] (if applicable)
```

### Step 4: Update PR

Use a HEREDOC for the body to avoid security warnings from `#` in markdown:
```bash
gh pr edit <pr-number> --repo "$ORG/$REPO" --title "<generated-title>" --body "$(cat <<'EOF'
<generated-body-here>
EOF
)"
```

### Step 5: Report

```
Pull request created:
- PR: [url]
- Commits: [count]
- [brief summary]
```

## Red Flags

**Never:**
- Use piped shell commands (echo | sed, etc.) — use gh --jq instead
- Use local git refs for branch comparison
- Leave PR with placeholder description
- Guess at what commits are included

**Always:**
- Use separate Bash calls for each command (no bundling)
- Create PR first with minimal body
- Read commits from GitHub's PR response
- Update PR with accurate description
