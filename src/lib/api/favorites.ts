import { createClient } from '@/lib/supabase/client'
import type { FavoriteTrip } from '@/types/database'

export async function getFavorites(): Promise<FavoriteTrip[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('favorite_trips')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return data ?? []
}

export async function saveFavorite(fav: Omit<FavoriteTrip, 'id' | 'user_id' | 'created_at'>): Promise<FavoriteTrip> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('favorite_trips')
    .insert({ ...fav, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteFavorite(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('favorite_trips').delete().eq('id', id)
  if (error) throw error
}
