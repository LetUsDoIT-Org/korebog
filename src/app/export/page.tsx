'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { tripsToCSV, downloadCSV, generatePDF } from '@/lib/export'

export default function ExportPage() {
  const now = new Date()
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const today = now.toISOString().split('T')[0]

  const [from, setFrom] = useState(firstOfMonth)
  const [to, setTo] = useState(today)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    localStorage.setItem('korebog_has_exported', 'true')
  }, [])

  async function fetchExportData() {
    const supabase = createClient()
    const { data: trips } = await supabase
      .from('trips')
      .select('*, vehicles(registration_number), customers(name)')
      .gte('date', from)
      .lte('date', to)
      .eq('is_business', true)
      .order('date')

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .single()

    return {
      trips: (trips ?? []).map((t: any) => ({
        date: t.date,
        purpose: t.purpose,
        start_address: t.start_address,
        end_address: t.end_address,
        distance_km: Number(t.distance_km),
        transport_type: t.transport_type,
        registration_number: t.vehicles?.registration_number ?? '',
        customer_name: t.customers?.name ?? '',
        odometer_start_km: t.odometer_start_km ?? null,
        odometer_end_km: t.odometer_end_km ?? null,
      })),
      userInfo: {
        name: profile?.full_name ?? '',
        address: profile?.address ?? '',
        identifier: profile?.identifier ?? '',
      },
    }
  }

  async function handleCSV() {
    setLoading(true)
    const { trips } = await fetchExportData()
    const csv = tripsToCSV(trips)
    downloadCSV(csv, `korebog-${from}-${to}.csv`)
    setLoading(false)
  }

  async function handlePDF() {
    setLoading(true)
    const { trips, userInfo } = await fetchExportData()
    await generatePDF(trips, userInfo, { from, to })
    setLoading(false)
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Eksporter kørebog</h1>
      <div className="space-y-3">
        <label className="block text-sm font-medium">Fra</label>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
          className="w-full rounded-lg border p-3 dark:bg-gray-800 dark:border-gray-700" />
        <label className="block text-sm font-medium">Til</label>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
          className="w-full rounded-lg border p-3 dark:bg-gray-800 dark:border-gray-700" />
      </div>
      <div className="flex gap-3">
        <button onClick={handleCSV} disabled={loading}
          className="flex-1 rounded-lg bg-green-600 p-3 text-white font-semibold hover:bg-green-700 disabled:opacity-50">
          Download CSV
        </button>
        <button onClick={handlePDF} disabled={loading}
          className="flex-1 rounded-lg bg-blue-600 p-3 text-white font-semibold hover:bg-blue-700 disabled:opacity-50">
          Download PDF
        </button>
      </div>
    </div>
  )
}
