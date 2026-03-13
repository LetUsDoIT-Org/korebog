'use client'

import { useEffect, useState } from 'react'
import { VehicleForm } from '@/components/VehicleForm'
import { OdometerForm } from '@/components/OdometerForm'
import { getDefaultVehicle, upsertVehicle } from '@/lib/api/vehicles'
import { getLatestReading, saveReading } from '@/lib/api/odometer'
import type { Vehicle, OdometerReading } from '@/types/database'

export default function VehiclePage() {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [lastReading, setLastReading] = useState<OdometerReading | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDefaultVehicle().then(async (v) => {
      setVehicle(v)
      if (v) {
        const reading = await getLatestReading(v.id)
        setLastReading(reading)
      }
      setLoading(false)
    })
  }, [])

  async function handleSave(data: { name: string; registration_number: string }) {
    const saved = await upsertVehicle({ ...data, id: vehicle?.id })
    setVehicle(saved)
  }

  async function handleOdometerSave(km: number) {
    if (!vehicle) return
    const today = new Date().toISOString().split('T')[0]
    const reading = await saveReading(vehicle.id, km, today)
    setLastReading(reading)
  }

  if (loading) return <div className="p-4">Indlæser...</div>

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Din bil</h1>
      <VehicleForm vehicle={vehicle} onSave={handleSave} />

      {vehicle && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Kilometertæller</h2>
          <OdometerForm
            lastReading={lastReading ? { km: lastReading.reading_km, date: lastReading.date } : null}
            onSave={handleOdometerSave}
          />
        </div>
      )}
    </div>
  )
}
