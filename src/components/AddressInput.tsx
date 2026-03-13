'use client'

import { useRef } from 'react'
import { Autocomplete, useLoadScript } from '@react-google-maps/api'

const libraries: ('places')[] = ['places']

type Props = {
  placeholder: string
  value: string
  onChange: (address: string) => void
}

export function AddressInput({ placeholder, value, onChange }: Props) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    libraries,
  })

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

  function onPlaceChanged() {
    const place = autocompleteRef.current?.getPlace()
    if (place?.formatted_address) {
      onChange(place.formatted_address)
    }
  }

  if (!isLoaded) {
    return (
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border p-3 text-lg dark:bg-gray-800 dark:border-gray-700"
      />
    )
  }

  return (
    <Autocomplete
      onLoad={(a) => (autocompleteRef.current = a)}
      onPlaceChanged={onPlaceChanged}
      options={{ componentRestrictions: { country: 'dk' }, types: ['address'] }}
    >
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border p-3 text-lg dark:bg-gray-800 dark:border-gray-700"
      />
    </Autocomplete>
  )
}
