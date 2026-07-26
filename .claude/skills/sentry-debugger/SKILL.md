---
name: sentry-debugger
description: Systematically debug Sentry errors across any Havemakker Sentry project (mobile, web). Use when investigating production errors, analyzing stack traces, or handling Sentry issues. Auto-detects which project the issue belongs to from the ID prefix and applies the right framework-specific patterns. Always run from the repo that owns the failing code.
---

# Sentry Error Debugger (Havemakker)

Structured 4-phase debugging for Sentry errors across all Havemakker projects. The skill is repo-scoped — you must be in the repo that owns the failing code, because fixing requires reading and editing that codebase.

**Announce at start:** "I'm using the sentry-debugger skill to investigate this error."

## Project registry

| Sentry project | ID prefix | Owner repo | Stack |
|----------------|-----------|------------|-------|
| `react-native` | `REACT-NATIVE-` | `havemakker_frontend` | Havemakker mobile — React Native + Expo + Supabase + i18n (DA/EN) |
| `havemakker-web` | `HAVEMAKKER-WEB-` | `havemakker_web` | Havemakker marketing/landing — Next.js (App Router) + Supabase |
| `havemakker-backend` | `HAVEMAKKER-BACKEND-` | `havemakker_frontend` | Supabase edge functions (`supabase/functions`, Deno) + Postgres (`supabase/migrations`), surfaced via the `log-monitor` log→Sentry pipeline (#259) |

> Add new rows when more Havemakker projects come online.

> **Backend (`HAVEMAKKER-BACKEND-`) specifics:** events come from the `log-monitor` pipeline, not an in-app SDK — `Users: 0` always (no attribution; judge severity by event count + `function_id` spread + user-facing impact), geo Frankfurt = Supabase eu-central server region (ignore it), and one root-cause bug can fingerprint into many issues when the message embeds variable data (a plant name, a UUID) — group before counting. Useful tags: `function_id`, `query_name` (`function_logs_errors` = edge runtime, `postgres_logs_errors` = DB), `error_class`, `sql_state_code`. Edge functions parse Claude JSON via `_shared/claude-json.ts` (`parseClaudeJson`) — a `ClaudeJsonError` mentioning truncation means the model hit `max_tokens`, raise it.

**Step 0 — verify you're in the right repo.** If the issue's ID prefix doesn't match the owner repo for the current working directory, stop and tell the user to switch repos before continuing. Don't try to debug Next.js issues from `havemakker_frontend` or vice versa.

- **Sentry org slug:** `letusdoit`
- **MCP server:** `sentry-letusdoit`
- **Project-wide tracker:** `/Users/letusdoit/repos/LetUsDoIT/havemakker/docs/operations/sentry-issue-tracker.md`

## Prerequisites

Requires the Sentry MCP server. If not available, ask the user to run:

```
claude mcp add --transport http sentry-letusdoit https://mcp.sentry.dev/mcp --scope project
```

Then authenticate via `/mcp`.

## Phase 1: Error collection

### Step 1.1: Fetch error details via Sentry MCP

Use `mcp__sentry-letusdoit__get_sentry_resource` with `resourceType: 'issue'` and the issue ID. Pull:

- Error type and message
- Stack trace (note the runtime tag — `browser` / `node` / `edge` for web, or platform for mobile)
- Affected users count and event count
- First/last occurrence timestamps
- Frequency trend (increasing, stable, decreasing)
- Affected releases (Git SHA, app version, or Next.js build ID)
- For web: `url` and `http.method` tags — tells you the route that failed
- For mobile: device, OS version, app version, locale (DA/EN matters)

### Step 1.2: Ask structured questions

After fetching data, clarify with user:

1. **Impact**
   - "This affected X users in the last 24h. Is this a critical path?"
   - For mobile: "Which screen/component is this — what user action triggers it (plant tracker, garden bed, care reminder)?"
   - For web: "Is this a marketing page or admin flow? Which route?"

2. **Recent changes**
   - "When did this first appear? Did anything deploy around then (Expo OTA, store release, Vercel deploy)?"
   - "Any recent changes to the affected area you're aware of?"

3. **Reproduction**
   - "Can you reproduce locally?"
   - "All users or specific conditions (device, version, browser, locale, auth state)?"

## Phase 2: Stack trace analysis

### Step 2.1: Parse the stack trace

Identify:
- **Failure point** — exact line where the error occurred
- **Call chain** — trace backwards through function calls
- **Where it ran** —
  - Mobile: native vs JS bridge vs React Native code vs Expo module
  - Web: `sentry.client.config.ts` (browser), `sentry.server.config.ts` (Node — RSC, Route Handlers, server actions), `sentry.edge.config.ts` (middleware, edge handlers)

### Step 2.2: Classify the error type

Use the framework-specific table that matches the issue's ID prefix.

#### `REACT-NATIVE-` (Havemakker mobile — RN + Expo)

| Error type | Common causes | Investigation focus |
|------------|---------------|---------------------|
| `TypeError: Cannot read property 'x' of undefined` | Missing null checks, async timing | Add optional chaining, check data flow |
| `Network request failed` | API issues, connectivity | Check Supabase endpoints, retry logic |
| `ReferenceError` | Typo, missing import | Check imports and variable names |
| `ChunkLoadError` | Bundle issues, OTA mismatch | Check Expo updates, clear cache |
| `Invariant Violation` | Component rendered during unmount | Add cleanup in useEffect |
| `Cannot update a component from inside...` | State update during render | Move to useEffect |
| `Text strings must be rendered...` | Conditional rendering issue | Wrap in `<Text>` or use fragments |
| Metro bundler errors | Cache issues | `npx expo start --clear` |
| Push notification: token registration failed | Wrong Supabase instance | Check env (dev vs prod) |
| Push notification: not received | Token expired, bad payload | Re-register token, check payload size |
| Supabase `PGRST301` | JWT expired | Check token refresh logic |
| Supabase `42501` (RLS) | Policy violation | Review RLS — Havemakker uses household-membership patterns, not direct ownership |
| Supabase `23505` (unique) | Duplicate key | Add upsert or pre-check |
| Supabase `relation does not exist` | Missing table/migration | Check migration status |
| Missing translation key | Key not in DA/EN translation file | Add key to `src/i18n/` resources |
| Wrong language displayed | Locale detection failed | Check expo-localization config |
| Date / season mismatch | Hardcoded dates vs Danish seasons | Use locale-aware date formatting |

> Pressable styling note: a Pressable `style` *function* breaks on iOS for `backgroundColor` — wrap in a `View`. (Recurring Havemakker pattern.)

#### `HAVEMAKKER-WEB-` (web — Next.js App Router)

| Error type | Common causes (web) | Investigation focus |
|------------|---------------------|---------------------|
| `TypeError: Cannot read properties of null/undefined` | Missing null checks, optional chaining missing on Supabase response | Add `?.` |
| `fetch failed` / `ECONNREFUSED` | Server-side fetch to Supabase or external API timed out or wrong URL | Check `NEXT_PUBLIC_*` vs server-only env, retry logic |
| `AbortError` | User navigated mid-fetch — usually noise | Check whether suppression is in place |
| `Hydration failed` / `Text content did not match` | Server/client HTML mismatch | Check `Date.now()`, `Math.random()`, locale, `useEffect`-only values |
| `Dynamic server usage` | RSC used `cookies()`/`headers()` during static render | Add `export const dynamic = 'force-dynamic'` or move to client |
| `Error: NEXT_NOT_FOUND` | `notFound()` thrown unexpectedly | Check route segment, add `not-found.tsx` |
| `Body exceeded X mb limit` (server action) | Upload bigger than `serverActions.bodySizeLimit` in `next.config.ts` | Pre-flight size validation client-side; bump framework limit if needed (see WEB-A/B fix) |
| Supabase cookie write error in Server Component | Supabase client tried to set cookie mid-render | Swallow at boundary or move read to Route Handler |
| Cookiebot `uc.js` / `cc.js` errors | Third-party consent script — being replaced (see [havemakker_web#45](https://github.com/LetUsDoIT-Org/havemakker_web/issues/45)) | Wait for replacement; flag if pattern persists post-replacement |
| Meta in-app browser bridge errors (`navigation_performance_logger_android` frames, `webkit.messageHandlers[t].postMessage`) | Instagram/Facebook in-app browser bridge teardown | Not our code — classify Won't Fix unless volume rises |

### Step 2.3: Find related code

Use the **Read** tool for known file paths and the **Grep**/**Glob** tools (NOT `find`/`grep`/`rg` via Bash — globally forbidden) to search.

For git history use absolute-path form:

```
git -C /Users/letusdoit/repos/LetUsDoIT/havemakker_frontend blame <file>
git -C /Users/letusdoit/repos/LetUsDoIT/havemakker_web log --oneline -- <file>
```

## Phase 3: Reproduction hypothesis

### Step 3.1: Form 2-3 hypotheses

- What conditions trigger this? (Auth state, plant data state, household membership, locale)
- What recent change could have introduced it?
- For web: server vs client — could the env be wrong (e.g., reading a non-`NEXT_PUBLIC_` var in a client component)? Hydration mismatch? Body-size limit?
- For mobile: device-specific? Version-specific? OTA update mismatch? Locale (DA vs EN)?

### Step 3.2: Check recent changes

```
git -C <repo> log --oneline --since="<first_occurrence_date>" -- <affected_files>
git -C <repo> diff <commit_before>..<commit_after> -- <affected_files>
```

### Step 3.3: Look for patterns

Correlate with:
- Specific releases (Git SHA, app version) → points to a deploy
- Browser / OS / device — Safari quirks, Mobile Safari cookies, Android version
- Auth state (anonymous vs authenticated)
- Route (web) or screen (mobile) — marketing vs admin
- Environment (production vs preview vs dev)
- Locale (DA vs EN) — Danish users mostly Europe/Copenhagen
- Time of day (timezone issues?)
- Network conditions

## Phase 4: Root cause & fix

### Step 4.1: Identify root cause

Distinguish:
- **Symptom** — where the error appears (a toast, an error boundary, a 500)
- **Root cause** — why it occurs (a null field, missing env, stale cookie, body limit hit before pre-flight)

Example: `TypeError` in `PlantDetailScreen` → root cause: plant query returns undefined for soft-deleted plants that still appear in the user's garden list.

### Step 4.2: Suggest fix — follow the bug-fix workflow (non-negotiable)

The org's bug-fix workflow (see global CLAUDE.md):

1. Root cause via systematic-debugging
2. Write **failing test** that reproduces the bug (RED)
3. Verify RED — confirm it fails for the right reason
4. Apply minimal fix
5. Verify GREEN
6. Run full test suite for regressions

Test locations:
- Mobile (`havemakker_frontend`): Jest tests in `src/**/__tests__/`
- Web (`havemakker_web`): Vitest in `src/**/*.test.ts(x)` (per existing repo convention)

Example fix shape (mobile):

```tsx
// Before
const name = plant.name;

// After (handles null + uses Danish fallback)
const name = plant?.name ?? t('plant.unknown'); // 'Ukendt plante' / 'Unknown plant'
```

### Step 4.3: Prevention recommendations

After fixing:
1. **Defensive code** — null checks, `?.`, Zod validation at boundaries, type guards
2. **Monitoring** — scope Sentry breadcrumbs around the risky call
3. **Tests** — the failing test from step 4.2 stays as regression coverage
4. **Types** — make TypeScript catch this (mark Supabase response fields `| null` when nullable)
5. **i18n (mobile)** — if the fix introduces user-facing strings, add both DA and EN keys

## Red flags

**Never:**
- Assume the error is "random" or "one-time" without investigation
- Fix the symptom without understanding the root cause
- Skip checking recent git changes
- Conflate projects (check the ID prefix matches the current repo)
- Add an EN string without the DA counterpart (or vice versa) on mobile
- Skip the failing-test step (org-wide rule, see global CLAUDE.md)

**Always:**
- Fetch actual error data before speculating
- Check git history around first occurrence
- Consider all affected users, not just one case
- Suggest preventive measures, not just immediate fixes

## Examples

### Example 1: Mobile TypeError on PlantDetailScreen

```
User: "REACT-NATIVE-12 — TypeError in the plant tracker"

Claude: "I'm using the sentry-debugger skill.

Step 0: ID prefix is REACT-NATIVE- (mobile). I'm in havemakker_frontend ✓.

Phase 1 [fetches]:
- TypeError: Cannot read property 'careSchedule' of undefined
- Location: PlantDetailScreen.tsx:87
- Affected: 15 users in last 24h, increasing
- First seen: 2 days ago

Phase 2: Plant query returns undefined for soft-deleted plants still
appearing in the user's garden list.

Phase 3: Confirmed — the list query doesn't filter `deleted_at IS NULL`.

Phase 4 (failing test first):
1. Jest test: render PlantDetailScreen with deleted plant → expect graceful empty state
2. Verify RED
3. Filter deleted plants from the list query + null-check in the screen
4. Verify GREEN, run full suite"
```

### Example 2: Web hydration mismatch

```
User: "HAVEMAKKER-WEB-7 — Hydration failed on /forar"

Claude: "I'm using the sentry-debugger skill.

Step 0: ID prefix is HAVEMAKKER-WEB- (web). I need to be in havemakker_web."
[checks pwd; if wrong, asks user to switch repos before continuing]

Phase 1 [fetches]:
- Runtime: browser
- Route: GET /forar
- Browser tag concentrated on Safari

Phase 2: Stack points to a date-formatted string rendered server-side that uses
Date.now() — non-deterministic.

Phase 3: Confirmed by reading the component — Date.now() in render.

Phase 4 (failing test first):
1. Vitest test asserting consistent render output
2. Verify RED
3. Move Date.now() into useEffect, render placeholder during SSR
4. Verify GREEN, run full suite"
```

### Example 3: Supabase RLS error on mobile

```
User: "REACT-NATIVE-19 — 42501 errors on garden bed update"

Claude: "I'm using the sentry-debugger skill.

Phase 1: RLS policy violation. Garden beds can be shared between household
members.

Phase 2/3: Policy requires `auth.uid() = user_id` but the table supports
household-shared beds.

Phase 4 (failing test first):
1. Test: as household member B, attempt update on bed owned by member A → expect success
2. Verify RED (currently fails with 42501)
3. Update RLS policy to check household membership
4. Verify GREEN, run policy validation"
```

## Checklist

Before closing an investigation:

1. ☐ ID prefix matches the current repo (right project)
2. ☐ Root cause identified (not just symptom)
3. ☐ **Failing test written BEFORE fix** (org-wide rule — non-negotiable)
4. ☐ Fix implemented; failing test now passes (GREEN)
5. ☐ Full test suite run — no regressions
6. ☐ Prevention measures documented
7. ☐ DA + EN strings updated together if user-facing copy changed (mobile)
8. ☐ **Decision recorded in project-wide tracker** (see below)

## Issue tracking

All investigated Sentry issues across all Havemakker projects are documented in **one** project-wide tracker:

`/Users/letusdoit/repos/LetUsDoIT/havemakker/docs/operations/sentry-issue-tracker.md`

If pre-consolidation per-repo trackers still exist (`havemakker_frontend/docs/operations/sentry-issue-tracker.md`, `havemakker_web/docs/operations/sentry-issue-tracker.md`), migrate entries to the project-wide tracker on next triage and stop appending to the old ones.

Tracker entry format — see the sentry-triage skill, "Add to tracker" section.

### Test device artifacts (mobile)

Before treating an ANR or crash as production, check for emulator/test device signatures:

| Indicator | Meaning |
|-----------|---------|
| OS build contains `sdk_phone`, `test-keys`, or `eng.` | Android emulator |
| `isSideLoaded: true` | APK installed directly, not from store |
| `device.class: low` + Pixel device | Likely emulator |
| Cupertino IP + `locale=en_CN` + `timezone=America/Los_Angeles` + thermal stress shortly after App Store submission | Apple App Store reviewer device |

Often noise that doesn't represent real user experience.
