import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const CreateEntrySchema = z.object({
  babyId: z.string(),
  type: z.enum(['FEEDING', 'CHANGING', 'NAP', 'SLEEP', 'MEDICINE']),
  occurredAt: z.string().optional(),
  notes: z.string().max(500).optional().nullable(),
  amount: z.number().positive().optional().nullable(),
  unit: z.enum(['ML', 'OZ']).optional().nullable(),
  durationMinutes: z.number().int().min(1).max(1440).optional().nullable(),
})

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

function checkOrigin(request: NextRequest): NextResponse | null {
  const origin = request.headers.get('origin')
  if (origin) {
    const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    if (origin !== allowedOrigin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }
  return null
}

async function verifyBabyAccess(userId: string, babyId: string) {
  return prisma.babyUser.findFirst({ where: { userId, babyId } })
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const babyId = searchParams.get('babyId')
  const date = searchParams.get('date')

  if (!babyId) {
    return NextResponse.json({ error: 'babyId required' }, { status: 400 })
  }

  if (date && !DATE_REGEX.test(date)) {
    return NextResponse.json({ error: 'Invalid date format. Expected YYYY-MM-DD.' }, { status: 400 })
  }

  const access = await verifyBabyAccess(session.user.id, babyId)
  if (!access) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // tz is the client's getTimezoneOffset() value (minutes to add to local time to get UTC)
  const tzOffset = parseInt(searchParams.get('tz') ?? '0')
  const dateStr = date ?? new Date().toISOString().split('T')[0]
  // Compute local midnight in UTC by shifting UTC midnight by the timezone offset
  const startOfDay = new Date(new Date(`${dateStr}T00:00:00.000Z`).getTime() + tzOffset * 60000)
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1)

  const entries = await prisma.entry.findMany({
    where: {
      babyId,
      occurredAt: { gte: startOfDay, lte: endOfDay },
    },
    orderBy: { occurredAt: 'asc' },
  })

  return NextResponse.json(entries)
}

export async function DELETE(request: NextRequest) {
  const originError = checkOrigin(request)
  if (originError) return originError

  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const entryId = searchParams.get('id')
  if (!entryId) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  const entry = await prisma.entry.findUnique({ where: { id: entryId } })
  if (!entry) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const access = await verifyBabyAccess(session.user.id, entry.babyId)
  if (!access || access.role === 'VIEWER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.entry.delete({ where: { id: entryId } })
  return new NextResponse(null, { status: 204 })
}

export async function POST(request: NextRequest) {
  const originError = checkOrigin(request)
  if (originError) return originError

  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const validated = CreateEntrySchema.parse(body)

    const access = await verifyBabyAccess(session.user.id, validated.babyId)
    if (!access || access.role === 'VIEWER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const entry = await prisma.entry.create({
      data: {
        babyId: validated.babyId,
        type: validated.type,
        occurredAt: validated.occurredAt ? new Date(validated.occurredAt) : new Date(),
        notes: validated.notes ?? null,
        amount: validated.amount ?? null,
        unit: validated.unit ?? null,
        durationMinutes: validated.durationMinutes ?? null,
      },
    })

    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
    }
    console.error('Error creating entry:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 })
  }
}
