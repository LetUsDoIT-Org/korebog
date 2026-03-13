import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { HomeContent } from '@/components/HomeContent'

vi.mock('@react-google-maps/api', () => ({
  useLoadScript: () => ({ isLoaded: false }),
  Autocomplete: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

describe('HomeContent', () => {
  it('renders month stats and action buttons', () => {
    render(
      <HomeContent
        favorites={[]}
        customers={[]}
        monthStats={{ totalKm: 0, tripCount: 0 }}
        defaultStartAddress=""
        currentOdometerKm={null}
        onFavoriteTap={vi.fn()}
        onFavoriteDelete={vi.fn()}
        onFavoriteUpdate={vi.fn()}
        onTripSave={vi.fn()}
      />
    )
    expect(screen.getByText(/denne måned/i)).toBeInTheDocument()
    expect(screen.getByText(/ny tur/i)).toBeInTheDocument()
    expect(screen.getByText(/start gps/i)).toBeInTheDocument()
  })
})
