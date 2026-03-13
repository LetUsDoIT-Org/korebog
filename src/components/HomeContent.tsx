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
