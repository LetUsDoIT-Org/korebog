---
name: create-issue
description: Create GitHub issues for LetUsDoIT projects (Havemakker, etc.). Sets issue type via GraphQL, adds to project board, assigns priority labels. Use when user says "create issue", "new issue", "file a bug", or wants to track work.
model: sonnet
---

# Create Issue — LetUsDoIT

**Announce:** "I'm using the create-issue skill to create a GitHub issue."

## Org Config

| Setting | Value |
|---------|-------|
| Organization | `LetUsDoIT-Org` |
| Assignee | `@me` |
| Project | 2 (Havemakker) |
| Issue types | Feature, Bug, Task |

## Repository Selection

- Code/app/technical issues → `havemakker_frontend`
- Planning/docs/business → `havemakker`
- Default when unclear → `havemakker_frontend`

## Issue Type Inference

- "add", "implement", "create", "new", "feature" → Feature
- "fix", "error", "crash", "broken", "bug" → Bug
- "update", "refactor", "clean up", "improve", "task" → Task

## Priority Labels

Every issue gets one priority label:
- `P0` — MVP must-have
- `P1` — Phase 2 / nice to have
- `P2` — Phase 3+ / future

Ask user for priority if not obvious from context.

## Workflow

### 1. Gather Information

Determine from user's request:
- **Type** (Feature/Bug/Task) — infer from keywords
- **Priority** (P0/P1/P2) — ask if not clear
- **Title** — concise, imperative form
- **Repository** — code vs planning

If user provides enough context, skip questions and draft directly.

### 2. Draft and Confirm

Present the draft to user before creating. Format depends on type:

**Bug:**
```markdown
## Bug Description
<what's broken>

## Steps to Reproduce
1. ...

## Expected vs Actual
<what should happen vs what happens>
```

**Feature/Task:**
```markdown
## Description
<what and why>

## Scope
- <bullet points>

## Acceptance Criteria
- [ ] <checklist items>
```

### 3. Create Issue, Set Type, and Add to Project

**IMPORTANT:** `gh issue create` does NOT support `--type`. Issue type must be set via GraphQL after creation.

**IMPORTANT:** Do NOT bundle these into one bash script. Run each step as a separate Bash tool call to avoid permission prompts.

**Step 1: Create issue**
```bash
gh issue create \
  --repo "LetUsDoIT-Org/<REPO>" \
  --title "<TITLE>" \
  --body "<BODY>" \
  --assignee @me \
  --label "<PRIORITY>"
```
Capture the issue URL and extract the issue number from the output.

**Step 2: Get node ID**
```bash
gh api "repos/LetUsDoIT-Org/<REPO>/issues/<ISSUE_NUM>" --jq '.node_id'
```

**Step 3: Set issue type via GraphQL**
Use the correct type ID (look these up once per repo, they're stable):
```bash
gh api graphql -f query='
mutation($id: ID!, $typeId: ID!) {
  updateIssue(input: {id: $id, issueTypeId: $typeId}) {
    issue { number }
  }
}' -f id="<NODE_ID>" -f typeId="<TYPE_ID>" --silent
```

**Step 4: Add to project**
```bash
gh project item-add 2 --owner "LetUsDoIT-Org" --url "<ISSUE_URL>"
```

**Step 5: Link as sub-issue (if applicable)**
```bash
gh api graphql -f query='
mutation($parent: ID!, $child: ID!) {
  addSubIssue(input: {issueId: $parent, subIssueId: $child}) {
    issue { number }
  }
}' -f parent="<EPIC_NODE_ID>" -f child="<ISSUE_NODE_ID>" --silent
```

### 4. Report

```
Created: #<number> <title>
URL: <url>
Type: <type>
Priority: <P0|P1|P2>
Repository: LetUsDoIT-Org/<repo>
Assigned: @me
Project: Havemakker
```

## Duplicate Check

Before creating, check for existing similar issues:
```bash
gh issue list --repo LetUsDoIT-Org/<repo> --search "<keywords>" --state open --limit 10
```

## Red Flags

**Never:**
- Create without setting type (MANDATORY via GraphQL)
- Use `--type` flag (it doesn't exist in `gh issue create`)
- Skip priority label
- Invent labels — only use P0/P1/P2

**Always:**
- Set issue type via GraphQL mutation after creation
- Assign one priority label (P0/P1/P2)
- Link to project #2
- Default assignee: `@me`
- Draft and confirm with user before creating
