# Baby Tracker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a multi-baby daily tracking app with auth, shared access, and a timeline UI.

**Architecture:** Next.js 16 App Router with server components for data fetching and client components for interactive UI. better-auth handles sessions via cookies. Prisma connects to Neon PostgreSQL.

**Tech Stack:** Next.js 16, TypeScript, Tailwind CSS, better-auth, Prisma, Neon PostgreSQL, Zod, Jest, React Testing Library

**Worktree:** `.worktrees/feature/baby-tracker-impl`

---

## Phase 1: Project Foundation

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install production deps**

```bash
npm install better-auth @prisma/client zod
```

**Step 2: Install Prisma CLI and test deps**

```bash
npm install -D prisma jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom @types/jest ts-jest
```

**Step 3: Verify installs**

```bash
cat package.json | grep -E '"better-auth|prisma|zod|jest'
```
Expected: all packages listed.

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install better-auth, prisma, zod, jest"
```

---

### Task 2: Configure Jest

**Files:**
- Create: `jest.config.ts`
- Create: `jest.setup.ts`

**Step 1: Create jest.config.ts**

```typescript
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
}

export default createJestConfig(config)
```

**Step 2: Create jest.setup.ts**

```typescript
import '@testing-library/jest-dom'
```

**Step 3: Add test script to package.json**

In `package.json` scripts, add:
```json
"test": "jest",
"test:watch": "jest --watch",
"test:coverage": "jest --coverage"
```

**Step 4: Run jest to confirm it loads**

```bash
npx jest --listTests
```
Expected: no errors (no tests yet).

**Step 5: Commit**

```bash
git add jest.config.ts jest.setup.ts package.json
git commit -m "chore: configure jest with next.js"
```

---

### Task 3: Set Up Prisma Schema

**Files:**
- Create: `prisma/schema.prisma`

**Step 1: Initialize Prisma**

```bash
npx prisma init --datasource-provider postgresql
```
This creates `prisma/schema.prisma` and `.env`.

**Step 2: Replace schema.prisma content**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())

  babies       BabyUser[]
  sharedAccess SharedAccess[]

  // better-auth requires these
  emailVerified Boolean  @default(false)
  image         String?
  updatedAt     DateTime @updatedAt
  sessions      Session[]
  accounts      Account[]
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Account {
  id                    String    @id @default(cuid())
  userId                String
  accountId             String
  providerId            String
  accessToken           String?
  refreshToken          String?
  idToken               String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Verification {
  id         String   @id @default(cuid())
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

model Baby {
  id        String    @id @default(cuid())
  name      String
  birthDate DateTime?
  createdAt DateTime  @default(now())

  users   BabyUser[]
  entries Entry[]
  shares  SharedAccess[]
}

model BabyUser {
  userId String
  babyId String
  role   Role @default(OWNER)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  baby Baby @relation(fields: [babyId], references: [id], onDelete: Cascade)

  @@id([userId, babyId])
}

model Entry {
  id         String    @id @default(cuid())
  babyId     String
  type       EntryType
  occurredAt DateTime  @default(now())
  notes      String?
  amount     Float?
  unit       Unit?

  baby Baby @relation(fields: [babyId], references: [id], onDelete: Cascade)
}

model SharedAccess {
  id        String    @id @default(cuid())
  babyId    String
  userId    String?
  token     String    @unique @default(cuid())
  role      Role      @default(VIEWER)
  expiresAt DateTime?
  createdAt DateTime  @default(now())

  baby Baby  @relation(fields: [babyId], references: [id], onDelete: Cascade)
  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)
}

enum EntryType {
  FEEDING
  CHANGING
  NAP
  SLEEP
  MEDICINE
}

enum Unit {
  ML
  OZ
}

enum Role {
  OWNER
  EDITOR
  VIEWER
}
```

**Step 3: Set DATABASE_URL in .env**

Edit `.env` and set your Neon connection string:
```
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
```

**Step 4: Push schema to database**

```bash
npx prisma db push
```
Expected: `Your database is now in sync with your Prisma schema.`

**Step 5: Generate Prisma client**

```bash
npx prisma generate
```

**Step 6: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add prisma schema for baby tracker"
```
Note: Never commit `.env`.

---

### Task 4: Set Up Prisma Client Singleton

**Files:**
- Create: `lib/db.ts`
- Create: `lib/__tests__/db.test.ts`

**Step 1: Write the failing test**

```typescript
// lib/__tests__/db.test.ts
import { prisma } from '../db'

