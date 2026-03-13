'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'login' | 'signup' | 'magic' | 'reset'>('login')
  const [magicSent, setMagicSent] = useState(false)
  const [signupSuccess, setSignupSuccess] = useState(false)
  const router = useRouter()

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else if (data.user && !data.user.identities?.length) {
        // User already exists with this email
        setError('Der findes allerede en konto med denne email. Prøv at logge ind i stedet.')
        setMode('login')
      } else if (data.session) {
        // Auto-confirmed (e.g. local dev or email confirmation disabled)
        router.push('/')
      } else {
        // Email confirmation required
        setError('')
        setMode('login')
        setSignupSuccess(true)
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        router.push('/')
      }
    }
    setLoading(false)
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setError(error.message)
    } else {
      setMagicSent(true)
    }
    setLoading(false)
  }

  const [resetSent, setResetSent] = useState(false)

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      setError(error.message)
    } else {
      setResetSent(true)
    }
    setLoading(false)
  }

  if (resetSent) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold">Tjek din email</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Vi har sendt et link til {email} til at nulstille din adgangskode.
          </p>
          <button
            type="button"
            onClick={() => { setResetSent(false); setMode('login') }}
            className="text-sm text-blue-600 underline"
          >
            Tilbage til login
          </button>
        </div>
      </div>
    )
  }

  if (magicSent) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Tjek din email</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Vi har sendt et login-link til {email}
          </p>
        </div>
      </div>
    )
  }

  if (mode === 'reset') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <form onSubmit={handleResetPassword} className="w-full max-w-sm space-y-4">
          <h1 className="text-2xl font-bold text-center">Kørebog</h1>
          <p className="text-sm text-gray-500 text-center">
            Indtast din email, så sender vi et link til at nulstille din adgangskode.
          </p>
          <input
            type="email"
            placeholder="din@email.dk"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-lg border p-3 text-lg dark:bg-gray-800 dark:border-gray-700"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 p-3 text-lg text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Sender...' : 'Nulstil adgangskode'}
          </button>
          <button
            type="button"
            onClick={() => setMode('login')}
            className="w-full text-sm text-gray-500 underline"
          >
            Tilbage til login
          </button>
        </form>
      </div>
    )
  }

  if (mode === 'magic') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <form onSubmit={handleMagicLink} className="w-full max-w-sm space-y-4">
          <h1 className="text-2xl font-bold text-center">Kørebog</h1>
          <input
            type="email"
            placeholder="din@email.dk"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-lg border p-3 text-lg dark:bg-gray-800 dark:border-gray-700"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 p-3 text-lg text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Sender...' : 'Send magic link'}
          </button>
          <button
            type="button"
            onClick={() => setMode('login')}
            className="w-full text-sm text-gray-500 underline"
          >
            Log ind med adgangskode
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={handlePasswordLogin} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-center">Kørebog</h1>
        <input
          type="email"
          placeholder="din@email.dk"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="w-full rounded-lg border p-3 text-lg dark:bg-gray-800 dark:border-gray-700"
        />
        <input
          type="password"
          placeholder="Adgangskode"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          className="w-full rounded-lg border p-3 text-lg dark:bg-gray-800 dark:border-gray-700"
        />
        {signupSuccess && (
          <div className="rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-3 text-sm text-green-800 dark:text-green-200">
            <p className="font-semibold">Konto oprettet!</p>
            <p>Tjek din email og klik på bekræftelseslinket, før du kan logge ind.</p>
          </div>
        )}
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 p-3 text-lg text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Vent...' : mode === 'signup' ? 'Opret konto' : 'Log ind'}
        </button>
        <div className="flex flex-wrap justify-between gap-y-2 text-sm">
          <button
            type="button"
            onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
            className="text-gray-500 underline"
          >
            {mode === 'signup' ? 'Har allerede konto' : 'Opret ny konto'}
          </button>
          <button
            type="button"
            onClick={() => setMode('magic')}
            className="text-gray-500 underline"
          >
            Magic link
          </button>
          {mode === 'login' && (
            <button
              type="button"
              onClick={() => setMode('reset')}
              className="w-full text-center text-gray-500 underline"
            >
              Glemt adgangskode?
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
