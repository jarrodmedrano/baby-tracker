# Baby Tracker App - Design Document

Date: 2026-03-09

## Overview

A baby tracking app for parents of twins (or more). Log feeding, changing, nap, sleep, and medicine events per baby per day. Share access with other users. View babies side by side.

## Stack

- **Frontend:** Next.js 16 (App Router) + Tailwind CSS
- **Auth:** better-auth (email/password)
- **ORM:** Prisma
- **Database:** PostgreSQL via Neon
- **Hosting:** Vercel + Neon

## App Structure

```
app/
  (auth)/
    login/page.tsx
    register/page.tsx
  (dashboard)/
    page.tsx              ← today's timeline
    history/page.tsx      ← past days
    babies/page.tsx       ← manage babies
    share/page.tsx        ← manage sharing
  api/
    auth/[...all]/route.ts
    babies/route.ts
    entries/route.ts
    share/route.ts
```

## Data Model (Prisma)

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())

  babies       BabyUser[]
  sharedAccess SharedAccess[]
}

model Baby {
  id        String    @id @default(cuid())
  name      String
  birthDate DateTime?
  createdAt DateTime  @default(now())

  users    BabyUser[]
  entries  Entry[]
  shares   SharedAccess[]
}

model BabyUser {
  userId String
  babyId String
  role   Role   @default(OWNER)

  user User @relation(fields: [userId], references: [id])
  baby Baby @relation(fields: [babyId], references: [id])
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

  baby Baby @relation(fields: [babyId], references: [id])
}

model SharedAccess {
  id        String    @id @default(cuid())
  babyId    String
  userId    String?
  token     String    @unique @default(cuid())
  role      Role      @default(VIEWER)
  expiresAt DateTime?

  baby Baby  @relation(fields: [babyId], references: [id])
  user User? @relation(fields: [userId], references: [id])
}

enum EntryType { FEEDING CHANGING NAP SLEEP MEDICINE }
enum Unit      { ML OZ }
enum Role      { OWNER EDITOR VIEWER }
```

## Screens

### Login / Register
- Centered card, email + password
- Link between login and register

### Dashboard (today)
- Baby tabs: Baby 1 | Baby 2 | Both
- "Both" = two-column side-by-side layout
- 24-row timeline (one per hour), current hour highlighted
- Entry pills per row (e.g. `🍼 4oz`, `💤 Nap`)
- Tap row → Add Entry modal

### Add Entry Modal
- 5 type buttons: Feeding / Changing / Nap / Sleep / Medicine
- Feeding: amount input + ML/OZ dropdown
- Time: defaults to now, editable
- Optional notes
- Save / Cancel

### History
- Date picker at top
- Same timeline, read-only for past days
- Baby switcher

### Babies
- List with name + birthdate
- "+ Add Baby" button
- Share button per baby

### Share Modal
- Tab 1: Invite by email (EDITOR access)
- Tab 2: Copy read-only link (VIEWER token URL)
- List of current shares with revoke option

## Sharing Model

- **Email invite:** Creates a `SharedAccess` row with `userId` set. Grantee can view + edit.
- **Read-only link:** Creates a `SharedAccess` row with `userId = null`, unique `token`. Anyone with the URL can view.
- Roles: `OWNER > EDITOR > VIEWER`
