---
name: github-sprint-cleanup
description: Bulk-move uncompleted items from one sprint to another in the Havemakker GitHub project (LetUsDoIT-Org, project 2). Use when user says "sprint cleanup", "sprint rollover", "move uncompleted issues to next sprint", "clean up previous sprint", or wants to roll over any sprint to another. Skips items with Status=Done or closed issues. Always invoked via a subagent — the main thread confirms the plan and the subagent runs the gh calls.
model: claude-sonnet-4-6
---

# GitHub Sprint Cleanup — LetUsDoIT (Havemakker)

**Announce:** "I'm using the github-sprint-cleanup skill to roll over uncompleted items between sprints."

## MANDATORY: Always run via a subagent

**Never execute this workflow in the main conversation.** A full sprint rollover is 15+ Bash calls (paginated discovery, filter, batched mutations, verification) and the discovery query alone can return several MB of JSON. That output has zero value for the user and pollutes the main context.

When this skill is invoked:

1. **Confirm the plan with the user in the main thread.** Required inputs:
   - **From sprint** (e.g. `Sprint 2026.04`)
   - **To sprint** (e.g. `Sprint 2026.05`)
   - **Skip rule** (default: skip Status=Done and closed issues — confirm if user wants different)
2. **Dispatch a subagent** (`Agent` tool, `general-purpose` type) with a self-contained prompt that includes the from/to sprint titles, the skip rule, and a pointer to this SKILL.md for the procedure.
3. **The subagent runs all `gh` calls and reports back**: total items in source sprint, breakdown by status, count moved, and any errors.
4. **Relay the subagent's report** to the user in a compact form.

## Org Config

| Setting | Value |
|---------|-------|
| Organization | `LetUsDoIT-Org` |
| Project number | 2 (Havemakker) |
| Project ID | `PVT_kwDOC69aK84BDX_5` |
| Sprint field ID | `PVTIF_lADOC69aK84BDX_5zhAYgSw` |
| Sprint field name | `Iteration` |
| Status field name | `Status` |
| Status value to skip | `Done` |

The project is **org-level** and spans the Havemakker repos (`havemakker_frontend`, `havemakker`). The skill moves items from all repos in the project — there is no per-repo filtering.

**Note:** the field is named `Iteration` in this project, not `Sprint` (unlike the foodzoomer equivalent). The displayed iteration *titles* are still `Sprint YYYY.MM`. Get this right in the GraphQL filters or the discovery query will silently return zero matches.

## Procedure

All scratch files go in the calling repo's `tmp/` and `.gh-graphql/` directories (both pre-approved per CLAUDE.md and gitignored). Use absolute paths in every `gh` command — do not rely on the working directory.

### Step 1 — Resolve sprint iteration IDs

Write `<repo>/.gh-graphql/sprint-iterations.graphql`:

```graphql
query {
  organization(login: "LetUsDoIT-Org") {
    projectV2(number: 2) {
      iteration: field(name: "Iteration") {
        ... on ProjectV2IterationField {
          id
          configuration {
            iterations { id title }
            completedIterations { id title }
          }
        }
      }
    }
  }
}
```

Run:

```bash
gh api graphql -F query=@<repo>/.gh-graphql/sprint-iterations.graphql > /tmp/sprints.json
```

Extract the iteration IDs for the from/to sprint titles. They may live under either `iterations` (active/upcoming) or `completedIterations` (just-closed). Both are valid sources.

### Step 2 — Discover all items in the source sprint

Write `<repo>/.gh-graphql/discover-sprint-items.graphql`:

```graphql
query($endCursor: String) {
  organization(login: "LetUsDoIT-Org") {
    projectV2(number: 2) {
      items(first: 100, after: $endCursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          fieldValues(first: 30) {
            nodes {
              __typename
              ... on ProjectV2ItemFieldIterationValue {
                iterationId
                field { ... on ProjectV2IterationField { name } }
              }
              ... on ProjectV2ItemFieldSingleSelectValue {
                name
                field { ... on ProjectV2SingleSelectField { name } }
              }
            }
          }
          content {
            __typename
            ... on Issue { number state }
            ... on PullRequest { number state }
          }
        }
      }
    }
  }
}
```

**CRITICAL:** The cursor variable MUST be named exactly `$endCursor`. `gh api graphql --paginate` injects the next cursor into a variable literally named `endCursor`. Any other name (`$cursor`, `$after`, `$page`) silently fails — gh refetches page 1 indefinitely until rate-limited, producing what looks like many pages of unique data but is actually duplicates.

Run:

```bash
gh api graphql --paginate -F query=@<repo>/.gh-graphql/discover-sprint-items.graphql > /tmp/items.json
```

The output is a stream of concatenated JSON objects (one per page). Use `jq -s` (slurp) to combine.

**Sanity check the pagination:** after the discovery returns, run `jq -s 'length' /tmp/items.json` to count pages. If you got >5 pages but the project clearly has fewer than 500 items in total (check the project board UI), pagination is broken — the most likely cause is the variable-name mistake above. Verify by counting unique IDs vs total nodes.

### Step 3 — Filter for items in the source sprint, excluding Done/closed

Write `<repo>/tmp/filter-sprint.jq` (substitute the source iteration ID for `<FROM_ITERATION_ID>`):

