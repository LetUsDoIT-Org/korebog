'use client'

import { useState } from 'react'
import type { FavoriteTrip } from '@/types/database'

type Props = {
  favorite: FavoriteTrip
  onTap: (fav: FavoriteTrip) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, updates: Partial<FavoriteTrip>) => void
}

export function FavoriteTripCard({ favorite, onTap, onDelete, onUpdate }: Props) {
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState(favorite.label)
  const [purpose, setPurpose] = useState(favorite.purpose)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function handleSaveEdit() {
    onUpdate(favorite.id, { label, purpose })
    setEditing(false)
  }

  function handleCancelEdit() {
    setLabel(favorite.label)
    setPurpose(favorite.purpose)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="w-full rounded-xl border-2 border-yellow-300 dark:border-yellow-700 bg-white dark:bg-gray-800 p-4 shadow-sm space-y-3">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Navn"
          className="w-full rounded-lg border p-2 text-lg dark:bg-gray-700 dark:border-gray-600"
        />
        <input
          type="text"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder="Formål"
          className="w-full rounded-lg border p-2 text-sm dark:bg-gray-700 dark:border-gray-600"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSaveEdit}
            className="flex-1 rounded-lg bg-blue-600 p-2 text-white text-sm font-semibold"
          >
            Gem
          </button>
          <button
            onClick={handleCancelEdit}
            className="flex-1 rounded-lg bg-gray-200 dark:bg-gray-700 p-2 text-sm font-semibold"
          >
            Annuller
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative group">
      <div className="w-full rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-800 p-4 shadow-sm space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-lg flex-1 min-w-0">{favorite.label}</p>
          <div className="flex gap-1 shrink-0">
            <span
              role="button"
              onClick={() => setEditing(true)}
              className="rounded-lg bg-gray-100 dark:bg-gray-700 px-2 py-1 text-xs hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer"
              title="Rediger"
            >
              ✏️
            </span>
            <span
              role="button"
              onClick={() => setConfirmDelete(true)}
              className="rounded-lg bg-gray-100 dark:bg-gray-700 px-2 py-1 text-xs hover:bg-red-100 dark:hover:bg-red-900 cursor-pointer"
              title="Slet"
            >
              🗑️
            </span>
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {favorite.start_address} → {favorite.end_address}
        </p>
        <div className="flex items-center justify-between">
          <p className="text-sm font-mono text-blue-600 dark:text-blue-400">
            {favorite.distance_km} km
          </p>
          <button
            onClick={() => onTap(favorite)}
            className="rounded-lg bg-green-600 px-4 py-2 text-white text-sm font-semibold hover:bg-green-700 active:scale-95 transition-all"
          >
            ▶ Registrer tur
          </button>
        </div>
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/95 dark:bg-gray-800/95 border-2 border-red-300 dark:border-red-700">
          <div className="text-center space-y-2">
            <p className="text-sm font-semibold">Slet &ldquo;{favorite.label}&rdquo;?</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => onDelete(favorite.id)}
                className="rounded-lg bg-red-600 px-4 py-2 text-white text-sm font-semibold"
              >
                Slet
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg bg-gray-200 dark:bg-gray-700 px-4 py-2 text-sm font-semibold"
              >
                Annuller
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
