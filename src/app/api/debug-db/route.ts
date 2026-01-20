import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // 간단한 쿼리로 DB 연결 테스트
    const branchCount = await prisma.branch.count()

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      branchCount
    })
  } catch (error) {
    console.error('Database connection error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorName: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
