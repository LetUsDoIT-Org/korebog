import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { FavoriteTripCard } from '@/components/FavoriteTripCard'

describe('FavoriteTripCard', () => {
  const favorite = {
    id: '1',
    label: 'Kundemøde - Acme',
    purpose: 'Kundemøde',
    start_address: 'Kontoret, København',
    end_address: 'Acme A/S, Aarhus',
    distance_km: 312,
    sort_order: 0,
    user_id: 'u1',
    customer_id: null,
    vehicle_id: null,
    created_at: '',
  }

  it('renders label and distance', () => {
    render(<FavoriteTripCard favorite={favorite} onTap={vi.fn()} onDelete={vi.fn()} onUpdate={vi.fn()} />)
    expect(screen.getByText('Kundemøde - Acme')).toBeInTheDocument()
    expect(screen.getByText('312 km')).toBeInTheDocument()
  })

  it('calls onTap when clicked', () => {
    const onTap = vi.fn()
    render(<FavoriteTripCard favorite={favorite} onTap={onTap} onDelete={vi.fn()} onUpdate={vi.fn()} />)
    fireEvent.click(screen.getByText(/registrer tur/i))
    expect(onTap).toHaveBeenCalledWith(favorite)
  })
})
