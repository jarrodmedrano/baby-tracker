'use client'

import { useState } from 'react'
import { X, Milk, ShoppingBag, Moon, BedDouble, Pill } from 'lucide-react'

type EntryType = 'FEEDING' | 'CHANGING' | 'NAP' | 'SLEEP' | 'MEDICINE'
type Unit = 'ML' | 'OZ'

interface OtherBaby {
  id: string
  name: string
}

interface AddEntryModalProps {
  babyId: string
  defaultHour: number
  otherBabies?: OtherBaby[]
  onClose: () => void
  onSave: (entry: {
    babyId: string
    type: EntryType
    occurredAt: string
    amount?: number | null
    unit?: Unit | null
    notes?: string | null
    durationMinutes?: number | null
  }) => Promise<void>
}

const ENTRY_TYPES: { type: EntryType; label: string; icon: React.ReactNode }[] = [
  { type: 'FEEDING', label: 'Feeding', icon: <Milk className="w-5 h-5" /> },
  { type: 'CHANGING', label: 'Changing', icon: <ShoppingBag className="w-5 h-5" /> },
  { type: 'NAP', label: 'Nap', icon: <Moon className="w-5 h-5" /> },
  { type: 'SLEEP', label: 'Sleep', icon: <BedDouble className="w-5 h-5" /> },
  { type: 'MEDICINE', label: 'Medicine', icon: <Pill className="w-5 h-5" /> },
]

export function AddEntryModal({ babyId, defaultHour, otherBabies = [], onClose, onSave }: AddEntryModalProps) {
  const [selectedType, setSelectedType] = useState<EntryType | null>('FEEDING')
  const [amount, setAmount] = useState('')
  const [unit, setUnit] = useState<Unit>('ML')
  const [notes, setNotes] = useState('')
  const [durationHours, setDurationHours] = useState(0)
  const [durationMins, setDurationMins] = useState(30)
  const [duplicateFor, setDuplicateFor] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const now = new Date()
  now.setHours(defaultHour, 0, 0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  const localDefault = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(defaultHour)}:00`
  const [occurredAt, setOccurredAt] = useState(localDefault)

  const handleSave = async () => {
    if (!selectedType) return
    setLoading(true)
    setError('')
    const isDuration = selectedType === 'NAP' || selectedType === 'SLEEP'
    const totalDuration = durationHours * 60 + durationMins
    const entryBase = {
      type: selectedType,
      occurredAt: new Date(occurredAt).toISOString(),
      amount: selectedType === 'FEEDING' && amount ? parseFloat(amount) : null,
      unit: selectedType === 'FEEDING' ? unit : null,
      notes: notes || null,
      durationMinutes: isDuration && totalDuration > 0 ? totalDuration : null,
    }
    try {
      await Promise.all([
        onSave({ babyId, ...entryBase }),
        ...[...duplicateFor].map((id) => onSave({ babyId: id, ...entryBase })),
      ])
      onClose()
    } catch {
      setError('Failed to save. Please try again.')
      setLoading(false)
    }
  }

  const toggleDuplicate = (id: string) => {
    setDuplicateFor((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-t-2xl w-full max-w-lg p-6 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add Entry</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-5 gap-2 mb-4">
          {ENTRY_TYPES.map(({ type, label, icon }) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              aria-label={label}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-colors ${
                selectedType === type
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              <span className={selectedType === type ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}>
                {icon}
              </span>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</span>
            </button>
          ))}
        </div>

        {selectedType === 'FEEDING' && (
          <div className="flex gap-2 mb-4">
            <div className="flex-1">
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Amount
              </label>
              <input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
            <div>
              <label htmlFor="unit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit</label>
              <select
                id="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value as Unit)}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700"
              >
                <option value="ML">ml</option>
                <option value="OZ">oz</option>
              </select>
            </div>
          </div>
        )}

        <div className="mb-4">
          <label htmlFor="time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time</label>
          <input
            id="time"
            type="datetime-local"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700"
          />
        </div>

        {(selectedType === 'NAP' || selectedType === 'SLEEP') && (
          <div className="flex gap-2 mb-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration</label>
              <div className="flex items-center gap-2">
                <select
                  value={durationHours}
                  onChange={(e) => setDurationHours(Number(e.target.value))}
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{i}h</option>
                  ))}
                </select>
                <select
                  value={durationMins}
                  onChange={(e) => setDurationMins(Number(e.target.value))}
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                >
                  {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                    <option key={m} value={m}>{m}m</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="mb-4">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Notes (optional)
          </label>
          <input
            id="notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes..."
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500"
          />
        </div>

        {otherBabies.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Also add for</p>
            <div className="flex flex-wrap gap-2">
              {otherBabies.map((baby) => (
                <button
                  key={baby.id}
                  type="button"
                  onClick={() => toggleDuplicate(baby.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    duplicateFor.has(baby.id)
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  {baby.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <button
          onClick={handleSave}
          disabled={!selectedType || loading}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}
