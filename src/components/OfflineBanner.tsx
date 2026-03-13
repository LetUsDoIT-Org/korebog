'use client'

import { useEffect, useState } from 'react'
import { getOfflineQueueCount, syncOfflineTrips } from '@/lib/api/trips'

export function OfflineBanner() {
  const [count, setCount] = useState(0)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    getOfflineQueueCount().then(setCount)

    function handleOnline() {
      setSyncing(true)
      syncOfflineTrips().then(() => {
        getOfflineQueueCount().then(setCount)
        setSyncing(false)
      })
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [])

  if (count === 0) return null

  return (
    <div className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-center text-sm py-2 px-4">
      {syncing
        ? 'Synkroniserer ture...'
        : `${count} tur${count > 1 ? 'e' : ''} venter på at blive synkroniseret`}
    </div>
  )
}
