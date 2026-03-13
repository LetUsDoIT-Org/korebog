import { createClient } from '@/lib/supabase/client'
import type { OdometerReading } from '@/types/database'

export async function getLatestReading(vehicleId: string): Promise<OdometerReading | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('odometer_readings')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('date', { ascending: false })
    .limit(1)
    .single()
  return data
}

export async function getReadings(vehicleId: string): Promise<OdometerReading[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('odometer_readings')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('date', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function saveReading(vehicleId: string, readingKm: number, date: string, note?: string): Promise<OdometerReading> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('odometer_readings')
    .insert({ user_id: user.id, vehicle_id: vehicleId, reading_km: readingKm, date, note: note ?? null })
    .select()
    .single()
  if (error) throw error
  return data
}

export function estimateCurrentKm(lastKm: number, lastDate: string): number {
  const daysSince = Math.floor(
    (Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)
  )
  const estimatedKmPerDay = 24000 / 365
  return Math.round(lastKm + daysSince * estimatedKmPerDay)
}
