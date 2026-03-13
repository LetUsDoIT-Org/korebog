import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      signUp: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

import LoginPage from '@/app/login/page'

describe('LoginPage', () => {
  it('renders email input and login button', () => {
    render(<LoginPage />)
    expect(screen.getByPlaceholderText('din@email.dk')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log ind/i })).toBeInTheDocument()
  })
})
