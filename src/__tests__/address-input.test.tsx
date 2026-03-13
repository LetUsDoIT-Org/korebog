import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

const mockUseLoadScript = vi.fn().mockReturnValue({ isLoaded: true })

vi.mock('@react-google-maps/api', () => ({
  useLoadScript: (...args: unknown[]) => mockUseLoadScript(...args),
  Autocomplete: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

import { AddressInput } from '@/components/AddressInput'

describe('AddressInput', () => {
  it('renders input with provided placeholder', () => {
    render(<AddressInput placeholder="Startadresse" value="" onChange={vi.fn()} />)
    expect(screen.getByPlaceholderText('Startadresse')).toBeInTheDocument()
  })

  it('renders as plain input when Google Maps is not loaded', () => {
    mockUseLoadScript.mockReturnValueOnce({ isLoaded: false, loadError: undefined })

    render(<AddressInput placeholder="Slutadresse" value="Test" onChange={vi.fn()} />)
    expect(screen.getByPlaceholderText('Slutadresse')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test')).toBeInTheDocument()
  })
})
