'use client'

import { useState } from 'react'

type EntryType = 'FEEDING' | 'CHANGING' | 'NAP' | 'SLEEP' | 'MEDICINE'
type Unit = 'ML' | 'OZ'

interface AddEntryModalProps {
  babyId: string
  defaultHour: number
  onClose: () => void
  onSave: (entry: {
    babyId: string
    type: EntryType
    occurredAt: string
    amount?: number | null
    unit?: Unit | null
    notes?: string | null
  }) => Promise<void>
}

const ENTRY_TYPES: { type: EntryType; label: string; emoji: string }[] = [
  { type: 'FEEDING', label: 'Feeding', emoji: '🍼' },
  { type: 'CHANGING', label: 'Changing', emoji: '🧷' },
  { type: 'NAP', label: 'Nap', emoji: '😴' },
  { type: 'SLEEP', label: 'Sleep', emoji: '🌙' },
  { type: 'MEDICINE', label: 'Medicine', emoji: '💊' },
]

export function AddEntryModal({ babyId, defaultHour, onClose, onSave }: AddEntryModalProps) {
  const [selectedType, setSelectedType] = useState<EntryType | null>(null)
  const [amount, setAmount] = useState('')
  const [unit, setUnit] = useState<Unit>('ML')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const now = new Date()
  now.setHours(defaultHour, 0, 0, 0)
  const [occurredAt, setOccurredAt] = useState(now.toISOString().slice(0, 16))

  const handleSave = async () => {
    if (!selectedType) return
    setLoading(true)
    setError('')
    try {
      await onSave({
        babyId,
        type: selectedType,
        occurredAt: new Date(occurredAt).toISOString(),
        amount: selectedType === 'FEEDING' && amount ? parseFloat(amount) : null,
        unit: selectedType === 'FEEDING' ? unit : null,
        notes: notes || null,
      })
      onClose()
    } catch {
      setError('Failed to save. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl w-full max-w-lg p-6 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Add Entry</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
            ×
          </button>
        </div>

        <div className="grid grid-cols-5 gap-2 mb-4">
          {ENTRY_TYPES.map(({ type, label, emoji }) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              aria-label={label}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-colors ${
                selectedType === type
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="text-2xl">{emoji}</span>
              <span className="text-xs font-medium text-gray-700">{label}</span>
            </button>
          ))}
        </div>

        {selectedType === 'FEEDING' && (
          <div className="flex gap-2 mb-4">
            <div className="flex-1">
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                Amount
              </label>
              <input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select
                id="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value as Unit)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="ML">ml</option>
                <option value="OZ">oz</option>
              </select>
            </div>
          </div>
        )}

        <div className="mb-4">
          <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">Time</label>
          <input
            id="time"
            type="datetime-local"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes (optional)
          </label>
          <input
            id="notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

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
