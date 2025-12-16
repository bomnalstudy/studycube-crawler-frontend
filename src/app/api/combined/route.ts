import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { checkAdminApi, isErrorResponse } from '@/lib/auth-helpers'

// 통합분석 목록 조회 (어드민 전용)
export async function GET(request: NextRequest) {
  try {
    // 어드민 권한 체크
    const authResult = await checkAdminApi()
    if (isErrorResponse(authResult)) return authResult

    const searchParams = request.nextUrl.searchParams
    const branchId = searchParams.get('branchId')

    const combined = await prisma.combinedAnalysis.findMany({
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

    const combinedWithAnalysis = await Promise.all(
      combined.map(async (item) => {
        try {
          // 통합분석에 연결된 지점 ID 목록
          const combinedBranchIds = item.branches.map(cb => cb.branchId)

          const afterMetrics = await prisma.dailyMetric.findMany({
            where: {
              branchId: combinedBranchIds.length > 0 ? { in: combinedBranchIds } : undefined,
              date: { gte: item.startDate, lte: item.endDate }
            }
          })

          const days = Math.ceil((item.endDate.getTime() - item.startDate.getTime()) / (1000 * 60 * 60 * 24))
          const beforeStartDate = new Date(item.startDate)
          beforeStartDate.setDate(beforeStartDate.getDate() - days)
          const beforeEndDate = new Date(item.startDate)
          beforeEndDate.setDate(beforeEndDate.getDate() - 1)

          const beforeMetrics = await prisma.dailyMetric.findMany({
            where: {
              branchId: combinedBranchIds.length > 0 ? { in: combinedBranchIds } : undefined,
              date: { gte: beforeStartDate, lte: beforeEndDate }
            }
          })

          const afterRevenue = afterMetrics.reduce((sum, m) => sum + Number(m.totalRevenue || 0), 0)
          const beforeRevenue = beforeMetrics.reduce((sum, m) => sum + Number(m.totalRevenue || 0), 0)
          const afterNewUsers = afterMetrics.reduce((sum, m) => sum + (m.newUsers || 0), 0)
          const beforeNewUsers = beforeMetrics.reduce((sum, m) => sum + (m.newUsers || 0), 0)

          const analysis = {
            changes: {
              revenueGrowth: beforeRevenue > 0 ? ((afterRevenue - beforeRevenue) / beforeRevenue) * 100 : 0,
              newUsersGrowth: beforeNewUsers > 0 ? ((afterNewUsers - beforeNewUsers) / beforeNewUsers) * 100 : 0
            }
          }

          return { ...item, analysis }
        } catch (error) {
          return item
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: combinedWithAnalysis
    })
  } catch (error) {
    console.error('Failed to fetch combined:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch combined' },
      { status: 500 }
    )
  }
}

// 통합분석 저장 (어드민 전용)
export async function POST(request: NextRequest) {
  try {
    // 어드민 권한 체크
    const authResult = await checkAdminApi()
    if (isErrorResponse(authResult)) return authResult

    const body = await request.json()
    const { name, branchIds, startDate, endDate, cost, impressions, clicks, strategyType, reason, description } = body

    const combined = await prisma.combinedAnalysis.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        cost,
        impressions,
        clicks,
        strategyType,
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
      const combinedDir = join(process.cwd(), 'combined')

      // 각 지점별 폴더에 저장
      for (const combinedBranch of combined.branches) {
        const branchName = combinedBranch.branch.name
        const branchDir = join(combinedDir, branchName)

        // 폴더 생성 (이미 존재하면 무시)
        await mkdir(branchDir, { recursive: true })

        // 통합분석 데이터 JSON 파일로 저장
        const fileName = `${name.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_${Date.now()}.json`
        const filePath = join(branchDir, fileName)

        const combinedData = {
          ...body,
          combined,
          savedAt: new Date().toISOString()
        }

        await writeFile(filePath, JSON.stringify(combinedData, null, 2), 'utf-8')
      }
    } catch (fsError) {
      console.error('Failed to save combined file:', fsError)
      // 파일 저장 실패해도 DB 저장은 성공했으므로 경고만 출력
    }

    return NextResponse.json({
      success: true,
      data: combined
    })
  } catch (error) {
    console.error('Failed to save combined:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save combined' },
      { status: 500 }
    )
  }
}

// 통합분석 수정 (어드민 전용)
export async function PATCH(request: NextRequest) {
  try {
    // 어드민 권한 체크
    const authResult = await checkAdminApi()
    if (isErrorResponse(authResult)) return authResult

    const body = await request.json()
    const { id, name, branchIds, startDate, endDate, cost, impressions, clicks, strategyType, reason, description } = body

    // 기존 지점 연결 삭제 후 새로 생성
    const combined = await prisma.combinedAnalysis.update({
      where: { id },
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        cost,
        impressions,
        clicks,
        strategyType,
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
      data: combined
    })
  } catch (error) {
    console.error('Failed to update combined:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update combined' },
      { status: 500 }
    )
  }
}

// 통합분석 삭제 (어드민 전용)
export async function DELETE(request: NextRequest) {
  try {
    // 어드민 권한 체크
    const authResult = await checkAdminApi()
    if (isErrorResponse(authResult)) return authResult

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Combined analysis ID is required' },
        { status: 400 }
      )
    }

    // 통합분석 삭제 (CASCADE로 CombinedBranch도 자동 삭제됨)
    await prisma.combinedAnalysis.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Combined analysis deleted successfully'
    })
  } catch (error) {
    console.error('Failed to delete combined:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete combined' },
      { status: 500 }
    )
  }
}
