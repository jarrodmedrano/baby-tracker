'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Baby {
  id: string
  name: string
  birthDate: string | null
  createdAt: string
}

export default function BabiesPage() {
  const [babies, setBabies] = useState<Baby[]>([])
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchBabies = async () => {
    const res = await fetch('/api/babies')
    if (res.ok) {
      const data = await res.json()
      setBabies(data)
    }
  }

  useEffect(() => { fetchBabies() }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/babies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, birthDate: birthDate || null }),
    })

    if (res.ok) {
      setName('')
      setBirthDate('')
      await fetchBabies()
    } else {
      setError('Failed to add baby')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0">
        <Link href="/" className="text-gray-500 hover:text-gray-700 text-sm">← Back</Link>
        <h1 className="text-lg font-bold text-gray-900">Babies</h1>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-6">
        {/* Add baby form */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Add Baby</h2>
          <form onSubmit={handleAdd} className="space-y-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Baby's name"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-600"
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Baby'}
            </button>
          </form>
        </div>

        {/* Baby list */}
        {babies.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
            {babies.map((baby) => (
              <div key={baby.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{baby.name}</p>
                  {baby.birthDate && (
                    <p className="text-xs text-gray-500">
                      Born {new Date(baby.birthDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <Link
                  href={`/babies/${baby.id}/share`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Share
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
