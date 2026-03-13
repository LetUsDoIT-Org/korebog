import { createClient } from '@/lib/supabase/client'
import type { Vehicle } from '@/types/database'

export async function getVehicles(): Promise<Vehicle[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getDefaultVehicle(): Promise<Vehicle | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('vehicles')
    .select('*')
    .eq('is_default', true)
    .maybeSingle()
  return data
}

export async function upsertVehicle(
  vehicle: Partial<Vehicle> & { name: string; registration_number: string },
): Promise<Vehicle> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // If updating existing vehicle, keep its current is_default
  if (vehicle.id) {
    const { data, error } = await supabase
      .from('vehicles')
      .update({ name: vehicle.name, registration_number: vehicle.registration_number })
      .eq('id', vehicle.id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  // New vehicle: check if any default exists
  const existing = await getVehicles()
  const isDefault = existing.length === 0

  const { data, error } = await supabase
    .from('vehicles')
    .insert({ name: vehicle.name, registration_number: vehicle.registration_number, user_id: user.id, is_default: isDefault })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function setDefaultVehicle(id: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Unset all defaults for this user
  await supabase
    .from('vehicles')
    .update({ is_default: false })
    .eq('user_id', user.id)

  // Set the target vehicle as default
  const { error } = await supabase
    .from('vehicles')
    .update({ is_default: true })
    .eq('id', id)
  if (error) throw error
}

export async function deleteVehicle(id: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const vehicles = await getVehicles()
  if (vehicles.length <= 1) throw new Error('Kan ikke slette den eneste bil')

  const toDelete = vehicles.find((v) => v.id === id)
  const { error } = await supabase.from('vehicles').delete().eq('id', id)
  if (error) throw error

  // If deleted vehicle was default, make another one default
  if (toDelete?.is_default) {
    const remaining = vehicles.filter((v) => v.id !== id)
    if (remaining.length > 0) {
      await setDefaultVehicle(remaining[0].id)
    }
  }
}