describe('prisma client', () => {
  it('exports a prisma instance', () => {
    expect(prisma).toBeDefined()
    expect(typeof prisma.$connect).toBe('function')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npx jest lib/__tests__/db.test.ts -v
```
Expected: FAIL - "Cannot find module '../db'"

**Step 3: Create lib/db.ts**

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ['error'] })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

**Step 4: Run test to verify it passes**

```bash
npx jest lib/__tests__/db.test.ts -v
```
Expected: PASS

**Step 5: Commit**

```bash
git add lib/db.ts lib/__tests__/db.test.ts
git commit -m "feat: add prisma client singleton"
```

---

### Task 5: Configure better-auth

**Files:**
- Create: `lib/auth.ts`
- Create: `lib/auth-client.ts`
- Create: `app/api/auth/[...all]/route.ts`

**Step 1: Create lib/auth.ts**

```typescript
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from './db'

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: [process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'],
})
```

**Step 2: Create lib/auth-client.ts**

```typescript
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
})

export const { signIn, signOut, signUp, useSession } = authClient
```

**Step 3: Create app/api/auth/[...all]/route.ts**

```typescript
import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'

export const { GET, POST } = toNextJsHandler(auth)
```

**Step 4: Add env vars to .env**

```
BETTER_AUTH_SECRET="generate-a-random-32-char-string-here"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Generate secret:
```bash
openssl rand -base64 32
```

**Step 5: Start dev server and test auth endpoint**

```bash
npm run dev
```
In another terminal:
```bash
curl http://localhost:3000/api/auth/get-session
```
Expected: `{"session":null,"user":null}` or similar.

**Step 6: Commit**

```bash
git add lib/auth.ts lib/auth-client.ts app/api/auth/[...all]/route.ts
git commit -m "feat: configure better-auth with prisma adapter"
```

---

## Phase 2: Auth UI

### Task 6: Create Auth Middleware

**Files:**
- Create: `middleware.ts`

**Step 1: Create middleware.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/register')

  if (!session && !isAuthRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

**Step 2: Commit**

```bash
git add middleware.ts
git commit -m "feat: add auth middleware to protect routes"
```

---

### Task 7: Login Page

**Files:**
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(auth)/login/__tests__/page.test.tsx`

**Step 1: Write the failing test**

```typescript
// app/(auth)/login/__tests__/page.test.tsx
import { render, screen } from '@testing-library/react'
import LoginPage from '../page'

// Mock auth client
jest.mock('@/lib/auth-client', () => ({
  signIn: { email: jest.fn() },
}))

describe('LoginPage', () => {
  it('renders email and password fields', () => {
    render(<LoginPage />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('renders link to register', () => {
    render(<LoginPage />)
    expect(screen.getByRole('link', { name: /create account/i })).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npx jest app/\(auth\)/login/__tests__/page.test.tsx -v
```
Expected: FAIL

**Step 3: Create app/(auth)/login/page.tsx**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from '@/lib/auth-client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: authError } = await signIn.email({ email, password })

    if (authError) {
      setError(authError.message ?? 'Sign in failed')
      setLoading(false)
      return
    }

    router.push('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-sm w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Baby Tracker</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-4 text-sm text-gray-600 text-center">
          No account?{' '}
          <Link href="/register" className="text-blue-600 hover:underline">
            Create account
          </Link>
        </p>
      </div>
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

```bash
npx jest app/\(auth\)/login/__tests__/page.test.tsx -v
```
Expected: PASS

**Step 5: Commit**

```bash
git add app/\(auth\)/login/
git commit -m "feat: add login page"
```

---

### Task 8: Register Page

**Files:**
- Create: `app/(auth)/register/page.tsx`
- Create: `app/(auth)/register/__tests__/page.test.tsx`

**Step 1: Write the failing test**

```typescript
// app/(auth)/register/__tests__/page.test.tsx
import { render, screen } from '@testing-library/react'
import RegisterPage from '../page'

jest.mock('@/lib/auth-client', () => ({
  signUp: { email: jest.fn() },
}))

describe('RegisterPage', () => {
  it('renders name, email, and password fields', () => {
    render(<RegisterPage />)
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('renders link to login', () => {
    render(<RegisterPage />)
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npx jest app/\(auth\)/register/__tests__/page.test.tsx -v
```
Expected: FAIL

**Step 3: Create app/(auth)/register/page.tsx**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signUp } from '@/lib/auth-client'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: authError } = await signUp.email({ name, email, password })

    if (authError) {
      setError(authError.message ?? 'Registration failed')
      setLoading(false)
      return
    }

    router.push('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-sm w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Account</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-4 text-sm text-gray-600 text-center">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
```

**Step 4: Run tests to verify they pass**

```bash
npx jest app/\(auth\)/register/__tests__/page.test.tsx -v
```
Expected: PASS

**Step 5: Commit**

```bash
git add app/\(auth\)/register/
git commit -m "feat: add register page"
```

---

## Phase 3: Baby Management API

### Task 9: Babies API Route

**Files:**
- Create: `app/api/babies/route.ts`
- Create: `app/api/babies/__tests__/route.test.ts`

**Step 1: Write failing tests**

```typescript
// app/api/babies/__tests__/route.test.ts
import { POST, GET } from '../route'
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
```

**Step 2: Run tests to verify they fail**

```bash
npx jest app/api/babies/__tests__/route.test.ts -v
```
Expected: FAIL

**Step 3: Create app/api/babies/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const CreateBabySchema = z.object({
  name: z.string().min(1).max(50).trim(),
  birthDate: z.string().datetime().optional().nullable(),
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
```

**Step 4: Run tests to verify they pass**

```bash
npx jest app/api/babies/__tests__/route.test.ts -v
```
Expected: PASS

**Step 5: Commit**

```bash
git add app/api/babies/
git commit -m "feat: add babies API (GET, POST)"
```

---

## Phase 4: Entries API

### Task 10: Entries API Route

**Files:**
- Create: `app/api/entries/route.ts`
- Create: `app/api/entries/__tests__/route.test.ts`

**Step 1: Write failing tests**

```typescript
// app/api/entries/__tests__/route.test.ts
import { POST, GET } from '../route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/auth', () => ({
  auth: { api: { getSession: jest.fn() } },
}))
jest.mock('@/lib/db', () => ({
  prisma: {
    babyUser: { findFirst: jest.fn() },
    entry: { findMany: jest.fn(), create: jest.fn() },
  },
}))

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const mockSession = { user: { id: 'user-1' } }

describe('GET /api/entries', () => {
  it('returns 401 when not authenticated', async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/entries?babyId=baby-1&date=2026-03-09')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 when user has no access to baby', async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue(mockSession)
    ;(prisma.babyUser.findFirst as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/entries?babyId=baby-1&date=2026-03-09')
    const res = await GET(req)
    expect(res.status).toBe(403)
  })

  it('returns entries for authorized user', async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue(mockSession)
    ;(prisma.babyUser.findFirst as jest.Mock).mockResolvedValue({ role: 'OWNER' })
    ;(prisma.entry.findMany as jest.Mock).mockResolvedValue([
      { id: 'e1', type: 'FEEDING', occurredAt: new Date(), amount: 90, unit: 'ML' },
    ])
    const req = new NextRequest('http://localhost/api/entries?babyId=baby-1&date=2026-03-09')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveLength(1)
  })
})

describe('POST /api/entries', () => {
  it('creates an entry and returns 201', async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue(mockSession)
    ;(prisma.babyUser.findFirst as jest.Mock).mockResolvedValue({ role: 'OWNER' })
    const entry = {
      id: 'e1', babyId: 'baby-1', type: 'FEEDING',
      occurredAt: new Date(), amount: 90, unit: 'ML', notes: null,
    }
    ;(prisma.entry.create as jest.Mock).mockResolvedValue(entry)
    const req = new NextRequest('http://localhost/api/entries', {
      method: 'POST',
      body: JSON.stringify({
        babyId: 'baby-1', type: 'FEEDING', amount: 90, unit: 'ML',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
npx jest app/api/entries/__tests__/route.test.ts -v
```
Expected: FAIL

**Step 3: Create app/api/entries/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const CreateEntrySchema = z.object({
  babyId: z.string().cuid(),
  type: z.enum(['FEEDING', 'CHANGING', 'NAP', 'SLEEP', 'MEDICINE']),
  occurredAt: z.string().datetime().optional(),
  notes: z.string().max(500).optional().nullable(),
  amount: z.number().positive().optional().nullable(),
  unit: z.enum(['ML', 'OZ']).optional().nullable(),
})

async function verifyBabyAccess(userId: string, babyId: string) {
  const access = await prisma.babyUser.findFirst({
    where: { userId, babyId },
  })
  return access
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
```

**Step 4: Run tests to verify they pass**

```bash
npx jest app/api/entries/__tests__/route.test.ts -v
```
Expected: PASS

**Step 5: Commit**

```bash
git add app/api/entries/
git commit -m "feat: add entries API (GET by day, POST)"
```

---

## Phase 5: Dashboard UI

### Task 11: Timeline Component

**Files:**
- Create: `components/Timeline.tsx`
- Create: `components/__tests__/Timeline.test.tsx`

**Step 1: Write failing tests**

```typescript
// components/__tests__/Timeline.test.tsx
import { render, screen } from '@testing-library/react'
import { Timeline } from '../Timeline'

const mockEntries = [
  { id: 'e1', type: 'FEEDING' as const, occurredAt: new Date('2026-03-09T08:30:00Z'), amount: 90, unit: 'ML' as const, notes: null },
  { id: 'e2', type: 'CHANGING' as const, occurredAt: new Date('2026-03-09T10:00:00Z'), amount: null, unit: null, notes: null },
]

describe('Timeline', () => {
  it('renders 24 hour rows', () => {
    render(<Timeline entries={[]} onAddEntry={jest.fn()} />)
    // Check for hour labels 0-23
    expect(screen.getByText('12 AM')).toBeInTheDocument()
    expect(screen.getByText('12 PM')).toBeInTheDocument()
  })

  it('shows feeding entry in correct hour row', () => {
    render(<Timeline entries={mockEntries} onAddEntry={jest.fn()} />)
    expect(screen.getByText(/90 ML/i)).toBeInTheDocument()
  })

  it('shows changing entry pill', () => {
    render(<Timeline entries={mockEntries} onAddEntry={jest.fn()} />)
    expect(screen.getByText(/Changing/i)).toBeInTheDocument()
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
npx jest components/__tests__/Timeline.test.tsx -v
```
Expected: FAIL

**Step 3: Create components/Timeline.tsx**

```typescript
'use client'

import { useMemo } from 'react'

type EntryType = 'FEEDING' | 'CHANGING' | 'NAP' | 'SLEEP' | 'MEDICINE'
type Unit = 'ML' | 'OZ'

interface Entry {
  id: string
  type: EntryType
  occurredAt: Date | string
  amount: number | null
  unit: Unit | null
  notes: string | null
}

interface TimelineProps {
  entries: Entry[]
  onAddEntry: (hour: number) => void
}

const ENTRY_LABELS: Record<EntryType, string> = {
  FEEDING: 'Feeding',
  CHANGING: 'Changing',
  NAP: 'Nap',
  SLEEP: 'Sleep',
  MEDICINE: 'Medicine',
}

const ENTRY_COLORS: Record<EntryType, string> = {
  FEEDING: 'bg-blue-100 text-blue-800',
  CHANGING: 'bg-yellow-100 text-yellow-800',
  NAP: 'bg-purple-100 text-purple-800',
  SLEEP: 'bg-indigo-100 text-indigo-800',
  MEDICINE: 'bg-red-100 text-red-800',
}

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM'
  if (hour < 12) return `${hour} AM`
  if (hour === 12) return '12 PM'
  return `${hour - 12} PM`
}

function formatEntryPill(entry: Entry): string {
  const label = ENTRY_LABELS[entry.type]
  if (entry.type === 'FEEDING' && entry.amount != null) {
    return `${label}: ${entry.amount} ${entry.unit}`
  }
  return label
}

export function Timeline({ entries, onAddEntry }: TimelineProps) {
  const currentHour = new Date().getHours()

  const entriesByHour = useMemo(() => {
    const map: Record<number, Entry[]> = {}
    entries.forEach((entry) => {
      const hour = new Date(entry.occurredAt).getHours()
      if (!map[hour]) map[hour] = []
      map[hour].push(entry)
    })
    return map
  }, [entries])

  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: 24 }, (_, hour) => (
        <button
          key={hour}
          onClick={() => onAddEntry(hour)}
          className={`w-full flex items-start gap-3 px-4 py-2 hover:bg-gray-50 text-left transition-colors ${
            hour === currentHour ? 'bg-blue-50' : ''
          }`}
        >
          <span className="text-xs text-gray-400 w-12 pt-1 flex-shrink-0">
            {formatHour(hour)}
          </span>
          <div className="flex flex-wrap gap-1 min-h-[24px]">
            {(entriesByHour[hour] ?? []).map((entry) => (
              <span
                key={entry.id}
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${ENTRY_COLORS[entry.type]}`}
              >
                {formatEntryPill(entry)}
              </span>
            ))}
          </div>
        </button>
      ))}
    </div>
  )
}
```

**Step 4: Run tests to verify they pass**

```bash
npx jest components/__tests__/Timeline.test.tsx -v
```
Expected: PASS

**Step 5: Commit**

```bash
git add components/Timeline.tsx components/__tests__/Timeline.test.tsx
git commit -m "feat: add Timeline component"
```

---

### Task 12: Add Entry Modal

**Files:**
- Create: `components/AddEntryModal.tsx`
- Create: `components/__tests__/AddEntryModal.test.tsx`

**Step 1: Write failing tests**

```typescript
// components/__tests__/AddEntryModal.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { AddEntryModal } from '../AddEntryModal'

describe('AddEntryModal', () => {
  const defaultProps = {
    babyId: 'baby-1',
    defaultHour: 8,
    onClose: jest.fn(),
    onSave: jest.fn(),
  }

  it('renders all 5 entry type buttons', () => {
    render(<AddEntryModal {...defaultProps} />)
    expect(screen.getByRole('button', { name: /feeding/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /changing/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /nap/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sleep/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /medicine/i })).toBeInTheDocument()
  })

  it('shows amount and unit fields when Feeding is selected', () => {
    render(<AddEntryModal {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /feeding/i }))
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('does not show amount fields for Changing', () => {
    render(<AddEntryModal {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /changing/i }))
    expect(screen.queryByLabelText(/amount/i)).not.toBeInTheDocument()
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
npx jest components/__tests__/AddEntryModal.test.tsx -v
```
Expected: FAIL

**Step 3: Create components/AddEntryModal.tsx**

```typescript
'use client'

import { useState } from 'react'

type EntryType = 'FEEDING' | 'CHANGING' | 'NAP' | 'SLEEP' | 'MEDICINE'
type Unit = 'ML' | 'OZ'

interface AddEntryModalProps {
  babyId: string
  defaultHour: number
  onClose: () => void
  onSave: (entry: {
    babyId: string
    type: EntryType
    occurredAt: string
    amount?: number | null
    unit?: Unit | null
    notes?: string | null
  }) => Promise<void>
}

const ENTRY_TYPES: { type: EntryType; label: string; emoji: string }[] = [
  { type: 'FEEDING', label: 'Feeding', emoji: '🍼' },
  { type: 'CHANGING', label: 'Changing', emoji: '🧷' },
  { type: 'NAP', label: 'Nap', emoji: '😴' },
  { type: 'SLEEP', label: 'Sleep', emoji: '🌙' },
  { type: 'MEDICINE', label: 'Medicine', emoji: '💊' },
]

export function AddEntryModal({ babyId, defaultHour, onClose, onSave }: AddEntryModalProps) {
  const [selectedType, setSelectedType] = useState<EntryType | null>(null)
  const [amount, setAmount] = useState('')
  const [unit, setUnit] = useState<Unit>('ML')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const now = new Date()
  now.setHours(defaultHour, 0, 0, 0)
  const [occurredAt, setOccurredAt] = useState(
    now.toISOString().slice(0, 16)
  )

  const handleSave = async () => {
    if (!selectedType) return
    setLoading(true)
    setError('')
    try {
      await onSave({
        babyId,
        type: selectedType,
        occurredAt: new Date(occurredAt).toISOString(),
        amount: selectedType === 'FEEDING' && amount ? parseFloat(amount) : null,
        unit: selectedType === 'FEEDING' ? unit : null,
        notes: notes || null,
      })
      onClose()
    } catch {
      setError('Failed to save. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl w-full max-w-lg p-6 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Add Entry</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
            ×
          </button>
        </div>

        {/* Entry type selection */}
        <div className="grid grid-cols-5 gap-2 mb-4">
          {ENTRY_TYPES.map(({ type, label, emoji }) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-colors ${
                selectedType === type
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="text-2xl">{emoji}</span>
              <span className="text-xs font-medium text-gray-700">{label}</span>
            </button>
          ))}
        </div>

        {/* Feeding fields */}
        {selectedType === 'FEEDING' && (
          <div className="flex gap-2 mb-4">
            <div className="flex-1">
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                Amount
              </label>
              <input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as Unit)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="ML">ml</option>
                <option value="OZ">oz</option>
              </select>
            </div>
          </div>
        )}

        {/* Time */}
        <div className="mb-4">
          <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">
            Time
          </label>
          <input
            id="time"
            type="datetime-local"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        {/* Notes */}
        <div className="mb-4">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes (optional)
          </label>
          <input
            id="notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <button
          onClick={handleSave}
          disabled={!selectedType || loading}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}
```

**Step 4: Run tests to verify they pass**

```bash
npx jest components/__tests__/AddEntryModal.test.tsx -v
```
Expected: PASS

**Step 5: Commit**

```bash
git add components/AddEntryModal.tsx components/__tests__/AddEntryModal.test.tsx
git commit -m "feat: add AddEntryModal component"
```

---

### Task 13: Dashboard Page

**Files:**
- Create: `app/(dashboard)/page.tsx`

**Step 1: Create app/(dashboard)/page.tsx**

This is a server component that fetches data, renders client components.

```typescript
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')

  const babies = await prisma.baby.findMany({
    where: { users: { some: { userId: session.user.id } } },
    orderBy: { createdAt: 'asc' },
  })

  return <DashboardClient babies={babies} userId={session.user.id} />
}
```

**Step 2: Create app/(dashboard)/DashboardClient.tsx**

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signOut } from '@/lib/auth-client'
import { Timeline } from '@/components/Timeline'
import { AddEntryModal } from '@/components/AddEntryModal'

interface Baby {
  id: string
  name: string
  birthDate: Date | null
  createdAt: Date
}

interface Entry {
  id: string
  type: 'FEEDING' | 'CHANGING' | 'NAP' | 'SLEEP' | 'MEDICINE'
  occurredAt: string
  amount: number | null
  unit: 'ML' | 'OZ' | null
  notes: string | null
}

interface DashboardClientProps {
  babies: Baby[]
  userId: string
}

type ViewMode = 'single' | 'all'

export function DashboardClient({ babies, userId }: DashboardClientProps) {
  const router = useRouter()
  const [selectedBabyId, setSelectedBabyId] = useState<string | 'all'>(
    babies[0]?.id ?? 'all'
  )
  const [entriesByBaby, setEntriesByBaby] = useState<Record<string, Entry[]>>({})
  const [modalHour, setModalHour] = useState<number | null>(null)
  const [modalBabyId, setModalBabyId] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]

  const fetchEntries = useCallback(async (babyId: string) => {
    const res = await fetch(`/api/entries?babyId=${babyId}&date=${today}`)
    if (res.ok) {
      const data = await res.json()
      setEntriesByBaby((prev) => ({ ...prev, [babyId]: data }))
    }
  }, [today])

  useEffect(() => {
    babies.forEach((baby) => fetchEntries(baby.id))
  }, [babies, fetchEntries])

  const handleAddEntry = (babyId: string, hour: number) => {
    setModalBabyId(babyId)
    setModalHour(hour)
  }

  const handleSaveEntry = async (entry: {
    babyId: string
    type: 'FEEDING' | 'CHANGING' | 'NAP' | 'SLEEP' | 'MEDICINE'
    occurredAt: string
    amount?: number | null
    unit?: 'ML' | 'OZ' | null
    notes?: string | null
  }) => {
    const res = await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    })
    if (!res.ok) throw new Error('Failed to save')
    await fetchEntries(entry.babyId)
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const activeBabies = selectedBabyId === 'all' ? babies : babies.filter((b) => b.id === selectedBabyId)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Baby Tracker</h1>
        <div className="flex items-center gap-2">
          <Link href="/babies" className="text-sm text-gray-600 hover:text-gray-900">
            Babies
          </Link>
          <button onClick={handleSignOut} className="text-sm text-gray-600 hover:text-gray-900">
            Sign out
          </button>
        </div>
      </header>

      {/* Baby tabs */}
      {babies.length > 0 && (
        <div className="bg-white border-b border-gray-200 px-4 flex gap-1 overflow-x-auto">
          {babies.map((baby) => (
            <button
              key={baby.id}
              onClick={() => setSelectedBabyId(baby.id)}
              className={`py-3 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                selectedBabyId === baby.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {baby.name}
            </button>
          ))}
          {babies.length > 1 && (
            <button
              onClick={() => setSelectedBabyId('all')}
              className={`py-3 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                selectedBabyId === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Both
            </button>
          )}
        </div>
      )}

      {/* No babies state */}
      {babies.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <p className="text-gray-500">No babies yet. Add your first baby to get started.</p>
          <Link
            href="/babies"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Add Baby
          </Link>
        </div>
      )}

      {/* Timeline(s) */}
      {babies.length > 0 && (
        <main className={`${selectedBabyId === 'all' && babies.length > 1 ? 'flex' : ''}`}>
          {activeBabies.map((baby) => (
            <div key={baby.id} className={selectedBabyId === 'all' && babies.length > 1 ? 'flex-1 min-w-0' : ''}>
              {selectedBabyId === 'all' && babies.length > 1 && (
                <div className="px-4 py-2 bg-gray-100 text-sm font-medium text-gray-700 sticky top-0">
                  {baby.name}
                </div>
              )}
              <Timeline
                entries={entriesByBaby[baby.id] ?? []}
                onAddEntry={(hour) => handleAddEntry(baby.id, hour)}
              />
            </div>
          ))}
        </main>
      )}

      {/* Add Entry Modal */}
      {modalHour !== null && modalBabyId && (
        <AddEntryModal
          babyId={modalBabyId}
          defaultHour={modalHour}
          onClose={() => { setModalHour(null); setModalBabyId(null) }}
          onSave={handleSaveEntry}
        />
      )}
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add app/\(dashboard\)/
git commit -m "feat: add dashboard with timeline and baby tabs"
```

---

## Phase 6: Baby Management UI

### Task 14: Babies Management Page

**Files:**
- Create: `app/(dashboard)/babies/page.tsx`

**Step 1: Create the page**

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Baby {
  id: string
  name: string
  birthDate: string | null
  createdAt: string
}

export default function BabiesPage() {
  const router = useRouter()
  const [babies, setBabies] = useState<Baby[]>([])
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchBabies = async () => {
    const res = await fetch('/api/babies')
    if (res.ok) {
      const data = await res.json()
      setBabies(data)
    }
  }

  useEffect(() => { fetchBabies() }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/babies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, birthDate: birthDate || null }),
    })

    if (res.ok) {
      setName('')
      setBirthDate('')
      await fetchBabies()
    } else {
      setError('Failed to add baby')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-gray-500 hover:text-gray-700 text-sm">← Back</Link>
        <h1 className="text-lg font-bold text-gray-900">Babies</h1>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-6">
        {/* Add baby form */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Add Baby</h2>
          <form onSubmit={handleAdd} className="space-y-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Baby's name"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-600"
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Baby'}
            </button>
          </form>
        </div>

        {/* Baby list */}
        {babies.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
            {babies.map((baby) => (
              <div key={baby.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{baby.name}</p>
                  {baby.birthDate && (
                    <p className="text-xs text-gray-500">
                      Born {new Date(baby.birthDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <Link
                  href={`/babies/${baby.id}/share`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Share
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add app/\(dashboard\)/babies/
git commit -m "feat: add babies management page"
```

---

## Phase 7: Sharing

### Task 15: Share API Route

**Files:**
- Create: `app/api/share/route.ts`

**Step 1: Create app/api/share/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const InviteSchema = z.object({
  babyId: z.string().cuid(),
  email: z.string().email(),
})

const LinkSchema = z.object({
  babyId: z.string().cuid(),
})

// POST /api/share - invite by email or generate link
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { type } = body

  if (type === 'link') {
    try {
      const { babyId } = LinkSchema.parse(body)

      // Verify ownership
      const access = await prisma.babyUser.findFirst({
        where: { userId: session.user.id, babyId, role: 'OWNER' },
      })
      if (!access) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const share = await prisma.sharedAccess.create({
        data: { babyId, role: 'VIEWER' },
      })

      const url = `${process.env.NEXT_PUBLIC_APP_URL}/shared/${share.token}`
      return NextResponse.json({ token: share.token, url }, { status: 201 })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
      }
      return NextResponse.json({ error: 'Failed to generate link' }, { status: 500 })
    }
  }

  if (type === 'invite') {
    try {
      const { babyId, email } = InviteSchema.parse(body)

      const access = await prisma.babyUser.findFirst({
        where: { userId: session.user.id, babyId, role: 'OWNER' },
      })
      if (!access) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const invitee = await prisma.user.findUnique({ where: { email } })
      if (!invitee) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      const share = await prisma.sharedAccess.upsert({
        where: { token: `${babyId}-${invitee.id}` },
        update: { role: 'EDITOR' },
        create: {
          babyId,
          userId: invitee.id,
          role: 'EDITOR',
          token: `invite-${babyId}-${invitee.id}`,
        },
      })

      // Also add to BabyUser so they can access
      await prisma.babyUser.upsert({
        where: { userId_babyId: { userId: invitee.id, babyId } },
        update: { role: 'EDITOR' },
        create: { userId: invitee.id, babyId, role: 'EDITOR' },
      })

      return NextResponse.json(share, { status: 201 })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
      }
      console.error('Error inviting user:', error instanceof Error ? error.message : 'Unknown error')
      return NextResponse.json({ error: 'Failed to invite user' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}

// GET /api/share?babyId=xxx - list shares for a baby
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

// DELETE /api/share?id=xxx - revoke a share
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

  const access = await prisma.babyUser.findFirst({
    where: { userId: session.user.id, babyId: share.babyId, role: 'OWNER' },
  })
  if (!access) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.sharedAccess.delete({ where: { id: shareId } })
  return NextResponse.json({ success: true })
}
```

**Step 2: Commit**

```bash
git add app/api/share/
git commit -m "feat: add share API (invite by email, generate link, revoke)"
```

---

### Task 16: Share Management Page

**Files:**
- Create: `app/(dashboard)/babies/[babyId]/share/page.tsx`

**Step 1: Create the share page**

```typescript
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Share {
  id: string
  role: string
  token: string
  user: { email: string; name: string | null } | null
}

export default function SharePage({ params }: { params: { babyId: string } }) {
  const { babyId } = params
  const [shares, setShares] = useState<Share[]>([])
  const [email, setEmail] = useState('')
  const [shareLink, setShareLink] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchShares = async () => {
    const res = await fetch(`/api/share?babyId=${babyId}`)
    if (res.ok) setShares(await res.json())
  }

  useEffect(() => { fetchShares() }, [babyId])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    const res = await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'invite', babyId, email }),
    })
    if (res.ok) {
      setSuccess(`Invited ${email} as editor`)
      setEmail('')
      await fetchShares()
    } else {
      const data = await res.json()
      setError(data.error ?? 'Failed to invite')
    }
    setLoading(false)
  }

  const handleGenerateLink = async () => {
    setLoading(true)
    const res = await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'link', babyId }),
    })
    if (res.ok) {
      const data = await res.json()
      setShareLink(data.url)
      await fetchShares()
    }
    setLoading(false)
  }

  const handleRevoke = async (id: string) => {
    await fetch(`/api/share?id=${id}`, { method: 'DELETE' })
    await fetchShares()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link href="/babies" className="text-gray-500 hover:text-gray-700 text-sm">← Back</Link>
        <h1 className="text-lg font-bold text-gray-900">Share Access</h1>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-6">
        {/* Invite by email */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Invite by Email (Editor Access)</h2>
          <form onSubmit={handleInvite} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="their@email.com"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            {success && <p className="text-green-600 text-sm">{success}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              Send Invite
            </button>
          </form>
        </div>

        {/* Read-only link */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">View-Only Link</h2>
          {shareLink ? (
            <div className="space-y-2">
              <input
                readOnly
                value={shareLink}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600"
              />
              <button
                onClick={() => navigator.clipboard.writeText(shareLink)}
                className="text-sm text-blue-600 hover:underline"
              >
                Copy link
              </button>
            </div>
          ) : (
            <button
              onClick={handleGenerateLink}
              disabled={loading}
              className="w-full border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              Generate view-only link
            </button>
          )}
        </div>

        {/* Current shares */}
        {shares.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
            <div className="px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-700">Active Shares</h2>
            </div>
            {shares.map((share) => (
              <div key={share.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-900">
                    {share.user ? (share.user.name ?? share.user.email) : 'View-only link'}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{share.role.toLowerCase()}</p>
                </div>
                <button
                  onClick={() => handleRevoke(share.id)}
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add app/\(dashboard\)/babies/
git commit -m "feat: add share management page"
```

---

## Phase 8: History Page

### Task 17: History Page

**Files:**
- Create: `app/(dashboard)/history/page.tsx`

**Step 1: Create the history page**

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Timeline } from '@/components/Timeline'

interface Baby {
  id: string
  name: string
}

interface Entry {
  id: string
  type: 'FEEDING' | 'CHANGING' | 'NAP' | 'SLEEP' | 'MEDICINE'
  occurredAt: string
  amount: number | null
  unit: 'ML' | 'OZ' | null
  notes: string | null
}

export default function HistoryPage() {
  const [babies, setBabies] = useState<Baby[]>([])
  const [selectedBabyId, setSelectedBabyId] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [entries, setEntries] = useState<Entry[]>([])

  useEffect(() => {
    fetch('/api/babies')
      .then((r) => r.json())
      .then((data: Baby[]) => {
        setBabies(data)
        if (data[0]) setSelectedBabyId(data[0].id)
      })
  }, [])

  const fetchEntries = useCallback(async () => {
    if (!selectedBabyId) return
    const res = await fetch(`/api/entries?babyId=${selectedBabyId}&date=${selectedDate}`)
    if (res.ok) setEntries(await res.json())
  }, [selectedBabyId, selectedDate])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-gray-500 hover:text-gray-700 text-sm">← Back</Link>
        <h1 className="text-lg font-bold text-gray-900">History</h1>
      </header>

      <div className="bg-white border-b border-gray-100 px-4 py-3 flex flex-wrap gap-3 items-center">
        <select
          value={selectedBabyId}
          onChange={(e) => setSelectedBabyId(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        >
          {babies.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        />
      </div>

      <main>
        <Timeline entries={entries} onAddEntry={() => {}} />
      </main>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add app/\(dashboard\)/history/
git commit -m "feat: add history page with date picker"
```

---

## Phase 9: Final Polish

### Task 18: Update Root Layout & Global Styles

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

**Step 1: Update app/layout.tsx**

```typescript
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Baby Tracker',
  description: 'Track feeding, sleep, and more for your baby',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
```

**Step 2: Ensure globals.css has Tailwind imports**

```css
@import "tailwindcss";
```

**Step 3: Run full test suite**

```bash
npx jest --coverage
```
Expected: all tests passing, coverage reported.

**Step 4: Build check**

```bash
npm run build
```
Expected: successful build.

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: finalize layout and run full test suite"
```

---

## Summary

| Phase | Tasks | What Gets Built |
|-------|-------|-----------------|
| 1 | 1-5 | Deps, Jest, Prisma, better-auth |
| 2 | 6-8 | Login, Register, Middleware |
| 3 | 9 | Babies CRUD API |
| 4 | 10 | Entries API |
| 5 | 11-13 | Timeline, Modal, Dashboard |
| 6 | 14 | Babies management page |
| 7 | 15-16 | Share API + Share page |
| 8 | 17 | History page |
| 9 | 18 | Polish + build |

**After completion:** Use `superpowers:finishing-a-development-branch` to merge.
