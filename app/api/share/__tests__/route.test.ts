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
      upsert: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    sharedAccess: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

import { GET, POST, DELETE } from '../route'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const mockSession = { user: { id: 'user-1', email: 'owner@test.com' } }
const mockShare = {
  id: 'share-1',
  babyId: 'baby-1',
  userId: 'user-2',
  role: 'EDITOR',
  token: null,
  expiresAt: null,
}

beforeEach(() => {
  jest.clearAllMocks()
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
})

// ---------------------------------------------------------------------------
// GET /api/share
// ---------------------------------------------------------------------------
describe('GET /api/share', () => {
  it('returns 401 when no session', async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/share?babyId=baby-1')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 when user is not OWNER (role is EDITOR)', async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue(mockSession)
    ;(prisma.babyUser.findFirst as jest.Mock).mockResolvedValue(null) // verifyOwner returns null
    const req = new NextRequest('http://localhost/api/share?babyId=baby-1')
    const res = await GET(req)
    expect(res.status).toBe(403)
  })

  it('returns shares when user is OWNER', async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue(mockSession)
    ;(prisma.babyUser.findFirst as jest.Mock).mockResolvedValue({ role: 'OWNER' })
    ;(prisma.sharedAccess.findMany as jest.Mock).mockResolvedValue([
      { ...mockShare, user: { email: 'viewer@test.com', name: 'Viewer' } },
    ])
    const req = new NextRequest('http://localhost/api/share?babyId=baby-1')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveLength(1)
    expect(data[0].id).toBe('share-1')
    expect(prisma.sharedAccess.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { babyId: 'baby-1' } }),
    )
  })
})

// ---------------------------------------------------------------------------
// POST /api/share — invite type
// ---------------------------------------------------------------------------
describe('POST /api/share (invite)', () => {
  it('returns 401 when no session', async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/share', {
      method: 'POST',
      body: JSON.stringify({ type: 'invite', babyId: 'baby-1', email: 'a@b.com' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 when Origin header is wrong', async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue(mockSession)
    const req = new NextRequest('http://localhost/api/share', {
      method: 'POST',
      headers: { origin: 'http://evil.com' },
      body: JSON.stringify({ type: 'invite', babyId: 'baby-1', email: 'a@b.com' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('returns generic 200 message when invited email does not exist', async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue(mockSession)
    ;(prisma.babyUser.findFirst as jest.Mock).mockResolvedValue({ role: 'OWNER' }) // verifyOwner
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null) // no user with that email
    const req = new NextRequest('http://localhost/api/share', {
      method: 'POST',
      headers: { origin: 'http://localhost:3000' },
      body: JSON.stringify({ type: 'invite', babyId: 'baby-1', email: 'unknown@example.com' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toMatch(/if that email is registered/i)
  })

  it('grants access and creates share record when invited user exists', async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue(mockSession)
    ;(prisma.babyUser.findFirst as jest.Mock).mockResolvedValue({ role: 'OWNER' })
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-2', email: 'invited@test.com' })
    ;(prisma.babyUser.upsert as jest.Mock).mockResolvedValue({})
    ;(prisma.sharedAccess.create as jest.Mock).mockResolvedValue(mockShare)
    const req = new NextRequest('http://localhost/api/share', {
      method: 'POST',
      headers: { origin: 'http://localhost:3000' },
      body: JSON.stringify({ type: 'invite', babyId: 'baby-1', email: 'invited@test.com' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    expect(prisma.babyUser.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_babyId: { userId: 'user-2', babyId: 'baby-1' } },
      }),
    )
    expect(prisma.sharedAccess.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ babyId: 'baby-1', userId: 'user-2', role: 'EDITOR' }),
      }),
    )
  })
})

// ---------------------------------------------------------------------------
// POST /api/share — link type
// ---------------------------------------------------------------------------
describe('POST /api/share (link)', () => {
  it('creates share with a token and 30-day expiry set', async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue(mockSession)
    ;(prisma.babyUser.findFirst as jest.Mock).mockResolvedValue({ role: 'OWNER' })
    const fakeToken = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    ;(prisma.sharedAccess.create as jest.Mock).mockResolvedValue({
      id: 'share-2',
      babyId: 'baby-1',
      role: 'VIEWER',
      token: fakeToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })
    const req = new NextRequest('http://localhost/api/share', {
      method: 'POST',
      headers: { origin: 'http://localhost:3000' },
      body: JSON.stringify({ type: 'link', babyId: 'baby-1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.token).toBe(fakeToken)
    expect(data.url).toContain(fakeToken)
    // Verify create was called with a token and an expiresAt
    const createCall = (prisma.sharedAccess.create as jest.Mock).mock.calls[0][0]
    expect(createCall.data).toMatchObject({ babyId: 'baby-1', role: 'VIEWER' })
    expect(createCall.data.token).toBeDefined()
    expect(createCall.data.expiresAt).toBeInstanceOf(Date)
    // Expiry should be approximately 30 days from now
    const diffMs = createCall.data.expiresAt.getTime() - Date.now()
    expect(diffMs).toBeGreaterThan(29 * 24 * 60 * 60 * 1000)
    expect(diffMs).toBeLessThan(31 * 24 * 60 * 60 * 1000)
  })
})

// ---------------------------------------------------------------------------
// DELETE /api/share
// ---------------------------------------------------------------------------
describe('DELETE /api/share', () => {
  it('returns 401 when no session', async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/share?id=share-1', {
      method: 'DELETE',
    })
    const res = await DELETE(req)
    expect(res.status).toBe(401)
  })

  it('revokes share and returns 200', async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue(mockSession)
    ;(prisma.sharedAccess.findUnique as jest.Mock).mockResolvedValue(mockShare)
    ;(prisma.babyUser.findFirst as jest.Mock).mockResolvedValue({ role: 'OWNER' })
    ;(prisma.sharedAccess.delete as jest.Mock).mockResolvedValue(mockShare)
    const req = new NextRequest('http://localhost/api/share?id=share-1', {
      method: 'DELETE',
    })
    const res = await DELETE(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(prisma.sharedAccess.delete).toHaveBeenCalledWith({ where: { id: 'share-1' } })
  })
})
