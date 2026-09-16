---
name: create-branch-from-issue
description: Create a properly named work branch for a GitHub issue, off the repo's integration branch. Handles naming, related-issue discovery, commits and the hand-over to create-pr. Use when user says "create branch", "start work on issue", or provides an issue number to work on.
model: sonnet
---

# Create Branch From Issue

**Announce:** "I'm using the create-branch-from-issue skill to create a branch for this issue."

This skill is shared, byte-identical, by every org that syncs it. Nothing in it may name an org, a repo or a project — anything org-specific belongs in that repo's `CLAUDE.md`.

## Command hygiene

One command per Bash call — no pipes, `&&`, `;`, `sed`, `$( )` captures or heredocs; the bash guard blocks them. `git fetch` is allowed. Pushing is the user's: hand over the command, with the **main checkout** path.

## Step 1: Identify repo and integration branch

```bash
gh repo view --json nameWithOwner,defaultBranchRef
```
```bash
gh api "repos/<owner/repo>/branches/dev" --jq .name
```

The integration branch is `dev` if that returns a name (and the repo's `CLAUDE.md` does not say otherwise), else the default branch. Some repos have no `dev` and take PRs straight into `main`.

```bash
git fetch origin <integration>
```

Branch from `origin/<integration>` directly. Your local copy of that branch does not need to be current, so there is nothing to pull first.

## Step 2: Look up the issue

```bash
gh issue view <number> --repo <owner/repo> --json title,body,issueType,state,labels
```

**Not found?** Issues often live in a different repo of the same org than the code. List the org's repos and try the likely ones:

```bash
gh repo list <owner> --limit 50 --json name
```

Issues and PRs share one number space per repo, so finding a PR under that number means the issue is elsewhere. Don't give up after one repo.

## Step 3: Surface related open issues (informational)

If the issue carries a surface or area label — any label family sharing a prefix such as `area:` — list the other open issues with that same label so related work can be bundled:

```bash
gh issue list --repo <owner/repo> --state open --label "<that label>" --json number,title,labels --limit 30
```

Present them compactly (priority first if the repo has priority labels). **Don't add them to the branch automatically**; the user decides. Skip this step when the repo has no such label family.

## Step 4: Create the branch

Name: `{type}/{issue-number}-{slug}`, lowercase, hyphens, no special characters, slug at most 50 characters.

| Issue type | Prefix |
|---|---|
| Feature, Story | `feature/` |
| Bug | `bug/` |
| Task | `task/` |

**If the checkout may be shared** (another session, a dev server, an editor), don't switch its branch. Use a worktree:

```bash
git -C <repo> worktree add <path> -b <branch> origin/<integration>
```

Otherwise, with a clean `git status --short`:

```bash
git checkout -b <branch> origin/<integration>
```

Then hand over the push, as a bare line:

```
git -C <main checkout path> push -u origin <branch>
```

## Step 5: Report

```
Branch created:
- Branch: <branch>
- Based on: origin/<integration>
- Issue: #<number> — <title>
```

## Committing (you commit, the user pushes)

- Run `git branch --show-current` right before every commit. In a shared checkout a parallel session can switch the branch mid-session, and the commit then lands on the wrong branch without any warning.
- Stage **explicit paths**. `git commit -a` skips new files, and `git add -A` sweeps in whatever an installer or another session dropped in the tree.
- Message: `feat:` / `fix:` / `chore:` prefix, referencing `#<number>`. For a multi-line message, Write it to `tmp/commit-msg-<slug>.txt` and run `git commit -F <that file>`. For one line, `-m` is fine; put code identifiers in 'single quotes', because backticks inside a double-quoted `-m` are executed by the shell and silently blank the text.

When the work is ready, use the **create-pr** skill. It covers closing keywords, which only work on a PR into the default branch.

## Red Flags

**Never:**
- Switch branches in a checkout another session may be using
- Branch from a local ref you have not just fetched
- Target a PR at a branch without checking which branch the repo integrates into
- Tell the user to commit — you commit; the user pushes
- Stop searching after one repo when the issue is not found

**Always:**
- Use `{type}/{number}-{slug}`
- Branch from `origin/<integration>`
- Confirm the current branch immediately before each commit
