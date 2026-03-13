'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  placeholder: string
  value: string
  onChange: (address: string) => void
}

let mapsLoaded = false
let mapsPromise: Promise<void> | null = null
let styleInjected = false

function ensureGoogleMaps(): Promise<void> {
  if (mapsLoaded) return Promise.resolve()
  if (mapsPromise) return mapsPromise

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!key) return Promise.reject(new Error('No API key'))

  mapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&v=weekly`
    script.async = true
    script.onload = () => { mapsLoaded = true; resolve() }
    script.onerror = () => reject(new Error('Failed to load Google Maps'))
    document.head.appendChild(script)
  })

  return mapsPromise
}

function injectStyles() {
  if (styleInjected) return
  styleInjected = true
  const style = document.createElement('style')
  style.textContent = `
    .address-input-wrapper {
      width: 100%;
    }
    .address-input-wrapper gmp-place-autocomplete {
      width: 100%;
      --gmpx-color-surface: transparent;
      --gmpx-color-on-surface: inherit;
      --gmpx-font-size-base: 1.125rem;
    }
  `
  document.head.appendChild(style)
}

export function AddressInput({ placeholder, value, onChange }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const autocompleteEl = useRef<google.maps.places.PlaceAutocompleteElement | null>(null)
  const [ready, setReady] = useState(false)
  const [editing, setEditing] = useState(false)

  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const innerInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    ensureGoogleMaps().then(() => setReady(true)).catch(console.error)
  }, [])

  useEffect(() => {
    if (!ready || !wrapperRef.current || autocompleteEl.current) return

    injectStyles()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const el = new google.maps.places.PlaceAutocompleteElement({
      includedRegionCodes: ['dk'],
    } as any)

    el.addEventListener('gmp-select', async (e: unknown) => {
      const { placePrediction } = e as { placePrediction: google.maps.places.PlacePrediction }
      const place = placePrediction.toPlace()
      await place.fetchFields({ fields: ['formattedAddress'] })
      if (place.formattedAddress) {
        onChangeRef.current(place.formattedAddress)
        setEditing(false)
      }
    })

    // Style the element inline for border/padding consistency
    el.style.cssText = `
      width: 100%;
      border: 1px solid #d1d5db;
      border-radius: 0.5rem;
      padding: 0.25rem;
      font-size: 1.125rem;
    `

    wrapperRef.current.appendChild(el)
    autocompleteEl.current = el

    // Set placeholder on the inner input via shadow DOM
    const trySetupInput = () => {
      const shadow = el.shadowRoot
      if (shadow) {
        const input = shadow.querySelector('input')
        if (input) {
          input.placeholder = placeholder
          innerInputRef.current = input

          // Capture manual typing so the value is always in sync
          input.addEventListener('input', () => {
            onChangeRef.current(input.value)
          })
          return
        }
      }
      requestAnimationFrame(trySetupInput)
    }
    requestAnimationFrame(trySetupInput)
  }, [ready, placeholder])

  // When entering edit mode, focus the autocomplete input
  useEffect(() => {
    if (editing && innerInputRef.current) {
      innerInputRef.current.focus()
    }
  }, [editing])

  if (!ready) {
    return (
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border p-3 text-lg dark:bg-gray-800 dark:border-gray-700"
        />
      </div>
    )
  }

  const hasValue = value && value.trim().length > 0
  const showAddress = hasValue && !editing

  return (
    <div className="relative">
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-1 pl-1">{placeholder}</p>

      {/* Show the current address as readable text when set */}
      {showAddress && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="w-full text-left rounded-lg border border-gray-300 dark:border-gray-600 p-3 text-base bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <span className="text-gray-800 dark:text-gray-200">{value}</span>
          <span className="text-xs text-blue-500 dark:text-blue-400 ml-2">Skift</span>
        </button>
      )}

      {/* Always keep autocomplete wrapper in DOM (for element attachment), but hide when showing address */}
      <div
        ref={wrapperRef}
        className="address-input-wrapper"
        style={{ display: showAddress ? 'none' : 'block' }}
      />
    </div>
  )
}
