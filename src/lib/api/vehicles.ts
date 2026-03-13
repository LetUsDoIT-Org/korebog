import { createClient } from '@/lib/supabase/client'
import type { Vehicle } from '@/types/database'

export async function getVehicles(): Promise<Vehicle[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .order('is_default', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getDefaultVehicle(): Promise<Vehicle | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('vehicles')
    .select('*')
    .eq('is_default', true)
    .single()
  return data
}

export async function upsertVehicle(vehicle: Partial<Vehicle> & { name: string; registration_number: string }): Promise<Vehicle> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('vehicles')
    .upsert({ ...vehicle, user_id: user.id, is_default: true })
    .select()
    .single()
  if (error) throw error
  return data
}
