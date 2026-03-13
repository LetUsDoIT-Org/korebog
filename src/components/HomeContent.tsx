'use client'

import { useState, useEffect } from 'react'
import type { FavoriteTrip, Customer } from '@/types/database'
import { FavoriteTripCard } from './FavoriteTripCard'
import { TripForm } from './TripForm'

type TripData = {
  date: string
  purpose: string
  start_address: string
  end_address: string
  distance_km: number
  is_business: boolean
  transport_type: 'car' | 'public_transport'
  customer_id: string | null
  odometer_start_km: number | null
  odometer_end_km: number | null
}

type Props = {
  favorites: FavoriteTrip[]
  customers: Customer[]
  monthStats: { totalKm: number; tripCount: number }
  defaultStartAddress: string
  currentOdometerKm: number | null
  onFavoriteTap: (fav: FavoriteTrip) => void
  onFavoriteDelete: (id: string) => void
  onFavoriteUpdate: (id: string, updates: Partial<FavoriteTrip>) => void
  onTripSave: (data: TripData, saveAsFavorite: boolean, favoriteLabel: string) => Promise<void>
}

export function HomeContent({ favorites, customers, monthStats, defaultStartAddress, currentOdometerKm, onFavoriteTap, onFavoriteDelete, onFavoriteUpdate, onTripSave }: Props) {
  const [showNewTrip, setShowNewTrip] = useState(false)
  const [monthName, setMonthName] = useState('')

  useEffect(() => {
    setMonthName(new Date().toLocaleDateString('da-DK', { month: 'long', year: 'numeric' }))
  }, [])

  return (
    <div className="p-4 max-w-lg mx-auto space-y-6">
      {/* Month stats */}
      <div className="rounded-xl bg-blue-50 dark:bg-blue-950 p-4 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">Denne måned - {monthName}</p>
        <p className="text-3xl font-bold mt-1">{Math.round(monthStats.totalKm)} km</p>
        <p className="text-sm text-gray-500">{monthStats.tripCount} ture</p>
      </div>

      {/* Favorite trips */}
      {favorites.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Hurtig registrering</h2>
          <div className="grid grid-cols-1 gap-3">
            {favorites.map((fav) => (
              <FavoriteTripCard
                key={fav.id}
                favorite={fav}
                onTap={onFavoriteTap}
                onDelete={onFavoriteDelete}
                onUpdate={onFavoriteUpdate}
              />
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
          <TripForm
            initial={{ start_address: defaultStartAddress }}
            customers={customers}
            currentOdometerKm={currentOdometerKm}
            onSave={async (data, saveAsFav, favLabel) => { await onTripSave(data, saveAsFav, favLabel); setShowNewTrip(false) }}
          />
        </div>
      )}
    </div>
  )
}
