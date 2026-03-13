'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [ready, setReady] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Supabase delivers the recovery token via hash fragment or code param.
    // The client library auto-detects and exchanges it on init.
    // Listen for PASSWORD_RECOVERY event to know the session is ready.
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })

    // Also check if we already have a session (code was exchanged by middleware/callback)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })

    // If neither fires within 5s, show error
    const timeout = setTimeout(() => {
      setReady((prev) => {
        if (!prev) setError('Linket er ugyldigt eller udløbet. Prøv at nulstille igen.')
        return prev
      })
    }, 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Adgangskoderne er ikke ens.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
      setTimeout(() => router.push('/'), 2000)
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold">Adgangskode opdateret!</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Du bliver sendt videre om et øjeblik...
          </p>
        </div>
      </div>
    )
  }

  if (error && !ready) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center space-y-3">
          <p className="text-red-500">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="text-sm text-blue-600 underline"
          >
            Tilbage til login
          </button>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-gray-500">Bekræfter dit link...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-center">Ny adgangskode</h1>
        <p className="text-sm text-gray-500 text-center">
          Vælg en ny adgangskode til din konto.
        </p>
        <input
          type="password"
          placeholder="Ny adgangskode"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
          className="w-full rounded-lg border p-3 text-lg dark:bg-gray-800 dark:border-gray-700"
        />
        <input
          type="password"
          placeholder="Bekræft adgangskode"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
          className="w-full rounded-lg border p-3 text-lg dark:bg-gray-800 dark:border-gray-700"
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 p-3 text-lg text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Gemmer...' : 'Gem ny adgangskode'}
        </button>
      </form>
    </div>
  )
}
