'use client'

import { useState } from 'react'
import type { Trip, Customer } from '@/types/database'
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
  trips: Trip[]
  customers?: Customer[]
  currentOdometerKm?: number | null
  onDelete: (id: string) => void
  onUpdate?: (id: string, data: TripData) => void
}

export function TripsList({ trips, customers = [], currentOdometerKm, onDelete, onUpdate }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)

  if (trips.length === 0) {
    return <p className="text-center text-gray-500 py-8">Ingen ture denne måned</p>
  }

  return (
    <div className="space-y-2">
      {trips.map((trip) => {
        const dateStr = new Date(trip.date).toLocaleDateString('da-DK', {
          day: 'numeric',
          month: 'short',
        })

        if (editingId === trip.id) {
          return (
            <div key={trip.id} className="rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-700 p-3 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Rediger tur</h3>
                <button
                  onClick={() => setEditingId(null)}
                  className="text-gray-500 text-xl"
                >
                  &times;
                </button>
              </div>
              <TripForm
                initial={{
                  date: trip.date,
                  purpose: trip.purpose,
                  start_address: trip.start_address,
                  end_address: trip.end_address,
                  distance_km: trip.distance_km,
                  is_business: trip.is_business,
                  transport_type: trip.transport_type,
                  customer_id: trip.customer_id,
                  odometer_start_km: trip.odometer_start_km,
                  odometer_end_km: trip.odometer_end_km,
                }}
                customers={customers}
                currentOdometerKm={currentOdometerKm}
                onSave={(data) => {
                  onUpdate?.(trip.id, data)
                  setEditingId(null)
                }}
              />
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 p-3 text-gray-600 dark:text-gray-400 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Annuller
              </button>
            </div>
          )
        }

        const customerName = trip.customer_id
          ? customers.find((c) => c.id === trip.customer_id)?.name
          : null

        return (
          <div
            key={trip.id}
            className="rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-700 p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">{dateStr}</span>
                  <span className="font-medium">{trip.purpose}</span>
                  {!trip.is_business && (
                    <span className="text-xs bg-gray-200 dark:bg-gray-700 rounded px-1">Privat</span>
                  )}
                  {trip.transport_type === 'public_transport' && (
                    <span className="text-xs bg-yellow-200 dark:bg-yellow-800 rounded px-1">Offentlig</span>
                  )}
                </div>
                {customerName && (
                  <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-0.5">{customerName}</p>
                )}
                <p className="text-sm text-gray-500 mt-0.5">Fra: {trip.start_address}</p>
                <p className="text-sm text-gray-500">Til: {trip.end_address}</p>
                {(trip.odometer_start_km != null || trip.odometer_end_km != null) && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-mono">
                    Km-tæller: {trip.odometer_start_km?.toLocaleString('da-DK') ?? '–'} → {trip.odometer_end_km?.toLocaleString('da-DK') ?? '–'}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="font-mono font-semibold">{trip.distance_km} km</p>
                <div className="flex gap-2 mt-1 justify-end">
                  {onUpdate && (
                    <button
                      onClick={() => setEditingId(trip.id)}
                      className="text-xs text-blue-500 hover:text-blue-700"
                    >
                      Rediger
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(trip.id)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Slet
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
