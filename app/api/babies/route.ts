import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const CreateBabySchema = z.object({
  name: z.string().min(1).max(50).trim(),
  birthDate: z.string().optional().nullable(),
})

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
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const validated = CreateBabySchema.parse(body)

    const baby = await prisma.baby.create({
      data: {
        name: validated.name,
        birthDate: validated.birthDate ? new Date(validated.birthDate) : null,
      },
    })

    await prisma.babyUser.create({
      data: {
        userId: session.user.id,
        babyId: baby.id,
        role: 'OWNER',
      },
    })

    return NextResponse.json(baby, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('Error creating baby:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to create baby' }, { status: 500 })
  }
}
