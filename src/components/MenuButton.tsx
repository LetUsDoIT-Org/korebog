'use client'

import { useState } from 'react'
import Link from 'next/link'

export function MenuButton() {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="p-2 text-xl">
        &#9776;
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full right-0 mb-2 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 py-2 w-48">
            <Link href="/export" onClick={() => setOpen(false)}
              className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">
              Eksporter
            </Link>
            <Link href="/settings" onClick={() => setOpen(false)}
              className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">
              Indstillinger
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
