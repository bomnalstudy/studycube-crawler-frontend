import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 진행 중인 캠페인과 전략의 성과를 업데이트하는 크론 작업
export async function GET(request: NextRequest) {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 1. 진행 중인 캠페인 업데이트
    const ongoingCampaigns = await prisma.campaign.findMany({
      where: {
        status: 'ONGOING',
        startDate: { lte: today },
      }
    })

    for (const campaign of ongoingCampaigns) {
      // 종료일이 지났으면 상태를 COMPLETED로 변경
      if (campaign.endDate < today) {
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: { status: 'COMPLETED' }
        })
      }
      // 진행 중이면 최신 데이터로 분석 업데이트 (JSON 파일 갱신)
      // 실제 분석 결과는 GET 요청 시 동적으로 계산하므로 별도 작업 불필요
    }

    // 2. 진행 중인 전략 업데이트
    const ongoingStrategies = await prisma.strategy.findMany({
      where: {
        status: 'ONGOING',
        startDate: { lte: today },
      }
    })

    for (const strategy of ongoingStrategies) {
      // 종료일이 지났으면 상태를 COMPLETED로 변경
      if (strategy.endDate < today) {
        await prisma.strategy.update({
          where: { id: strategy.id },
          data: { status: 'COMPLETED' }
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Ongoing campaigns and strategies updated',
      updatedCampaigns: ongoingCampaigns.length,
      updatedStrategies: ongoingStrategies.length
    })
  } catch (error) {
    console.error('Failed to update ongoing items:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update ongoing items'
      },
      { status: 500 }
    )
  }
}
