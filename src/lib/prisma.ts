import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Vercel 환경변수에 channel_binding이 없을 경우 자동 추가
function getDatabaseUrl(): string | undefined {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL

  // URL이 없으면 undefined 반환 (Prisma가 기본 동작)
  if (!url) {
    return undefined
  }

  // 이미 channel_binding이 있으면 그대로 반환
  if (url.includes('channel_binding')) {
    return url
  }

  // channel_binding이 없으면 추가
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}channel_binding=require`
}

const databaseUrl = getDatabaseUrl()

export const prisma = globalForPrisma.prisma ?? new PrismaClient(
  databaseUrl ? {
    datasources: {
      db: {
        url: databaseUrl
      }
    }
  } : undefined
)

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
