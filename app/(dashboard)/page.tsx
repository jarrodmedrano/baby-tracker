import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { DashboardClient } from './DashboardClient'
import type { Baby } from '@prisma/client'

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    cookieStore.delete('better-auth.session_token')
    redirect('/login')
  }

  const babies = await prisma.baby.findMany({
    where: { users: { some: { userId: session.user.id } } },
    orderBy: { createdAt: 'asc' },
  })

  // Serialize for client (dates need to be strings)
  const serializedBabies = babies.map((b: Baby) => ({
    ...b,
    birthDate: b.birthDate ? b.birthDate.toISOString() : null,
    createdAt: b.createdAt.toISOString(),
  }))

  return <DashboardClient babies={serializedBabies} />
}
