# Kørebog Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a personal PWA kørebog (driving logbook) that lets you register a repeat trip in 2 taps and meets Danish SKAT documentation requirements.

**Architecture:** Next.js 15 App Router PWA with Supabase backend (Postgres + Auth). Google Maps API for address autocomplete and distance calculation. Offline-first with IndexedDB queue synced to Supabase. Deployed on Vercel.

**Tech Stack:** Next.js 15, React 19, Supabase (JS client v2), Tailwind CSS v4, Google Maps Places/Directions API, next-pwa, Vitest, React Testing Library

**Design doc:** `docs/plans/2026-03-13-korebog-design.md`

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Create: `.env.local.example`
- Create: `vitest.config.ts`, `vitest.setup.ts`

**Step 1: Scaffold Next.js project**

```bash
cd /Users/letusdoit/repos/LetUsDoIT/Kørebog
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Accept defaults. This creates the full Next.js 15 project structure.

**Step 2: Install test dependencies**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @vitejs/plugin-react jsdom
```

**Step 3: Create vitest config**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

Create `vitest.setup.ts`:
```typescript
import '@testing-library/jest-dom/vitest'
```

**Step 4: Add test script to package.json**

Add to `"scripts"`:
```json
"test": "vitest",
"test:run": "vitest run"
```

**Step 5: Create .env.local.example**

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key
```

**Step 6: Verify setup**

```bash
npm run dev
# Should start on localhost:3000

npm run test:run
# Should pass (no tests yet, exit 0)
```

**Step 7: Commit**

```bash
git init
git add .
git commit -m "chore: scaffold Next.js 15 project with Vitest"
```

---

## Task 2: Supabase Client & Types

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/types/database.ts`

**Step 1: Install Supabase dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr
```

**Step 2: Create database types**

Create `src/types/database.ts`:
```typescript
export type Vehicle = {
  id: string
  user_id: string
  name: string
  registration_number: string
  is_default: boolean
  created_at: string
}

export type OdometerReading = {
  id: string
  user_id: string
  vehicle_id: string
  reading_km: number
  date: string
  note: string | null
  created_at: string
}

export type Trip = {
  id: string
  user_id: string
  vehicle_id: string | null
  date: string
  purpose: string
  start_address: string
  end_address: string
  distance_km: number
  is_business: boolean
  transport_type: 'car' | 'public_transport'
  gps_track: Array<{ lat: number; lng: number; timestamp: number }> | null
  created_at: string
}

export type FavoriteTrip = {
  id: string
  user_id: string
  label: string
  purpose: string
  start_address: string
  end_address: string
  distance_km: number
  sort_order: number
  created_at: string
}

export type UserProfile = {
  id: string
  user_id: string
  full_name: string
  address: string
  identifier: string // CPR or employee number
  identifier_type: 'cpr' | 'employee_number'
  created_at: string
}
```

**Step 3: Create browser Supabase client**

Create `src/lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Step 4: Create server Supabase client**

Create `src/lib/supabase/server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component - ignore
          }
        },
      },
    }
  )
}
```

**Step 5: Commit**

```bash
git add src/lib/supabase src/types/database.ts
git commit -m "feat: add Supabase client setup and database types"
```

---

## Task 3: Supabase Database Schema (SQL Migration)

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

**Step 1: Create migration file**

Create `supabase/migrations/001_initial_schema.sql`:
```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Vehicles
create table vehicles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  registration_number text not null,
  is_default boolean default false,
  created_at timestamptz default now()
);

alter table vehicles enable row level security;
create policy "Users manage own vehicles"
  on vehicles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Odometer readings
create table odometer_readings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  vehicle_id uuid references vehicles(id) on delete cascade not null,
  reading_km integer not null,
  date date not null default current_date,
  note text,
  created_at timestamptz default now()
);

alter table odometer_readings enable row level security;
create policy "Users manage own odometer readings"
  on odometer_readings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Trips
create table trips (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  vehicle_id uuid references vehicles(id) on delete set null,
  date date not null default current_date,
  purpose text not null,
  start_address text not null,
  end_address text not null,
  distance_km numeric(10,2) not null,
  is_business boolean default true,
  transport_type text default 'car' check (transport_type in ('car', 'public_transport')),
  gps_track jsonb,
  created_at timestamptz default now()
);

alter table trips enable row level security;
create policy "Users manage own trips"
  on trips for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Favorite trips
create table favorite_trips (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  label text not null,
  purpose text not null,
  start_address text not null,
  end_address text not null,
  distance_km numeric(10,2) not null,
  sort_order integer default 0,
  created_at timestamptz default now()
);

alter table favorite_trips enable row level security;
create policy "Users manage own favorite trips"
  on favorite_trips for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- User profiles
create table user_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  full_name text not null default '',
  address text not null default '',
  identifier text not null default '',
  identifier_type text default 'cpr' check (identifier_type in ('cpr', 'employee_number')),
  created_at timestamptz default now()
);

alter table user_profiles enable row level security;
create policy "Users manage own profile"
  on user_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Indexes
create index idx_trips_user_date on trips(user_id, date desc);
create index idx_trips_vehicle on trips(vehicle_id);
create index idx_odometer_vehicle_date on odometer_readings(vehicle_id, date desc);
create index idx_favorite_trips_user_sort on favorite_trips(user_id, sort_order);
```

**Step 2: Apply migration**

Go to your Supabase project dashboard → SQL Editor → paste and run the migration. Or if using Supabase CLI:

```bash
npx supabase db push
```

**Step 3: Commit**

```bash
git add supabase/
git commit -m "feat: add database schema with RLS policies"
```

---

## Task 4: Auth - Magic Link Login

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/app/auth/callback/route.ts`
- Create: `src/middleware.ts`
- Test: `src/__tests__/login.test.tsx`

**Step 1: Write the failing test**

Create `src/__tests__/login.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import LoginPage from '@/app/login/page'

describe('LoginPage', () => {
  it('renders email input and login button', () => {
    render(<LoginPage />)
    expect(screen.getByPlaceholderText('din@email.dk')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log ind/i })).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/__tests__/login.test.tsx
```

Expected: FAIL — module not found.

**Step 3: Implement login page**

Create `src/app/login/page.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Tjek din email</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Vi har sendt et login-link til {email}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-center">Kørebog</h1>
        <input
          type="email"
          placeholder="din@email.dk"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-lg border p-3 text-lg dark:bg-gray-800 dark:border-gray-700"
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 p-3 text-lg text-white font-semibold hover:bg-blue-700"
        >
          Log ind
        </button>
      </form>
    </div>
  )
}
```

**Step 4: Create auth callback route**

Create `src/app/auth/callback/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(origin)
}
```

**Step 5: Create auth middleware**

Create `src/middleware.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && !request.nextUrl.pathname.startsWith('/login') && !request.nextUrl.pathname.startsWith('/auth')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && request.nextUrl.pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

**Step 6: Run test to verify it passes**

```bash
npm run test:run -- src/__tests__/login.test.tsx
```

Expected: PASS

**Step 7: Commit**

```bash
git add src/app/login src/app/auth src/middleware.ts src/__tests__/login.test.tsx
git commit -m "feat: add magic link auth with middleware redirect"
```

---

## Task 5: Bottom Navigation Layout

**Files:**
- Create: `src/components/BottomNav.tsx`
- Modify: `src/app/layout.tsx`
- Test: `src/__tests__/bottom-nav.test.tsx`

**Step 1: Write the failing test**

Create `src/__tests__/bottom-nav.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { BottomNav } from '@/components/BottomNav'

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}))

describe('BottomNav', () => {
  it('renders three navigation tabs', () => {
    render(<BottomNav />)
    expect(screen.getByText('Hjem')).toBeInTheDocument()
    expect(screen.getByText('Ture')).toBeInTheDocument()
    expect(screen.getByText('Bil')).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/__tests__/bottom-nav.test.tsx
```

