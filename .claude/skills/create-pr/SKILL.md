---
name: create-pr
description: Create a pull request with an accurate description, in either shape — a work branch into the integration branch, or a release from dev into main. Creates the PR first, reads GitHub's own commit list, then writes the description. Also covers pushing more commits to an open PR and re-checking a release PR before merge. Use when user says "create pr", "/pr", "make a pr", or "pull request".
model: sonnet
---

# Create Pull Request

**Announce:** "I'm using the create-pr skill to create a pull request."

This skill is shared, byte-identical, by every org that syncs it. Nothing in it may name an org, a repo or a project — anything org-specific belongs in that repo's `CLAUDE.md`.

## Command hygiene

- **One command per Bash call.** No pipes, `&&`, `;`, `sed`, `$( )` captures or heredocs — the bash guard blocks them. Issue independent calls in parallel instead.
- **Every PR body goes through a file.** Write it with the Write tool to `tmp/pr-body-<branch-slug>.md` and pass `--body-file`. Markdown headings inside a quoted `--body` trip the command-injection guard, and a heredoc is blocked outright.
- **`git fetch` is allowed** and should be run before any ahead/behind question. Local refs are fine once fetched, but GitHub's view of the PR is the authority for what the PR contains.

## Step 0: Identify repo, head and base

Separate calls:

```bash
gh repo view --json nameWithOwner --jq .nameWithOwner
```
```bash
git branch --show-current
```
```bash
gh repo view <owner/repo> --json defaultBranchRef --jq .defaultBranchRef.name
```

`gh repo view` without an argument resolves from the **current working directory**. When the work is in a different repo, read `git -C <repo> remote get-url origin` and pass `--repo <owner/repo>` on every `gh` call below.

| Shape | Head | Base |
|---|---|---|
| Feature PR — the everyday case | `feature/…`, `bug/…`, `task/…` | the integration branch |
| Release PR | `dev` | `main` |

The **integration branch** is `dev` when the repo has one and PRs land there, otherwise the default branch. Check rather than assume — `gh api "repos/<owner/repo>/branches/dev" --jq .name` returns 404 when there is no `dev`. An explicit `<head> -> <base>` from the user wins. Never open the reverse of the intended direction (`main` → `dev`, or `dev` → a work branch).

**Check for an existing PR:**

```bash
gh pr list --repo <owner/repo> --head <head> --state all --json number,title,state,isDraft,author
```

A PR for this branch may already exist, possibly a colleague's draft. "It's not a PR yet" from the user is a hint, not a fact.

**Check the head is on the remote with every commit you expect:**

```bash
git fetch origin <head> <base>
```
```bash
git log --oneline origin/<base>..origin/<head>
```

If a commit you expect is missing, stop and ask for the push first. A PR opened on a partial branch can be merged before the rest arrives, stranding it.

## Step 1: Create the PR with a placeholder that already carries the issue keywords

**GitHub only closes an issue if the closing keyword is in the body at the moment of merge, and only when the PR merges into the repo's default branch.** A follow-up edit is too late if someone merges in between, and that has left a whole release's issues open.

So the placeholder body already holds the issue lines. Write `tmp/pr-body-<branch-slug>.md`:

```markdown
Generating description...

Closes #123
```

- **PR into the default branch** (usually the release PR): `Closes #N` for each issue the merge completes.
- **PR into a non-default branch** (a feature PR into `dev` when the default is `main`): `Refs #N`. A closing keyword does nothing there; it belongs on the release PR.
- Cross-repo issue: `Closes <owner>/<repo>#N`.

```bash
gh pr create --repo <owner/repo> --head <head> --base <base> --title "<provisional title>" --body-file tmp/pr-body-<branch-slug>.md
```

Take the PR number from the returned URL.

## Step 2: Read commits and files from GitHub

```bash
gh pr view <n> --repo <owner/repo> --json commits,files
```

For a release PR, scan `files` for anything you do not recognise. Parallel sessions merge into the integration branch, and their work rides along into "your" release.

## Step 3: Write the description

Categorise commits by prefix — `feat:` features, `fix:` bug fixes, `docs:` documentation, `test:` tests, `refactor:`/`chore:` technical.

Title: a single change uses that commit's message. Several changes get a summary. A release PR starts with "Release:".

Edit the same body file (keep the `Closes`/`Refs` lines):

```markdown
## Summary

### Features
- ...

### Bug Fixes
- ...

### Technical
- ...

## Test plan
- [ ] ...

Closes #123
```

## Step 4: Update the PR

```bash
gh pr edit <n> --repo <owner/repo> --title "<title>" --body-file tmp/pr-body-<branch-slug>.md
```

## Step 5: Report

```
Pull request created:
- PR: <url>
- <head> -> <base>, <count> commits
- <one-line summary>
```

## Later: more commits pushed to an open PR

A PR can merge between two pushes, and nothing in the push output makes that obvious. After every push to a branch that has a PR:

```bash
gh pr view <n> --repo <owner/repo> --json state,headRefOid
```

- `OPEN` and `headRefOid` equals the sha just pushed: fine. A passing `gh pr checks` is **not** this check — it reports on whatever head the PR has.
- `MERGED`: the new commits are in no PR. Look at the merge commit:
  ```bash
  gh pr view <n> --repo <owner/repo> --json mergeCommit
  ```
  ```bash
  gh api "repos/<owner/repo>/commits/<merge-sha>" --jq '.parents | length'
  ```
  **2 parents** (a true merge) → open a new PR from the **same** branch. It will show exactly the new commits, with no cherry-pick. **1 parent** (squash) → cut a fresh branch off the updated base and cherry-pick the new commits.
- Push output `* [new branch]` for a branch that was pushed before means the PR merged and the remote branch was auto-deleted. Treat it as `MERGED`.
- No CI run appears after a push: check the workflow's `on:` block before polling again. A `pull_request`-only workflow never runs for a branch whose PR has merged. The PR's own run tested `refs/pull/N/merge`, which is already the merged state.

## Before merging a release PR

The base keeps moving. Right before merging, re-read:

```bash
gh pr view <n> --repo <owner/repo> --json commits,files
```

If the list changed since the description was written, update the body. Name any open feature PR that is deliberately **not** in this release.

## Red Flags

**Never:**
- Open a PR before every expected commit is on the remote
- Add `Closes #N` only in a later edit
- Put closing keywords on a PR into a non-default branch and expect the issue to close
- Leave the placeholder description
- Guess which commits are included
- Pass a multi-line markdown `--body`, or build a body with a heredoc

**Always:**
- Check for an existing PR first
- Read commits and files from GitHub's PR response
- After pushing to a PR, confirm `state` and `headRefOid`
- Re-read a release PR's commits right before merging it
