import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const CreateBabySchema = z.object({
  name: z.string().min(1).max(50).trim(),
  birthDate: z.string().optional().nullable(),
})

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

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const babies = await prisma.baby.findMany({
    where: {
      users: { some: { userId: session.user.id } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(babies)
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
    const validated = CreateBabySchema.parse(body)

    const baby = await prisma.$transaction(async (tx) => {
      const created = await tx.baby.create({
        data: {
          name: validated.name,
          birthDate: validated.birthDate ? new Date(validated.birthDate) : null,
        },
      })

      await tx.babyUser.create({
        data: {
          userId: session.user.id,
          babyId: created.id,
          role: 'OWNER',
        },
      })

      return created
    })

    return NextResponse.json(baby, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
    }
    console.error('Error creating baby:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to create baby' }, { status: 500 })
  }
}
