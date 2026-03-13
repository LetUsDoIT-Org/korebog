import { createClient } from '@/lib/supabase/client'
import type { UserProfile } from '@/types/database'

export async function getProfile(): Promise<UserProfile | null> {
  const supabase = createClient()
  const { data } = await supabase.from('user_profiles').select('*').single()
  return data
}

export async function upsertProfile(
  profile: Pick<UserProfile, 'full_name' | 'address' | 'identifier' | 'identifier_type'>
): Promise<UserProfile> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('user_profiles')
    .upsert({ ...profile, user_id: user.id }, { onConflict: 'user_id' })
    .select()
    .single()
  if (error) throw error
  return data
}
