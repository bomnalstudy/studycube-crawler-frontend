import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { cost, impressions, clicks } = body

    if (cost === undefined || impressions === undefined || clicks === undefined) {
      return NextResponse.json(
        { success: false, error: 'cost, impressions, clicks가 필요합니다' },
        { status: 400 }
      )
    }

    // 캠페인 메트릭 업데이트
    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        cost,
        impressions,
        clicks
      }
    })

    return NextResponse.json({
      success: true,
      data: campaign
    })
  } catch (error) {
    console.error('Failed to update campaign metrics:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update campaign metrics'
      },
      { status: 500 }
    )
  }
}
