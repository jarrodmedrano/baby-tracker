/**
 * @jest-environment node
 */

jest.mock('@prisma/client', () => {
  const mockPrismaClient = jest.fn().mockImplementation(() => ({
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  }))
  return { PrismaClient: mockPrismaClient }
})

import { prisma } from '../db'

describe('prisma client', () => {
  it('exports a prisma instance', () => {
    expect(prisma).toBeDefined()
    expect(typeof prisma.$connect).toBe('function')
  })
})
