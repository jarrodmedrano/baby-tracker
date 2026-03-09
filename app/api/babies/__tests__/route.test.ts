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
    baby: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    babyUser: {
      create: jest.fn(),
    },
  },
}))

import { GET, POST } from '../route'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const mockSession = { user: { id: 'user-1', email: 'test@test.com' } }

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

  it('creates a baby and returns 201', async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue(mockSession)
    const baby = { id: 'baby-1', name: 'Alice', birthDate: null, createdAt: new Date() }
    ;(prisma.baby.create as jest.Mock).mockResolvedValue(baby)
    ;(prisma.babyUser.create as jest.Mock).mockResolvedValue({})
    const req = new NextRequest('http://localhost/api/babies', {
      method: 'POST',
      body: JSON.stringify({ name: 'Alice' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.name).toBe('Alice')
  })
})
