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

    // 각 전략의 분석 결과 계산 (지점별 개별 분석)
    const strategiesWithAnalysis = await Promise.all(
      strategies.map(async (strategy) => {
        try {
          // 이전 기간 계산
          const days = Math.ceil((strategy.endDate.getTime() - strategy.startDate.getTime()) / (1000 * 60 * 60 * 24))
          const beforeStartDate = new Date(strategy.startDate)
          beforeStartDate.setDate(beforeStartDate.getDate() - days)
          const beforeEndDate = new Date(strategy.startDate)
          beforeEndDate.setDate(beforeEndDate.getDate() - 1)

          // 각 지점별 개별 분석 결과 계산
          const branchAnalyses = await Promise.all(
            strategy.branches.map(async (sb) => {
              const branchId = sb.branchId
              const branchName = sb.branch.name

              // 해당 지점의 전략 기간 메트릭
              const afterMetrics = await prisma.dailyMetric.findMany({
                where: {
                  branchId,
                  date: { gte: strategy.startDate, lte: strategy.endDate }
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

              // 재방문률은 DailyVisitor에서 계산 필요 - 현재는 0으로 처리
              const afterRevisitRate = 0
              const beforeRevisitRate = 0

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
                }
              }
            })
          )

          const analysis = {
            branchAnalyses
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

// 전략 저장 - 각 지점별로 개별 전략 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, branchIds, startDate, endDate, type, reason, description, analysis } = body

    // 각 지점별로 개별 전략 생성
    const strategies = await Promise.all(
      branchIds.map(async (branchId: string) => {
        // 해당 지점의 분석 결과만 추출
        const branchAnalysis = analysis?.branchAnalyses?.find(
          (ba: { branchId: string }) => ba.branchId === branchId
        )

        const strategy = await prisma.strategy.create({
          data: {
            name,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            type,
            reason,
            description,
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
          const strategiesDir = join(process.cwd(), 'strategies')
          const branchName = strategy.branches[0].branch.name
          const branchDir = join(strategiesDir, branchName)

          await mkdir(branchDir, { recursive: true })

          const fileName = `${name.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_${Date.now()}.json`
          const filePath = join(branchDir, fileName)

          const strategyData = {
            ...body,
            branchId,
            // 해당 지점의 분석 결과만 저장
            analysis: branchAnalysis ? {
              branchAnalyses: [branchAnalysis]
            } : null,
            strategy,
            savedAt: new Date().toISOString()
          }

          await writeFile(filePath, JSON.stringify(strategyData, null, 2), 'utf-8')
        } catch (fsError) {
          console.error('Failed to save strategy file:', fsError)
        }

        return strategy
      })
    )

    return NextResponse.json({
      success: true,
      data: strategies,
      message: `${strategies.length}개의 전략이 각 지점별로 저장되었습니다.`
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

// 전략 수정
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, branchIds, startDate, endDate, type, reason, description } = body

    // 기존 지점 연결 삭제 후 새로 생성
    const strategy = await prisma.strategy.update({
      where: { id },
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        type,
        reason,
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
      data: strategy
    })
  } catch (error) {
    console.error('Failed to update strategy:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update strategy'
      },
      { status: 500 }
    )
  }
}

// 전략 삭제 (전체 또는 특정 지점만)
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    const branchId = searchParams.get('branchId') // 특정 지점만 삭제할 경우

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Strategy ID is required' },
        { status: 400 }
      )
    }

    if (branchId) {
      // 특정 지점만 전략에서 제거
      const strategy = await prisma.strategy.findUnique({
        where: { id },
        include: { branches: true }
      })

      if (!strategy) {
        return NextResponse.json(
          { success: false, error: 'Strategy not found' },
          { status: 404 }
        )
      }

      // 해당 지점 연결만 삭제
      await prisma.strategyBranch.deleteMany({
        where: {
          strategyId: id,
          branchId: branchId
        }
      })

      // 남은 지점이 없으면 전략 자체도 삭제
      const remainingBranches = await prisma.strategyBranch.count({
        where: { strategyId: id }
      })

      if (remainingBranches === 0) {
        await prisma.strategy.delete({
          where: { id }
        })
        return NextResponse.json({
          success: true,
          message: 'Strategy deleted completely (no branches left)'
        })
      }

      return NextResponse.json({
        success: true,
        message: 'Branch removed from strategy'
      })
    } else {
      // 전략 전체 삭제 (CASCADE로 StrategyBranch도 자동 삭제됨)
      await prisma.strategy.delete({
        where: { id }
      })

      return NextResponse.json({
        success: true,
        message: 'Strategy deleted successfully'
      })
    }
  } catch (error) {
    console.error('Failed to delete strategy:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete strategy'
      },
      { status: 500 }
    )
  }
}
