---
name: sentry-triage
description: Org-wide review of unresolved Sentry issues across all Havemakker projects (mobile, web, backend). Use when checking for new errors, doing routine error review, or when user asks "what's new on Sentry", "check Sentry", "triage errors", "any new production issues". Pulls issues from every project in the letusdoit Sentry org regardless of which repo Claude is invoked from. Cross-references with the project-wide tracker at havemakker/docs/operations/sentry-issue-tracker.md and hands off to sentry-debugger for deep investigation.
---

# Sentry Triage (Havemakker — Project-Wide)

Routine review of unresolved Sentry issues across **all Havemakker Sentry projects**, cross-referenced with the project-wide tracker. Designed for operational follow-up: when you get a Sentry alert email you should be able to run this from any Havemakker repo and see everything.

**Announce at start:** "I'm using the sentry-triage skill to review Sentry issues across all Havemakker projects."

## Scope — all Havemakker projects in the letusdoit Sentry org

| Project slug | Source | Owner repo (for fixes) | ID prefix |
|--------------|--------|------------------------|-----------|
| `react-native` | Mobile app (React Native + Expo) | `havemakker_frontend` | `REACT-NATIVE-` |
| `havemakker-web` | Marketing/landing site (Next.js) | `havemakker_web` | `HAVEMAKKER-WEB-` |
| `havemakker-backend` | Supabase edge functions + Postgres, surfaced via the `log-monitor` log→Sentry pipeline (issue #259) | `havemakker_frontend` (edge functions live in `supabase/functions`; DB in `supabase/migrations`) | `HAVEMAKKER-BACKEND-` |

> **Backend project specifics:** events arrive through the `log-monitor` logger (pg_cron → Logflare → Sentry ingest), not the in-app Sentry SDK. They carry `environment: prod` and geo Frankfurt am Main — that's the **Supabase eu-central server region**, NOT the user's location, so ignore geo for backend triage. Useful tags: `function_id` (which edge function), `query_name` (`function_logs_errors` = edge function runtime, `postgres_logs_errors` = DB), `error_class` (`runtime-panic` / `generic-error`), `sql_state_code` (Postgres errors). A single root-cause bug whose error message embeds variable data (e.g. a plant name or UUID) will fingerprint into **many separate issues** — group them before treating each as distinct.

> **Note:** The `letusdoit` Sentry org may host other LetUsDoIT projects (e.g. Kørebog) in the future. This skill is scoped to **Havemakker** projects only — add a row when a Havemakker project comes online; non-Havemakker projects get their own triage skill in their own project base repo.

The `search_issues` MCP tool **without a project filter** queries the entire org. That includes any non-Havemakker projects too, so when reviewing results, classify by ID prefix against this table and ignore foreign projects.

- **Sentry organization slug:** `letusdoit`
- **Sentry MCP server name:** `sentry-letusdoit`
- **Project-wide tracker:** `/Users/letusdoit/repos/LetUsDoIT/havemakker/docs/operations/sentry-issue-tracker.md`

## Prerequisites

Requires the Sentry MCP server. If not available in the current repo, ask the user to run:

```
claude mcp add --transport http sentry-letusdoit https://mcp.sentry.dev/mcp --scope project
```

Then authenticate via `/mcp` with an account that has access to the `letusdoit` Sentry org.

## Workflow

### Step 1: Fetch unresolved issues across the org

**IMPORTANT**: The Sentry MCP `search_issues` tool uses AI-based natural language translation, which may silently drop results. Always run multiple queries and merge.

**Primary query (org-wide, no project filter):**

```
mcp__sentry-letusdoit__search_issues(
  organizationSlug: 'letusdoit',
  naturalLanguageQuery: 'unresolved issues last 30 days',
  limit: 100
)
```

**Verification queries (NL translator rejects boolean OR/AND — keep plain):**

```
mcp__sentry-letusdoit__search_issues(
  organizationSlug: 'letusdoit',
  naturalLanguageQuery: 'all open issues',
  limit: 100
)
```

```
mcp__sentry-letusdoit__search_issues(
  organizationSlug: 'letusdoit',
  naturalLanguageQuery: 'unresolved or regressed issues',
  limit: 100
)
```

Merge results from all queries and deduplicate by Sentry ID.

**Optional per-project sweep** — if you suspect the org-wide query missed something for a specific project:

```
mcp__sentry-letusdoit__search_issues(
  organizationSlug: 'letusdoit',
  projectSlugOrId: 'havemakker-web',  // or 'react-native'
  naturalLanguageQuery: 'unresolved issues',
  limit: 50
)
```

**If counts seem low**, ask the user to verify against [the unresolved issues dashboard](https://letusdoit.sentry.io/issues/?query=is%3Aunresolved). If they spot missing IDs, fetch each individually.

### Step 2: Read the project-wide tracker

Read `/Users/letusdoit/repos/LetUsDoIT/havemakker/docs/operations/sentry-issue-tracker.md`.

If it doesn't exist yet, tell the user. Pre-consolidation per-repo trackers may live in:
- `havemakker_frontend/docs/operations/sentry-issue-tracker.md`
- `havemakker_web/docs/operations/sentry-issue-tracker.md`

Offer to migrate them in a single pass — read each, append entries to the project-wide tracker with the project slug prefixed in section headings, and stop appending to the old ones.

Extract known Sentry IDs and their current status (Fixed, Monitoring, Won't Fix, Pending).

### Step 3: Cross-reference and classify

For each unresolved issue, classify as:

- **NEW** — Not in the tracker. Needs attention.
- **Tracked (Monitoring)** — Already documented. Check if new events warrant action.
- **Tracked (Fixed/Won't Fix)** — Already resolved. May have regressed if new events appeared.
- **Tracked (Pending)** — Under active investigation.

### Step 4: Present grouped summary table

Group by **Project** to make it obvious which repo each issue belongs to. Within each group sort: NEW first, then by event count descending.

```
## react-native (Havemakker mobile)
| Sentry ID | Error | Events | Users | Version | Platform | Last Seen | Status |
|-----------|-------|--------|-------|---------|----------|-----------|--------|
| REACT-NATIVE-XX | TypeError: ... | 5 | 3 | 1.0.4+38 | Android | 2026-05-03 | NEW |

## havemakker-web
| Sentry ID | Error | Events | Users | Runtime | Release | Last Seen | Status |
|-----------|-------|--------|-------|---------|---------|-----------|--------|
| HAVEMAKKER-WEB-YY | fetch failed... | 12 | 8 | Server | abc1234 | 2026-05-02 | Monitoring |
```

### Step 5: Recommendations + repo handoff

Each recommendation must include **which repo to switch to** before fixing — the debugger is repo-scoped:

**NEW mobile issue:**
> "REACT-NATIVE-XX is new and unresolved. To investigate: `cd /Users/letusdoit/repos/LetUsDoIT/havemakker_frontend` and run `/sentry-debugger`."

**NEW web issue:**
> "HAVEMAKKER-WEB-YY is new. To investigate: `cd /Users/letusdoit/repos/LetUsDoIT/havemakker_web` and run `/sentry-debugger`."

**Regressed issues (Fixed/Won't Fix with new events):**
> "REACT-NATIVE-XX was marked Fixed but has new events. Likely regression — switch to the owner repo and run `/sentry-debugger`."

**No new issues:**
> "All unresolved Havemakker issues are already tracked. No action needed."

### Step 6: Add to tracker (optional)

Skeleton entry — **always include `Project` and `Owner repo` fields** so project-wide grouping works:

```markdown
### HAVEMAKKER-WEB-XX: [Short Description]

| Field | Value |
|-------|-------|
| **Sentry ID** | [HAVEMAKKER-WEB-XX](https://letusdoit.sentry.io/issues/HAVEMAKKER-WEB-XX) |
| **Project** | havemakker-web |
| **Owner repo** | havemakker_web |
| **Error** | `[error message]` |
| **Runtime / Platform** | [Browser / Server / Edge / iOS / Android] |
| **Events** | [count] |
| **Users** | [count] |
| **First Seen** | [date] |
| **Last Seen** | [date] |
| **Status** | Pending |
| **Decision Date** | [today] |

**Analysis:**
- [To be filled after investigation]

**Decision: Pending**
- Awaiting investigation via sentry-debugger
```

Insert above the "Patterns to Watch" section (create that section if it doesn't exist).

## Handoff to sentry-debugger (always repo-scoped)

The triage is project-wide; the debugger is **repo-scoped** because fixing requires the right codebase open. Always tell the user explicitly which repo to switch into before invoking `/sentry-debugger`:

| ID prefix | Switch to repo |
|-----------|----------------|
| `REACT-NATIVE-` | `/Users/letusdoit/repos/LetUsDoIT/havemakker_frontend` |
| `HAVEMAKKER-WEB-` | `/Users/letusdoit/repos/LetUsDoIT/havemakker_web` |
| `HAVEMAKKER-BACKEND-` | `/Users/letusdoit/repos/LetUsDoIT/havemakker_frontend` (edge functions in `supabase/functions`, DB in `supabase/migrations`) |

Do NOT automatically invoke the debugger — the user picks which issues are worth deep investigation.

## Noise filtering

Flag rather than hide. Categories the user has historically de-prioritized:

**Mobile (react-native):**
- Tagged `test_environment: true`
- Device signatures: `sdk_phone`, `test-keys`, `eng.` (Android emulator)
- `isSideLoaded: true`, `device.class: low` on flagship devices
- Impossible screen sizes
- Apple App Store reviewer device fingerprint: Cupertino IP + production build + `locale=en_CN` + `timezone=America/Los_Angeles` + thermal/memory stress + short window after submission

**Web (havemakker-web):**
- Meta in-app browser bridge errors — stack frames in `app://navigation_performance_logger_android` (Instagram Android) or `webkit.messageHandlers[t].postMessage` (Facebook iOS). These are Meta's own JS bridges tearing down inside their own WebViews; not our code. Family includes WEB-C, WEB-D, WEB-G and any future variants.
- Cookiebot `uc.js` / `cc.js` errors on Mobile Safari / Meta in-app browsers — Cookiebot is being replaced (see [havemakker_web#45](https://github.com/LetUsDoIT-Org/havemakker_web/issues/45)). Flag if returning post-replacement.
- Browser extension stack frames — `<anonymous>` source with no first-party frames (e.g. PrivacyBadger's `TrackerStorageType`)
- `ResizeObserver loop limit exceeded` (benign Chrome quirk)
- Bot/scraper traffic to non-existent routes (`/wp-admin`, malformed tokens)
- Non-`production` environments leaking in — flag for review
- `Users: 0` doesn't mean "no real users" — visitors aren't logged in. Cross-check with geo diversity and `browser.name` distribution before classifying as crawler-only.

**Backend (havemakker-backend):**
- `Users: 0` is the norm — backend log events have no user attribution. Severity comes from event count, `function_id` spread, and whether the error breaks a real user-facing path, not from user count.
- Geo Frankfurt am Main = Supabase eu-central server region, not a real location. Never treat backend geo as a triage signal.
- `Deno.core.runMicrotasks() is not supported` at `dispatchBeforeUnloadEvent` is a known Deno edge-runtime teardown panic (pending microtask at shutdown, usually from a `node:`-compat polyfill). Often benign shutdown noise, but a recurring one on a single `function_id` can mean a dropped/unawaited promise — flag, don't auto-dismiss.
- Postgres `RAISE EXCEPTION` (`sql_state_code: P0001`) from an RPC guard (e.g. `upsert_my_ballot: feature … does not exist or is shipped`) is **expected validation behavior**, often triggered by a stale client. The triage question is whether the *client handles it gracefully*, not whether the guard is wrong.
- One root-cause bug can fingerprint into many issues when the error message embeds variable data (a plant name, a UUID). Group by error prefix before counting "distinct" issues.

## Step 7: Actionable links

Always end the triage with clickable Sentry links:

**For resolving issues** (per project):
```
Ready to resolve:
- [REACT-NATIVE-XX](https://letusdoit.sentry.io/issues/REACT-NATIVE-XX) — Won't Fix (test env)
- [HAVEMAKKER-WEB-YY](https://letusdoit.sentry.io/issues/HAVEMAKKER-WEB-YY) — Won't Fix (Meta in-app browser noise)
```

**For dashboards:**
- All unresolved (org-wide): https://letusdoit.sentry.io/issues/?query=is%3Aunresolved
- Mobile only: https://letusdoit.sentry.io/issues/?project=react-native&query=is%3Aunresolved
- Web only: https://letusdoit.sentry.io/issues/?project=havemakker-web&query=is%3Aunresolved
- Backend only: https://letusdoit.sentry.io/issues/?project=havemakker-backend&query=is%3Aunresolved

The user should never have to navigate Sentry manually to act on triage results.

## Quick reference

```
Organization:          letusdoit
MCP server:            sentry-letusdoit
Havemakker projects:   react-native, havemakker-web, havemakker-backend
Project-wide tracker:  /Users/letusdoit/repos/LetUsDoIT/havemakker/docs/operations/sentry-issue-tracker.md
Sentry base URL:       https://letusdoit.sentry.io/issues/
Debugger handoff:      repo-scoped — see "Handoff" section above
```
