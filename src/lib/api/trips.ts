import { createClient } from '@/lib/supabase/client'
import type { Trip } from '@/types/database'

export async function saveTrip(trip: Omit<Trip, 'id' | 'user_id' | 'created_at'>): Promise<Trip> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('trips')
    .insert({ ...trip, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getTrips(year: number, month: number): Promise<Trip[]> {
  const supabase = createClient()
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = month === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2, '0')}-01`

  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .gte('date', startDate)
    .lt('date', endDate)
    .order('date', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function deleteTrip(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('trips').delete().eq('id', id)
  if (error) throw error
}

export async function updateTrip(id: string, updates: Partial<Trip>): Promise<Trip> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('trips')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}
