'use client'

import { useEffect, useState } from 'react'
import { VehicleForm } from '@/components/VehicleForm'
import { getDefaultVehicle, upsertVehicle } from '@/lib/api/vehicles'
import type { Vehicle } from '@/types/database'

export default function VehiclePage() {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDefaultVehicle().then((v) => { setVehicle(v); setLoading(false) })
  }, [])

  async function handleSave(data: { name: string; registration_number: string }) {
    const saved = await upsertVehicle({ ...data, id: vehicle?.id })
    setVehicle(saved)
  }

  if (loading) return <div className="p-4">Indlæser...</div>

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Din bil</h1>
      <VehicleForm vehicle={vehicle} onSave={handleSave} />
    </div>
  )
}
