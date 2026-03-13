export async function calculateDistance(
  origin: string,
  destination: string
): Promise<number | null> {
  const res = await fetch(
    `/api/distance?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`
  )
  if (!res.ok) return null
  const data = await res.json()
  return data.distanceKm
}
