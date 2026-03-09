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

const mockTx = {
  baby: { create: jest.fn() },
  babyUser: { create: jest.fn() },
}

jest.mock('@/lib/db', () => ({
  prisma: {
    baby: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

import { GET, POST } from '../route'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const mockSession = { user: { id: 'user-1', email: 'test@test.com' } }

beforeEach(() => {
  jest.clearAllMocks()
  // Default $transaction implementation: execute the callback with mockTx
  ;(prisma.$transaction as jest.Mock).mockImplementation(
    (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx),
  )
})

describe('GET /api/babies', () => {
  it('returns 401 when not authenticated', async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/babies')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns babies for authenticated user', async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue(mockSession)
    ;(prisma.baby.findMany as jest.Mock).mockResolvedValue([
      { id: 'baby-1', name: 'Alice', birthDate: null, createdAt: new Date() },
    ])
    const req = new NextRequest('http://localhost/api/babies')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveLength(1)
    expect(data[0].name).toBe('Alice')
  })
})

describe('POST /api/babies', () => {
  it('returns 401 when not authenticated', async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/babies', {
      method: 'POST',
      body: JSON.stringify({ name: 'Alice' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('creates a baby inside a transaction and returns 201', async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue(mockSession)
    const baby = { id: 'baby-1', name: 'Alice', birthDate: null, createdAt: new Date() }
    mockTx.baby.create.mockResolvedValue(baby)
    mockTx.babyUser.create.mockResolvedValue({})

    const req = new NextRequest('http://localhost/api/babies', {
      method: 'POST',
      body: JSON.stringify({ name: 'Alice' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.name).toBe('Alice')
    expect(mockTx.baby.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: 'Alice' }) }),
    )
    expect(mockTx.babyUser.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'user-1', babyId: 'baby-1', role: 'OWNER' }),
      }),
    )
  })

  it('returns 400 when body fails Zod validation (name missing)', async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue(mockSession)
    const req = new NextRequest('http://localhost/api/babies', {
      method: 'POST',
      headers: { origin: 'http://localhost:3000' },
      body: JSON.stringify({}), // name is required
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Validation failed')
  })

  it('returns 403 when Origin header does not match allowed origin', async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue(mockSession)
    const req = new NextRequest('http://localhost/api/babies', {
      method: 'POST',
      headers: { origin: 'http://evil.com' },
      body: JSON.stringify({ name: 'Alice' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })
})
