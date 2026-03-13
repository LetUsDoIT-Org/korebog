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

  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&key=${apiKey}`

  const res = await fetch(url)
  const data = await res.json()

  if (data.routes?.length > 0) {
    const meters = data.routes[0].legs[0].distance.value
    return NextResponse.json({ distanceKm: Math.round(meters / 100) / 10 })
  }

  return NextResponse.json({ error: 'No route found' }, { status: 404 })
}
