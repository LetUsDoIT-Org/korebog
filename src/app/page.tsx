'use client'

import { useEffect, useState } from 'react'
import { HomeContent } from '@/components/HomeContent'
import { getFavorites, saveFavorite, deleteFavorite, updateFavorite } from '@/lib/api/favorites'
import { getTrips, saveTripOfflineAware, hasAnyTrips } from '@/lib/api/trips'
import { getVehicles, getDefaultVehicle } from '@/lib/api/vehicles'
import { getLatestReading, saveReading, estimateCurrentKm } from '@/lib/api/odometer'
import { getProfile } from '@/lib/api/profile'
import { getCustomers } from '@/lib/api/customers'
import type { FavoriteTrip, Customer, Vehicle } from '@/types/database'
import type { OnboardingStatus } from '@/components/OnboardingChecklist'

export default function HomePage() {
  const [favorites, setFavorites] = useState<FavoriteTrip[]>([])
  const [monthStats, setMonthStats] = useState({ totalKm: 0, tripCount: 0 })
  const [customers, setCustomers] = useState<Customer[]>([])
  const [defaultStartAddress, setDefaultStartAddress] = useState('')
  const [currentOdometerKm, setCurrentOdometerKm] = useState<number | null>(null)
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([])
  const [defaultVehicle, setDefaultVehicle] = useState<Vehicle | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus>({
    profileComplete: false, vehicleAdded: false, odometerSet: false,
    customersAdded: false, hasTrips: false, hasUsedGps: false, hasFavorites: false, hasExported: false,
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [favs, trips, profile, custs, vehicles] = await Promise.all([
      getFavorites(),
      getTrips(new Date().getFullYear(), new Date().getMonth() + 1),
      getProfile(),
      getCustomers(),
      getVehicles(),
    ])
    setFavorites(favs)
    setCustomers(custs)
    setAllVehicles(vehicles)
    const vehicle = vehicles.find((v) => v.is_default) ?? null
    setDefaultVehicle(vehicle)
    if (profile?.address) setDefaultStartAddress(profile.address)
    const businessTrips = trips.filter((t) => t.is_business)
    setMonthStats({
      totalKm: businessTrips.reduce((sum, t) => sum + Number(t.distance_km), 0),
      tripCount: businessTrips.length,
    })

    // Load odometer + onboarding status
    let odometerSet = false
    if (vehicle) {
      const latest = await getLatestReading(vehicle.id)
      if (latest) {
        setCurrentOdometerKm(estimateCurrentKm(latest.reading_km, latest.date))
        odometerSet = true
      }
    }

    const anyTrips = await hasAnyTrips()

    setOnboardingStatus({
      profileComplete: !!(profile?.full_name && profile?.address && profile?.identifier),
      vehicleAdded: vehicles.length > 0,
      odometerSet,
      customersAdded: custs.length > 0,
      hasTrips: anyTrips,
      hasUsedGps: localStorage.getItem('korebog_has_used_gps') === 'true',
      hasFavorites: favs.length > 0,
      hasExported: localStorage.getItem('korebog_has_exported') === 'true',
    })
  }

  async function updateOdometerIfHigher(vehicleId: string | null, odometerEndKm: number | null) {
    if (!vehicleId || !odometerEndKm || odometerEndKm <= 0) return
    const latest = await getLatestReading(vehicleId)
    // Only save if higher than current latest — avoids inflating km for backdated trips
    if (!latest || odometerEndKm > latest.reading_km) {
      const today = new Date().toISOString().split('T')[0]
      await saveReading(vehicleId, Math.round(odometerEndKm), today, 'Auto-opdateret fra tur')
    }
  }

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 2500)
  }

  async function handleFavoriteTap(fav: FavoriteTrip) {
    try {
      // Use the favorite's assigned vehicle, or fall back to default
      const vehicleId = fav.vehicle_id ?? defaultVehicle?.id ?? null
      const today = new Date().toISOString().split('T')[0]

      // Compute odometer for favorite trips from current reading
      let odometerStartKm: number | null = null
      let odometerEndKm: number | null = null
      if (vehicleId) {
        const latest = await getLatestReading(vehicleId)
        if (latest) {
          odometerStartKm = latest.reading_km
          odometerEndKm = Math.round(latest.reading_km + fav.distance_km)
        }
      }

      await saveTripOfflineAware({
        vehicle_id: vehicleId,
        customer_id: fav.customer_id ?? null,
        date: today,
        purpose: fav.purpose,
        start_address: fav.start_address,
        end_address: fav.end_address,
        distance_km: fav.distance_km,
        is_business: true,
        transport_type: 'car',
        gps_track: null,
        odometer_start_km: odometerStartKm,
        odometer_end_km: odometerEndKm,
      })
      await updateOdometerIfHigher(vehicleId, odometerEndKm)
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
      showToast('Rute slettet')
    } catch (err) {
      console.error('Failed to delete favorite:', err)
      showToast('Kunne ikke slette rute', 'error')
    }
  }

  async function handleFavoriteUpdate(id: string, updates: Partial<FavoriteTrip>) {
    try {
      await updateFavorite(id, updates)
      await loadData()
      showToast('Rute opdateret')
    } catch (err) {
      console.error('Failed to update favorite:', err)
      showToast('Kunne ikke opdatere rute', 'error')
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
      vehicle_id: string | null
      odometer_start_km: number | null
      odometer_end_km: number | null
    },
    saveAsFavorite: boolean,
    favoriteLabel: string,
  ) {
    try {
      const vehicleId = data.vehicle_id ?? defaultVehicle?.id ?? null
      await saveTripOfflineAware({
        ...data,
        vehicle_id: vehicleId,
        gps_track: null,
      })
      await updateOdometerIfHigher(vehicleId, data.odometer_end_km)

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
            vehicle_id: vehicleId,
          })
          showToast('Tur gemt + rute tilføjet')
        } catch (favErr: unknown) {
          const msg = favErr && typeof favErr === 'object' && 'message' in favErr
            ? String((favErr as Record<string, unknown>).message)
            : JSON.stringify(favErr)
          console.error('Failed to save favorite:', msg, favErr)
          showToast('Tur gemt, men rute fejlede: ' + msg, 'error')
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
        vehicles={allVehicles}
        monthStats={monthStats}
        defaultStartAddress={defaultStartAddress}
        currentOdometerKm={currentOdometerKm}
        onboardingStatus={onboardingStatus}
        onFavoriteTap={handleFavoriteTap}
        onFavoriteDelete={handleFavoriteDelete}
        onFavoriteUpdate={handleFavoriteUpdate}
        onTripSave={handleTripSave}
      />
      {toast && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className={`rounded-2xl px-8 py-5 text-white font-semibold shadow-2xl text-center max-w-xs animate-fade-in ${
            toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'
          }`}>
            <p className="text-2xl mb-1">{toast.type === 'error' ? '⚠️' : '✅'}</p>
            <p>{toast.message}</p>
          </div>
        </div>
      )}
    </>
  )
}
