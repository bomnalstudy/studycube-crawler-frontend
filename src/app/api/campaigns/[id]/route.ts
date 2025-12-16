import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkAdminApi, isErrorResponse } from '@/lib/auth-helpers'

// 캠페인 상세 조회 (어드민 전용)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 어드민 권한 체크
    const authResult = await checkAdminApi()
    if (isErrorResponse(authResult)) return authResult

    const { id } = await params
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        branches: {
          include: {
            branch: true
          }
        }
      }
    })

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: campaign
    })
  } catch (error) {
    console.error('Failed to fetch campaign:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch campaign'
      },
      { status: 500 }
    )
  }
}
