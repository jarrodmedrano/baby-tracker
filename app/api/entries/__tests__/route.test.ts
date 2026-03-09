/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

jest.mock('@/lib/auth', () => ({
  auth: { api: { getSession: jest.fn() } },
}))
jest.mock('@/lib/db', () => ({
  prisma: {
    babyUser: { findFirst: jest.fn() },
    entry: { findMany: jest.fn(), create: jest.fn() },
  },
}))

import { GET, POST } from '../route'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const mockSession = { user: { id: 'user-1' } }

describe('GET /api/entries', () => {
  it('returns 401 when not authenticated', async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/entries?babyId=baby-1&date=2026-03-09')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 when user has no access to baby', async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue(mockSession)
    ;(prisma.babyUser.findFirst as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/entries?babyId=baby-1&date=2026-03-09')
    const res = await GET(req)
    expect(res.status).toBe(403)
  })

  it('returns entries for authorized user', async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue(mockSession)
    ;(prisma.babyUser.findFirst as jest.Mock).mockResolvedValue({ role: 'OWNER' })
    ;(prisma.entry.findMany as jest.Mock).mockResolvedValue([
      { id: 'e1', type: 'FEEDING', occurredAt: new Date(), amount: 90, unit: 'ML' },
    ])
    const req = new NextRequest('http://localhost/api/entries?babyId=baby-1&date=2026-03-09')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveLength(1)
  })
})

describe('POST /api/entries', () => {
  it('creates an entry and returns 201', async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue(mockSession)
    ;(prisma.babyUser.findFirst as jest.Mock).mockResolvedValue({ role: 'OWNER' })
    const entry = {
      id: 'e1', babyId: 'baby-1', type: 'FEEDING',
      occurredAt: new Date(), amount: 90, unit: 'ML', notes: null,
    }
    ;(prisma.entry.create as jest.Mock).mockResolvedValue(entry)
    const req = new NextRequest('http://localhost/api/entries', {
      method: 'POST',
      body: JSON.stringify({
        babyId: 'baby-1', type: 'FEEDING', amount: 90, unit: 'ML',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })
})
