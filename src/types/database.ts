export type Vehicle = {
  id: string
  user_id: string
  name: string
  registration_number: string
  is_default: boolean
  created_at: string
}

export type OdometerReading = {
  id: string
  user_id: string
  vehicle_id: string
  reading_km: number
  date: string
  note: string | null
  created_at: string
}

export type Trip = {
  id: string
  user_id: string
  vehicle_id: string | null
  date: string
  purpose: string
  start_address: string
  end_address: string
  distance_km: number
  is_business: boolean
  transport_type: 'car' | 'public_transport'
  gps_track: Array<{ lat: number; lng: number; timestamp: number }> | null
  created_at: string
}

export type FavoriteTrip = {
  id: string
  user_id: string
  label: string
  purpose: string
  start_address: string
  end_address: string
  distance_km: number
  sort_order: number
  created_at: string
}

export type UserProfile = {
  id: string
  user_id: string
  full_name: string
  address: string
  identifier: string // CPR or employee number
  identifier_type: 'cpr' | 'employee_number'
  created_at: string
}