```jq
[.[] | .data.organization.projectV2.items.nodes[]]
| map(select(any(.fieldValues.nodes[]?; .__typename=="ProjectV2ItemFieldIterationValue" and .field.name=="Iteration" and .iterationId=="<FROM_ITERATION_ID>")))
| unique_by(.id)
| map({
    id: .id,
    status: ([.fieldValues.nodes[]? | select(.__typename=="ProjectV2ItemFieldSingleSelectValue" and .field.name=="Status") | .name] | first),
    issueState: .content.state,
    number: .content.number,
    type: .content.__typename
  })
```

Then summarize and select the items to move. Write `<repo>/tmp/summarize.jq`:

```jq
{
  total: length,
  byStatus: (group_by(.status) | map({status: .[0].status, count: length})),
  toMove: [.[] | select(.status != "Done" and .issueState != "CLOSED")],
  toMoveCount: ([.[] | select(.status != "Done" and .issueState != "CLOSED")] | length)
}
```

Run:

```bash
jq -s -f <repo>/tmp/filter-sprint.jq /tmp/items.json > /tmp/in-sprint.json
jq -f <repo>/tmp/summarize.jq /tmp/in-sprint.json > /tmp/summary.json
```

Inspect `/tmp/summary.json`. Report `total`, `byStatus`, and `toMoveCount` back to the user via the subagent's final message.

### Step 4 — Build batched mutations (max 15 per batch)

GraphQL has resource limits. A single mutation with >15 `updateProjectV2ItemFieldValue` aliases will fail with `Resource limits for this query exceeded`. Always batch in chunks of 15.

Write `<repo>/tmp/build-batches.jq` (substitute the target iteration ID for `<TO_ITERATION_ID>`):

```jq
[.toMove | _nwise(15)] | to_entries | map({
  batch: .key,
  body: ("mutation{\n" + (
    [.value | to_entries[] |
      "  m\(.key): updateProjectV2ItemFieldValue(input:{projectId:\"PVT_kwDOC69aK84BDX_5\",itemId:\"\(.value.id)\",fieldId:\"PVTIF_lADOC69aK84BDX_5zhAYgSw\",value:{iterationId:\"<TO_ITERATION_ID>\"}}){projectV2Item{id}}"
    ] | join("\n")
  ) + "\n}\n")
})
```

Run:

```bash
jq -r -f <repo>/tmp/build-batches.jq /tmp/summary.json > /tmp/batches.json
```

Then write each batch to a separate `.graphql` file using one `jq -r '.[N].body'` call per batch (do NOT chain with `|` or `&&` — those trigger permission prompts; use sequential Bash calls):

```bash
jq -r '.[0].body' /tmp/batches.json > <repo>/.gh-graphql/move-batch-0.graphql
jq -r '.[1].body' /tmp/batches.json > <repo>/.gh-graphql/move-batch-1.graphql
# ... one per batch
```

### Step 5 — Execute batches sequentially

```bash
gh api graphql -F query=@<repo>/.gh-graphql/move-batch-0.graphql > /tmp/r0.json
gh api graphql -F query=@<repo>/.gh-graphql/move-batch-1.graphql > /tmp/r1.json
# ... one per batch
```

### Step 6 — Verify

Write `<repo>/tmp/check-results.jq`:

```jq
{
  successCount: ([.data | to_entries[] | select(.value.projectV2Item.id != null)] | length),
  errors: (.errors // [])
}
```

Run against all result files in one call:

```bash
jq -f <repo>/tmp/check-results.jq /tmp/r0.json /tmp/r1.json /tmp/r2.json
```

Sum `successCount` across batches. Report `<sum> / <toMoveCount>` to the user. If any batch returns errors, list the error messages.

## Cost & Round-Trip Budget

For a typical sprint with ~50–100 items:

- 1 sprint-iterations query (1 round trip)
- 1 discovery query (paginated, ~2–5 round trips depending on project size)
- N batched mutations where N = ceil(items_to_move / 15)

Total: roughly 5–15 GraphQL calls, no per-item shell calls.

## Common Failures

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Resource limits for this query exceeded` | Batch size > 15 mutations | Reduce batch size in `_nwise(15)` to `_nwise(10)` |
| Discovery returns way more pages than expected, unique IDs much less than total nodes | Cursor variable not named `$endCursor` | Rename to `$endCursor` exactly |
| `toMoveCount` is 0 but you know there are items | Iteration field name mismatch — `Iteration` not `Sprint` in this project | Verify `field.name=="Iteration"` in the filter jq |
| `toMoveCount` is 0 but you know there are items (variant 2) | Iteration ID mismatch — wrong title-to-ID lookup in Step 1 | Re-fetch sprint config and confirm exact title spelling (`Sprint YYYY.MM`) |
| Some items appear in source sprint after the move | Items added to sprint between discovery and move | Re-run the skill — second pass picks up the stragglers |

## Optional: Schedule recurring monthly rollover

After a successful run, offer to `/schedule` a recurring agent on the 1st of every month that runs this same skill with `From sprint = just-closed iteration, To sprint = newly-active iteration`. Sprints in this project are monthly (`Sprint YYYY.MM`), so this matches the natural cadence.
