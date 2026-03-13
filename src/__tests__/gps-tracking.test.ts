import { describe, it, expect } from 'vitest'
import { calculateGpsDistance } from '@/hooks/useGpsTracking'

describe('calculateGpsDistance', () => {
  it('calculates distance between two points using Haversine', () => {
    // Copenhagen to Aarhus ≈ 157 km straight line (Haversine)
    const coords = [
      { lat: 55.6761, lng: 12.5683, timestamp: 0 },
      { lat: 56.1629, lng: 10.2039, timestamp: 1 },
    ]
    const km = calculateGpsDistance(coords)
    expect(km).toBeGreaterThan(150)
    expect(km).toBeLessThan(165)
  })

  it('returns 0 for single point', () => {
    const coords = [{ lat: 55.6761, lng: 12.5683, timestamp: 0 }]
    expect(calculateGpsDistance(coords)).toBe(0)
  })

  it('sums segments for multiple points', () => {
    const coords = [
      { lat: 55.6761, lng: 12.5683, timestamp: 0 },
      { lat: 55.8, lng: 12.4, timestamp: 1 },
      { lat: 56.0, lng: 12.2, timestamp: 2 },
    ]
    const km = calculateGpsDistance(coords)
    expect(km).toBeGreaterThan(30)
  })
})
