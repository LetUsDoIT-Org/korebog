'use client'

import { useState } from 'react'
import { AddressInput } from './AddressInput'
import { calculateDistance } from '@/lib/maps'
import type { Customer } from '@/types/database'

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
  onSave: (data: TripData, saveAsFavorite: boolean, favoriteLabel: string) => void
  initial?: Partial<TripData>
  customers?: Customer[]
  currentOdometerKm?: number | null
}

export function TripForm({ onSave, initial, customers = [], currentOdometerKm }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(initial?.date ?? today)
  const [purpose, setPurpose] = useState(initial?.purpose ?? 'Kundemøde')
  const [startAddress, setStartAddress] = useState(initial?.start_address ?? '')
  const [endAddress, setEndAddress] = useState(initial?.end_address ?? '')
  const [distanceKm, setDistanceKm] = useState(initial?.distance_km ?? 0)
  const [isBusiness, setIsBusiness] = useState(initial?.is_business ?? true)
  const [transportType, setTransportType] = useState<'car' | 'public_transport'>(
    initial?.transport_type ?? 'car'
  )
  const [calculating, setCalculating] = useState(false)
  const [returnTrip, setReturnTrip] = useState(initial?.distance_km ? false : true)
  const [customerId, setCustomerId] = useState<string | null>(initial?.customer_id ?? null)
  const [saveAsFav, setSaveAsFav] = useState(false)
  const [favLabel, setFavLabel] = useState('')
  const [showOptions, setShowOptions] = useState(false)
  const initialOdometer = initial?.odometer_start_km ?? currentOdometerKm ?? 0
  const [odometerStart, setOdometerStart] = useState<string>(
    initialOdometer > 0 ? String(initialOdometer) : ''
  )
  const odometerStartNum = parseFloat(odometerStart) || 0
  const showOdometer = initialOdometer > 0 || odometerStart !== ''

  const totalKm = returnTrip ? distanceKm * 2 : distanceKm

  // Show non-default options summary
  const optionsSummary: string[] = []
  if (!isBusiness) optionsSummary.push('Privat')
  if (transportType !== 'car') optionsSummary.push('Offentlig transport')

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

  async function handleCustomerSelect(c: Customer) {
    if (customerId === c.id) {
      // Deselect
      setCustomerId(null)
      return
    }
    setCustomerId(c.id)
    if (c.address) {
      setEndAddress(c.address)
      // Auto-calculate distance if start address is also set
      if (startAddress) {
        setCalculating(true)
        const km = await calculateDistance(startAddress, c.address)
        if (km !== null) setDistanceKm(km)
        setCalculating(false)
      }
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const odometerEnd = odometerStartNum > 0 ? Math.round(odometerStartNum + totalKm) : null
    onSave({
      date,
      purpose,
      start_address: startAddress,
      end_address: endAddress,
      distance_km: totalKm,
      is_business: isBusiness,
      transport_type: transportType,
      customer_id: customerId,
      odometer_start_km: odometerStartNum > 0 ? odometerStartNum : null,
      odometer_end_km: odometerEnd,
    }, saveAsFav, favLabel || purpose)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Customer chips */}
      {customers.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Kunde</p>
          <div className="flex flex-wrap gap-2">
            {customers.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleCustomerSelect(c)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                  customerId === c.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

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

      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <input
            type="number"
            step="0.1"
            value={distanceKm || ''}
            onChange={(e) => setDistanceKm(parseFloat(e.target.value) || 0)}
            placeholder="Km"
            className="w-24 rounded-lg border p-3 text-lg text-center dark:bg-gray-800 dark:border-gray-700"
          />
          <span className="text-gray-500">km (én vej)</span>
          {calculating && <span className="text-sm text-gray-400">Beregner...</span>}
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={returnTrip}
            onChange={(e) => setReturnTrip(e.target.checked)}
            className="w-5 h-5 rounded"
          />
          <span className="text-base">Tur/retur</span>
          {returnTrip && distanceKm > 0 && (
            <span className="text-sm text-blue-600 dark:text-blue-400 font-semibold">
              = {Math.round(totalKm)} km total
            </span>
          )}
        </label>
      </div>

      {/* Odometer readings */}
      {showOdometer && (
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3 space-y-2">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Kilometertæller</p>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-400">Start km</label>
              <input
                type="number"
                value={odometerStart}
                onChange={(e) => setOdometerStart(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border p-2 text-center text-lg dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
            <span className="text-gray-400 mt-4">→</span>
            <div className="flex-1">
              <label className="text-xs text-gray-400">Slut km</label>
              <input
                type="number"
                value={odometerStartNum > 0 && totalKm > 0 ? Math.round(odometerStartNum + totalKm) : ''}
                onChange={(e) => {
                  const endKm = parseFloat(e.target.value) || 0
                  const newDistance = endKm - odometerStartNum
                  if (newDistance > 0) {
                    setDistanceKm(returnTrip ? newDistance / 2 : newDistance)
                  }
                }}
                placeholder="0"
                className="w-full rounded-lg border p-2 text-center text-lg dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          </div>
        </div>
      )}

      <input
        type="text"
        placeholder="Formål"
        value={purpose}
        onChange={(e) => setPurpose(e.target.value)}
        required
        className="w-full rounded-lg border p-3 text-lg dark:bg-gray-800 dark:border-gray-700"
      />

      {/* Collapsible options: business/private, transport type */}
      <div>
        <button
          type="button"
          onClick={() => setShowOptions(!showOptions)}
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <span className={`transition-transform ${showOptions ? 'rotate-90' : ''}`}>&#9654;</span>
          <span>Indstillinger</span>
          {optionsSummary.length > 0 && (
            <span className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded-full">
              {optionsSummary.join(', ')}
            </span>
          )}
          {optionsSummary.length === 0 && (
            <span className="text-xs text-gray-400">(Erhverv, Bil)</span>
          )}
        </button>

        {showOptions && (
          <div className="mt-3 space-y-3 pl-1">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsBusiness(true)}
                className={`flex-1 rounded-lg p-2 text-center text-sm font-semibold ${
                  isBusiness ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                Erhverv
              </button>
              <button
                type="button"
                onClick={() => setIsBusiness(false)}
                className={`flex-1 rounded-lg p-2 text-center text-sm font-semibold ${
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
                className={`flex-1 rounded-lg p-2 text-center text-sm ${
                  transportType === 'car' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                Bil
              </button>
              <button
                type="button"
                onClick={() => setTransportType('public_transport')}
                className={`flex-1 rounded-lg p-2 text-center text-sm ${
                  transportType === 'public_transport' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                Offentlig transport
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Save as favorite */}
      <div className="space-y-2">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={saveAsFav}
            onChange={(e) => setSaveAsFav(e.target.checked)}
            className="w-5 h-5 rounded"
          />
          <span className="text-base">Gem som favorit</span>
        </label>
        {saveAsFav && (
          <input
            type="text"
            placeholder="Favorit-navn (f.eks. Kundemøde - Acme)"
            value={favLabel}
            onChange={(e) => setFavLabel(e.target.value)}
            className="w-full rounded-lg border p-3 text-lg dark:bg-gray-800 dark:border-gray-700"
          />
        )}
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
