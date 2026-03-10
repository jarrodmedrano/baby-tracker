'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Timeline } from '@/components/Timeline'

interface Baby {
  id: string
  name: string
}

interface Entry {
  id: string
  type: 'FEEDING' | 'CHANGING' | 'NAP' | 'SLEEP' | 'MEDICINE'
  occurredAt: string
  amount: number | null
  unit: 'ML' | 'OZ' | null
  notes: string | null
  durationMinutes: number | null
}

export default function HistoryPage() {
  const [babies, setBabies] = useState<Baby[]>([])
  const [selectedBabyId, setSelectedBabyId] = useState<string>('all')
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  })
  const [entriesByBaby, setEntriesByBaby] = useState<Record<string, Entry[]>>({})

  useEffect(() => {
    fetch('/api/babies')
      .then((r) => r.json())
      .then((data: Baby[]) => {
        setBabies(data)
      })
  }, [])

  const fetchEntries = useCallback(async (babyId: string) => {
    const tz = new Date().getTimezoneOffset()
    const res = await fetch(`/api/entries?babyId=${babyId}&date=${selectedDate}&tz=${tz}`)
    if (res.ok) {
      const data = await res.json()
      setEntriesByBaby((prev) => ({ ...prev, [babyId]: data }))
    }
  }, [selectedDate])

  useEffect(() => {
    const targets = selectedBabyId === 'all' ? babies : babies.filter((b) => b.id === selectedBabyId)
    targets.forEach((b) => fetchEntries(b.id))
  }, [selectedBabyId, selectedDate, babies, fetchEntries])

  const isAllView = selectedBabyId === 'all' && babies.length > 1
  const activeBabies = isAllView ? babies : babies.filter((b) => b.id === selectedBabyId)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/" className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"><ArrowLeft className="w-4 h-4" /></Link>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">History</h1>
      </header>

      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex flex-wrap gap-3 items-center sticky top-[53px] z-10">
        <select
          value={selectedBabyId}
          onChange={(e) => setSelectedBabyId(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700"
        >
          {babies.length > 1 && <option value="all">Both</option>}
          {babies.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700"
        />
      </div>

      <main className={isAllView ? 'flex divide-x divide-gray-200 dark:divide-gray-700' : ''}>
        {activeBabies.map((baby) => (
          <div key={baby.id} className={isAllView ? 'flex-1 min-w-0' : ''}>
            {isAllView && (
              <div className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 sticky top-[112px]">
                {baby.name}
              </div>
            )}
            <Timeline entries={entriesByBaby[baby.id] ?? []} onAddEntry={() => {}} />
          </div>
        ))}
      </main>
    </div>
  )
}
