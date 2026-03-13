import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { OdometerForm } from '@/components/OdometerForm'

describe('OdometerForm', () => {
  it('renders estimated reading and adjustment buttons', () => {
    render(
      <OdometerForm
        lastReading={{ km: 50000, date: '2026-03-01' }}
        onSave={vi.fn()}
      />
    )
    expect(screen.getByText('+50')).toBeInTheDocument()
    expect(screen.getByText('-50')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /gem aflæsning/i })).toBeInTheDocument()
  })

  it('estimates km based on 24000 km/year from last reading', () => {
    // Last reading was 30 days ago at 50000 km
    // 24000 / 365 * 30 ≈ 1973
    // Estimated: ~51973
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    render(
      <OdometerForm
        lastReading={{ km: 50000, date: thirtyDaysAgo.toISOString().split('T')[0] }}
        onSave={vi.fn()}
      />
    )
    const input = screen.getByRole('spinbutton') as HTMLInputElement
    const value = parseInt(input.value)
    expect(value).toBeGreaterThan(51900)
    expect(value).toBeLessThan(52100)
  })
})
