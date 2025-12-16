import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { checkAdminApi, isErrorResponse } from '@/lib/auth-helpers'

// 전략 목록 조회 (어드민 전용)
export async function GET(request: NextRequest) {
  try {
    // 어드민 권한 체크
    const authResult = await checkAdminApi()
    if (isErrorResponse(authResult)) return authResult

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

    // 각 전략의 분석 결과 계산
    const strategiesWithAnalysis = await Promise.all(
      strategies.map(async (strategy) => {
        try {
          // 전략에 연결된 지점 ID 목록
          const strategyBranchIds = strategy.branches.map(sb => sb.branchId)

          // 전략 기간의 메트릭 조회
          const afterMetrics = await prisma.dailyMetric.findMany({
            where: {
              branchId: strategyBranchIds.length > 0 ? { in: strategyBranchIds } : undefined,
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
              branchId: strategyBranchIds.length > 0 ? { in: strategyBranchIds } : undefined,
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

// 전략 저장 (어드민 전용)
export async function POST(request: NextRequest) {
  try {
    // 어드민 권한 체크
    const authResult = await checkAdminApi()
    if (isErrorResponse(authResult)) return authResult

    const body = await request.json()
    const { name, branchIds, startDate, endDate, type, reason, description, analysis } = body

    // 데이터베이스에 저장 (트랜잭션)
    const strategy = await prisma.strategy.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        type,
        reason,
        description,
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
      const strategiesDir = join(process.cwd(), 'strategies')

      // 각 지점별 폴더에 저장
      for (const strategyBranch of strategy.branches) {
        const branchName = strategyBranch.branch.name
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
      }
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

// 전략 수정 (어드민 전용)
export async function PATCH(request: NextRequest) {
  try {
    // 어드민 권한 체크
    const authResult = await checkAdminApi()
    if (isErrorResponse(authResult)) return authResult

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

// 전략 삭제 (어드민 전용)
export async function DELETE(request: NextRequest) {
  try {
    // 어드민 권한 체크
    const authResult = await checkAdminApi()
    if (isErrorResponse(authResult)) return authResult

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Strategy ID is required' },
        { status: 400 }
      )
    }

    // 전략 삭제 (CASCADE로 StrategyBranch도 자동 삭제됨)
    await prisma.strategy.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Strategy deleted successfully'
    })
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
