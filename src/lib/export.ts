type ExportTrip = {
  date: string
  purpose: string
  start_address: string
  end_address: string
  distance_km: number
  transport_type: string
  registration_number: string
  customer_name: string
  odometer_start_km: number | null
  odometer_end_km: number | null
}

export function tripsToCSV(trips: ExportTrip[]): string {
  const header = 'Dato;Formål;Kunde;Startadresse;Slutadresse;Km;Km-tæller start;Km-tæller slut;Registreringsnummer;Transporttype'
  const rows = trips.map((t) =>
    [
      t.date,
      t.purpose,
      t.customer_name,
      t.start_address,
      t.end_address,
      t.distance_km,
      t.odometer_start_km ?? '',
      t.odometer_end_km ?? '',
      t.registration_number,
      t.transport_type === 'car' ? 'Bil' : 'Offentlig transport',
    ].join(';')
  )
  return [header, ...rows].join('\n')
}

export function downloadCSV(csv: string, filename: string) {
  const bom = '\uFEFF' // UTF-8 BOM for Excel
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function generatePDF(
  trips: ExportTrip[],
  userInfo: { name: string; address: string; identifier: string },
  dateRange: { from: string; to: string }
) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape' })

  doc.setFontSize(18)
  doc.text('Kørebog', 14, 22)

  doc.setFontSize(10)
  doc.text(`Navn: ${userInfo.name}`, 14, 32)
  doc.text(`Adresse: ${userInfo.address}`, 14, 38)
  doc.text(`ID: ${userInfo.identifier}`, 14, 44)
  doc.text(`Periode: ${dateRange.from} – ${dateRange.to}`, 14, 50)

  autoTable(doc, {
    startY: 58,
    head: [['Dato', 'Formål', 'Kunde', 'Fra', 'Til', 'Km', 'Km start', 'Km slut', 'Reg.nr.', 'Transport']],
    body: trips.map((t) => [
      t.date,
      t.purpose,
      t.customer_name,
      t.start_address,
      t.end_address,
      t.distance_km.toString(),
      t.odometer_start_km?.toString() ?? '',
      t.odometer_end_km?.toString() ?? '',
      t.registration_number,
      t.transport_type === 'car' ? 'Bil' : 'Offentlig',
    ]),
  })

  const totalKm = trips.reduce((sum, t) => sum + t.distance_km, 0)
  const finalY = (doc as any).lastAutoTable.finalY + 10
  doc.text(`Total erhvervskørsel: ${totalKm} km`, 14, finalY)

  doc.save(`korebog-${dateRange.from}-${dateRange.to}.pdf`)
}
