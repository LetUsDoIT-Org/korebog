import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TripForm } from '@/components/TripForm'

vi.mock('@react-google-maps/api', () => ({
  useLoadScript: () => ({ isLoaded: false }),
  Autocomplete: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

describe('TripForm', () => {
  it('renders all required fields', () => {
    render(<TripForm onSave={vi.fn()} />)
    expect(screen.getByPlaceholderText('Startadresse')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Slutadresse')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Formål')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /gem tur/i })).toBeInTheDocument()
  })

  it('defaults to today and business trip', () => {
    render(<TripForm onSave={vi.fn()} />)
    const dateInput = screen.getByDisplayValue(new Date().toISOString().split('T')[0])
    expect(dateInput).toBeInTheDocument()
  })
})
