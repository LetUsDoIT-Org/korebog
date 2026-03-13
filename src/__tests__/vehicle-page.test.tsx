import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { VehicleForm } from '@/components/VehicleForm'

describe('VehicleForm', () => {
  it('renders vehicle name and registration fields', () => {
    render(<VehicleForm onSave={vi.fn()} />)
    expect(screen.getByPlaceholderText('Bilens navn')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Registreringsnummer')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /gem/i })).toBeInTheDocument()
  })
})
