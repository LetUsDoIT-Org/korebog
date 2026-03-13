import { createClient } from '@/lib/supabase/client'
import type { Customer } from '@/types/database'

export async function getCustomers(): Promise<Customer[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function saveCustomer(
  customer: Omit<Customer, 'id' | 'user_id' | 'created_at'>,
): Promise<Customer> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('customers')
    .insert({ ...customer, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCustomer(
  id: string,
  updates: Partial<Omit<Customer, 'id' | 'user_id' | 'created_at'>>,
): Promise<Customer> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('customers')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCustomer(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('customers').delete().eq('id', id)
  if (error) throw error
}
