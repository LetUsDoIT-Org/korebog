import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const origin = searchParams.get('origin')
  const destination = searchParams.get('destination')

  if (!origin || !destination) {
    return NextResponse.json(
      { error: 'Missing origin or destination' },
      { status: 400 }
    )
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google Maps API key not configured' },
      { status: 500 }
    )
  }

  // Use Routes API (New) instead of legacy Directions API
  const res = await fetch(
    'https://routes.googleapis.com/directions/v2:computeRoutes',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.distanceMeters',
      },
      body: JSON.stringify({
        origin: { address: origin },
        destination: { address: destination },
        travelMode: 'DRIVE',
        regionCode: 'DK',
      }),
    }
  )

  const data = await res.json()

  if (data.routes?.length > 0) {
    const meters = data.routes[0].distanceMeters
    return NextResponse.json({ distanceKm: Math.round(meters / 100) / 10 })
  }

  return NextResponse.json({ error: 'No route found' }, { status: 404 })
}
