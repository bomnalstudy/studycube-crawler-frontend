import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // ticket_buyers 테이블 구조 확인
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'ticket_buyers'
      ORDER BY ordinal_position
    `

    // 샘플 데이터 5개 조회
    const sampleData = await prisma.$queryRaw`
      SELECT * FROM ticket_buyers LIMIT 5
    `

    return NextResponse.json({
      success: true,
      columns,
      sampleData
    })
  } catch (error) {
    console.error('Error querying database:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
