'use client'

import { useEffect, useState } from 'react'
import { getProfile, upsertProfile } from '@/lib/api/profile'
import { getCustomers, saveCustomer, updateCustomer, deleteCustomer } from '@/lib/api/customers'
import { AddressInput } from '@/components/AddressInput'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Customer } from '@/types/database'

export default function SettingsPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [address, setAddress] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Customers
  const [customers, setCustomers] = useState<Customer[]>([])
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerAddress, setNewCustomerAddress] = useState('')
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [editName, setEditName] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    getProfile().then((p) => {
      if (p) {
        setFullName(p.full_name)
        setAddress(p.address)
        setIdentifier(p.identifier)
      }
    })
    loadCustomers()
  }, [])

  async function loadCustomers() {
    const custs = await getCustomers()
    setCustomers(custs)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaveError('')
    try {
      await upsertProfile({
        full_name: fullName,
        address,
        identifier,
        identifier_type: 'employee_number',
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Failed to save profile:', err)
      setSaveError(err instanceof Error ? err.message : 'Kunne ikke gemme profil')
    }
  }

  async function handleAddCustomer(e: React.FormEvent) {
    e.preventDefault()
    if (!newCustomerName.trim()) return
    await saveCustomer({ name: newCustomerName.trim(), address: newCustomerAddress.trim() })
    setNewCustomerName('')
    setNewCustomerAddress('')
    await loadCustomers()
  }

  async function handleUpdateCustomer() {
    if (!editingCustomer || !editName.trim()) return
    await updateCustomer(editingCustomer.id, { name: editName.trim(), address: editAddress.trim() })
    setEditingCustomer(null)
    await loadCustomers()
  }

  async function handleDeleteCustomer(id: string) {
    await deleteCustomer(id)
    setConfirmDeleteId(null)
    await loadCustomers()
  }

  function startEdit(customer: Customer) {
    setEditingCustomer(customer)
    setEditName(customer.name)
    setEditAddress(customer.address)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Indstillinger</h1>

      <form onSubmit={handleSave} className="space-y-4">
        <h2 className="text-lg font-semibold">Profil (til eksport)</h2>
        <input type="text" placeholder="Fulde navn" value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-lg border p-3 dark:bg-gray-800 dark:border-gray-700" />
        <AddressInput
          placeholder="Adresse"
          value={address}
          onChange={(a) => setAddress(a)}
        />

        <input type="text" placeholder="Medarbejdernummer"
          value={identifier} onChange={(e) => setIdentifier(e.target.value)}
          className="w-full rounded-lg border p-3 dark:bg-gray-800 dark:border-gray-700" />

        {saveError && (
          <p className="text-red-500 text-sm">{saveError}</p>
        )}
        <button type="submit"
          className="w-full rounded-lg bg-blue-600 p-3 text-white font-semibold hover:bg-blue-700">
          {saved ? 'Gemt!' : 'Gem profil'}
        </button>
      </form>

      <hr className="dark:border-gray-700" />

      {/* Customers section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Kunder</h2>

        {/* Existing customers */}
        {customers.length > 0 && (
          <div className="space-y-2">
            {customers.map((c) => (
              <div key={c.id} className="relative rounded-lg border dark:border-gray-700 p-3">
                {editingCustomer?.id === c.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Kundenavn"
                      className="w-full rounded-lg border p-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <AddressInput
                      placeholder="Kundeadresse"
                      value={editAddress}
                      onChange={(a) => setEditAddress(a)}
                    />
                    <div className="flex gap-2">
                      <button onClick={handleUpdateCustomer}
                        className="flex-1 rounded-lg bg-blue-600 p-2 text-white text-sm font-semibold">
                        Gem
                      </button>
                      <button onClick={() => setEditingCustomer(null)}
                        className="flex-1 rounded-lg bg-gray-200 dark:bg-gray-700 p-2 text-sm font-semibold">
                        Annuller
                      </button>
                    </div>
                  </div>
                ) : confirmDeleteId === c.id ? (
                  <div className="text-center space-y-2">
                    <p className="text-sm font-semibold">Slet &ldquo;{c.name}&rdquo;?</p>
                    <div className="flex gap-2 justify-center">
                      <button onClick={() => handleDeleteCustomer(c.id)}
                        className="rounded-lg bg-red-600 px-4 py-2 text-white text-sm font-semibold">
                        Slet
                      </button>
                      <button onClick={() => setConfirmDeleteId(null)}
                        className="rounded-lg bg-gray-200 dark:bg-gray-700 px-4 py-2 text-sm font-semibold">
                        Annuller
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{c.name}</p>
                      {c.address && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">{c.address}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(c)}
                        className="rounded-lg bg-gray-100 dark:bg-gray-700 px-2 py-1 text-xs hover:bg-gray-200 dark:hover:bg-gray-600"
                        title="Rediger">
                        ✏️
                      </button>
                      <button onClick={() => setConfirmDeleteId(c.id)}
                        className="rounded-lg bg-gray-100 dark:bg-gray-700 px-2 py-1 text-xs hover:bg-red-100 dark:hover:bg-red-900"
                        title="Slet">
                        🗑️
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add new customer */}
        <form onSubmit={handleAddCustomer} className="rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Tilføj ny kunde</p>
          <input
            type="text"
            placeholder="Kundenavn"
            value={newCustomerName}
            onChange={(e) => setNewCustomerName(e.target.value)}
            className="w-full rounded-lg border p-3 dark:bg-gray-800 dark:border-gray-700"
          />
          <AddressInput
            placeholder="Kundeadresse (valgfrit)"
            value={newCustomerAddress}
            onChange={(a) => setNewCustomerAddress(a)}
          />
          <button type="submit"
            disabled={!newCustomerName.trim()}
            className="w-full rounded-lg bg-green-600 p-3 text-white font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">
            Tilføj kunde
          </button>
        </form>
      </div>

      <hr className="dark:border-gray-700" />

      <button onClick={handleLogout}
        className="w-full rounded-lg border border-red-500 p-3 text-red-500 font-semibold hover:bg-red-50 dark:hover:bg-red-950">
        Log ud
      </button>
    </div>
  )
}
