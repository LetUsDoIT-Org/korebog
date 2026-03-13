import { describe, it, expect, beforeEach } from 'vitest'
import { addToQueue, getQueue, clearQueue } from '@/lib/offline'

// Note: requires fake-indexeddb for Vitest

describe('offline queue', () => {
  beforeEach(async () => {
    await clearQueue()
  })

  it('adds a trip to the offline queue', async () => {
    const trip = {
      date: '2026-03-10',
      purpose: 'Test',
      start_address: 'A',
      end_address: 'B',
      distance_km: 10,
      is_business: true,
      transport_type: 'car' as const,
      gps_track: null,
      vehicle_id: null,
    }
    await addToQueue(trip)
    const queue = await getQueue()
    expect(queue).toHaveLength(1)
    expect(queue[0].purpose).toBe('Test')
  })
})
