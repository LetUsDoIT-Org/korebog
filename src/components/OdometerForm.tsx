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
