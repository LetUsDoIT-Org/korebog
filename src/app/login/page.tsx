'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'login' | 'signup' | 'magic'>('login')
  const [magicSent, setMagicSent] = useState(false)
  const router = useRouter()

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else {
        setError('')
        setMode('login')
        alert('Konto oprettet! Du kan nu logge ind.')
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
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 p-3 text-lg text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Vent...' : mode === 'signup' ? 'Opret konto' : 'Log ind'}
        </button>
        <div className="flex justify-between text-sm">
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
        </div>
      </form>
    </div>
  )
}
