'use client'

import { useEffect, useState } from 'react'
import { TripsList } from '@/components/TripsList'
import { getTrips, deleteTrip, updateTrip } from '@/lib/api/trips'
import { getCustomers } from '@/lib/api/customers'
import { getVehicles } from '@/lib/api/vehicles'
import { getLatestReading, estimateCurrentKm } from '@/lib/api/odometer'
import type { Trip, Customer, Vehicle } from '@/types/database'

export default function TripsPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [trips, setTrips] = useState<Trip[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([])
  const [currentOdometerKm, setCurrentOdometerKm] = useState<number | null>(null)

  useEffect(() => {
    getTrips(year, month).then(setTrips)
  }, [year, month])

  useEffect(() => {
    async function loadExtras() {
      const [custs, vehicles] = await Promise.all([
        getCustomers(),
        getVehicles(),
      ])
      setCustomers(custs)
      setAllVehicles(vehicles)
      const defaultVehicle = vehicles.find(v => v.is_default)
      if (defaultVehicle) {
        const latest = await getLatestReading(defaultVehicle.id)
        if (latest) {
          setCurrentOdometerKm(estimateCurrentKm(latest.reading_km, latest.date))
        }
      }
    }
    loadExtras()
  }, [])

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

  async function handleUpdate(id: string, data: {
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
  }) {
    await updateTrip(id, data)
    // Reload trips in case the date changed to a different month
    const refreshed = await getTrips(year, month)
    setTrips(refreshed)
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
      <TripsList
        trips={trips}
        customers={customers}
        vehicles={allVehicles}
        currentOdometerKm={currentOdometerKm}
        onDelete={handleDelete}
        onUpdate={handleUpdate}
      />
    </div>
  )
}
