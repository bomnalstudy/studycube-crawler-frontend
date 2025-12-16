import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { checkAdminApi, isErrorResponse } from '@/lib/auth-helpers'

// 캠페인 목록 조회 (어드민 전용)
export async function GET(request: NextRequest) {
  try {
    // 어드민 권한 체크
    const authResult = await checkAdminApi()
    if (isErrorResponse(authResult)) return authResult

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

    // 각 캠페인의 분석 결과 계산
    const campaignsWithAnalysis = await Promise.all(
      campaigns.map(async (campaign) => {
        try {
          // 캠페인에 연결된 지점 ID 목록
          const campaignBranchIds = campaign.branches.map(cb => cb.branchId)

          // 캠페인 기간의 메트릭 조회
          const afterMetrics = await prisma.dailyMetric.findMany({
            where: {
              branchId: campaignBranchIds.length > 0 ? { in: campaignBranchIds } : undefined,
              date: {
                gte: campaign.startDate,
                lte: campaign.endDate
              }
            }
          })

          // 이전 기간 (같은 길이)
          const days = Math.ceil((campaign.endDate.getTime() - campaign.startDate.getTime()) / (1000 * 60 * 60 * 24))
          const beforeStartDate = new Date(campaign.startDate)
          beforeStartDate.setDate(beforeStartDate.getDate() - days)
          const beforeEndDate = new Date(campaign.startDate)
          beforeEndDate.setDate(beforeEndDate.getDate() - 1)

          const beforeMetrics = await prisma.dailyMetric.findMany({
            where: {
              branchId: campaignBranchIds.length > 0 ? { in: campaignBranchIds } : undefined,
              date: {
                gte: beforeStartDate,
                lte: beforeEndDate
              }
            }
          })

          // 변화율 계산
          const afterRevenue = afterMetrics.reduce((sum, m) => sum + Number(m.totalRevenue || 0), 0)
          const beforeRevenue = beforeMetrics.reduce((sum, m) => sum + Number(m.totalRevenue || 0), 0)
          const afterNewUsers = afterMetrics.reduce((sum, m) => sum + (m.newUsers || 0), 0)
          const beforeNewUsers = beforeMetrics.reduce((sum, m) => sum + (m.newUsers || 0), 0)
          const afterAvgUsers = afterMetrics.length > 0 ? afterMetrics.reduce((sum, m) => sum + (m.seatUsage || 0), 0) / afterMetrics.length : 0
          const beforeAvgUsers = beforeMetrics.length > 0 ? beforeMetrics.reduce((sum, m) => sum + (m.seatUsage || 0), 0) / beforeMetrics.length : 0

          const analysis = {
            changes: {
              revenueGrowth: beforeRevenue > 0 ? ((afterRevenue - beforeRevenue) / beforeRevenue) * 100 : 0,
              newUsersGrowth: beforeNewUsers > 0 ? ((afterNewUsers - beforeNewUsers) / beforeNewUsers) * 100 : 0,
              avgDailyUsersGrowth: beforeAvgUsers > 0 ? ((afterAvgUsers - beforeAvgUsers) / beforeAvgUsers) * 100 : 0,
              revisitRateGrowth: 0 // 재방문률 계산은 복잡하므로 일단 0으로
            }
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

// 캠페인 저장 (어드민 전용)
export async function POST(request: NextRequest) {
  try {
    // 어드민 권한 체크
    const authResult = await checkAdminApi()
    if (isErrorResponse(authResult)) return authResult

    const body = await request.json()
    const { name, branchIds, startDate, endDate, cost, impressions, clicks, analysis } = body

    // 데이터베이스에 저장 (트랜잭션)
    const campaign = await prisma.campaign.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        cost,
        impressions,
        clicks,
        branches: {
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

    // 파일 시스템에 지점별 폴더 생성 및 JSON 파일 저장
    try {
      const campaignsDir = join(process.cwd(), 'campaigns')

      // 각 지점별 폴더에 저장
      for (const campaignBranch of campaign.branches) {
        const branchName = campaignBranch.branch.name
        const branchDir = join(campaignsDir, branchName)

        // 폴더 생성 (이미 존재하면 무시)
        await mkdir(branchDir, { recursive: true })

        // 캠페인 데이터 JSON 파일로 저장
        const fileName = `${name.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_${Date.now()}.json`
        const filePath = join(branchDir, fileName)

        const campaignData = {
          ...body,
          campaign,
          savedAt: new Date().toISOString()
        }

        await writeFile(filePath, JSON.stringify(campaignData, null, 2), 'utf-8')
      }
    } catch (fsError) {
      console.error('Failed to save campaign file:', fsError)
      // 파일 저장 실패해도 DB 저장은 성공했으므로 경고만 출력
    }

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

// 캠페인 수정 (어드민 전용)
export async function PATCH(request: NextRequest) {
  try {
    // 어드민 권한 체크
    const authResult = await checkAdminApi()
    if (isErrorResponse(authResult)) return authResult

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

// 캠페인 삭제 (어드민 전용)
export async function DELETE(request: NextRequest) {
  try {
    // 어드민 권한 체크
    const authResult = await checkAdminApi()
    if (isErrorResponse(authResult)) return authResult

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Campaign ID is required' },
        { status: 400 }
      )
    }

    // 캠페인 삭제 (CASCADE로 CampaignBranch도 자동 삭제됨)
    await prisma.campaign.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Campaign deleted successfully'
    })
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
