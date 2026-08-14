---
name: create-issue
description: Create GitHub issues for LetUsDoIT projects (Havemakker, etc.). Sets issue type via GraphQL, adds to project board, assigns priority labels. Prefers a subagent (main thread confirms the draft, subagent runs the gh calls), and runs inline when agent dispatch is unavailable. Use when user says "create issue", "new issue", "file a bug", or wants to track work.
model: claude-sonnet-4-6
---

# Create Issue — LetUsDoIT

**Announce:** "I'm using the create-issue skill to create a GitHub issue."

## Prefer a subagent — and degrade gracefully if there isn't one

**Run this via a subagent when agent dispatch is available.** If it is not — some sessions carry an explicit "do not call the Agent tool unless the user requested it" instruction — **run the steps inline in the main thread instead, and say in one line that you are doing so.** That is a supported path, not a violation: the preference below is context hygiene, not correctness, and the inline route has produced correct issues in five separate sessions.

Note that invoking this skill by name (`/create-issue`) reasonably counts as the user requesting a dispatch, so either resolution is defensible. What is *not* acceptable is stalling on the contradiction — decide, state which you chose, and proceed. Note too that step 1 below requires confirming the draft **in the main thread** regardless, so the flow is always "confirm inline, then dispatch if you can".

**Prefer not to execute the `gh` calls in the main conversation.** The full flow (duplicate check, drafting body, creating issue, getting node ID, setting type, adding to project, looking up iteration, setting sprint, optionally linking sub-issues) is 6+ Bash calls per issue and pollutes the main context with `gh` JSON output that the user does not need to see.

When this skill is invoked:

1. **Confirm the draft with the user in the main thread** (title, type, priority, repo, body). The subagent will not have the full conversation context, so alignment must happen here.
2. **Dispatch a subagent** (`Agent` tool, `general-purpose` type) with a self-contained prompt that includes: the confirmed title(s), body content (or instruction to write to a unique per-issue temp file `tmp/issue-body-<slug>.md`), type, priority label, repo, any sub-issue parent, and a pointer to this SKILL.md for the step-by-step procedure.
3. **The subagent runs all `gh` calls and reports back** the issue number, URL, and confirmation that type + project + sprint were set.
4. **Relay the subagent's report** to the user in a compact form (issue numbers + URLs).

For batch issue creation (multiple issues in one triage pass), dispatch a single subagent with all issues in the prompt — not one subagent per issue.

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

## Area Labels (Havemakker repos — mandatory)

For issues in `havemakker_frontend` / `havemakker`, every issue **also** gets exactly one
`area:*` label naming the surface it touches. This keeps the backlog batchable by area (work one
chat issue → the `whats-next` skill can surface sibling chat issues) and feeds the blended
backlog ranking. Pick the single best fit:

| Label | Surface |
|-------|---------|
| `area:plants` | Plant registry, catalog, details, Min Have, AI identification |
| `area:care-tasks` | Care schedule engine, task UI, calendar, climate profile, årshjul |
| `area:chat` | AI plant/bed chat, conversational Q&A, chat UI/keyboard |
| `area:havekort` | Garden map: satellite, beds, matrikelkort, plant placement |
| `area:notifications` | Push delivery, scheduling, content |
| `area:onboarding` | Signup, login, magic link, invite/welcome, account structure |
| `area:comms` | Admin communications, broadcasts, email templates, Resend |
| `area:paywall` | Stripe, premium gating, subscription/trial state |
| `area:testing` | Jest, Maestro, unit/integration/E2E, CI test wiring |
| `area:release` | EAS builds, OTA, store submission, compliance |
| `area:growth` | Surveys, marketing, analytics, prioritization & discovery modules |
| `area:infra` | Supabase platform, edge functions, security, RLS, deps, migrations, SDK upgrades |

Infer from the issue topic; ask only if genuinely ambiguous between two areas. Do **not** invent
new `area:*` values — if nothing fits, use the closest and flag it to the user.

## Workflow

### 1. Gather Information

Determine from user's request:
- **Type** (Feature/Bug/Task) — infer from keywords
- **Priority** (P0/P1/P2) — ask if not clear
- **Area** (`area:*`) — infer from topic (Havemakker repos; see Area Labels table)
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

**GraphQL with commas inside braces:** If a mutation contains `{a,b}` comma-in-brace patterns (arrays of objects, single-select option lists, etc.), Claude Code's brace-expansion guard will prompt even inside single quotes. Write the query to `.gh-graphql/<name>.graphql` (gitignored, pre-approved for Write) and invoke with `gh api graphql -F query=@.gh-graphql/<name>.graphql -f var=value`. Simple queries with no commas in braces can stay inline.

**Step 1: Write body to a temp file, then create issue**

Markdown headings (`##`) inside a quoted `--body` argument trip Claude Code's command-injection guard ("Newline followed by # inside a quoted argument can hide arguments from path validation"). **Always** write the body to a temp file with the Write tool and use `--body-file`.

