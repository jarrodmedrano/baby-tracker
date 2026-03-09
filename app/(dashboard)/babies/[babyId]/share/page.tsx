'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'

interface Share {
  id: string
  role: string
  token: string
  user: { email: string; name: string | null } | null
}

export default function SharePage({ params }: { params: Promise<{ babyId: string }> }) {
  const { babyId } = use(params)
  const [shares, setShares] = useState<Share[]>([])
  const [email, setEmail] = useState('')
  const [shareLink, setShareLink] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchShares = async () => {
    const res = await fetch(`/api/share?babyId=${babyId}`)
    if (res.ok) setShares(await res.json())
  }

  useEffect(() => { fetchShares() }, [babyId])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    const res = await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'invite', babyId, email }),
    })
    if (res.ok) {
      setSuccess(`Invited ${email} as editor`)
      setEmail('')
      await fetchShares()
    } else {
      const data = await res.json()
      setError(data.error ?? 'Failed to invite')
    }
    setLoading(false)
  }

  const handleGenerateLink = async () => {
    setLoading(true)
    const res = await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'link', babyId }),
    })
    if (res.ok) {
      const data = await res.json()
      setShareLink(data.url)
      await fetchShares()
    }
    setLoading(false)
  }

  const handleRevoke = async (id: string) => {
    await fetch(`/api/share?id=${id}`, { method: 'DELETE' })
    await fetchShares()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0">
        <Link href="/babies" className="text-gray-500 hover:text-gray-700 text-sm">← Back</Link>
        <h1 className="text-lg font-bold text-gray-900">Share Access</h1>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-6">
        {/* Invite by email */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Invite by Email (Editor Access)</h2>
          <form onSubmit={handleInvite} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="their@email.com"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            {success && <p className="text-green-600 text-sm">{success}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              Send Invite
            </button>
          </form>
        </div>

        {/* Read-only link */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">View-Only Link</h2>
          {shareLink ? (
            <div className="space-y-2">
              <input
                readOnly
                value={shareLink}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600"
              />
              <button
                onClick={() => navigator.clipboard.writeText(shareLink)}
                className="text-sm text-blue-600 hover:underline"
              >
                Copy link
              </button>
            </div>
          ) : (
            <button
              onClick={handleGenerateLink}
              disabled={loading}
              className="w-full border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              Generate view-only link
            </button>
          )}
        </div>

        {/* Current shares */}
        {shares.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
            <div className="px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-700">Active Shares</h2>
            </div>
            {shares.map((share) => (
              <div key={share.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-900">
                    {share.user ? (share.user.name ?? share.user.email) : 'View-only link'}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{share.role.toLowerCase()}</p>
                </div>
                <button
                  onClick={() => handleRevoke(share.id)}
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
