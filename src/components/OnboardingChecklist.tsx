'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export type OnboardingStatus = {
  profileComplete: boolean
  vehicleAdded: boolean
  odometerSet: boolean
  customersAdded: boolean
  hasTrips: boolean
  hasUsedGps: boolean
  hasFavorites: boolean
  hasExported: boolean
}

type Step = {
  key: keyof OnboardingStatus
  title: string
  description: string
  href: string | null
  required: boolean
}

const steps: Step[] = [
  {
    key: 'profileComplete',
    title: 'Udfyld din profil',
    description: 'Tilføj navn, adresse og medarbejdernr under Indstillinger.',
    href: '/settings',
    required: true,
  },
  {
    key: 'vehicleAdded',
    title: 'Tilføj din bil',
    description: 'Registrer dine biler med navn og nummerplade under Bil-siden. Du kan tilføje flere biler.',
    href: '/vehicle',
    required: true,
  },
  {
    key: 'odometerSet',
    title: 'Registrer km-tæller',
    description: 'Aflæs bilens aktuelle kilometerstand, så den kan spores automatisk.',
    href: '/vehicle',
    required: true,
  },
  {
    key: 'customersAdded',
    title: 'Tilføj kunder',
    description: 'Tilføj dine faste kunder under Indstillinger — så kan du vælge dem hurtigt.',
    href: '/settings',
    required: false,
  },
  {
    key: 'hasTrips',
    title: 'Opret din første tur',
    description: 'Tryk "Ny tur" herunder for at registrere en kørsel manuelt.',
    href: null,
    required: false,
  },
  {
    key: 'hasUsedGps',
    title: 'Prøv GPS-tracking',
    description: 'Tryk "Start GPS" på forsiden for at spore en tur automatisk med GPS.',
    href: null,
    required: false,
  },
  {
    key: 'hasFavorites',
    title: 'Gem en ofte kørt rute',
    description: 'Når du opretter en tur, kan du markere "Gem som ofte kørt rute" for hurtig registrering næste gang.',
    href: null,
    required: false,
  },
  {
    key: 'hasExported',
    title: 'Eksporter data',
    description: 'Under Menu → Eksporter kan du downloade din kørebog som CSV eller PDF — til SKAT eller lønkørsel.',
    href: '/export',
    required: false,
  },
]

const STORAGE_KEY = 'korebog_onboarding_dismissed'

export function OnboardingChecklist({ status }: { status: OnboardingStatus }) {
  const [dismissed, setDismissed] = useState(true) // start hidden to avoid flash
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    setDismissed(localStorage.getItem(STORAGE_KEY) === 'true')
  }, [])

  const completedCount = steps.filter((s) => status[s.key]).length
  const totalSteps = steps.length
  const allRequiredDone = steps
    .filter((s) => s.required)
    .every((s) => status[s.key])

  function handleDismiss() {
    setDismissed(true)
    localStorage.setItem(STORAGE_KEY, 'true')
  }

  function handleShow() {
    setDismissed(false)
    localStorage.removeItem(STORAGE_KEY)
  }

  // Fully dismissed — just show a small link
  if (dismissed) {
    return (
      <button
        onClick={handleShow}
        className="text-xs text-amber-600 dark:text-amber-400 underline"
      >
        Vis opsætningsguide
      </button>
    )
  }

  return (
    <div className="rounded-xl bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 flex-1 text-left"
        >
          <span className="text-lg font-bold">Kom godt i gang</span>
          <span className="text-sm text-amber-700 dark:text-amber-300 font-mono">
            {completedCount}/{totalSteps}
          </span>
          <span className={`text-xs transition-transform ${expanded ? 'rotate-90' : ''}`}>&#9654;</span>
        </button>
        {allRequiredDone && (
          <button
            onClick={handleDismiss}
            className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Skjul
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-amber-200 dark:bg-amber-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-amber-500 dark:bg-amber-400 transition-all duration-500"
          style={{ width: `${(completedCount / totalSteps) * 100}%` }}
        />
      </div>

      {/* Steps list */}
      {expanded && (
        <div className="space-y-2">
          {steps.map((step) => {
            const isDone = status[step.key]

            return (
              <div
                key={step.key}
                className={`flex items-start gap-3 rounded-lg p-2 transition-colors ${
                  isDone ? 'opacity-60' : 'bg-white/50 dark:bg-gray-800/50'
                }`}
              >
                {/* Checkbox */}
                <span className="text-lg mt-0.5 shrink-0">
                  {isDone ? '✅' : '⬜'}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${isDone ? 'line-through text-gray-500' : 'font-semibold'}`}>
                    {step.title}
                    {!step.required && !isDone && (
                      <span className="text-xs font-normal text-gray-400 ml-1">(valgfrit)</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {step.description}
                  </p>
                </div>

                {/* Action link */}
                {step.href && !isDone && (
                  <Link
                    href={step.href}
                    className="shrink-0 rounded-lg bg-amber-500 dark:bg-amber-600 px-3 py-1 text-xs text-white font-semibold hover:bg-amber-600 dark:hover:bg-amber-500 mt-0.5"
                  >
                    Gå til
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
