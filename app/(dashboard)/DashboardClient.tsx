'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signOut } from '@/lib/auth-client'
import { Timeline } from '@/components/Timeline'
import { AddEntryModal } from '@/components/AddEntryModal'

interface Baby {
  id: string
  name: string
  birthDate: string | null
  createdAt: string
}

interface Entry {
  id: string
  type: 'FEEDING' | 'CHANGING' | 'NAP' | 'SLEEP' | 'MEDICINE'
  occurredAt: string
  amount: number | null
  unit: 'ML' | 'OZ' | null
  notes: string | null
}

interface DashboardClientProps {
  babies: Baby[]
}

export function DashboardClient({ babies }: DashboardClientProps) {
  const router = useRouter()
  const [selectedBabyId, setSelectedBabyId] = useState<string | 'all'>(
    babies[0]?.id ?? 'all'
  )
  const [entriesByBaby, setEntriesByBaby] = useState<Record<string, Entry[]>>({})
  const [modalHour, setModalHour] = useState<number | null>(null)
  const [modalBabyId, setModalBabyId] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]

  const fetchEntries = useCallback(async (babyId: string) => {
    const res = await fetch(`/api/entries?babyId=${babyId}&date=${today}`)
    if (res.ok) {
      const data = await res.json()
      setEntriesByBaby((prev) => ({ ...prev, [babyId]: data }))
    }
  }, [today])

  useEffect(() => {
    babies.forEach((baby) => fetchEntries(baby.id))
  }, [babies, fetchEntries])

  const handleAddEntry = (babyId: string, hour: number) => {
    setModalBabyId(babyId)
    setModalHour(hour)
  }

  const handleSaveEntry = async (entry: {
    babyId: string
    type: 'FEEDING' | 'CHANGING' | 'NAP' | 'SLEEP' | 'MEDICINE'
    occurredAt: string
    amount?: number | null
    unit?: 'ML' | 'OZ' | null
    notes?: string | null
  }) => {
    const res = await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    })
    if (!res.ok) throw new Error('Failed to save')
    await fetchEntries(entry.babyId)
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const activeBabies = selectedBabyId === 'all'
    ? babies
    : babies.filter((b) => b.id === selectedBabyId)

  const isAllView = selectedBabyId === 'all' && babies.length > 1

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-lg font-bold text-gray-900">🍼 Baby Tracker</h1>
        <div className="flex items-center gap-4">
          <Link href="/history" className="text-sm text-gray-600 hover:text-gray-900">History</Link>
          <Link href="/babies" className="text-sm text-gray-600 hover:text-gray-900">Babies</Link>
          <button onClick={handleSignOut} className="text-sm text-gray-600 hover:text-gray-900">
            Sign out
          </button>
        </div>
      </header>

      {/* Baby tabs */}
      {babies.length > 0 && (
        <div className="bg-white border-b border-gray-200 px-4 flex gap-1 overflow-x-auto">
          {babies.map((baby) => (
            <button
              key={baby.id}
              onClick={() => setSelectedBabyId(baby.id)}
              className={`py-3 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                selectedBabyId === baby.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {baby.name}
            </button>
          ))}
          {babies.length > 1 && (
            <button
              onClick={() => setSelectedBabyId('all')}
              className={`py-3 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                selectedBabyId === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Both
            </button>
          )}
        </div>
      )}

      {/* No babies state */}
      {babies.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <p className="text-gray-500">No babies yet.</p>
          <Link
            href="/babies"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Add Baby
          </Link>
        </div>
      )}

      {/* Timeline(s) */}
      {babies.length > 0 && (
        <main className={isAllView ? 'flex divide-x divide-gray-200' : ''}>
          {activeBabies.map((baby) => (
            <div key={baby.id} className={isAllView ? 'flex-1 min-w-0' : ''}>
              {isAllView && (
                <div className="px-4 py-2 bg-gray-100 text-sm font-semibold text-gray-700 sticky top-[57px]">
                  {baby.name}
                </div>
              )}
              <Timeline
                entries={entriesByBaby[baby.id] ?? []}
                onAddEntry={(hour) => handleAddEntry(baby.id, hour)}
              />
            </div>
          ))}
        </main>
      )}

      {/* Add Entry Modal */}
      {modalHour !== null && modalBabyId && (
        <AddEntryModal
          babyId={modalBabyId}
          defaultHour={modalHour}
          onClose={() => { setModalHour(null); setModalBabyId(null) }}
          onSave={handleSaveEntry}
        />
      )}
    </div>
  )
}
