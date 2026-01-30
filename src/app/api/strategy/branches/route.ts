import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-helpers'
import type { BranchCharacteristics, BranchWithCharacteristics } from '@/types/strategy'

// GET: 지점 목록 및 특성 조회
export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const region = searchParams.get('region')
    const size = searchParams.get('size')
    const targetAudience = searchParams.get('targetAudience')

    // 필터 조건 구성
    const where: Record<string, unknown> = {}

    if (region) {
      where.region = region
    }

    if (size) {
      where.size = size
    }

    if (targetAudience) {
      where.targetAudience = targetAudience
    }

    const branches = await prisma.branch.findMany({
      where,
      select: {
        id: true,
        name: true,
        region: true,
        size: true,
        targetAudience: true,
        openedAt: true,
      },
      orderBy: { name: 'asc' },
    })

    const result: BranchWithCharacteristics[] = branches.map((branch) => {
      // 오픈 기간에 따른 성숙도 계산
      let maturity: BranchCharacteristics['maturity'] = undefined
      if (branch.openedAt) {
        const monthsOpen =
          (new Date().getTime() - branch.openedAt.getTime()) / (1000 * 60 * 60 * 24 * 30)
        if (monthsOpen < 12) {
          maturity = 'NEW'
        } else if (monthsOpen < 36) {
          maturity = 'STABLE'
        } else {
          maturity = 'MATURE'
        }
      }

      return {
        id: branch.id,
        name: branch.name,
        characteristics: {
          region: (branch.region as BranchCharacteristics['region']) ?? undefined,
          size: (branch.size as BranchCharacteristics['size']) ?? undefined,
          targetAudience: (branch.targetAudience as BranchCharacteristics['targetAudience']) ?? undefined,
          openedAt: branch.openedAt?.toISOString().split('T')[0],
          maturity,
        },
      }
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Failed to fetch branches:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch branches' },
      { status: 500 }
    )
  }
}

// PATCH: 지점 특성 업데이트
export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body: {
      branchId: string
      characteristics: Partial<BranchCharacteristics>
    } = await request.json()

    if (!body.branchId) {
      return NextResponse.json(
        { success: false, error: 'branchId is required' },
        { status: 400 }
      )
    }

    const branch = await prisma.branch.update({
      where: { id: body.branchId },
      data: {
        region: body.characteristics.region,
        size: body.characteristics.size,
        targetAudience: body.characteristics.targetAudience,
        openedAt: body.characteristics.openedAt
          ? new Date(body.characteristics.openedAt)
          : undefined,
      },
      select: {
        id: true,
        name: true,
        region: true,
        size: true,
        targetAudience: true,
        openedAt: true,
      },
    })

    return NextResponse.json({ success: true, data: branch })
  } catch (error) {
    console.error('Failed to update branch characteristics:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update branch characteristics' },
      { status: 500 }
    )
  }
}

// POST: 유사 지점 찾기 (대조군 비교용)
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body: {
      branchId: string
      excludeBranchIds?: string[]
    } = await request.json()

    if (!body.branchId) {
      return NextResponse.json(
        { success: false, error: 'branchId is required' },
        { status: 400 }
      )
    }

    // 기준 지점 조회
    const targetBranch = await prisma.branch.findUnique({
      where: { id: body.branchId },
      select: {
        id: true,
        name: true,
        region: true,
        size: true,
        targetAudience: true,
        openedAt: true,
      },
    })

    if (!targetBranch) {
      return NextResponse.json(
        { success: false, error: 'Branch not found' },
        { status: 404 }
      )
    }

    // 모든 지점 조회 (제외 목록 반영)
    const excludeIds = [body.branchId, ...(body.excludeBranchIds ?? [])]
    const allBranches = await prisma.branch.findMany({
      where: {
        id: { notIn: excludeIds },
      },
      select: {
        id: true,
        name: true,
        region: true,
        size: true,
        targetAudience: true,
        openedAt: true,
      },
    })

    // 유사도 점수 계산
    const scoredBranches = allBranches.map((branch) => {
      let score = 0

      // 지역 일치: +3점
      if (branch.region && branch.region === targetBranch.region) {
        score += 3
      }

      // 규모 일치: +3점
      if (branch.size && branch.size === targetBranch.size) {
        score += 3
      }

      // 타겟층 일치: +3점
      if (branch.targetAudience && branch.targetAudience === targetBranch.targetAudience) {
        score += 3
      }

      // 오픈 기간 유사: +1점 (같은 성숙도 단계)
      if (targetBranch.openedAt && branch.openedAt) {
        const targetMonths =
          (new Date().getTime() - targetBranch.openedAt.getTime()) / (1000 * 60 * 60 * 24 * 30)
        const branchMonths =
          (new Date().getTime() - branch.openedAt.getTime()) / (1000 * 60 * 60 * 24 * 30)

        const getMaturityStage = (months: number) => {
          if (months < 12) return 'NEW'
          if (months < 36) return 'STABLE'
          return 'MATURE'
        }

        if (getMaturityStage(targetMonths) === getMaturityStage(branchMonths)) {
          score += 1
        }
      }

      return {
        id: branch.id,
        name: branch.name,
        characteristics: {
          region: branch.region,
          size: branch.size,
          targetAudience: branch.targetAudience,
          openedAt: branch.openedAt?.toISOString().split('T')[0],
        },
        similarityScore: score,
        matchedCriteria: {
          region: branch.region === targetBranch.region,
          size: branch.size === targetBranch.size,
          targetAudience: branch.targetAudience === targetBranch.targetAudience,
        },
      }
    })

    // 점수순으로 정렬
    scoredBranches.sort((a, b) => b.similarityScore - a.similarityScore)

    return NextResponse.json({
      success: true,
      data: {
        targetBranch: {
          id: targetBranch.id,
          name: targetBranch.name,
          characteristics: {
            region: targetBranch.region,
            size: targetBranch.size,
            targetAudience: targetBranch.targetAudience,
            openedAt: targetBranch.openedAt?.toISOString().split('T')[0],
          },
        },
        similarBranches: scoredBranches,
      },
    })
  } catch (error) {
    console.error('Failed to find similar branches:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to find similar branches' },
      { status: 500 }
    )
  }
}
