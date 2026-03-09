import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const InviteSchema = z.object({
  type: z.literal('invite'),
  babyId: z.string(),
  email: z.string().email(),
})

const LinkSchema = z.object({
  type: z.literal('link'),
  babyId: z.string(),
})

const PostSchema = z.discriminatedUnion('type', [InviteSchema, LinkSchema])

async function verifyOwner(userId: string, babyId: string) {
  return prisma.babyUser.findFirst({
    where: { userId, babyId, role: 'OWNER' },
  })
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const validated = PostSchema.parse(body)

    const isOwner = await verifyOwner(session.user.id, validated.babyId)
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (validated.type === 'link') {
      const share = await prisma.sharedAccess.create({
        data: { babyId: validated.babyId, role: 'VIEWER' },
      })
      const url = `${process.env.NEXT_PUBLIC_APP_URL}/shared/${share.token}`
      return NextResponse.json({ token: share.token, url }, { status: 201 })
    }

    // type === 'invite'
    const invitee = await prisma.user.findUnique({ where: { email: validated.email } })
    if (!invitee) {
      return NextResponse.json({ error: 'User not found. They must register first.' }, { status: 404 })
    }

    // Add to BabyUser
    await prisma.babyUser.upsert({
      where: { userId_babyId: { userId: invitee.id, babyId: validated.babyId } },
      update: { role: 'EDITOR' },
      create: { userId: invitee.id, babyId: validated.babyId, role: 'EDITOR' },
    })

    // Create SharedAccess record
    const share = await prisma.sharedAccess.create({
      data: {
        babyId: validated.babyId,
        userId: invitee.id,
        role: 'EDITOR',
      },
    })

    return NextResponse.json(share, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('Error sharing:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to share' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const babyId = new URL(request.url).searchParams.get('babyId')
  if (!babyId) {
    return NextResponse.json({ error: 'babyId required' }, { status: 400 })
  }

  const access = await prisma.babyUser.findFirst({
    where: { userId: session.user.id, babyId },
  })
  if (!access) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const shares = await prisma.sharedAccess.findMany({
    where: { babyId },
    include: { user: { select: { email: true, name: true } } },
  })

  return NextResponse.json(shares)
}

export async function DELETE(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const shareId = new URL(request.url).searchParams.get('id')
  if (!shareId) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  const share = await prisma.sharedAccess.findUnique({ where: { id: shareId } })
  if (!share) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const isOwner = await verifyOwner(session.user.id, share.babyId)
  if (!isOwner) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.sharedAccess.delete({ where: { id: shareId } })
  return NextResponse.json({ success: true })
}
