---
name: crm
description: Havemakker CRM on GitHub — manage Companies, Contacts and Deals as labeled issues in LetUsDoIT-Org/havemakker on Project #2 (CRM view). Use when the user mentions a partner, planteskole, contact person, deal, meeting/visit notes, outreach, or says "CRM", "add contact", "log meeting", "log visit", "create company", "crm status", "who do we know at". Auto-suggests missing contacts when people are mentioned and extracts action items from notes.
---

# CRM — Havemakker (LetUsDoIT)

**Announce:** "I'm using the CRM skill to manage Havemakker CRM data on GitHub."

Havemakker runs its partner CRM as GitHub issues in **`LetUsDoIT-Org/havemakker`** (the base repo — never the frontend/web repos), using three labels:

- `crm-company` — organisations (planteskoler, garden centers, media, NGOs, service companies, investors, content creators as companies-of-one)
- `crm-contact` — individual people
- `crm-deal` — active opportunities (partnership, affiliate, content, membership benefit, referral)

All CRM items live on **Project #2 (Havemakker)** in the **CRM view**. Pipeline position is the project's **`Stage`** single-select field (not body text).

**Market facts vs relationship state:** what a partner *is* (size, products, threat, partnership angle) lives in `docs/competitors/competitors.json` via the `competitive-intel` skill. *Where the conversation is* (contacts, what was said, what is owed, next action) lives here. Don't duplicate — link the company issue to the `competitors.json` entry by name.

## 1. Data model

```
Company (crm-company)                   ← organisation
├── Contact (crm-contact, sub-issue)    ← people at that company
├── Deal (crm-deal, sub-issue)          ← opportunity with that company
│   └── Task (issue type Task, sub-issue)  ← action items, carry Sprint
└── Task (sub-issue)                    ← company-level action items
```

- Contacts are sub-issues of their Company. Deals are sub-issues of their Company. Cross-company deals (grants, funds) have no parent.
- Action items are plain issues (type **Task**), sub-issued under the deal/company/contact they came from — these are the only CRM-related items that get **Iteration (sprint)** set. Companies, Contacts and Deals never carry a sprint.

### Naming (enforce on create)

| Type | Format | Example |
|------|--------|---------|
| Company | `[Company] <Name>` | `[Company] Plantetorvet` |
| Contact | `[Contact] <Full Name> — <Role> @ <Company>` | `[Contact] Bjarne — Owner/IT @ Plantetorvet` |
| Deal | `[Deal] <Short description> — <Company>` | `[Deal] Reciprocal promotion + affiliate — Plantetorvet` |
| Task | plain imperative | `Send Bjarne summary mail incl. reciprocal ask` |

### Project fields on CRM items

| Field | Company | Contact | Deal | Task |
|---|---|---|---|---|
| Status | Todo (open) / Done (closed) | same | same | Todo → Done |
| **Stage** | ✅ overall relationship stage | — | ✅ deal stage | — |
| Iteration | ❌ | ❌ | ❌ | ✅ current sprint |

`Stage` options: `Lead` (candidate, no real conversation) · `Contacted` · `Qualified` (interest confirmed) · `Proposal` · `Negotiation` · `Won` · `Parked` · `No fit`.

IDs (stable): project `PVT_kwDOC69aK84BDX_5` · Stage field `PVTSSF_lADOC69aK84BDX_5zhgRkTc` · options Lead `a30b1ce1`, Contacted `e5796779`, Qualified `54f21bb7`, Proposal `3aa8b01c`, Negotiation `47dc7237`, Won `b44346f0`, Parked `37d86d85`, No fit `938d456c`. Status field `PVTSSF_lADOC69aK84BDX_5zg1T_xE` (Todo `deff068b`, Done `a5e4476f`). Iteration field `PVTIF_lADOC69aK84BDX_5zhAYgSw`.

### Ownership

Single-founder org: every CRM item is assigned to `@me` (simon-letusdoit). No routing table needed — but never leave an item unassigned.

### Body templates

**Company**
```markdown
### Category
<planteskole / garden center / media / NGO / service / creator / investor / other>

### Website · Location · CVR
<url> · <city> · <cvr if known>

### competitors.json
<entry name, or "not tracked">

### Why this partner (strategic fit)
<1–3 lines; which partnership model from docs/Garden helper/partnership-strategy-planteskoler.md>

### Commercial model
<affiliate / reciprocal promotion / paid B2B / content / member benefit — and the money-flow direction>

### Owed by us / owed by them
- us: …
- them: …

### Activity Log
- YYYY-MM-DD: <what happened> (<channel>)
```

