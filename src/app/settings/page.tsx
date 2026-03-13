'use client'

import { useEffect, useState } from 'react'
import { getProfile, upsertProfile } from '@/lib/api/profile'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [address, setAddress] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [identifierType, setIdentifierType] = useState<'cpr' | 'employee_number'>('cpr')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getProfile().then((p) => {
      if (p) {
        setFullName(p.full_name)
        setAddress(p.address)
        setIdentifier(p.identifier)
        setIdentifierType(p.identifier_type as 'cpr' | 'employee_number')
      }
    })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    await upsertProfile({
      full_name: fullName,
      address,
      identifier,
      identifier_type: identifierType,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Indstillinger</h1>

      <form onSubmit={handleSave} className="space-y-4">
        <h2 className="text-lg font-semibold">Profil (til eksport)</h2>
        <input type="text" placeholder="Fulde navn" value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-lg border p-3 dark:bg-gray-800 dark:border-gray-700" />
        <input type="text" placeholder="Adresse" value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full rounded-lg border p-3 dark:bg-gray-800 dark:border-gray-700" />

        <div className="flex gap-3">
          <button type="button" onClick={() => setIdentifierType('cpr')}
            className={`flex-1 rounded-lg p-2 text-center ${identifierType === 'cpr' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
            CPR-nr
          </button>
          <button type="button" onClick={() => setIdentifierType('employee_number')}
            className={`flex-1 rounded-lg p-2 text-center ${identifierType === 'employee_number' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
            Medarbejdernr
          </button>
        </div>
        <input type="text" placeholder={identifierType === 'cpr' ? 'CPR-nummer' : 'Medarbejdernummer'}
          value={identifier} onChange={(e) => setIdentifier(e.target.value)}
          className="w-full rounded-lg border p-3 dark:bg-gray-800 dark:border-gray-700" />

        <button type="submit"
          className="w-full rounded-lg bg-blue-600 p-3 text-white font-semibold hover:bg-blue-700">
          {saved ? 'Gemt!' : 'Gem profil'}
        </button>
      </form>

      <hr className="dark:border-gray-700" />

      <button onClick={handleLogout}
        className="w-full rounded-lg border border-red-500 p-3 text-red-500 font-semibold hover:bg-red-50 dark:hover:bg-red-950">
        Log ud
      </button>
    </div>
  )
}
