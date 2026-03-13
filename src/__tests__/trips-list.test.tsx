import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TripsList } from '@/components/TripsList'

describe('TripsList', () => {
  it('renders trips with date, purpose, and km', () => {
    const trips = [
      {
        id: '1', user_id: 'u1', vehicle_id: 'v1', date: '2026-03-10',
        purpose: 'Kundemøde', start_address: 'København', end_address: 'Aarhus',
        distance_km: 312, is_business: true, transport_type: 'car' as const,
        gps_track: null, created_at: '',
      },
    ]
    render(<TripsList trips={trips} onDelete={vi.fn()} />)
    expect(screen.getByText('Kundemøde')).toBeInTheDocument()
    expect(screen.getByText('312 km')).toBeInTheDocument()
    expect(screen.getByText(/10\. mar/i)).toBeInTheDocument()
  })

  it('shows empty state when no trips', () => {
    render(<TripsList trips={[]} onDelete={vi.fn()} />)
    expect(screen.getByText(/ingen ture/i)).toBeInTheDocument()
  })
})