**Contact**
```markdown
### Role
### Company (parent issue #)
### Email / Phone / LinkedIn / IG
### Availability & preferences
<e.g. not in on Mondays; prefers face-to-face>
### Notes
<how we met, warmth, who introduced>
### Activity Log
- YYYY-MM-DD: …
```

**Deal**
```markdown
### Company (parent issue #)
### What we want (primary ask)
### What they offered
### Value / mechanics
<money-flow direction, %, cookie window, price>
### Dependencies
<e.g. referral/QR plumbing issue>
### Next step
<single next action + date> (mirrored as a Task sub-issue)
### Activity Log
- YYYY-MM-DD: …
```

## 2. Behaviours

### User mentions a person at a company
1. Search: `gh issue list --repo LetUsDoIT-Org/havemakker --label crm-contact --search "<name> in:title" --json number,title`
2. Not found → **propose** creating `[Contact] …` as a sub-issue of the company (ask role, email, how connected). Create only after confirmation.
3. Found → use that issue number when logging.

### User gives meeting / visit / call / mail notes
1. Append a dated bullet to the company's (and deal's, if any) **Activity Log** — post as a comment *and* update the body section.
2. Extract action items (imperatives, deadlines, "I'll…/they'll…") → **propose** Tasks, sub-issued under the deal/company, with current sprint. Create after confirmation via the `create-issue` procedure.
3. Extract new people → propose contacts.
4. If the notes change the relationship stage → propose the `Stage` change.
5. If the notes contain **market** facts (products, pricing, size, digital tools) → say so and offer to run `competitive-intel` to update `competitors.json`; don't put them in the CRM body.

### First real contact with a `competitors.json` candidate
When a planteskole/media/ecosystem entry gets its first real conversation, create the `[Company]` issue (Stage = Contacted) and add `Relationship: LetUsDoIT-Org/havemakker#<n>` to the JSON notes via `competitive-intel`.

### "crm status"
Counts by label; deals by Stage; companies with no Activity Log entry in 60 days ("stale"); open Tasks under CRM items by sprint. Print one table.

### Contact changes job
Reparent via `removeSubIssue` + `addSubIssue`, log the move in the contact's Activity Log.

## 3. Procedure (per item)

Follow the `create-issue` skill mechanics: body via `--body-file tmp/issue-body-<slug>.md`, labels (`crm-*` — **no** `P*`/`area:*` on Company/Contact/Deal; Tasks get `P*` + `area:growth`), issue type via GraphQL (Company/Contact/Deal = type **Task** for board purposes; action items = Task), `gh project item-add 2`, set Status, set **Stage** on Company/Deal:

```bash
gh api graphql -f query='
mutation($proj: ID!, $item: ID!, $field: ID!, $opt: String!) {
  updateProjectV2ItemFieldValue(input: {projectId: $proj, itemId: $item, fieldId: $field, value: {singleSelectOptionId: $opt}}) { projectV2Item { id } }
}' -f proj="PVT_kwDOC69aK84BDX_5" -f item="<ITEM_ID>" -f field="PVTSSF_lADOC69aK84BDX_5zhgRkTc" -f opt="<STAGE_OPTION_ID>" --silent
```

Sub-issue link:
```bash
gh api graphql -f query='mutation($p: ID!, $c: ID!) { addSubIssue(input: {issueId: $p, subIssueId: $c}) { issue { number } } }' -f p="<PARENT_NODE_ID>" -f c="<CHILD_NODE_ID>" --silent
```

Run each `gh` call as its own Bash call. For batch seeding, dispatch one subagent with the whole list. **GraphQL caps aliased mutations at ~22 per request** (`RESOURCE_LIMITS_EXCEEDED` silently truncates the rest) — keep batch files at ≤20 mutations and verify with a read-back query afterwards.

## 4. What NOT to do

- Don't create contacts/deals/tasks silently — propose, then create.
- Don't put market facts in CRM bodies; don't put relationship state in `competitors.json` beyond a one-line pointer.
- Don't set Iteration on Company/Contact/Deal.
- Don't use `crm-deal` for action items.
- Don't create CRM items outside `LetUsDoIT-Org/havemakker`.
- Don't keep a parallel markdown tracker; `docs/Garden helper/partnerships.md` is a pointer stub only.
