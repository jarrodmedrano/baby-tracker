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
})

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

  const access = await verifyBabyAccess(session.user.id, babyId)
  if (!access) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const startOfDay = date ? new Date(`${date}T00:00:00.000Z`) : new Date()
  startOfDay.setUTCHours(0, 0, 0, 0)
  const endOfDay = new Date(startOfDay)
  endOfDay.setUTCHours(23, 59, 59, 999)

  const entries = await prisma.entry.findMany({
    where: {
      babyId,
      occurredAt: { gte: startOfDay, lte: endOfDay },
    },
    orderBy: { occurredAt: 'asc' },
  })

  return NextResponse.json(entries)
}

export async function POST(request: NextRequest) {
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
      },
    })

    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('Error creating entry:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 })
  }
}
