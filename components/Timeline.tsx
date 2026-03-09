'use client'

import { useMemo } from 'react'
import { Milk, ShoppingBag, Moon, BedDouble, Pill, Plus } from 'lucide-react'

type EntryType = 'FEEDING' | 'CHANGING' | 'NAP' | 'SLEEP' | 'MEDICINE'
type Unit = 'ML' | 'OZ'

interface Entry {
  id: string
  type: EntryType
  occurredAt: string
  amount: number | null
  unit: Unit | null
  notes: string | null
}

interface TimelineProps {
  entries: Entry[]
  onAddEntry: (hour: number) => void
  onEntryClick?: (entry: Entry) => void
}

const ENTRY_LABELS: Record<EntryType, string> = {
  FEEDING: 'Feeding',
  CHANGING: 'Changing',
  NAP: 'Nap',
  SLEEP: 'Sleep',
  MEDICINE: 'Medicine',
}

const ENTRY_ICONS: Record<EntryType, React.ReactNode> = {
  FEEDING: <Milk className="w-3 h-3" />,
  CHANGING: <ShoppingBag className="w-3 h-3" />,
  NAP: <Moon className="w-3 h-3" />,
  SLEEP: <BedDouble className="w-3 h-3" />,
  MEDICINE: <Pill className="w-3 h-3" />,
}

const ENTRY_COLORS: Record<EntryType, string> = {
  FEEDING: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  CHANGING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  NAP: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  SLEEP: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
  MEDICINE: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
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

export function Timeline({ entries, onAddEntry, onEntryClick }: TimelineProps) {
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
    <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
      {Array.from({ length: 24 }, (_, hour) => (
        <button
          key={hour}
          onClick={() => onAddEntry(hour)}
          className={`w-full flex items-start gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors group ${
            hour === currentHour ? 'bg-blue-50 dark:bg-blue-900/20' : ''
          }`}
        >
          <span className="text-xs text-gray-400 dark:text-gray-500 w-12 pt-1 flex-shrink-0">
            {formatHour(hour)}
          </span>
          <div className="flex flex-wrap gap-1 min-h-[24px] flex-1">
            {(entriesByHour[hour] ?? []).map((entry) => (
              <span
                key={entry.id}
                onClick={onEntryClick ? (e) => { e.stopPropagation(); onEntryClick(entry) } : undefined}
                className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${ENTRY_COLORS[entry.type]} ${onEntryClick ? 'cursor-pointer hover:opacity-75' : ''}`}
              >
                {ENTRY_ICONS[entry.type]}
                {formatEntryPill(entry)}
              </span>
            ))}
          </div>
          <Plus className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 group-hover:text-gray-400 dark:group-hover:text-gray-500 flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      ))}
    </div>
  )
}
