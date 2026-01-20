import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Vercel 환경변수에 channel_binding이 없을 경우 자동 추가
function getDatabaseUrl() {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL
  if (!url) {
    throw new Error('Database URL not found')
  }

  // 이미 channel_binding이 있으면 그대로 반환
  if (url.includes('channel_binding')) {
    return url
  }

  // channel_binding이 없으면 추가
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}channel_binding=require`
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: getDatabaseUrl()
    }
  }
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