Expected: FAIL

**Step 3: Implement BottomNav**

Create `src/components/BottomNav.tsx`:
```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/', label: 'Hjem', icon: '🏠' },
  { href: '/trips', label: 'Ture', icon: '🛣️' },
  { href: '/vehicle', label: 'Bil', icon: '🚗' },
] as const

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t bg-white dark:bg-gray-900 dark:border-gray-800 safe-bottom">
      <div className="flex justify-around">
        {tabs.map((tab) => {
          const active = pathname === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center py-2 px-4 text-sm ${
                active
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
```

**Step 4: Update layout.tsx**

Modify `src/app/layout.tsx` — wrap `{children}` with padding for the bottom nav and add `<BottomNav />`:

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { BottomNav } from '@/components/BottomNav'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Kørebog',
  description: 'Registrer erhvervsmæssig kørsel',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="da">
      <body className={`${inter.className} bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100`}>
        <main className="pb-20 min-h-screen">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  )
}
```

**Step 5: Run test to verify it passes**

```bash
npm run test:run -- src/__tests__/bottom-nav.test.tsx
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/components/BottomNav.tsx src/app/layout.tsx src/__tests__/bottom-nav.test.tsx
git commit -m "feat: add bottom navigation with Hjem, Ture, Bil tabs"
```

---

## Task 6: Vehicle Management Page

**Files:**
- Create: `src/app/vehicle/page.tsx`
- Create: `src/lib/api/vehicles.ts`
- Test: `src/__tests__/vehicle-page.test.tsx`

**Step 1: Write the failing test**

Create `src/__tests__/vehicle-page.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { VehicleForm } from '@/components/VehicleForm'

