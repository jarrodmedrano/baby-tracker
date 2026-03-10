'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signOut } from '@/lib/auth-client'
import { Timeline } from '@/components/Timeline'
import { AddEntryModal } from '@/components/AddEntryModal'
import { useTheme } from '@/components/ThemeProvider'
import { Moon, Sun, LogOut, History, Baby, Trash2 } from 'lucide-react'

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

const ENTRY_LABELS: Record<Entry['type'], string> = {
  FEEDING: 'Feeding',
  CHANGING: 'Changing',
  NAP: 'Nap',
  SLEEP: 'Sleep',
  MEDICINE: 'Medicine',
}

interface DashboardClientProps {
  babies: Baby[]
}

export function DashboardClient({ babies }: DashboardClientProps) {
  const router = useRouter()
  const { theme, toggle } = useTheme()
  const [selectedBabyId, setSelectedBabyId] = useState<string | 'all'>('all')
  const [entriesByBaby, setEntriesByBaby] = useState<Record<string, Entry[]>>({})
  const [modalHour, setModalHour] = useState<number | null>(null)
  const [modalBabyId, setModalBabyId] = useState<string | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null)
  const [deleting, setDeleting] = useState(false)

  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const fetchEntries = useCallback(async (babyId: string) => {
    const tz = new Date().getTimezoneOffset()
    const res = await fetch(`/api/entries?babyId=${babyId}&date=${today}&tz=${tz}`)
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

  const handleDeleteEntry = async () => {
    if (!selectedEntry) return
    setDeleting(true)
    const res = await fetch(`/api/entries?id=${selectedEntry.id}`, { method: 'DELETE' })
    if (res.ok) {
      // Find which baby this entry belongs to and refresh
      for (const baby of babies) {
        const babyEntries = entriesByBaby[baby.id] ?? []
        if (babyEntries.some((e) => e.id === selectedEntry.id)) {
          await fetchEntries(baby.id)
          break
        }
      }
      setSelectedEntry(null)
    }
    setDeleting(false)
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Baby className="w-5 h-5 text-blue-600" />
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Baby Tracker</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/history" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white" aria-label="History">
            <History className="w-4 h-4" />
          </Link>
          <Link href="/babies" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
            Babies
          </Link>
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button onClick={handleSignOut} aria-label="Sign out" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Baby tabs */}
      {babies.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 flex gap-1 overflow-x-auto">
          {babies.map((baby) => (
            <button
              key={baby.id}
              onClick={() => setSelectedBabyId(baby.id)}
              className={`py-3 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                selectedBabyId === baby.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
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
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
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
          <p className="text-gray-500 dark:text-gray-400">No babies yet.</p>
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
        <main className={isAllView ? 'flex divide-x divide-gray-200 dark:divide-gray-700' : ''}>
          {activeBabies.map((baby) => (
            <div key={baby.id} className={isAllView ? 'flex-1 min-w-0' : ''}>
              {isAllView && (
                <div className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 sticky top-[57px]">
                  {baby.name}
                </div>
              )}
              <Timeline
                entries={entriesByBaby[baby.id] ?? []}
                onAddEntry={(hour) => handleAddEntry(baby.id, hour)}
                onEntryClick={(entry) => setSelectedEntry(entry)}
              />
            </div>
          ))}
        </main>
      )}

      {/* Entry action sheet */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50" onClick={() => setSelectedEntry(null)}>
          <div
            className="bg-white dark:bg-gray-800 rounded-t-2xl w-full max-w-lg p-6 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {ENTRY_LABELS[selectedEntry.type]}
              </h2>
              <button onClick={() => setSelectedEntry(null)} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
                <span className="sr-only">Close</span>
                ×
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {new Date(selectedEntry.occurredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {selectedEntry.amount != null && ` · ${selectedEntry.amount} ${selectedEntry.unit}`}
              {selectedEntry.notes && ` · ${selectedEntry.notes}`}
            </p>
            <button
              onClick={handleDeleteEntry}
              disabled={deleting}
              className="w-full flex items-center justify-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 py-3 rounded-xl font-medium hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? 'Deleting…' : 'Delete entry'}
            </button>
          </div>
        </div>
      )}

      {/* Add Entry Modal */}
      {modalHour !== null && modalBabyId && (
        <AddEntryModal
          babyId={modalBabyId}
          defaultHour={modalHour}
          otherBabies={babies.filter((b) => b.id !== modalBabyId)}
          onClose={() => { setModalHour(null); setModalBabyId(null) }}
          onSave={handleSaveEntry}
        />
      )}
    </div>
  )
}
