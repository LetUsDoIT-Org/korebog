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
