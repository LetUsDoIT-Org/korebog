'use client'

import { useEffect, useState } from 'react'
import { VehicleForm } from '@/components/VehicleForm'
import { OdometerForm } from '@/components/OdometerForm'
import { getVehicles, upsertVehicle, setDefaultVehicle, deleteVehicle } from '@/lib/api/vehicles'
import { getLatestReading, saveReading } from '@/lib/api/odometer'
import type { Vehicle, OdometerReading } from '@/types/database'

export default function VehiclePage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [readings, setReadings] = useState<Record<string, OdometerReading | null>>({})
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    const all = await getVehicles()
    setVehicles(all)

    // Load latest odometer for each vehicle
    const readingMap: Record<string, OdometerReading | null> = {}
    await Promise.all(
      all.map(async (v) => {
        readingMap[v.id] = await getLatestReading(v.id)
      }),
    )
    setReadings(readingMap)
    setLoading(false)
  }

  async function handleSaveNew(data: { name: string; registration_number: string }) {
    await upsertVehicle(data)
    setShowAddForm(false)
    await loadAll()
  }

  async function handleSaveEdit(vehicleId: string, data: { name: string; registration_number: string }) {
    await upsertVehicle({ id: vehicleId, ...data })
    setEditingId(null)
    await loadAll()
  }

  async function handleSetDefault(id: string) {
    await setDefaultVehicle(id)
    await loadAll()
  }

  async function handleDelete(id: string) {
    await deleteVehicle(id)
    setConfirmDeleteId(null)
    await loadAll()
  }

  async function handleOdometerSave(vehicleId: string, km: number) {
    const today = new Date().toISOString().split('T')[0]
    const reading = await saveReading(vehicleId, km, today)
    setReadings((prev) => ({ ...prev, [vehicleId]: reading }))
  }

  if (loading) return <div className="p-4">Indlæser...</div>

  return (
    <div className="p-4 max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Dine biler</h1>

      {vehicles.map((v) => {
        const reading = readings[v.id]
        const isExpanded = expandedId === v.id

        return (
          <div key={v.id} className="rounded-xl border dark:border-gray-700 overflow-hidden">
            {/* Vehicle header */}
            {editingId === v.id ? (
              <div className="p-4 space-y-3">
                <VehicleForm
                  vehicle={v}
                  onSave={(data) => handleSaveEdit(v.id, data)}
                />
                <button
                  onClick={() => setEditingId(null)}
                  className="w-full text-sm text-gray-500 underline"
                >
                  Annuller
                </button>
              </div>
            ) : confirmDeleteId === v.id ? (
              <div className="p-4 text-center space-y-3">
                <p className="font-semibold">Slet &ldquo;{v.name}&rdquo;?</p>
                <p className="text-sm text-gray-500">Alle km-aflæsninger for denne bil slettes også.</p>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => handleDelete(v.id)}
                    className="rounded-lg bg-red-600 px-4 py-2 text-white text-sm font-semibold"
                  >
                    Slet
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="rounded-lg bg-gray-200 dark:bg-gray-700 px-4 py-2 text-sm font-semibold"
                  >
                    Annuller
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setExpandedId(isExpanded ? null : v.id)}
                className="w-full p-4 text-left"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-lg">{v.name}</p>
                      {v.is_default && (
                        <span className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded-full font-semibold">
                          Standard
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{v.registration_number}</p>
                    {reading && (
                      <p className="text-xs text-gray-400 mt-1">
                        Km-tæller: {reading.reading_km.toLocaleString('da-DK')} km ({reading.date})
                      </p>
                    )}
                  </div>
                  <span className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                    ▾
                  </span>
                </div>
              </button>
            )}

            {/* Expanded section */}
            {isExpanded && editingId !== v.id && confirmDeleteId !== v.id && (
              <div className="border-t dark:border-gray-700 p-4 space-y-4 bg-gray-50 dark:bg-gray-800/50">
                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setEditingId(v.id)}
                    className="rounded-lg bg-gray-200 dark:bg-gray-700 px-3 py-2 text-sm font-semibold hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    ✏️ Rediger
                  </button>
                  {!v.is_default && (
                    <button
                      onClick={() => handleSetDefault(v.id)}
                      className="rounded-lg bg-yellow-100 dark:bg-yellow-900 px-3 py-2 text-sm font-semibold text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-800"
                    >
                      ⭐ Sæt som standard
                    </button>
                  )}
                  {vehicles.length > 1 && (
                    <button
                      onClick={() => setConfirmDeleteId(v.id)}
                      className="rounded-lg bg-gray-200 dark:bg-gray-700 px-3 py-2 text-sm font-semibold hover:bg-red-100 dark:hover:bg-red-900 hover:text-red-600"
                    >
                      🗑️ Slet
                    </button>
                  )}
                </div>

                {/* Odometer */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                    Kilometertæller
                  </h3>
                  <OdometerForm
                    lastReading={reading ? { km: reading.reading_km, date: reading.date } : null}
                    onSave={(km) => handleOdometerSave(v.id, km)}
                  />
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Add new vehicle */}
      {showAddForm ? (
        <div className="rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Tilføj ny bil</p>
          <VehicleForm onSave={handleSaveNew} />
          <button
            onClick={() => setShowAddForm(false)}
            className="w-full text-sm text-gray-500 underline"
          >
            Annuller
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-4 text-gray-500 font-semibold hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          + Tilføj bil
        </button>
      )}
    </div>
  )
}
