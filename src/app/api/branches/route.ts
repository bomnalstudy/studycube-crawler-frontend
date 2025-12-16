import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession } from '@/lib/auth-helpers'

export async function GET() {
  try {
    // 인증 체크
    const session = await getAuthSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 지점 계정은 자신의 지점만 반환
    if (session.user.role === 'BRANCH') {
      const branch = await prisma.branch.findUnique({
        where: { id: session.user.branchId! },
        select: { id: true, name: true }
      })
      return NextResponse.json({
        success: true,
        data: branch ? [branch] : []
      })
    }

    // 어드민은 모든 지점 반환
    const branches = await prisma.branch.findMany({
      select: {
        id: true,
        name: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json({
      success: true,
      data: branches
    })
  } catch (error) {
    console.error('Failed to fetch branches:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch branches'
      },
      { status: 500 }
    )
  }
}