1. Use the Write tool to create a **unique per-issue** temp file `tmp/issue-body-<slug>.md`, where `<slug>` is a short kebab-case fragment of the issue title (e.g. `tmp/issue-body-fix-og-image-refs.md`). Never use a shared fixed name like `tmp/issue-body.md` — parallel sessions and batch runs clobber each other's bodies, and a fixed name forces a mandatory Read of some previous session's stale draft before the Write is allowed. For a batch where two titles would slugify identically, append a counter (`-2`, `-3`). The file holds the full markdown body.
2. Create the issue referencing that file:
```bash
gh issue create \
  --repo "LetUsDoIT-Org/<REPO>" \
  --title "<TITLE>" \
  --body-file tmp/issue-body-<slug>.md \
  --assignee @me \
  --label "<PRIORITY>" \
  --label "<AREA>"
```

For Havemakker repos, pass both labels (`--label "<PRIORITY>" --label "<AREA>"`). For other
repos that have no `area:*` taxonomy, pass just the priority label.
3. Capture the issue URL and extract the issue number from the output.

**Delete `tmp/issue-body-<slug>.md` at close-out.** Because the name is unique to this issue, it is unambiguously yours to clean. A shared `tmp/issue-body.md` is the opposite: no session can attribute it, so nobody ever removes it, and it accumulates indefinitely. `tmp/` is gitignored scratch space and the `rm` pattern is pre-approved, so this costs no permission prompt.

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
Capture the returned item ID (`.id`) — you need it for Step 5.

**Step 5: Set current sprint on the project item**

Every issue must land on the current sprint so it shows up in the Current Sprint board. The Havemakker project's `Iteration` field uses monthly sprints named `Sprint YYYY.MM`.

Project/field IDs (stable):
- Project ID: `PVT_kwDOC69aK84BDX_5`
- Iteration field ID: `PVTIF_lADOC69aK84BDX_5zhAYgSw`

Look up the current iteration ID (the one whose `startDate` ≤ today < startDate+duration):
```bash
gh api graphql -f query='query { node(id: "PVTIF_lADOC69aK84BDX_5zhAYgSw") { ... on ProjectV2IterationField { configuration { iterations { id title startDate duration } } } } }'
```

Pick the iteration matching the current month and set it on the item:
```bash
gh api graphql -f query='
mutation($proj: ID!, $item: ID!, $field: ID!, $iter: String!) {
  updateProjectV2ItemFieldValue(input: {
    projectId: $proj, itemId: $item, fieldId: $field,
    value: {iterationId: $iter}
  }) { projectV2Item { id } }
}' -f proj="PVT_kwDOC69aK84BDX_5" -f item="<PROJECT_ITEM_ID>" -f field="PVTIF_lADOC69aK84BDX_5zhAYgSw" -f iter="<ITERATION_ID>" --silent
```

**Step 6: Set Status — do not skip this**

An issue with an empty Status is **invisible on the board**. Project 2 does *not* default it, so it must be set explicitly. (This varies per project — some GitHub projects default Status and some don't, so on any other project, verify after adding rather than assuming either way.)

Havemakker project 2 IDs (stable):
- Status field ID: `PVTSSF_lADOC69aK84BDX_5zg1T_xE`
- Options: `Todo` `deff068b` · `In Progress` `3c813cce` · `In Review` `3f3ec22b` · `Done` `a5e4476f`

Default to `Todo` unless the user says otherwise:
```bash
gh api graphql -f query='
mutation($proj: ID!, $item: ID!, $field: ID!, $opt: String!) {
  updateProjectV2ItemFieldValue(input: {
    projectId: $proj, itemId: $item, fieldId: $field,
    value: {singleSelectOptionId: $opt}
  }) { projectV2Item { id } }
}' -f proj="PVT_kwDOC69aK84BDX_5" -f item="<PROJECT_ITEM_ID>" -f field="PVTSSF_lADOC69aK84BDX_5zg1T_xE" -f opt="deff068b" --silent
```

Verify with `gh issue view <n> --json projectItems` — that is also the reliable way to recover a lost item ID. **Do not hunt for the item ID with `gh project item-list`**: on a large board it truncates at `--limit` and has produced both a false match from a *different repo* (which would write the field onto someone else's card) and a phantom "not on the board" for an issue that was. Re-running `gh project item-add … --format json --jq '.id'` is idempotent and returns the existing id, so the add call doubles as the lookup.

**Step 7: Link as sub-issue (if applicable)**
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
Area: <area:*>
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
- Use `--body "..."` with a multi-line markdown string — `##` headings trip the harness guard. Always use `--body-file` with a temp file.
- Skip priority label
- Skip the `area:*` label on Havemakker issues
- Invent labels — only use P0/P1/P2 and the fixed `area:*` set
- Skip setting the current sprint on the project item

**Always:**
- Set issue type via GraphQL mutation after creation
- Assign one priority label (P0/P1/P2)
- Assign one `area:*` label on Havemakker issues
- Link to project #2
- Set the current `Sprint YYYY.MM` iteration on the project item
- Default assignee: `@me`
- Draft and confirm with user before creating
