'use client'

import { useMemo } from 'react'

type EntryType = 'FEEDING' | 'CHANGING' | 'NAP' | 'SLEEP' | 'MEDICINE'
type Unit = 'ML' | 'OZ'

interface Entry {
  id: string
  type: EntryType
  occurredAt: Date | string
  amount: number | null
  unit: Unit | null
  notes: string | null
}

interface TimelineProps {
  entries: Entry[]
  onAddEntry: (hour: number) => void
}

const ENTRY_LABELS: Record<EntryType, string> = {
  FEEDING: 'Feeding',
  CHANGING: 'Changing',
  NAP: 'Nap',
  SLEEP: 'Sleep',
  MEDICINE: 'Medicine',
}

const ENTRY_COLORS: Record<EntryType, string> = {
  FEEDING: 'bg-blue-100 text-blue-800',
  CHANGING: 'bg-yellow-100 text-yellow-800',
  NAP: 'bg-purple-100 text-purple-800',
  SLEEP: 'bg-indigo-100 text-indigo-800',
  MEDICINE: 'bg-red-100 text-red-800',
}

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM'
  if (hour < 12) return `${hour} AM`
  if (hour === 12) return '12 PM'
  return `${hour - 12} PM`
}

function formatEntryPill(entry: Entry): string {
  const label = ENTRY_LABELS[entry.type]
  if (entry.type === 'FEEDING' && entry.amount != null) {
    return `${label}: ${entry.amount} ${entry.unit}`
  }
  return label
}

export function Timeline({ entries, onAddEntry }: TimelineProps) {
  const currentHour = new Date().getHours()

  const entriesByHour = useMemo(() => {
    const map: Record<number, Entry[]> = {}
    entries.forEach((entry) => {
      const hour = new Date(entry.occurredAt).getHours()
      if (!map[hour]) map[hour] = []
      map[hour].push(entry)
    })
    return map
  }, [entries])

  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: 24 }, (_, hour) => (
        <button
          key={hour}
          onClick={() => onAddEntry(hour)}
          className={`w-full flex items-start gap-3 px-4 py-2 hover:bg-gray-50 text-left transition-colors ${
            hour === currentHour ? 'bg-blue-50' : ''
          }`}
        >
          <span className="text-xs text-gray-400 w-12 pt-1 flex-shrink-0">
            {formatHour(hour)}
          </span>
          <div className="flex flex-wrap gap-1 min-h-[24px]">
            {(entriesByHour[hour] ?? []).map((entry) => (
              <span
                key={entry.id}
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${ENTRY_COLORS[entry.type]}`}
              >
                {formatEntryPill(entry)}
              </span>
            ))}
          </div>
        </button>
      ))}
    </div>
  )
}
