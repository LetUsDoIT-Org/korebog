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
