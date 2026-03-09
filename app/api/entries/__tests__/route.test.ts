/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

jest.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: jest.fn(),
    },
  },
}))

jest.mock('@/lib/db', () => ({
  prisma: {
    babyUser: {
      findFirst: jest.fn(),
    },
    entry: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

import { GET, POST, DELETE } from '../route'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const mockSession = { user: { id: 'user-1', email: 'test@test.com' } }
const mockEntry = {
  id: 'entry-1',
  babyId: 'baby-1',
  type: 'FEEDING',
  occurredAt: new Date('2024-01-15T10:00:00.000Z'),
  notes: null,
  amount: null,
  unit: null,
}

beforeEach(() => {
  jest.clearAllMocks()
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
})

// ---------------------------------------------------------------------------
// GET /api/entries
// ---------------------------------------------------------------------------
describe('GET /api/entries', () => {
  it('returns 401 when no session', async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/entries?babyId=baby-1')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 when user has no access to baby', async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue(mockSession)
    ;(prisma.babyUser.findFirst as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/entries?babyId=baby-1')
    const res = await GET(req)
    expect(res.status).toBe(403)
  })

  it('returns 400 when date format is invalid', async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue(mockSession)
    const req = new NextRequest('http://localhost/api/entries?babyId=baby-1&date=not-a-date')
    const res = await GET(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/Invalid date format/i)
  })

  it('returns entries filtered by date when valid', async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue(mockSession)
    ;(prisma.babyUser.findFirst as jest.Mock).mockResolvedValue({ role: 'OWNER' })
    ;(prisma.entry.findMany as jest.Mock).mockResolvedValue([mockEntry])
    const req = new NextRequest('http://localhost/api/entries?babyId=baby-1&date=2024-01-15')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveLength(1)
    expect(data[0].id).toBe('entry-1')
    expect(prisma.entry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ babyId: 'baby-1' }),
      }),
    )
  })
})

// ---------------------------------------------------------------------------
// DELETE /api/entries
// ---------------------------------------------------------------------------
describe('DELETE /api/entries', () => {
  it('returns 401 when no session', async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/entries?id=entry-1', {
      method: 'DELETE',
    })
    const res = await DELETE(req)
    expect(res.status).toBe(401)
  })

  it('returns 404 when entry not found', async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue(mockSession)
    ;(prisma.entry.findUnique as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/entries?id=entry-1', {
      method: 'DELETE',
    })
    const res = await DELETE(req)
    expect(res.status).toBe(404)
  })

  it('returns 403 when user has no baby access', async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue(mockSession)
    ;(prisma.entry.findUnique as jest.Mock).mockResolvedValue(mockEntry)
    ;(prisma.babyUser.findFirst as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/entries?id=entry-1', {
      method: 'DELETE',
    })
    const res = await DELETE(req)
    expect(res.status).toBe(403)
  })

  it('returns 403 when user is VIEWER role', async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue(mockSession)
    ;(prisma.entry.findUnique as jest.Mock).mockResolvedValue(mockEntry)
    ;(prisma.babyUser.findFirst as jest.Mock).mockResolvedValue({ role: 'VIEWER' })
    const req = new NextRequest('http://localhost/api/entries?id=entry-1', {
      method: 'DELETE',
    })
    const res = await DELETE(req)
    expect(res.status).toBe(403)
  })

  it('returns 204 and deletes entry when valid', async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue(mockSession)
    ;(prisma.entry.findUnique as jest.Mock).mockResolvedValue(mockEntry)
    ;(prisma.babyUser.findFirst as jest.Mock).mockResolvedValue({ role: 'EDITOR' })
    ;(prisma.entry.delete as jest.Mock).mockResolvedValue(mockEntry)
    const req = new NextRequest('http://localhost/api/entries?id=entry-1', {
      method: 'DELETE',
    })
    const res = await DELETE(req)
    expect(res.status).toBe(204)
    expect(prisma.entry.delete).toHaveBeenCalledWith({ where: { id: 'entry-1' } })
  })
})

// ---------------------------------------------------------------------------
// POST /api/entries
// ---------------------------------------------------------------------------
describe('POST /api/entries', () => {
  it('returns 401 when no session', async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/entries', {
      method: 'POST',
      body: JSON.stringify({ babyId: 'baby-1', type: 'FEEDING' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 when Origin header is wrong', async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue(mockSession)
    const req = new NextRequest('http://localhost/api/entries', {
      method: 'POST',
      headers: { origin: 'http://evil.com' },
      body: JSON.stringify({ babyId: 'baby-1', type: 'FEEDING' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('returns 400 when body fails Zod validation (missing required fields)', async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue(mockSession)
    const req = new NextRequest('http://localhost/api/entries', {
      method: 'POST',
      headers: { origin: 'http://localhost:3000' },
      body: JSON.stringify({ notes: 'no babyId or type present' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Validation failed')
  })

  it('returns 403 when user is VIEWER role', async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue(mockSession)
    ;(prisma.babyUser.findFirst as jest.Mock).mockResolvedValue({ role: 'VIEWER' })
    const req = new NextRequest('http://localhost/api/entries', {
      method: 'POST',
      headers: { origin: 'http://localhost:3000' },
      body: JSON.stringify({ babyId: 'baby-1', type: 'FEEDING' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('creates entry and returns 201', async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue(mockSession)
    ;(prisma.babyUser.findFirst as jest.Mock).mockResolvedValue({ role: 'EDITOR' })
    ;(prisma.entry.create as jest.Mock).mockResolvedValue(mockEntry)
    const req = new NextRequest('http://localhost/api/entries', {
      method: 'POST',
      headers: { origin: 'http://localhost:3000' },
      body: JSON.stringify({ babyId: 'baby-1', type: 'FEEDING' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.id).toBe('entry-1')
    expect(prisma.entry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ babyId: 'baby-1', type: 'FEEDING' }),
      }),
    )
  })
})
