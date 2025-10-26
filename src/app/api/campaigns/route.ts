import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 캠페인 목록 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const branchId = searchParams.get('branchId')

    const campaigns = await prisma.campaign.findMany({
      where: branchId && branchId !== 'all' ? { branchId } : {},
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      data: campaigns
    })
  } catch (error) {
    console.error('Failed to fetch campaigns:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch campaigns'
      },
      { status: 500 }
    )
  }
}

// 캠페인 저장
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, branchId, startDate, endDate, cost, impressions, clicks } = body

    const campaign = await prisma.campaign.create({
      data: {
        branchId: branchId || 'all',
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
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
    console.error('Failed to save campaign:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save campaign'
      },
      { status: 500 }
    )
  }
}
