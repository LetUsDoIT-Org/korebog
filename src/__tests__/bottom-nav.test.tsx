import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { BottomNav } from '@/components/BottomNav'

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}))

describe('BottomNav', () => {
  it('renders three navigation tabs', () => {
    render(<BottomNav />)
    expect(screen.getByText('Hjem')).toBeInTheDocument()
    expect(screen.getByText('Ture')).toBeInTheDocument()
    expect(screen.getByText('Bil')).toBeInTheDocument()
  })
})