describe('VehicleForm', () => {
  it('renders vehicle name and registration fields', () => {
    render(<VehicleForm onSave={vi.fn()} />)
    expect(screen.getByPlaceholderText('Bilens navn')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Registreringsnummer')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /gem/i })).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/__tests__/vehicle-page.test.tsx
```

Expected: FAIL

**Step 3: Create vehicle API helpers**

Create `src/lib/api/vehicles.ts`:
```typescript
import { createClient } from '@/lib/supabase/client'
import type { Vehicle } from '@/types/database'

export async function getVehicles(): Promise<Vehicle[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .order('is_default', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getDefaultVehicle(): Promise<Vehicle | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('vehicles')
    .select('*')
    .eq('is_default', true)
    .single()
  return data
}

export async function upsertVehicle(vehicle: Partial<Vehicle> & { name: string; registration_number: string }): Promise<Vehicle> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('vehicles')
    .upsert({ ...vehicle, user_id: user.id, is_default: true })
    .select()
    .single()
  if (error) throw error
  return data
}
```

**Step 4: Create VehicleForm component**

Create `src/components/VehicleForm.tsx`:
```tsx
'use client'

import { useState } from 'react'
import type { Vehicle } from '@/types/database'

type Props = {
  vehicle?: Vehicle | null
  onSave: (data: { name: string; registration_number: string }) => void
}

export function VehicleForm({ vehicle, onSave }: Props) {
  const [name, setName] = useState(vehicle?.name ?? '')
  const [regNr, setRegNr] = useState(vehicle?.registration_number ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave({ name, registration_number: regNr })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        placeholder="Bilens navn"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className="w-full rounded-lg border p-3 text-lg dark:bg-gray-800 dark:border-gray-700"
      />
      <input
        type="text"
        placeholder="Registreringsnummer"
        value={regNr}
        onChange={(e) => setRegNr(e.target.value.toUpperCase())}
        required
        className="w-full rounded-lg border p-3 text-lg dark:bg-gray-800 dark:border-gray-700"
      />
      <button
        type="submit"
        className="w-full rounded-lg bg-blue-600 p-3 text-lg text-white font-semibold hover:bg-blue-700"
      >
        Gem
      </button>
    </form>
  )
}
```

**Step 5: Create vehicle page**

Create `src/app/vehicle/page.tsx`:
```tsx
'use client'

import { useEffect, useState } from 'react'
import { VehicleForm } from '@/components/VehicleForm'
import { getDefaultVehicle, upsertVehicle } from '@/lib/api/vehicles'
import type { Vehicle } from '@/types/database'

export default function VehiclePage() {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDefaultVehicle().then((v) => { setVehicle(v); setLoading(false) })
  }, [])

  async function handleSave(data: { name: string; registration_number: string }) {
    const saved = await upsertVehicle({ ...data, id: vehicle?.id })
    setVehicle(saved)
  }

  if (loading) return <div className="p-4">Indlæser...</div>

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Din bil</h1>
      <VehicleForm vehicle={vehicle} onSave={handleSave} />
    </div>
  )
}
```

**Step 6: Run test to verify it passes**

```bash
npm run test:run -- src/__tests__/vehicle-page.test.tsx
```

Expected: PASS

**Step 7: Commit**

```bash
git add src/app/vehicle src/components/VehicleForm.tsx src/lib/api/vehicles.ts src/__tests__/vehicle-page.test.tsx
git commit -m "feat: add vehicle management page with form"
```

---

## Task 7: Odometer Readings

**Files:**
- Create: `src/components/OdometerForm.tsx`
- Create: `src/lib/api/odometer.ts`
- Test: `src/__tests__/odometer-form.test.tsx`

**Step 1: Write the failing test**

Create `src/__tests__/odometer-form.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { OdometerForm } from '@/components/OdometerForm'

describe('OdometerForm', () => {
  it('renders estimated reading and adjustment buttons', () => {
    render(
      <OdometerForm
        lastReading={{ km: 50000, date: '2026-03-01' }}
        onSave={vi.fn()}
      />
    )
    expect(screen.getByText('+50')).toBeInTheDocument()
    expect(screen.getByText('-50')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /gem aflæsning/i })).toBeInTheDocument()
  })

  it('estimates km based on 24000 km/year from last reading', () => {
    // Last reading was 30 days ago at 50000 km
    // 24000 / 365 * 30 ≈ 1973
    // Estimated: ~51973
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    render(
      <OdometerForm
        lastReading={{ km: 50000, date: thirtyDaysAgo.toISOString().split('T')[0] }}
        onSave={vi.fn()}
      />
    )
    const input = screen.getByRole('spinbutton') as HTMLInputElement
    const value = parseInt(input.value)
    expect(value).toBeGreaterThan(51900)
    expect(value).toBeLessThan(52100)
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/__tests__/odometer-form.test.tsx
```

Expected: FAIL

**Step 3: Create odometer API helpers**

Create `src/lib/api/odometer.ts`:
```typescript
import { createClient } from '@/lib/supabase/client'
import type { OdometerReading } from '@/types/database'

export async function getLatestReading(vehicleId: string): Promise<OdometerReading | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('odometer_readings')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('date', { ascending: false })
    .limit(1)
    .single()
  return data
}

export async function getReadings(vehicleId: string): Promise<OdometerReading[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('odometer_readings')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('date', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function saveReading(vehicleId: string, readingKm: number, date: string, note?: string): Promise<OdometerReading> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('odometer_readings')
    .insert({ user_id: user.id, vehicle_id: vehicleId, reading_km: readingKm, date, note: note ?? null })
    .select()
    .single()
  if (error) throw error
  return data
}

export function estimateCurrentKm(lastKm: number, lastDate: string): number {
  const daysSince = Math.floor(
    (Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)
  )
  const estimatedKmPerDay = 24000 / 365
  return Math.round(lastKm + daysSince * estimatedKmPerDay)
}
```

**Step 4: Create OdometerForm component**

Create `src/components/OdometerForm.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { estimateCurrentKm } from '@/lib/api/odometer'

type Props = {
  lastReading: { km: number; date: string } | null
  onSave: (km: number) => void
}

export function OdometerForm({ lastReading, onSave }: Props) {
  const estimated = lastReading
    ? estimateCurrentKm(lastReading.km, lastReading.date)
    : 0

  const [km, setKm] = useState(estimated)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => setKm((k) => k - 50)}
          className="rounded-lg bg-gray-200 dark:bg-gray-700 px-4 py-3 text-lg font-bold"
        >
          -50
        </button>
        <input
          type="number"
          value={km}
          onChange={(e) => setKm(parseInt(e.target.value) || 0)}
          className="w-32 rounded-lg border p-3 text-center text-xl font-mono dark:bg-gray-800 dark:border-gray-700"
        />
        <button
          type="button"
          onClick={() => setKm((k) => k + 50)}
          className="rounded-lg bg-gray-200 dark:bg-gray-700 px-4 py-3 text-lg font-bold"
        >
          +50
        </button>
      </div>
      {lastReading && (
        <p className="text-center text-sm text-gray-500">
          Sidste aflæsning: {lastReading.km.toLocaleString('da-DK')} km ({lastReading.date})
        </p>
      )}
      <button
        onClick={() => onSave(km)}
        className="w-full rounded-lg bg-blue-600 p-3 text-lg text-white font-semibold hover:bg-blue-700"
      >
        Gem aflæsning
      </button>
    </div>
  )
}
```

**Step 5: Run test to verify it passes**

```bash
npm run test:run -- src/__tests__/odometer-form.test.tsx
```

Expected: PASS

**Step 6: Add OdometerForm to vehicle page**

Modify `src/app/vehicle/page.tsx` — add an "Odometer" section below the vehicle form that loads the latest reading and renders `<OdometerForm />`. Wire up `onSave` to call `saveReading()`.

**Step 7: Commit**

```bash
git add src/components/OdometerForm.tsx src/lib/api/odometer.ts src/__tests__/odometer-form.test.tsx src/app/vehicle/page.tsx
git commit -m "feat: add odometer readings with smart estimation and +/-50 buttons"
```

---

## Task 8: Google Maps Address Autocomplete

**Files:**
- Create: `src/components/AddressInput.tsx`
- Create: `src/lib/maps.ts`
- Test: `src/__tests__/address-input.test.tsx`

**Step 1: Install Google Maps library**

```bash
npm install @react-google-maps/api
```

**Step 2: Write the failing test**

Create `src/__tests__/address-input.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AddressInput } from '@/components/AddressInput'

vi.mock('@react-google-maps/api', () => ({
  useLoadScript: () => ({ isLoaded: true }),
  Autocomplete: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

describe('AddressInput', () => {
  it('renders input with provided placeholder', () => {
    render(<AddressInput placeholder="Startadresse" value="" onChange={vi.fn()} />)
    expect(screen.getByPlaceholderText('Startadresse')).toBeInTheDocument()
  })
})
```

**Step 3: Run test to verify it fails**

```bash
npm run test:run -- src/__tests__/address-input.test.tsx
```

Expected: FAIL

**Step 4: Create AddressInput component**

Create `src/components/AddressInput.tsx`:
```tsx
'use client'

import { useRef } from 'react'
import { Autocomplete, useLoadScript } from '@react-google-maps/api'

const libraries: ('places')[] = ['places']

type Props = {
  placeholder: string
  value: string
  onChange: (address: string) => void
}

export function AddressInput({ placeholder, value, onChange }: Props) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries,
  })

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

  function onPlaceChanged() {
    const place = autocompleteRef.current?.getPlace()
    if (place?.formatted_address) {
      onChange(place.formatted_address)
    }
  }

  if (!isLoaded) {
    return (
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border p-3 text-lg dark:bg-gray-800 dark:border-gray-700"
      />
    )
  }

  return (
    <Autocomplete
      onLoad={(a) => (autocompleteRef.current = a)}
      onPlaceChanged={onPlaceChanged}
      options={{ componentRestrictions: { country: 'dk' }, types: ['address'] }}
    >
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border p-3 text-lg dark:bg-gray-800 dark:border-gray-700"
      />
    </Autocomplete>
  )
}
```

**Step 5: Create distance calculation helper**

Create `src/lib/maps.ts`:
```typescript
export async function calculateDistance(
  origin: string,
  destination: string
): Promise<number | null> {
  const res = await fetch(
    `/api/distance?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`
  )
  if (!res.ok) return null
  const data = await res.json()
  return data.distanceKm
}
```

Create `src/app/api/distance/route.ts` (server-side to protect API key):
```typescript
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const origin = searchParams.get('origin')
  const destination = searchParams.get('destination')

  if (!origin || !destination) {
    return NextResponse.json({ error: 'Missing origin or destination' }, { status: 400 })
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&key=${apiKey}`

  const res = await fetch(url)
  const data = await res.json()

  if (data.routes?.length > 0) {
    const meters = data.routes[0].legs[0].distance.value
    return NextResponse.json({ distanceKm: Math.round(meters / 100) / 10 })
  }

  return NextResponse.json({ error: 'No route found' }, { status: 404 })
}
```

**Step 6: Run test to verify it passes**

```bash
npm run test:run -- src/__tests__/address-input.test.tsx
```

Expected: PASS

**Step 7: Commit**

```bash
git add src/components/AddressInput.tsx src/lib/maps.ts src/app/api/distance src/__tests__/address-input.test.tsx
git commit -m "feat: add Google Maps address autocomplete and distance calculation"
```

---

## Task 9: New Trip Form

**Files:**
- Create: `src/components/TripForm.tsx`
- Create: `src/lib/api/trips.ts`
- Test: `src/__tests__/trip-form.test.tsx`

**Step 1: Write the failing test**

Create `src/__tests__/trip-form.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TripForm } from '@/components/TripForm'

vi.mock('@react-google-maps/api', () => ({
  useLoadScript: () => ({ isLoaded: false }),
  Autocomplete: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

describe('TripForm', () => {
  it('renders all required fields', () => {
    render(<TripForm onSave={vi.fn()} />)
    expect(screen.getByPlaceholderText('Startadresse')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Slutadresse')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Formål')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /gem tur/i })).toBeInTheDocument()
  })

  it('defaults to today and business trip', () => {
    render(<TripForm onSave={vi.fn()} />)
    const dateInput = screen.getByDisplayValue(new Date().toISOString().split('T')[0])
    expect(dateInput).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/__tests__/trip-form.test.tsx
```

Expected: FAIL

**Step 3: Create trip API helpers**

Create `src/lib/api/trips.ts`:
```typescript
import { createClient } from '@/lib/supabase/client'
import type { Trip } from '@/types/database'

export async function saveTrip(trip: Omit<Trip, 'id' | 'user_id' | 'created_at'>): Promise<Trip> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('trips')
    .insert({ ...trip, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getTrips(year: number, month: number): Promise<Trip[]> {
  const supabase = createClient()
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = month === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2, '0')}-01`

  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .gte('date', startDate)
    .lt('date', endDate)
    .order('date', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function deleteTrip(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('trips').delete().eq('id', id)
  if (error) throw error
}

export async function updateTrip(id: string, updates: Partial<Trip>): Promise<Trip> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('trips')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}
```

**Step 4: Create TripForm component**

Create `src/components/TripForm.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { AddressInput } from './AddressInput'
import { calculateDistance } from '@/lib/maps'

type TripData = {
  date: string
  purpose: string
  start_address: string
  end_address: string
  distance_km: number
  is_business: boolean
  transport_type: 'car' | 'public_transport'
}

type Props = {
  onSave: (data: TripData) => void
  initial?: Partial<TripData>
}

export function TripForm({ onSave, initial }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(initial?.date ?? today)
  const [purpose, setPurpose] = useState(initial?.purpose ?? '')
  const [startAddress, setStartAddress] = useState(initial?.start_address ?? '')
  const [endAddress, setEndAddress] = useState(initial?.end_address ?? '')
  const [distanceKm, setDistanceKm] = useState(initial?.distance_km ?? 0)
  const [isBusiness, setIsBusiness] = useState(initial?.is_business ?? true)
  const [transportType, setTransportType] = useState<'car' | 'public_transport'>(
    initial?.transport_type ?? 'car'
  )
  const [calculating, setCalculating] = useState(false)

  async function handleAddressChange(field: 'start' | 'end', address: string) {
    if (field === 'start') setStartAddress(address)
    else setEndAddress(address)

    const start = field === 'start' ? address : startAddress
    const end = field === 'end' ? address : endAddress

    if (start && end) {
      setCalculating(true)
      const km = await calculateDistance(start, end)
      if (km !== null) setDistanceKm(km)
      setCalculating(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave({
      date,
      purpose,
      start_address: startAddress,
      end_address: endAddress,
      distance_km: distanceKm,
      is_business: isBusiness,
      transport_type: transportType,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="w-full rounded-lg border p-3 text-lg dark:bg-gray-800 dark:border-gray-700"
      />

      <AddressInput
        placeholder="Startadresse"
        value={startAddress}
        onChange={(a) => handleAddressChange('start', a)}
      />

      <AddressInput
        placeholder="Slutadresse"
        value={endAddress}
        onChange={(a) => handleAddressChange('end', a)}
      />

      <div className="flex items-center gap-3">
        <input
          type="number"
          step="0.1"
          value={distanceKm || ''}
          onChange={(e) => setDistanceKm(parseFloat(e.target.value) || 0)}
          placeholder="Km"
          className="w-24 rounded-lg border p-3 text-lg text-center dark:bg-gray-800 dark:border-gray-700"
        />
        <span className="text-gray-500">km</span>
        {calculating && <span className="text-sm text-gray-400">Beregner...</span>}
      </div>

      <input
        type="text"
        placeholder="Formål"
        value={purpose}
        onChange={(e) => setPurpose(e.target.value)}
        required
        className="w-full rounded-lg border p-3 text-lg dark:bg-gray-800 dark:border-gray-700"
      />

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setIsBusiness(true)}
          className={`flex-1 rounded-lg p-3 text-center font-semibold ${
            isBusiness ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          Erhverv
        </button>
        <button
          type="button"
          onClick={() => setIsBusiness(false)}
          className={`flex-1 rounded-lg p-3 text-center font-semibold ${
            !isBusiness ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          Privat
        </button>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setTransportType('car')}
          className={`flex-1 rounded-lg p-3 text-center ${
            transportType === 'car' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          Bil
        </button>
        <button
          type="button"
          onClick={() => setTransportType('public_transport')}
          className={`flex-1 rounded-lg p-3 text-center ${
            transportType === 'public_transport' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          Offentlig transport
        </button>
      </div>

      <button
        type="submit"
        className="w-full rounded-lg bg-green-600 p-3 text-lg text-white font-semibold hover:bg-green-700"
      >
        Gem tur
      </button>
    </form>
  )
}
```

**Step 5: Run test to verify it passes**

```bash
npm run test:run -- src/__tests__/trip-form.test.tsx
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/components/TripForm.tsx src/lib/api/trips.ts src/__tests__/trip-form.test.tsx
git commit -m "feat: add trip registration form with address autocomplete and distance calculation"
```

---

## Task 10: Favorite Trips (2-Tap Registration)

**Files:**
- Create: `src/components/FavoriteTripCard.tsx`
- Create: `src/lib/api/favorites.ts`
- Test: `src/__tests__/favorite-trip-card.test.tsx`

**Step 1: Write the failing test**

Create `src/__tests__/favorite-trip-card.test.tsx`:
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { FavoriteTripCard } from '@/components/FavoriteTripCard'

describe('FavoriteTripCard', () => {
  const favorite = {
    id: '1',
    label: 'Kundemøde - Acme',
    purpose: 'Kundemøde',
    start_address: 'Kontoret, København',
    end_address: 'Acme A/S, Aarhus',
    distance_km: 312,
    sort_order: 0,
    user_id: 'u1',
    created_at: '',
  }

  it('renders label and distance', () => {
    render(<FavoriteTripCard favorite={favorite} onTap={vi.fn()} />)
    expect(screen.getByText('Kundemøde - Acme')).toBeInTheDocument()
    expect(screen.getByText('312 km')).toBeInTheDocument()
  })

  it('calls onTap when clicked', () => {
    const onTap = vi.fn()
    render(<FavoriteTripCard favorite={favorite} onTap={onTap} />)
    fireEvent.click(screen.getByText('Kundemøde - Acme'))
    expect(onTap).toHaveBeenCalledWith(favorite)
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/__tests__/favorite-trip-card.test.tsx
```

Expected: FAIL

**Step 3: Create favorites API helpers**

Create `src/lib/api/favorites.ts`:
```typescript
import { createClient } from '@/lib/supabase/client'
import type { FavoriteTrip } from '@/types/database'

export async function getFavorites(): Promise<FavoriteTrip[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('favorite_trips')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return data ?? []
}

export async function saveFavorite(fav: Omit<FavoriteTrip, 'id' | 'user_id' | 'created_at'>): Promise<FavoriteTrip> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('favorite_trips')
    .insert({ ...fav, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteFavorite(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('favorite_trips').delete().eq('id', id)
  if (error) throw error
}
```

**Step 4: Create FavoriteTripCard component**

Create `src/components/FavoriteTripCard.tsx`:
```tsx
import type { FavoriteTrip } from '@/types/database'

type Props = {
  favorite: FavoriteTrip
  onTap: (fav: FavoriteTrip) => void
}

export function FavoriteTripCard({ favorite, onTap }: Props) {
  return (
    <button
      onClick={() => onTap(favorite)}
      className="w-full rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-800 p-4 text-left shadow-sm hover:shadow-md active:scale-95 transition-all"
    >
      <p className="font-semibold text-lg">{favorite.label}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        {favorite.start_address} → {favorite.end_address}
      </p>
      <p className="text-sm font-mono text-blue-600 dark:text-blue-400 mt-1">
        {favorite.distance_km} km
      </p>
    </button>
  )
}
```

**Step 5: Run test to verify it passes**

```bash
npm run test:run -- src/__tests__/favorite-trip-card.test.tsx
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/components/FavoriteTripCard.tsx src/lib/api/favorites.ts src/__tests__/favorite-trip-card.test.tsx
git commit -m "feat: add favorite trip cards for 2-tap registration"
```

---

## Task 11: Home Page

**Files:**
- Modify: `src/app/page.tsx`
- Test: `src/__tests__/home-page.test.tsx`

**Step 1: Write the failing test**

Create `src/__tests__/home-page.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { HomeContent } from '@/components/HomeContent'

vi.mock('@react-google-maps/api', () => ({
  useLoadScript: () => ({ isLoaded: false }),
  Autocomplete: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

describe('HomeContent', () => {
  it('renders month stats and action buttons', () => {
    render(
      <HomeContent
        favorites={[]}
        monthStats={{ totalKm: 0, tripCount: 0 }}
        onFavoriteTap={vi.fn()}
      />
    )
    expect(screen.getByText(/denne måned/i)).toBeInTheDocument()
    expect(screen.getByText(/ny tur/i)).toBeInTheDocument()
    expect(screen.getByText(/start gps/i)).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/__tests__/home-page.test.tsx
```

Expected: FAIL

**Step 3: Create HomeContent component**

Create `src/components/HomeContent.tsx`:
```tsx
'use client'

import { useState } from 'react'
import type { FavoriteTrip } from '@/types/database'
import { FavoriteTripCard } from './FavoriteTripCard'
import { TripForm } from './TripForm'

type Props = {
  favorites: FavoriteTrip[]
  monthStats: { totalKm: number; tripCount: number }
  onFavoriteTap: (fav: FavoriteTrip) => void
}

export function HomeContent({ favorites, monthStats, onFavoriteTap }: Props) {
  const [showNewTrip, setShowNewTrip] = useState(false)

  const monthName = new Date().toLocaleDateString('da-DK', { month: 'long', year: 'numeric' })

  return (
    <div className="p-4 max-w-lg mx-auto space-y-6">
      {/* Month stats */}
      <div className="rounded-xl bg-blue-50 dark:bg-blue-950 p-4 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">Denne måned - {monthName}</p>
        <p className="text-3xl font-bold mt-1">{monthStats.totalKm} km</p>
        <p className="text-sm text-gray-500">{monthStats.tripCount} ture</p>
      </div>

      {/* Favorite trips */}
      {favorites.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Hurtig registrering</h2>
          <div className="grid grid-cols-1 gap-3">
            {favorites.map((fav) => (
              <FavoriteTripCard key={fav.id} favorite={fav} onTap={onFavoriteTap} />
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setShowNewTrip(true)}
          className="flex-1 rounded-lg bg-green-600 p-4 text-white font-semibold text-lg hover:bg-green-700"
        >
          Ny tur
        </button>
        <button
          onClick={() => {/* GPS tracking - Task 13 */}}
          className="flex-1 rounded-lg bg-purple-600 p-4 text-white font-semibold text-lg hover:bg-purple-700"
        >
          Start GPS
        </button>
      </div>

      {/* New trip form (slide in) */}
      {showNewTrip && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Ny tur</h2>
            <button onClick={() => setShowNewTrip(false)} className="text-gray-500 text-2xl">&times;</button>
          </div>
          <TripForm onSave={() => setShowNewTrip(false)} />
        </div>
      )}
    </div>
  )
}
```

**Step 4: Wire up the home page**

Replace `src/app/page.tsx`:
```tsx
'use client'

import { useEffect, useState } from 'react'
import { HomeContent } from '@/components/HomeContent'
import { getFavorites } from '@/lib/api/favorites'
import { getTrips, saveTrip } from '@/lib/api/trips'
import { getDefaultVehicle } from '@/lib/api/vehicles'
import type { FavoriteTrip } from '@/types/database'

export default function HomePage() {
  const [favorites, setFavorites] = useState<FavoriteTrip[]>([])
  const [monthStats, setMonthStats] = useState({ totalKm: 0, tripCount: 0 })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [favs, trips] = await Promise.all([
      getFavorites(),
      getTrips(new Date().getFullYear(), new Date().getMonth() + 1),
    ])
    setFavorites(favs)
    const businessTrips = trips.filter((t) => t.is_business)
    setMonthStats({
      totalKm: businessTrips.reduce((sum, t) => sum + Number(t.distance_km), 0),
      tripCount: businessTrips.length,
    })
  }

  async function handleFavoriteTap(fav: FavoriteTrip) {
    const vehicle = await getDefaultVehicle()
    await saveTrip({
      vehicle_id: vehicle?.id ?? null,
      date: new Date().toISOString().split('T')[0],
      purpose: fav.purpose,
      start_address: fav.start_address,
      end_address: fav.end_address,
      distance_km: fav.distance_km,
      is_business: true,
      transport_type: 'car',
      gps_track: null,
    })
    loadData()
  }

  return (
    <HomeContent
      favorites={favorites}
      monthStats={monthStats}
      onFavoriteTap={handleFavoriteTap}
    />
  )
}
```

**Step 5: Run test to verify it passes**

```bash
npm run test:run -- src/__tests__/home-page.test.tsx
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/app/page.tsx src/components/HomeContent.tsx src/__tests__/home-page.test.tsx
git commit -m "feat: add home page with favorite trip cards and month stats"
```

---

## Task 12: Trips List Page

**Files:**
- Create: `src/app/trips/page.tsx`
- Create: `src/components/TripsList.tsx`
- Test: `src/__tests__/trips-list.test.tsx`

**Step 1: Write the failing test**

Create `src/__tests__/trips-list.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TripsList } from '@/components/TripsList'

describe('TripsList', () => {
  it('renders trips with date, purpose, and km', () => {
    const trips = [
      {
        id: '1', user_id: 'u1', vehicle_id: 'v1', date: '2026-03-10',
        purpose: 'Kundemøde', start_address: 'København', end_address: 'Aarhus',
        distance_km: 312, is_business: true, transport_type: 'car' as const,
        gps_track: null, created_at: '',
      },
    ]
    render(<TripsList trips={trips} onDelete={vi.fn()} />)
    expect(screen.getByText('Kundemøde')).toBeInTheDocument()
    expect(screen.getByText('312 km')).toBeInTheDocument()
    expect(screen.getByText(/10\. mar/i)).toBeInTheDocument()
  })

  it('shows empty state when no trips', () => {
    render(<TripsList trips={[]} onDelete={vi.fn()} />)
    expect(screen.getByText(/ingen ture/i)).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/__tests__/trips-list.test.tsx
```

Expected: FAIL

**Step 3: Create TripsList component**

Create `src/components/TripsList.tsx`:
```tsx
import type { Trip } from '@/types/database'

type Props = {
  trips: Trip[]
  onDelete: (id: string) => void
}

export function TripsList({ trips, onDelete }: Props) {
  if (trips.length === 0) {
    return <p className="text-center text-gray-500 py-8">Ingen ture denne måned</p>
  }

  return (
    <div className="space-y-2">
      {trips.map((trip) => {
        const dateStr = new Date(trip.date).toLocaleDateString('da-DK', {
          day: 'numeric',
          month: 'short',
        })
        return (
          <div
            key={trip.id}
            className="flex items-center justify-between rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-700 p-3"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">{dateStr}</span>
                {!trip.is_business && (
                  <span className="text-xs bg-gray-200 dark:bg-gray-700 rounded px-1">Privat</span>
                )}
                {trip.transport_type === 'public_transport' && (
                  <span className="text-xs bg-yellow-200 dark:bg-yellow-800 rounded px-1">Offentlig</span>
                )}
              </div>
              <p className="font-medium">{trip.purpose}</p>
              <p className="text-sm text-gray-500">{trip.start_address} → {trip.end_address}</p>
            </div>
            <div className="text-right ml-3">
              <p className="font-mono font-semibold">{trip.distance_km} km</p>
              <button
                onClick={() => onDelete(trip.id)}
                className="text-xs text-red-500 hover:text-red-700 mt-1"
              >
                Slet
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

**Step 4: Create trips page with month navigation**

Create `src/app/trips/page.tsx`:
```tsx
'use client'

import { useEffect, useState } from 'react'
import { TripsList } from '@/components/TripsList'
import { getTrips, deleteTrip } from '@/lib/api/trips'
import type { Trip } from '@/types/database'

export default function TripsPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [trips, setTrips] = useState<Trip[]>([])

  useEffect(() => {
    getTrips(year, month).then(setTrips)
  }, [year, month])

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  async function handleDelete(id: string) {
    await deleteTrip(id)
    setTrips(t => t.filter(trip => trip.id !== id))
  }

  const monthLabel = new Date(year, month - 1).toLocaleDateString('da-DK', {
    month: 'long', year: 'numeric',
  })

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-2 text-2xl">&larr;</button>
        <h1 className="text-xl font-bold capitalize">{monthLabel}</h1>
        <button onClick={nextMonth} className="p-2 text-2xl">&rarr;</button>
      </div>
      <TripsList trips={trips} onDelete={handleDelete} />
    </div>
  )
}
```

**Step 5: Run test to verify it passes**

```bash
npm run test:run -- src/__tests__/trips-list.test.tsx
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/app/trips src/components/TripsList.tsx src/__tests__/trips-list.test.tsx
git commit -m "feat: add trips list page with month navigation"
```

---

## Task 13: GPS Tracking

**Files:**
- Create: `src/hooks/useGpsTracking.ts`
- Create: `src/components/GpsTracker.tsx`
- Test: `src/__tests__/gps-tracking.test.ts`

**Step 1: Write the failing test**

Create `src/__tests__/gps-tracking.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { calculateGpsDistance } from '@/hooks/useGpsTracking'

describe('calculateGpsDistance', () => {
  it('calculates distance between two points using Haversine', () => {
    // Copenhagen to Aarhus ≈ 187 km straight line
    const coords = [
      { lat: 55.6761, lng: 12.5683, timestamp: 0 },
      { lat: 56.1629, lng: 10.2039, timestamp: 1 },
    ]
    const km = calculateGpsDistance(coords)
    expect(km).toBeGreaterThan(180)
    expect(km).toBeLessThan(200)
  })

  it('returns 0 for single point', () => {
    const coords = [{ lat: 55.6761, lng: 12.5683, timestamp: 0 }]
    expect(calculateGpsDistance(coords)).toBe(0)
  })

  it('sums segments for multiple points', () => {
    const coords = [
      { lat: 55.6761, lng: 12.5683, timestamp: 0 },
      { lat: 55.8, lng: 12.4, timestamp: 1 },
      { lat: 56.0, lng: 12.2, timestamp: 2 },
    ]
    const km = calculateGpsDistance(coords)
    expect(km).toBeGreaterThan(30)
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/__tests__/gps-tracking.test.ts
```

Expected: FAIL

**Step 3: Create GPS tracking hook**

Create `src/hooks/useGpsTracking.ts`:
```typescript
'use client'

import { useState, useRef, useCallback } from 'react'

type Coordinate = { lat: number; lng: number; timestamp: number }

export function calculateGpsDistance(coords: Coordinate[]): number {
  if (coords.length < 2) return 0

  let totalKm = 0
  for (let i = 1; i < coords.length; i++) {
    totalKm += haversine(coords[i - 1], coords[i])
  }
  return Math.round(totalKm * 10) / 10
}

function haversine(a: Coordinate, b: Coordinate): number {
  const R = 6371 // Earth radius in km
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng
  return 2 * R * Math.asin(Math.sqrt(h))
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

export function useGpsTracking() {
  const [tracking, setTracking] = useState(false)
  const [coords, setCoords] = useState<Coordinate[]>([])
  const [error, setError] = useState<string | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  const start = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('GPS er ikke tilgængelig i denne browser')
      return
    }

    setCoords([])
    setError(null)
    setTracking(true)

    // Request wake lock to keep screen on
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen')
      }
    } catch {
      // Wake lock not available, continue without it
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setCoords((prev) => [
          ...prev,
          { lat: pos.coords.latitude, lng: pos.coords.longitude, timestamp: pos.timestamp },
        ])
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    )
  }, [])

  const stop = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (wakeLockRef.current) {
      wakeLockRef.current.release()
      wakeLockRef.current = null
    }
    setTracking(false)
  }, [])

  return {
    tracking,
    coords,
    error,
    distanceKm: calculateGpsDistance(coords),
    start,
    stop,
  }
}
```

**Step 4: Create GpsTracker component**

Create `src/components/GpsTracker.tsx`:
```tsx
'use client'

import { useGpsTracking } from '@/hooks/useGpsTracking'

type Props = {
  onComplete: (data: {
    coords: Array<{ lat: number; lng: number; timestamp: number }>
    distanceKm: number
  }) => void
  onCancel: () => void
}

export function GpsTracker({ onComplete, onCancel }: Props) {
  const { tracking, coords, error, distanceKm, start, stop } = useGpsTracking()

  function handleStop() {
    stop()
    onComplete({ coords, distanceKm })
  }

  if (!tracking) {
    return (
      <div className="text-center space-y-4">
        <p className="text-gray-500">Tryk start for at begynde GPS-sporing</p>
        <button
          onClick={start}
          className="w-full rounded-lg bg-purple-600 p-4 text-white font-semibold text-xl hover:bg-purple-700"
        >
          Start GPS
        </button>
        <button onClick={onCancel} className="text-gray-500 text-sm">Annuller</button>
      </div>
    )
  }

  return (
    <div className="text-center space-y-4">
      <div className="rounded-xl bg-purple-50 dark:bg-purple-950 p-6">
        <p className="text-sm text-purple-600 dark:text-purple-400">Sporer din tur...</p>
        <p className="text-4xl font-bold font-mono mt-2">{distanceKm} km</p>
        <p className="text-sm text-gray-500 mt-1">{coords.length} punkter registreret</p>
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        onClick={handleStop}
        className="w-full rounded-lg bg-red-600 p-4 text-white font-semibold text-xl hover:bg-red-700"
      >
        Stop tur
      </button>
    </div>
  )
}
```

**Step 5: Run test to verify it passes**

```bash
npm run test:run -- src/__tests__/gps-tracking.test.ts
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/hooks/useGpsTracking.ts src/components/GpsTracker.tsx src/__tests__/gps-tracking.test.ts
git commit -m "feat: add GPS tracking with Haversine distance and Wake Lock"
```

---

## Task 14: Export (PDF/CSV)

**Files:**
- Create: `src/app/export/page.tsx`
- Create: `src/lib/export.ts`
- Test: `src/__tests__/export.test.ts`

**Step 1: Install PDF library**

```bash
npm install jspdf jspdf-autotable
npm install -D @types/jspdf
```

**Step 2: Write the failing test**

Create `src/__tests__/export.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { tripsToCSV } from '@/lib/export'

describe('tripsToCSV', () => {
  it('generates CSV with SKAT-required headers', () => {
    const trips = [
      {
        date: '2026-03-10', purpose: 'Kundemøde', start_address: 'København',
        end_address: 'Aarhus', distance_km: 312, transport_type: 'car',
        registration_number: 'AB12345',
      },
    ]
    const csv = tripsToCSV(trips)
    expect(csv).toContain('Dato;Formål;Startadresse;Slutadresse;Km;Registreringsnummer;Transporttype')
    expect(csv).toContain('2026-03-10;Kundemøde;København;Aarhus;312;AB12345;Bil')
  })
})
```

**Step 3: Run test to verify it fails**

```bash
npm run test:run -- src/__tests__/export.test.ts
```

Expected: FAIL

**Step 4: Create export helpers**

Create `src/lib/export.ts`:
```typescript
type ExportTrip = {
  date: string
  purpose: string
  start_address: string
  end_address: string
  distance_km: number
  transport_type: string
  registration_number: string
}

export function tripsToCSV(trips: ExportTrip[]): string {
  const header = 'Dato;Formål;Startadresse;Slutadresse;Km;Registreringsnummer;Transporttype'
  const rows = trips.map((t) =>
    [
      t.date,
      t.purpose,
      t.start_address,
      t.end_address,
      t.distance_km,
      t.registration_number,
      t.transport_type === 'car' ? 'Bil' : 'Offentlig transport',
    ].join(';')
  )
  return [header, ...rows].join('\n')
}

export function downloadCSV(csv: string, filename: string) {
  const bom = '\uFEFF' // UTF-8 BOM for Excel
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function generatePDF(
  trips: ExportTrip[],
  userInfo: { name: string; address: string; identifier: string },
  dateRange: { from: string; to: string }
) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF()

  doc.setFontSize(18)
  doc.text('Kørebog', 14, 22)

  doc.setFontSize(10)
  doc.text(`Navn: ${userInfo.name}`, 14, 32)
  doc.text(`Adresse: ${userInfo.address}`, 14, 38)
  doc.text(`ID: ${userInfo.identifier}`, 14, 44)
  doc.text(`Periode: ${dateRange.from} – ${dateRange.to}`, 14, 50)

  autoTable(doc, {
    startY: 58,
    head: [['Dato', 'Formål', 'Fra', 'Til', 'Km', 'Reg.nr.', 'Transport']],
    body: trips.map((t) => [
      t.date,
      t.purpose,
      t.start_address,
      t.end_address,
      t.distance_km.toString(),
      t.registration_number,
      t.transport_type === 'car' ? 'Bil' : 'Offentlig',
    ]),
  })

  const totalKm = trips.reduce((sum, t) => sum + t.distance_km, 0)
  const finalY = (doc as any).lastAutoTable.finalY + 10
  doc.text(`Total erhvervskørsel: ${totalKm} km`, 14, finalY)

  doc.save(`korebog-${dateRange.from}-${dateRange.to}.pdf`)
}
```

**Step 5: Create export page**

Create `src/app/export/page.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { tripsToCSV, downloadCSV, generatePDF } from '@/lib/export'

export default function ExportPage() {
  const now = new Date()
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const today = now.toISOString().split('T')[0]

  const [from, setFrom] = useState(firstOfMonth)
  const [to, setTo] = useState(today)
  const [loading, setLoading] = useState(false)

  async function fetchExportData() {
    const supabase = createClient()
    const { data: trips } = await supabase
      .from('trips')
      .select('*, vehicles(registration_number)')
      .gte('date', from)
      .lte('date', to)
      .eq('is_business', true)
      .order('date')

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .single()

    return {
      trips: (trips ?? []).map((t: any) => ({
        date: t.date,
        purpose: t.purpose,
        start_address: t.start_address,
        end_address: t.end_address,
        distance_km: Number(t.distance_km),
        transport_type: t.transport_type,
        registration_number: t.vehicles?.registration_number ?? '',
      })),
      userInfo: {
        name: profile?.full_name ?? '',
        address: profile?.address ?? '',
        identifier: profile?.identifier ?? '',
      },
    }
  }

  async function handleCSV() {
    setLoading(true)
    const { trips } = await fetchExportData()
    const csv = tripsToCSV(trips)
    downloadCSV(csv, `korebog-${from}-${to}.csv`)
    setLoading(false)
  }

  async function handlePDF() {
    setLoading(true)
    const { trips, userInfo } = await fetchExportData()
    await generatePDF(trips, userInfo, { from, to })
    setLoading(false)
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Eksporter kørebog</h1>
      <div className="space-y-3">
        <label className="block text-sm font-medium">Fra</label>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
          className="w-full rounded-lg border p-3 dark:bg-gray-800 dark:border-gray-700" />
        <label className="block text-sm font-medium">Til</label>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
          className="w-full rounded-lg border p-3 dark:bg-gray-800 dark:border-gray-700" />
      </div>
      <div className="flex gap-3">
        <button onClick={handleCSV} disabled={loading}
          className="flex-1 rounded-lg bg-green-600 p-3 text-white font-semibold hover:bg-green-700 disabled:opacity-50">
          Download CSV
        </button>
        <button onClick={handlePDF} disabled={loading}
          className="flex-1 rounded-lg bg-blue-600 p-3 text-white font-semibold hover:bg-blue-700 disabled:opacity-50">
          Download PDF
        </button>
      </div>
    </div>
  )
}
```

**Step 6: Run test to verify it passes**

```bash
npm run test:run -- src/__tests__/export.test.ts
```

Expected: PASS

**Step 7: Commit**

```bash
git add src/lib/export.ts src/app/export src/__tests__/export.test.ts
git commit -m "feat: add PDF and CSV export with SKAT-required fields"
```

---

## Task 15: Settings & User Profile

**Files:**
- Create: `src/app/settings/page.tsx`
- Create: `src/lib/api/profile.ts`

**Step 1: Create profile API helper**

Create `src/lib/api/profile.ts`:
```typescript
import { createClient } from '@/lib/supabase/client'
import type { UserProfile } from '@/types/database'

export async function getProfile(): Promise<UserProfile | null> {
  const supabase = createClient()
  const { data } = await supabase.from('user_profiles').select('*').single()
  return data
}

export async function upsertProfile(
  profile: Pick<UserProfile, 'full_name' | 'address' | 'identifier' | 'identifier_type'>
): Promise<UserProfile> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('user_profiles')
    .upsert({ ...profile, user_id: user.id }, { onConflict: 'user_id' })
    .select()
    .single()
  if (error) throw error
  return data
}
```

**Step 2: Create settings page**

Create `src/app/settings/page.tsx`:
```tsx
'use client'

import { useEffect, useState } from 'react'
import { getProfile, upsertProfile } from '@/lib/api/profile'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [address, setAddress] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [identifierType, setIdentifierType] = useState<'cpr' | 'employee_number'>('cpr')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getProfile().then((p) => {
      if (p) {
        setFullName(p.full_name)
        setAddress(p.address)
        setIdentifier(p.identifier)
        setIdentifierType(p.identifier_type as 'cpr' | 'employee_number')
      }
    })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    await upsertProfile({
      full_name: fullName,
      address,
      identifier,
      identifier_type: identifierType,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Indstillinger</h1>

      <form onSubmit={handleSave} className="space-y-4">
        <h2 className="text-lg font-semibold">Profil (til eksport)</h2>
        <input type="text" placeholder="Fulde navn" value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-lg border p-3 dark:bg-gray-800 dark:border-gray-700" />
        <input type="text" placeholder="Adresse" value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full rounded-lg border p-3 dark:bg-gray-800 dark:border-gray-700" />

        <div className="flex gap-3">
          <button type="button" onClick={() => setIdentifierType('cpr')}
            className={`flex-1 rounded-lg p-2 text-center ${identifierType === 'cpr' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
            CPR-nr
          </button>
          <button type="button" onClick={() => setIdentifierType('employee_number')}
            className={`flex-1 rounded-lg p-2 text-center ${identifierType === 'employee_number' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
            Medarbejdernr
          </button>
        </div>
        <input type="text" placeholder={identifierType === 'cpr' ? 'CPR-nummer' : 'Medarbejdernummer'}
          value={identifier} onChange={(e) => setIdentifier(e.target.value)}
          className="w-full rounded-lg border p-3 dark:bg-gray-800 dark:border-gray-700" />

        <button type="submit"
          className="w-full rounded-lg bg-blue-600 p-3 text-white font-semibold hover:bg-blue-700">
          {saved ? 'Gemt!' : 'Gem profil'}
        </button>
      </form>

      <hr className="dark:border-gray-700" />

      <button onClick={handleLogout}
        className="w-full rounded-lg border border-red-500 p-3 text-red-500 font-semibold hover:bg-red-50 dark:hover:bg-red-950">
        Log ud
      </button>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/app/settings src/lib/api/profile.ts
git commit -m "feat: add settings page with user profile for SKAT export"
```

---

## Task 16: PWA Configuration

**Files:**
- Create: `public/manifest.json`
- Create: `public/sw.js`
- Modify: `src/app/layout.tsx` — add manifest link and meta tags
- Create: `public/icons/` — app icons (192x192, 512x512)

**Step 1: Install next-pwa**

```bash
npm install next-pwa
```

**Step 2: Create manifest**

Create `public/manifest.json`:
```json
{
  "name": "Kørebog",
  "short_name": "Kørebog",
  "description": "Registrer erhvervsmæssig kørsel",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#f9fafb",
  "theme_color": "#2563eb",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**Step 3: Update next.config.ts for PWA**

Add next-pwa wrapper to `next.config.ts`:
```typescript
import withPWA from 'next-pwa'

const nextConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})({})

export default nextConfig
```

**Step 4: Add manifest link to layout.tsx**

In `src/app/layout.tsx`, add to `<head>` via metadata:
```typescript
export const metadata: Metadata = {
  title: 'Kørebog',
  description: 'Registrer erhvervsmæssig kørsel',
  manifest: '/manifest.json',
  themeColor: '#2563eb',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Kørebog',
  },
}
```

**Step 5: Create placeholder icons**

Generate simple placeholder icons (replace with real icons later):
```bash
mkdir -p public/icons
# Use any tool to create 192x192 and 512x512 PNG icons, or use placeholders
```

**Step 6: Verify PWA**

```bash
npm run build && npm run start
# Open in Chrome → DevTools → Application → Manifest should show
# Service worker should be registered
```

**Step 7: Commit**

```bash
git add public/manifest.json next.config.ts src/app/layout.tsx public/icons
git commit -m "feat: add PWA configuration with manifest and service worker"
```

---

## Task 17: Offline Trip Queue (IndexedDB)

**Files:**
- Create: `src/lib/offline.ts`
- Test: `src/__tests__/offline.test.ts`

**Step 1: Write the failing test**

Create `src/__tests__/offline.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { addToQueue, getQueue, clearQueue } from '@/lib/offline'

// Note: requires fake-indexeddb for Vitest
// npm install -D fake-indexeddb

describe('offline queue', () => {
  beforeEach(async () => {
    await clearQueue()
  })

  it('adds a trip to the offline queue', async () => {
    const trip = {
      date: '2026-03-10',
      purpose: 'Test',
      start_address: 'A',
      end_address: 'B',
      distance_km: 10,
      is_business: true,
      transport_type: 'car' as const,
      gps_track: null,
      vehicle_id: null,
    }
    await addToQueue(trip)
    const queue = await getQueue()
    expect(queue).toHaveLength(1)
    expect(queue[0].purpose).toBe('Test')
  })
})
```

**Step 2: Install fake-indexeddb for tests**

```bash
npm install -D fake-indexeddb
```

Add to `vitest.setup.ts`:
```typescript
import 'fake-indexeddb/auto'
```

**Step 3: Run test to verify it fails**

```bash
npm run test:run -- src/__tests__/offline.test.ts
```

Expected: FAIL

**Step 4: Create offline queue**

Create `src/lib/offline.ts`:
```typescript
const DB_NAME = 'korebog-offline'
const STORE_NAME = 'trip-queue'
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: 'offlineId', autoIncrement: true })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function addToQueue(trip: Record<string, unknown>): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).add({ ...trip, queuedAt: Date.now() })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getQueue(): Promise<any[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const request = tx.objectStore(STORE_NAME).getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function clearQueue(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function removeFromQueue(offlineId: number): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(offlineId)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function syncQueue(saveFn: (trip: any) => Promise<void>): Promise<number> {
  const queue = await getQueue()
  let synced = 0
  for (const item of queue) {
    const { offlineId, queuedAt, ...trip } = item
    try {
      await saveFn(trip)
      await removeFromQueue(offlineId)
      synced++
    } catch {
      break // Stop on first failure, retry later
    }
  }
  return synced
}
```

**Step 5: Run test to verify it passes**

```bash
npm run test:run -- src/__tests__/offline.test.ts
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/lib/offline.ts src/__tests__/offline.test.ts vitest.setup.ts
git commit -m "feat: add IndexedDB offline trip queue with sync"
```

---

## Task 18: Integration - Wire Offline Queue Into Trip Saving

**Files:**
- Modify: `src/lib/api/trips.ts` — add offline-aware save function
- Create: `src/components/OfflineBanner.tsx`

**Step 1: Create offline-aware trip save**

Add to `src/lib/api/trips.ts`:
```typescript
import { addToQueue, getQueue, syncQueue } from '@/lib/offline'

export async function saveTripOfflineAware(
  trip: Omit<Trip, 'id' | 'user_id' | 'created_at'>
): Promise<void> {
  if (!navigator.onLine) {
    await addToQueue(trip)
    return
  }
  try {
    await saveTrip(trip)
  } catch {
    await addToQueue(trip)
  }
}

export async function syncOfflineTrips(): Promise<number> {
  return syncQueue(async (trip) => {
    await saveTrip(trip)
  })
}

export async function getOfflineQueueCount(): Promise<number> {
  const queue = await getQueue()
  return queue.length
}
```

**Step 2: Create offline banner**

Create `src/components/OfflineBanner.tsx`:
```tsx
'use client'

import { useEffect, useState } from 'react'
import { getOfflineQueueCount, syncOfflineTrips } from '@/lib/api/trips'

export function OfflineBanner() {
  const [count, setCount] = useState(0)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    getOfflineQueueCount().then(setCount)

    function handleOnline() {
      setSyncing(true)
      syncOfflineTrips().then(() => {
        getOfflineQueueCount().then(setCount)
        setSyncing(false)
      })
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [])

  if (count === 0) return null

  return (
    <div className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-center text-sm py-2 px-4">
      {syncing
        ? 'Synkroniserer ture...'
        : `${count} tur${count > 1 ? 'e' : ''} venter på at blive synkroniseret`}
    </div>
  )
}
```

**Step 3: Add OfflineBanner to layout.tsx**

Add `<OfflineBanner />` at the top of the `<main>` element in `src/app/layout.tsx`.

**Step 4: Commit**

```bash
git add src/lib/api/trips.ts src/components/OfflineBanner.tsx src/app/layout.tsx
git commit -m "feat: add offline-aware trip saving with sync banner"
```

---

## Task 19: Final Polish & Menu

**Files:**
- Create: `src/components/MenuButton.tsx`
- Modify: `src/components/BottomNav.tsx` — add menu icon for Export/Settings

**Step 1: Create menu button**

Create `src/components/MenuButton.tsx`:
```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'

export function MenuButton() {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="p-2 text-xl">
        &#9776;
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full right-0 mb-2 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 py-2 w-48">
            <Link href="/export" onClick={() => setOpen(false)}
              className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">
              Eksporter
            </Link>
            <Link href="/settings" onClick={() => setOpen(false)}
              className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">
              Indstillinger
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
```

**Step 2: Add MenuButton to BottomNav**

Update `src/components/BottomNav.tsx` to include `<MenuButton />` as the 4th item in the nav bar.

**Step 3: Commit**

```bash
git add src/components/MenuButton.tsx src/components/BottomNav.tsx
git commit -m "feat: add menu button for Export and Settings access"
```

---

## Task 20: Run Full Test Suite & Verify Build

**Step 1: Run all tests**

```bash
npm run test:run
```

Expected: All tests PASS

**Step 2: Build for production**

```bash
npm run build
```

Expected: Build succeeds with no errors

**Step 3: Verify PWA in production mode**

```bash
npm run start
```

Open in browser, check:
- [ ] Login flow works
- [ ] Bottom nav renders all tabs
- [ ] Vehicle page saves vehicle
- [ ] Favorite trips appear on home
- [ ] New trip form works
- [ ] GPS tracking starts/stops
- [ ] Export generates CSV/PDF
- [ ] Installable as PWA (manifest detected)

**Step 4: Final commit**

```bash
git add .
git commit -m "chore: verify full build and test suite pass"
```
