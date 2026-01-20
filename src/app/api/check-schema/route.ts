import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // 모든 테이블의 컬럼 정보 조회
    const tables = [
      'daily_visitors',
      'daily_metrics',
      'ticket_revenue',
      'ticket_buyers',
      'branches',
      'users'
    ]

    const results: Record<string, any> = {}

    for (const tableName of tables) {
      try {
        const columns = await prisma.$queryRaw`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = ${tableName}
          ORDER BY ordinal_position
        `
        results[tableName] = columns
      } catch (error) {
        results[tableName] = { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }

    return NextResponse.json({
      success: true,
      schema: results
    })
  } catch (error) {
    console.error('Error querying database schema:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
