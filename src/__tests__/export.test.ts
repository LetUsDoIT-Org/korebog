import { describe, it, expect } from 'vitest'
import { tripsToCSV } from '@/lib/export'

describe('tripsToCSV', () => {
  it('generates CSV with SKAT-required headers', () => {
    const trips = [
      {
        date: '2026-03-10', purpose: 'Kundemøde', start_address: 'København',
        end_address: 'Aarhus', distance_km: 312, transport_type: 'car',
        registration_number: 'AB12345',
      },
    ]
    const csv = tripsToCSV(trips)
    expect(csv).toContain('Dato;Formål;Startadresse;Slutadresse;Km;Registreringsnummer;Transporttype')
    expect(csv).toContain('2026-03-10;Kundemøde;København;Aarhus;312;AB12345;Bil')
  })
})
