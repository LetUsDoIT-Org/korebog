'use client'

import { useEffect, useState } from 'react'
import { HomeContent } from '@/components/HomeContent'
import { getFavorites, saveFavorite, deleteFavorite, updateFavorite } from '@/lib/api/favorites'
import { getTrips, saveTripOfflineAware } from '@/lib/api/trips'
import { getDefaultVehicle } from '@/lib/api/vehicles'
import { getLatestReading, saveReading, estimateCurrentKm } from '@/lib/api/odometer'
import { getProfile } from '@/lib/api/profile'
import { getCustomers } from '@/lib/api/customers'
import type { FavoriteTrip, Customer, Vehicle } from '@/types/database'

export default function HomePage() {
  const [favorites, setFavorites] = useState<FavoriteTrip[]>([])
  const [monthStats, setMonthStats] = useState({ totalKm: 0, tripCount: 0 })
  const [customers, setCustomers] = useState<Customer[]>([])
  const [defaultStartAddress, setDefaultStartAddress] = useState('')
  const [currentOdometerKm, setCurrentOdometerKm] = useState<number | null>(null)
  const [defaultVehicle, setDefaultVehicle] = useState<Vehicle | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [favs, trips, profile, custs, vehicle] = await Promise.all([
      getFavorites(),
      getTrips(new Date().getFullYear(), new Date().getMonth() + 1),
      getProfile(),
      getCustomers(),
      getDefaultVehicle(),
    ])
    setFavorites(favs)
    setCustomers(custs)
    setDefaultVehicle(vehicle)
    if (profile?.address) setDefaultStartAddress(profile.address)
    const businessTrips = trips.filter((t) => t.is_business)
    setMonthStats({
      totalKm: businessTrips.reduce((sum, t) => sum + Number(t.distance_km), 0),
      tripCount: businessTrips.length,
    })

    // Load odometer
    if (vehicle) {
      const latest = await getLatestReading(vehicle.id)
      if (latest) {
        setCurrentOdometerKm(estimateCurrentKm(latest.reading_km, latest.date))
      }
    }
  }

  async function updateOdometer(vehicleId: string | null, km: number, date: string) {
    if (!vehicleId) return
    const latest = await getLatestReading(vehicleId)
    const newKm = Math.round((latest?.reading_km ?? 0) + km)
    await saveReading(vehicleId, newKm, date, 'Auto-opdateret fra tur')
  }

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 2500)
  }

  async function handleFavoriteTap(fav: FavoriteTrip) {
    try {
      const vehicle = await getDefaultVehicle()
      const today = new Date().toISOString().split('T')[0]
      await saveTripOfflineAware({
        vehicle_id: vehicle?.id ?? null,
        customer_id: fav.customer_id ?? null,
        date: today,
        purpose: fav.purpose,
        start_address: fav.start_address,
        end_address: fav.end_address,
        distance_km: fav.distance_km,
        is_business: true,
        transport_type: 'car',
        gps_track: null,
        odometer_start_km: null,
        odometer_end_km: null,
      })
      await updateOdometer(vehicle?.id ?? null, fav.distance_km, today)
      await loadData()
      showToast(`${fav.label} — ${fav.distance_km} km registreret`)
    } catch (err) {
      console.error('Failed to save favorite trip:', err)
      showToast('Kunne ikke gemme tur', 'error')
    }
  }

  async function handleFavoriteDelete(id: string) {
    try {
      await deleteFavorite(id)
      await loadData()
      showToast('Favorit slettet')
    } catch (err) {
      console.error('Failed to delete favorite:', err)
      showToast('Kunne ikke slette favorit', 'error')
    }
  }

  async function handleFavoriteUpdate(id: string, updates: Partial<FavoriteTrip>) {
    try {
      await updateFavorite(id, updates)
      await loadData()
      showToast('Favorit opdateret')
    } catch (err) {
      console.error('Failed to update favorite:', err)
      showToast('Kunne ikke opdatere favorit', 'error')
    }
  }

  async function handleTripSave(
    data: {
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
    },
    saveAsFavorite: boolean,
    favoriteLabel: string,
  ) {
    try {
      const vehicle = await getDefaultVehicle()
      await saveTripOfflineAware({
        ...data,
        vehicle_id: vehicle?.id ?? null,
        gps_track: null,
      })
      await updateOdometer(vehicle?.id ?? null, data.distance_km, data.date)

      if (saveAsFavorite) {
        try {
          await saveFavorite({
            label: favoriteLabel,
            purpose: data.purpose,
            start_address: data.start_address,
            end_address: data.end_address,
            distance_km: data.distance_km,
            sort_order: favorites.length,
            customer_id: data.customer_id,
          })
          showToast('Tur + favorit gemt')
        } catch (favErr: unknown) {
          const msg = favErr && typeof favErr === 'object' && 'message' in favErr
            ? String((favErr as Record<string, unknown>).message)
            : JSON.stringify(favErr)
          console.error('Failed to save favorite:', msg, favErr)
          showToast('Tur gemt, men favorit fejlede: ' + msg, 'error')
        }
      } else {
        showToast('Tur gemt')
      }

      await loadData()
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err
        ? String((err as Record<string, unknown>).message)
        : JSON.stringify(err)
      console.error('Failed to save trip:', msg, err)
      showToast('Kunne ikke gemme tur: ' + msg, 'error')
    }
  }

  return (
    <>
      <HomeContent
        favorites={favorites}
        customers={customers}
        monthStats={monthStats}
        defaultStartAddress={defaultStartAddress}
        currentOdometerKm={currentOdometerKm}
        onFavoriteTap={handleFavoriteTap}
        onFavoriteDelete={handleFavoriteDelete}
        onFavoriteUpdate={handleFavoriteUpdate}
        onTripSave={handleTripSave}
      />
      {toast && (
        <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 rounded-lg px-5 py-3 text-white font-semibold shadow-lg z-50 transition-opacity ${
          toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'
        }`}>
          {toast.message}
        </div>
      )}
    </>
  )
}
