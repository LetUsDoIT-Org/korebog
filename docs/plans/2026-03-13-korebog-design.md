# Kørebog App - Design Document

## Purpose

Personal kørebog (driving logbook) PWA that meets Danish SKAT requirements for documenting business driving. Supports both self-employed and employee use cases. Primary design goal: registering a repeat trip in 2 taps, a new trip in under 10 seconds.

## Tech Stack

- **Next.js 15** (App Router) - framework
- **Supabase** - Postgres DB + auth (magic link)
- **Tailwind CSS** - styling
- **Google Maps Places + Directions API** - address autocomplete + distance calculation
- **PWA** - service worker, manifest, installable
- **Vercel** - hosting

## Data Model

### vehicles
- `id` (uuid, PK)
- `name` (text)
- `registration_number` (text)
- `is_default` (boolean)
- `created_at` (timestamptz)

### odometer_readings
- `id` (uuid, PK)
- `vehicle_id` (uuid, FK → vehicles)
- `reading_km` (integer)
- `date` (date)
- `note` (text, nullable)
- `created_at` (timestamptz)

### trips
- `id` (uuid, PK)
- `vehicle_id` (uuid, FK → vehicles, nullable for public transport)
- `date` (date)
- `purpose` (text)
- `start_address` (text)
- `end_address` (text)
- `distance_km` (numeric)
- `is_business` (boolean, default true)
- `transport_type` (text, default 'car') — 'car' or 'public_transport'
- `gps_track` (jsonb, nullable) — array of {lat, lng, timestamp}
- `created_at` (timestamptz)

### favorite_trips
- `id` (uuid, PK)
- `label` (text) — display name on the card, e.g. "Kundemøde - Acme"
- `purpose` (text)
- `start_address` (text)
- `end_address` (text)
- `distance_km` (numeric)
- `sort_order` (integer)
- `created_at` (timestamptz)

All tables have RLS policies filtering by `auth.uid()`.

No rate calculation — the app logs facts (distance, route, purpose, date). Payout calculation happens outside the app.

## User Flows

### 1. Quick trip registration (2 taps)
Home screen shows favorite trip cards. Tap a card → trip saved with today's date, default vehicle, pre-filled addresses/purpose/distance. Done.

### 2. New trip (under 10 seconds)
Tap "New trip" → address autocomplete → distance auto-calculated → type purpose → save. Option to "Save as favorite" after saving.

### 3. GPS-tracked trip
Tap "Start tracking" → GPS records coordinates while app is open → tap "Stop" → addresses reverse geocoded from first/last coordinates → distance from GPS path → select/type purpose → save. Vehicle auto-selected.

### 4. Odometer reading (self-employed)
From vehicle page → "Log odometer" → app suggests start value based on last end-reading + estimated km (24.000 km/year prorated by days elapsed) → +50/-50 buttons for quick adjustment → save.

### 5. Vehicle handling
Default vehicle auto-selected on every trip. Small "Change vehicle" link available but never a blocking step. Public transport toggle hides vehicle/odometer fields.

## Pages

1. **Home (/)** — Month stats at top, favorite trip cards grid, "Start GPS" button, "New trip" button
2. **Trips (/trips)** — All trips list, filterable by month/year. Tap to edit/delete.
3. **Vehicle (/vehicle)** — Default vehicle settings, registration number, odometer reading log
4. **Export (/export)** — Date range picker, preview, PDF/CSV download with all SKAT fields
5. **Settings (/settings)** — User profile (name, address, CPR/employee nr), manage favorites, default vehicle

**Navigation:** Bottom tab bar with 3 tabs (Home, Trips, Vehicle). Export and Settings via menu icon.

## Offline & PWA

- App shell cached by service worker for instant load
- Offline trips stored in IndexedDB, synced to Supabase when online
- Banner shows "X trips waiting to sync" when offline trips exist
- GPS uses browser Geolocation API (watchPosition), requires app in foreground
- Wake Lock API keeps screen on during GPS tracking
- If user switches away during tracking, trip is flagged for manual distance review

## Export Format

PDF/CSV containing per-trip:
- Date
- Purpose
- Start address
- End address
- Distance (km)
- Vehicle registration number
- Transport type

Header includes: user name, address, CPR/employee number.
For self-employed: odometer readings for the selected period included.

## Design Style

- Clean, minimal, large tap targets (mobile-first)
- Danish language UI
- Dark mode via Tailwind `dark:` classes
