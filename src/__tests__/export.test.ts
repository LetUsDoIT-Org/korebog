import { describe, it, expect } from 'vitest'
import { tripsToCSV } from '@/lib/export'

describe('tripsToCSV', () => {
  it('generates CSV with SKAT-required headers', () => {
    const trips = [
      {
        date: '2026-03-10', purpose: 'Kundemøde', start_address: 'København',
        end_address: 'Aarhus', distance_km: 312, transport_type: 'car',
        registration_number: 'AB12345', customer_name: 'Acme A/S',
        odometer_start_km: null, odometer_end_km: null,
      },
    ]
    const csv = tripsToCSV(trips)
    expect(csv).toContain('Dato;Formål;Kunde;Startadresse;Slutadresse;Km;Km-tæller start;Km-tæller slut;Registreringsnummer;Transporttype')
    expect(csv).toContain('2026-03-10;Kundemøde;Acme A/S;København;Aarhus;312;;;AB12345;Bil')
  })
})
