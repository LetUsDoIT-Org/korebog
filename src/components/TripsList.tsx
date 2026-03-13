import type { Trip } from '@/types/database'

type Props = {
  trips: Trip[]
  onDelete: (id: string) => void
}

export function TripsList({ trips, onDelete }: Props) {
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
        return (
          <div
            key={trip.id}
            className="flex items-center justify-between rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-700 p-3"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">{dateStr}</span>
                {!trip.is_business && (
                  <span className="text-xs bg-gray-200 dark:bg-gray-700 rounded px-1">Privat</span>
                )}
                {trip.transport_type === 'public_transport' && (
                  <span className="text-xs bg-yellow-200 dark:bg-yellow-800 rounded px-1">Offentlig</span>
                )}
              </div>
              <p className="font-medium">{trip.purpose}</p>
              <p className="text-sm text-gray-500">{trip.start_address} → {trip.end_address}</p>
            </div>
            <div className="text-right ml-3">
              <p className="font-mono font-semibold">{trip.distance_km} km</p>
              <button
                onClick={() => onDelete(trip.id)}
                className="text-xs text-red-500 hover:text-red-700 mt-1"
              >
                Slet
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
