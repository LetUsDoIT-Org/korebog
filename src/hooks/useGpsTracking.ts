'use client'

import { useState, useRef, useCallback } from 'react'

type Coordinate = { lat: number; lng: number; timestamp: number }

export function calculateGpsDistance(coords: Coordinate[]): number {
  if (coords.length < 2) return 0

  let totalKm = 0
  for (let i = 1; i < coords.length; i++) {
    totalKm += haversine(coords[i - 1], coords[i])
  }
  return Math.round(totalKm * 10) / 10
}

function haversine(a: Coordinate, b: Coordinate): number {
  const R = 6371 // Earth radius in km
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng
  return 2 * R * Math.asin(Math.sqrt(h))
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

export function useGpsTracking() {
  const [tracking, setTracking] = useState(false)
  const [coords, setCoords] = useState<Coordinate[]>([])
  const [error, setError] = useState<string | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  const start = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('GPS er ikke tilgængelig i denne browser')
      return
    }

    setCoords([])
    setError(null)
    setTracking(true)

    // Request wake lock to keep screen on
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen')
      }
    } catch {
      // Wake lock not available, continue without it
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setCoords((prev) => [
          ...prev,
          { lat: pos.coords.latitude, lng: pos.coords.longitude, timestamp: pos.timestamp },
        ])
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    )
  }, [])

  const stop = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (wakeLockRef.current) {
      wakeLockRef.current.release()
      wakeLockRef.current = null
    }
    setTracking(false)
  }, [])

  return {
    tracking,
    coords,
    error,
    distanceKm: calculateGpsDistance(coords),
    start,
    stop,
  }
}
