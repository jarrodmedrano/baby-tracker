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
}

export default function HistoryPage() {
  const [babies, setBabies] = useState<Baby[]>([])
  const [selectedBabyId, setSelectedBabyId] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [entries, setEntries] = useState<Entry[]>([])

  useEffect(() => {
    fetch('/api/babies')
      .then((r) => r.json())
      .then((data: Baby[]) => {
        setBabies(data)
        if (data[0]) setSelectedBabyId(data[0].id)
      })
  }, [])

  const fetchEntries = useCallback(async () => {
    if (!selectedBabyId) return
    const res = await fetch(`/api/entries?babyId=${selectedBabyId}&date=${selectedDate}`)
    if (res.ok) setEntries(await res.json())
  }, [selectedBabyId, selectedDate])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-3 sticky top-0">
        <Link href="/" className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"><ArrowLeft className="w-4 h-4" /></Link>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">History</h1>
      </header>

      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex flex-wrap gap-3 items-center">
        <select
          value={selectedBabyId}
          onChange={(e) => setSelectedBabyId(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700"
        >
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

      <main>
        <Timeline entries={entries} onAddEntry={() => {}} />
      </main>
    </div>
  )
}
