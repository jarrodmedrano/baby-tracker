'use client'

import { useMemo, useState, useEffect } from 'react'
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
  durationMinutes: number | null
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

const SPAN_BLOCK_COLORS: Record<EntryType, string> = {
  FEEDING: '',
  CHANGING: '',
  NAP: 'bg-purple-200 dark:bg-purple-900/60 border-purple-400 dark:border-purple-600 text-purple-900 dark:text-purple-200',
  SLEEP: 'bg-indigo-200 dark:bg-indigo-900/60 border-indigo-400 dark:border-indigo-600 text-indigo-900 dark:text-indigo-200',
  MEDICINE: '',
}

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM'
  if (hour < 12) return `${hour} AM`
  if (hour === 12) return '12 PM'
  return `${hour - 12} PM`
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function formatEntryPill(entry: Entry): string {
  const label = ENTRY_LABELS[entry.type]
  if (entry.type === 'FEEDING' && entry.amount != null) {
    return `${label}: ${entry.amount} ${entry.unit}`
  }
  return label
}

export function Timeline({ entries, onAddEntry, onEntryClick }: TimelineProps) {
  const [currentHour, setCurrentHour] = useState(-1)
  useEffect(() => { setCurrentHour(new Date().getHours()) }, [])

  const { instantByHour, spanningEntries } = useMemo(() => {
    const instantByHour: Record<number, Entry[]> = {}
    const spanningEntries: Entry[] = []

    entries.forEach((entry) => {
      const hour = new Date(entry.occurredAt).getHours()
      const isSpanning =
        (entry.type === 'NAP' || entry.type === 'SLEEP') &&
        entry.durationMinutes != null &&
        entry.durationMinutes > 0

      if (isSpanning) {
        spanningEntries.push(entry)
      } else {
        if (!instantByHour[hour]) instantByHour[hour] = []
        instantByHour[hour].push(entry)
      }
    })

    return { instantByHour, spanningEntries }
  }, [entries])

  return (
    <div
      className="relative"
      style={{
        display: 'grid',
        gridTemplateColumns: '48px 1fr 56px',
        gridTemplateRows: 'repeat(24, minmax(40px, auto))',
      }}
    >
      {/* Hour rows */}
      {Array.from({ length: 24 }, (_, hour) => (
        <button
          key={hour}
          onClick={() => onAddEntry(hour)}
          style={{ gridRow: hour + 1, gridColumn: '1 / 3' }}
          className={`flex items-start gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors group border-b border-gray-100 dark:border-gray-700/50 ${
            hour === currentHour ? 'bg-blue-50 dark:bg-blue-900/20' : ''
          }`}
        >
          <span className="text-xs text-gray-400 dark:text-gray-500 w-[30px] pt-1 flex-shrink-0">
            {formatHour(hour)}
          </span>
          <div className="flex flex-wrap gap-1 min-h-[24px] flex-1">
            {(instantByHour[hour] ?? []).map((entry) => (
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

      {/* Spanning NAP/SLEEP blocks */}
      {spanningEntries.map((entry) => {
        const startHour = new Date(entry.occurredAt).getHours()
        const rowSpan = Math.max(1, Math.ceil(entry.durationMinutes! / 60))
        const endRow = Math.min(startHour + rowSpan, 24)
        const actualSpan = endRow - startHour

        return (
          <button
            key={entry.id}
            onClick={onEntryClick ? (e) => { e.stopPropagation(); onEntryClick(entry) } : undefined}
            style={{
              gridRow: `${startHour + 1} / ${startHour + 1 + actualSpan}`,
              gridColumn: 3,
            }}
            className={`flex flex-col items-center justify-center gap-0.5 mx-1 my-0.5 rounded-lg border text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${SPAN_BLOCK_COLORS[entry.type]}`}
          >
            {ENTRY_ICONS[entry.type]}
            <span className="leading-tight text-center px-0.5">{ENTRY_LABELS[entry.type]}</span>
            <span className="leading-tight opacity-75">{formatDuration(entry.durationMinutes!)}</span>
          </button>
        )
      })}

      {/* Empty column 3 spacer rows to keep grid height consistent */}
      {Array.from({ length: 24 }, (_, hour) => (
        <div
          key={`spacer-${hour}`}
          style={{ gridRow: hour + 1, gridColumn: 3 }}
          className="border-b border-gray-100 dark:border-gray-700/50"
        />
      ))}
    </div>
  )
}
