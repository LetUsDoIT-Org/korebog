# GitHub issue mechanics — shared by every org

This file is **byte-identical in every org's `create-issue` skill.** It holds the GitHub mechanics that are the same everywhere. `SKILL.md` next to it holds the org-specific part: org name, repos, project numbers, field and option IDs, epics, labels, routing rules.

**Never put an org, repo, project number or ID in this file.** If a rule only holds for one org, it goes in that org's `SKILL.md`. Change this file in one base repo, then copy it unchanged to the other three.

---

## 1. Duplicate check — before drafting, once per issue

```bash
gh issue list --repo <owner/repo> --state all --search "<3-4 distinctive keywords from the drafted title>" --limit 10 --json number,title,state
```

- **`--state all`, not `open`.** A recently closed issue is prior art too, often with the analysis already done.
- **`--search` with keywords, never an unfiltered list.** Scrolling a 60-row `gh issue list` does not count as a check: a duplicate has been filed while its twin sat in exactly that list.
- If the work may belong in another repo of the org, repeat the search there.
- Show any plausible hit to the user **before** creating. If an existing issue already reports that a fix does not work, its evidence outranks your reading of the code.
- `gh search issues` lags the index and handles Danish poorly, so prefer `gh issue list --search`. `gh search issues --state` accepts only `open|closed`, never `all`.

## 2. Command hygiene

- **One `gh` call per Bash call.** No bundled scripts, pipes, `&&`, `;`, `sed` or heredocs; the bash guard blocks them. Independent calls go in parallel in one message.
- **Bodies go through a file.** Write the body to a unique `tmp/issue-body-<slug>.md` and pass `--body-file`. `##` headings in a quoted `--body` trip the injection guard. Never use a fixed shared name, which parallel runs overwrite.
- **Mutations with `input: {a: …, b: …}` go in a file.** A comma inside braces trips the brace-expansion guard even inside single quotes. Write `.gh-graphql/<name>.graphql` and call `gh api graphql -F query=@.gh-graphql/<name>.graphql -f var=value`.
- `gh issue create` has **no `--type` flag**. The type is set by GraphQL after creation.

## 3. Project items

- **Get the item ID from the add call.** `gh project item-add <n> --owner <org> --url <issue-url> --format json --jq .id` is idempotent: re-running it returns the existing item's ID.
- **Never look up items with `gh project item-list`.** It silently truncates at `--limit` and drops draft items. That has produced a false match on another repo's card and a phantom "not on the board".
- **Verify per issue** with `gh issue view <n> --repo <owner/repo> --json projectItems`, which returns the project fields (Status included) inline.
- **Status is often empty on API-created items** even when the web UI would default it. An empty Status makes the issue invisible on most board views, so set it explicitly and verify. Whether a project defaults it is recorded per project in `SKILL.md`.
- **Setting Status to Done can fire a project workflow that closes the issue.** A following `gh issue close --comment` then says "already closed" and silently drops the comment. Post comments with a separate `gh issue comment`.
- **Project fields do not inherit from a parent issue.** Sprint, quarter, status and so on are set on each item.
- Error `missing required scopes [read:project]`: the token lacks the `project` scope. When the token comes from the `GH_TOKEN` environment variable, `gh auth refresh` cannot fix it. Create the issue anyway, say plainly it is **not** on the board, and give the user the board URL.

## 4. Batching several issues — aliased GraphQL

`gh issue create` and `gh project item-add` have no batch form: one call per issue. Everything else batches into **one call per kind of operation** using aliases, so four issues take about 10 calls instead of about 28.

Node IDs for all new issues, in one query:

```graphql
query {
  repository(owner: "<owner>", name: "<repo>") {
    i101: issue(number: 101) { id }
    i102: issue(number: 102) { id }
  }
}
```

Types for all of them, in one mutation file:

```graphql
mutation {
  a: updateIssue(input: {id: "<node-101>", issueTypeId: "<type-id>"}) { issue { number issueType { name } } }
  b: updateIssue(input: {id: "<node-102>", issueTypeId: "<type-id>"}) { issue { number issueType { name } } }
}
```

Project fields — any number of fields across any number of items — in one mutation file:

```graphql
mutation {
  s1: updateProjectV2ItemFieldValue(input: {projectId: "<project>", itemId: "<item-101>", fieldId: "<status-field>", value: {singleSelectOptionId: "<option>"}}) { projectV2Item { id } }
  t1: updateProjectV2ItemFieldValue(input: {projectId: "<project>", itemId: "<item-101>", fieldId: "<iteration-field>", value: {iterationId: "<iteration>"}}) { projectV2Item { id } }
}
```

The alias in the response doubles as per-item verification. **Never derive IDs by pattern:** project item IDs (`PVTI_…`) share a long prefix and look derivable, but a guessed one writes silently onto an unrelated card. Always read them from the add call or a query.

## 5. Sub-issues, epics and re-parenting

```graphql
mutation($parent: ID!, $child: ID!) {
  addSubIssue(input: {issueId: $parent, subIssueId: $child, replaceParent: true}) {
    issue { number }
    subIssue { number }
  }
}
```

- An issue has **exactly one** parent. Without `replaceParent: true`, linking an issue that already has a parent fails. With it, the call is a **move**.
- Sub-issue links work across repos.
- **Three or more issues that come from one plan or document:** ask "epic first?" before creating any of them. Filing them flat and re-parenting afterwards costs one mutation per issue.

## 6. Running the skill: subagent or inline

- If the dispatch to a subagent **fails** (for example HTTP 429 on the model, or a tool error before any `gh` call ran), **run the steps inline in the main thread and say so in one line. Don't retry the dispatch.** Nothing was created, so inline is safe.
- A subagent does not see the conversation. Its prompt carries the confirmed drafts, the repo and type per issue, the parent, and a pointer to **both** `SKILL.md` and this file.

## 7. Report and verify

Don't report an issue as done until a read-back confirms type, labels (if the org requires them), project membership and Status. For a batch, report issue numbers and URLs compactly, and list any issue where a step failed.
