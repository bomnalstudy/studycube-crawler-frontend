import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'

// 캠페인 목록 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const branchId = searchParams.get('branchId')

    const campaigns = await prisma.campaign.findMany({
      where: branchId && branchId !== 'all'
        ? {
            branches: {
              some: { branchId }
            }
          }
        : {},
      include: {
        branches: {
          include: {
            branch: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // 각 캠페인의 분석 결과 계산 (지점별 개별 분석)
    const campaignsWithAnalysis = await Promise.all(
      campaigns.map(async (campaign) => {
        try {
          // 이전 기간 계산
          const days = Math.ceil((campaign.endDate.getTime() - campaign.startDate.getTime()) / (1000 * 60 * 60 * 24))
          const beforeStartDate = new Date(campaign.startDate)
          beforeStartDate.setDate(beforeStartDate.getDate() - days)
          const beforeEndDate = new Date(campaign.startDate)
          beforeEndDate.setDate(beforeEndDate.getDate() - 1)

          // 각 지점별 개별 분석 결과 계산
          const branchAnalyses = await Promise.all(
            campaign.branches.map(async (cb) => {
              const branchId = cb.branchId
              const branchName = cb.branch.name

              // 해당 지점의 캠페인 기간 메트릭
              const afterMetrics = await prisma.dailyMetric.findMany({
                where: {
                  branchId,
                  date: { gte: campaign.startDate, lte: campaign.endDate }
                }
              })

              // 해당 지점의 이전 기간 메트릭
              const beforeMetrics = await prisma.dailyMetric.findMany({
                where: {
                  branchId,
                  date: { gte: beforeStartDate, lte: beforeEndDate }
                }
              })

              // 지점별 변화율 계산
              const afterRevenue = afterMetrics.reduce((sum, m) => sum + Number(m.totalRevenue || 0), 0)
              const beforeRevenue = beforeMetrics.reduce((sum, m) => sum + Number(m.totalRevenue || 0), 0)
              const afterNewUsers = afterMetrics.reduce((sum, m) => sum + (m.newUsers || 0), 0)
              const beforeNewUsers = beforeMetrics.reduce((sum, m) => sum + (m.newUsers || 0), 0)
              const afterAvgUsers = afterMetrics.length > 0 ? afterMetrics.reduce((sum, m) => sum + (m.seatUsage || 0), 0) / afterMetrics.length : 0
              const beforeAvgUsers = beforeMetrics.length > 0 ? beforeMetrics.reduce((sum, m) => sum + (m.seatUsage || 0), 0) / beforeMetrics.length : 0

              // 재방문자 데이터
              const afterRevisit = afterMetrics.reduce((sum, m) => sum + (m.revisitCount2 || 0) + (m.revisitCount3 || 0) + (m.revisitCount4Plus || 0), 0)
              const beforeRevisit = beforeMetrics.reduce((sum, m) => sum + (m.revisitCount2 || 0) + (m.revisitCount3 || 0) + (m.revisitCount4Plus || 0), 0)
              const afterTotalUsers = afterMetrics.reduce((sum, m) => sum + (m.revisitCount1 || 0) + (m.revisitCount2 || 0) + (m.revisitCount3 || 0) + (m.revisitCount4Plus || 0), 0)
              const beforeTotalUsers = beforeMetrics.reduce((sum, m) => sum + (m.revisitCount1 || 0) + (m.revisitCount2 || 0) + (m.revisitCount3 || 0) + (m.revisitCount4Plus || 0), 0)
              const afterRevisitRate = afterTotalUsers > 0 ? (afterRevisit / afterTotalUsers) * 100 : 0
              const beforeRevisitRate = beforeTotalUsers > 0 ? (beforeRevisit / beforeTotalUsers) * 100 : 0

              // ROI, ROAS 계산
              const cost = Number(campaign.cost) || 0
              const revenueIncrease = afterRevenue - beforeRevenue
              const roi = cost > 0 ? ((revenueIncrease - cost) / cost) * 100 : 0
              const roas = cost > 0 ? (afterRevenue / cost) * 100 : 0

              return {
                branchId,
                branchName,
                beforeMetrics: {
                  revenue: beforeRevenue,
                  newUsers: beforeNewUsers,
                  avgDailyUsers: beforeAvgUsers,
                  revisitRate: beforeRevisitRate
                },
                afterMetrics: {
                  revenue: afterRevenue,
                  newUsers: afterNewUsers,
                  avgDailyUsers: afterAvgUsers,
                  revisitRate: afterRevisitRate
                },
                changes: {
                  revenueGrowth: beforeRevenue > 0 ? ((afterRevenue - beforeRevenue) / beforeRevenue) * 100 : 0,
                  newUsersGrowth: beforeNewUsers > 0 ? ((afterNewUsers - beforeNewUsers) / beforeNewUsers) * 100 : 0,
                  avgDailyUsersGrowth: beforeAvgUsers > 0 ? ((afterAvgUsers - beforeAvgUsers) / beforeAvgUsers) * 100 : 0,
                  revisitRateGrowth: beforeRevisitRate > 0 ? ((afterRevisitRate - beforeRevisitRate) / beforeRevisitRate) * 100 : 0
                },
                roi,
                roas
              }
            })
          )

          // 광고 지표 계산
          const impressions = campaign.impressions || 0
          const clicks = campaign.clicks || 0
          const cost = Number(campaign.cost) || 0
          const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
          const cpc = clicks > 0 ? cost / clicks : 0

          const analysis = {
            branchAnalyses,
            adMetrics: { ctr, cpc, cost, impressions, clicks }
          }

          return {
            ...campaign,
            analysis
          }
        } catch (analysisError) {
          console.error('Failed to calculate analysis for campaign:', campaign.id, analysisError)
          return campaign
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: campaignsWithAnalysis
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

// 캠페인 저장 - 각 지점별로 개별 캠페인 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, branchIds, startDate, endDate, cost, impressions, clicks, analysis } = body

    // 각 지점별로 개별 캠페인 생성
    const campaigns = await Promise.all(
      branchIds.map(async (branchId: string) => {
        // 해당 지점의 분석 결과만 추출
        const branchAnalysis = analysis?.branchAnalyses?.find(
          (ba: { branchId: string }) => ba.branchId === branchId
        )

        const campaign = await prisma.campaign.create({
          data: {
            name,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            cost,
            impressions,
            clicks,
            branches: {
              create: [{ branchId }]
            }
          },
          include: {
            branches: {
              include: {
                branch: true
              }
            }
          }
        })

        // 파일 시스템에 지점별 폴더 생성 및 JSON 파일 저장
        try {
          const campaignsDir = join(process.cwd(), 'campaigns')
          const branchName = campaign.branches[0].branch.name
          const branchDir = join(campaignsDir, branchName)

          await mkdir(branchDir, { recursive: true })

          const fileName = `${name.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_${Date.now()}.json`
          const filePath = join(branchDir, fileName)

          const campaignData = {
            ...body,
            branchId,
            // 해당 지점의 분석 결과만 저장
            analysis: branchAnalysis ? {
              branchAnalyses: [branchAnalysis],
              adMetrics: analysis?.adMetrics
            } : null,
            campaign,
            savedAt: new Date().toISOString()
          }

          await writeFile(filePath, JSON.stringify(campaignData, null, 2), 'utf-8')
        } catch (fsError) {
          console.error('Failed to save campaign file:', fsError)
        }

        return campaign
      })
    )

    return NextResponse.json({
      success: true,
      data: campaigns,
      message: `${campaigns.length}개의 캠페인이 각 지점별로 저장되었습니다.`
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

// 캠페인 수정
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, branchIds, startDate, endDate, cost, impressions, clicks, description } = body

    // 기존 지점 연결 삭제 후 새로 생성
    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        cost,
        impressions,
        clicks,
        description,
        branches: {
          deleteMany: {},
          create: branchIds.map((branchId: string) => ({
            branchId
          }))
        }
      },
      include: {
        branches: {
          include: {
            branch: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: campaign
    })
  } catch (error) {
    console.error('Failed to update campaign:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update campaign'
      },
      { status: 500 }
    )
  }
}

// 캠페인 삭제 (전체 또는 특정 지점만)
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    const branchId = searchParams.get('branchId') // 특정 지점만 삭제할 경우

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Campaign ID is required' },
        { status: 400 }
      )
    }

    if (branchId) {
      // 특정 지점만 캠페인에서 제거
      const campaign = await prisma.campaign.findUnique({
        where: { id },
        include: { branches: true }
      })

      if (!campaign) {
        return NextResponse.json(
          { success: false, error: 'Campaign not found' },
          { status: 404 }
        )
      }

      // 해당 지점 연결만 삭제
      await prisma.campaignBranch.deleteMany({
        where: {
          campaignId: id,
          branchId: branchId
        }
      })

      // 남은 지점이 없으면 캠페인 자체도 삭제
      const remainingBranches = await prisma.campaignBranch.count({
        where: { campaignId: id }
      })

      if (remainingBranches === 0) {
        await prisma.campaign.delete({
          where: { id }
        })
        return NextResponse.json({
          success: true,
          message: 'Campaign deleted completely (no branches left)'
        })
      }

      return NextResponse.json({
        success: true,
        message: 'Branch removed from campaign'
      })
    } else {
      // 캠페인 전체 삭제 (CASCADE로 CampaignBranch도 자동 삭제됨)
      await prisma.campaign.delete({
        where: { id }
      })

      return NextResponse.json({
        success: true,
        message: 'Campaign deleted successfully'
      })
    }
  } catch (error) {
    console.error('Failed to delete campaign:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete campaign'
      },
      { status: 500 }
    )
  }
}
