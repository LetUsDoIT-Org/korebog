'use client'

import { useState } from 'react'
import type { Vehicle } from '@/types/database'

type Props = {
  vehicle?: Vehicle | null
  onSave: (data: { name: string; registration_number: string }) => void
}

export function VehicleForm({ vehicle, onSave }: Props) {
  const [name, setName] = useState(vehicle?.name ?? '')
  const [regNr, setRegNr] = useState(vehicle?.registration_number ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave({ name, registration_number: regNr })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        placeholder="Bilens navn"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className="w-full rounded-lg border p-3 text-lg dark:bg-gray-800 dark:border-gray-700"
      />
      <input
        type="text"
        placeholder="Registreringsnummer"
        value={regNr}
        onChange={(e) => setRegNr(e.target.value.toUpperCase())}
        required
        className="w-full rounded-lg border p-3 text-lg dark:bg-gray-800 dark:border-gray-700"
      />
      <button
        type="submit"
        className="w-full rounded-lg bg-blue-600 p-3 text-lg text-white font-semibold hover:bg-blue-700"
      >
        Gem
      </button>
    </form>
  )
}
