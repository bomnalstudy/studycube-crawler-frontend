import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'

// 전략 목록 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const branchId = searchParams.get('branchId')

    const strategies = await prisma.strategy.findMany({
      where: branchId && branchId !== 'all' ? { branchId } : {},
      include: {
        branch: true // 지점 정보 포함
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // 각 전략의 분석 결과 계산
    const strategiesWithAnalysis = await Promise.all(
      strategies.map(async (strategy) => {
        try {
          // 전략 기간의 메트릭 조회
          const afterMetrics = await prisma.dailyMetric.findMany({
            where: {
              branchId: strategy.branchId === 'all' ? undefined : strategy.branchId,
              date: {
                gte: strategy.startDate,
                lte: strategy.endDate
              }
            }
          })

          // 이전 기간 (같은 길이)
          const days = Math.ceil((strategy.endDate.getTime() - strategy.startDate.getTime()) / (1000 * 60 * 60 * 24))
          const beforeStartDate = new Date(strategy.startDate)
          beforeStartDate.setDate(beforeStartDate.getDate() - days)
          const beforeEndDate = new Date(strategy.startDate)
          beforeEndDate.setDate(beforeEndDate.getDate() - 1)

          const beforeMetrics = await prisma.dailyMetric.findMany({
            where: {
              branchId: strategy.branchId === 'all' ? undefined : strategy.branchId,
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
            ...strategy,
            analysis
          }
        } catch (analysisError) {
          console.error('Failed to calculate analysis for strategy:', strategy.id, analysisError)
          return strategy
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: strategiesWithAnalysis
    })
  } catch (error) {
    console.error('Failed to fetch strategies:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch strategies'
      },
      { status: 500 }
    )
  }
}

// 전략 저장
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, branchId, startDate, endDate, type, reason, description, analysis } = body

    // 데이터베이스에 저장
    const strategy = await prisma.strategy.create({
      data: {
        branchId: branchId || 'all',
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        type,
        reason,
        description
      }
    })

    // 지점 정보 조회 (폴더명 생성용)
    let branchName = '전체지점'
    if (branchId && branchId !== 'all') {
      const branch = await prisma.branch.findUnique({
        where: { id: branchId }
      })
      if (branch) {
        branchName = branch.name
      }
    }

    // 파일 시스템에 지점별 폴더 생성 및 JSON 파일 저장
    try {
      const strategiesDir = join(process.cwd(), 'strategies')
      const branchDir = join(strategiesDir, branchName)

      // 폴더 생성 (이미 존재하면 무시)
      await mkdir(branchDir, { recursive: true })

      // 전략 데이터 JSON 파일로 저장
      const fileName = `${name.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_${Date.now()}.json`
      const filePath = join(branchDir, fileName)

      const strategyData = {
        ...body,
        strategy,
        savedAt: new Date().toISOString()
      }

      await writeFile(filePath, JSON.stringify(strategyData, null, 2), 'utf-8')
    } catch (fsError) {
      console.error('Failed to save strategy file:', fsError)
      // 파일 저장 실패해도 DB 저장은 성공했으므로 경고만 출력
    }

    return NextResponse.json({
      success: true,
      data: strategy
    })
  } catch (error) {
    console.error('Failed to save strategy:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save strategy'
      },
      { status: 500 }
    )
  }
}
