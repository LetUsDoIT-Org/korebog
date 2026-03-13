import type { FavoriteTrip } from '@/types/database'

type Props = {
  favorite: FavoriteTrip
  onTap: (fav: FavoriteTrip) => void
}

export function FavoriteTripCard({ favorite, onTap }: Props) {
  return (
    <button
      onClick={() => onTap(favorite)}
      className="w-full rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-800 p-4 text-left shadow-sm hover:shadow-md active:scale-95 transition-all"
    >
      <p className="font-semibold text-lg">{favorite.label}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        {favorite.start_address} → {favorite.end_address}
      </p>
      <p className="text-sm font-mono text-blue-600 dark:text-blue-400 mt-1">
        {favorite.distance_km} km
      </p>
    </button>
  )
}
