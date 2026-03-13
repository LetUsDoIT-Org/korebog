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
          onClick={() => { localStorage.setItem('korebog_has_used_gps', 'true'); start() }}
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
