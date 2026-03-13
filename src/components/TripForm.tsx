'use client'

import { useState } from 'react'
import { AddressInput } from './AddressInput'
import { calculateDistance } from '@/lib/maps'

type TripData = {
  date: string
  purpose: string
  start_address: string
  end_address: string
  distance_km: number
  is_business: boolean
  transport_type: 'car' | 'public_transport'
}

type Props = {
  onSave: (data: TripData) => void
  initial?: Partial<TripData>
}

export function TripForm({ onSave, initial }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(initial?.date ?? today)
  const [purpose, setPurpose] = useState(initial?.purpose ?? '')
  const [startAddress, setStartAddress] = useState(initial?.start_address ?? '')
  const [endAddress, setEndAddress] = useState(initial?.end_address ?? '')
  const [distanceKm, setDistanceKm] = useState(initial?.distance_km ?? 0)
  const [isBusiness, setIsBusiness] = useState(initial?.is_business ?? true)
  const [transportType, setTransportType] = useState<'car' | 'public_transport'>(
    initial?.transport_type ?? 'car'
  )
  const [calculating, setCalculating] = useState(false)

  async function handleAddressChange(field: 'start' | 'end', address: string) {
    if (field === 'start') setStartAddress(address)
    else setEndAddress(address)

    const start = field === 'start' ? address : startAddress
    const end = field === 'end' ? address : endAddress

    if (start && end) {
      setCalculating(true)
      const km = await calculateDistance(start, end)
      if (km !== null) setDistanceKm(km)
      setCalculating(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave({
      date,
      purpose,
      start_address: startAddress,
      end_address: endAddress,
      distance_km: distanceKm,
      is_business: isBusiness,
      transport_type: transportType,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="w-full rounded-lg border p-3 text-lg dark:bg-gray-800 dark:border-gray-700"
      />

      <AddressInput
        placeholder="Startadresse"
        value={startAddress}
        onChange={(a) => handleAddressChange('start', a)}
      />

      <AddressInput
        placeholder="Slutadresse"
        value={endAddress}
        onChange={(a) => handleAddressChange('end', a)}
      />

      <div className="flex items-center gap-3">
        <input
          type="number"
          step="0.1"
          value={distanceKm || ''}
          onChange={(e) => setDistanceKm(parseFloat(e.target.value) || 0)}
          placeholder="Km"
          className="w-24 rounded-lg border p-3 text-lg text-center dark:bg-gray-800 dark:border-gray-700"
        />
        <span className="text-gray-500">km</span>
        {calculating && <span className="text-sm text-gray-400">Beregner...</span>}
      </div>

      <input
        type="text"
        placeholder="Formål"
        value={purpose}
        onChange={(e) => setPurpose(e.target.value)}
        required
        className="w-full rounded-lg border p-3 text-lg dark:bg-gray-800 dark:border-gray-700"
      />

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setIsBusiness(true)}
          className={`flex-1 rounded-lg p-3 text-center font-semibold ${
            isBusiness ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          Erhverv
        </button>
        <button
          type="button"
          onClick={() => setIsBusiness(false)}
          className={`flex-1 rounded-lg p-3 text-center font-semibold ${
            !isBusiness ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          Privat
        </button>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setTransportType('car')}
          className={`flex-1 rounded-lg p-3 text-center ${
            transportType === 'car' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          Bil
        </button>
        <button
          type="button"
          onClick={() => setTransportType('public_transport')}
          className={`flex-1 rounded-lg p-3 text-center ${
            transportType === 'public_transport' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          Offentlig transport
        </button>
      </div>

      <button
        type="submit"
        className="w-full rounded-lg bg-green-600 p-3 text-lg text-white font-semibold hover:bg-green-700"
      >
        Gem tur
      </button>
    </form>
  )
}
