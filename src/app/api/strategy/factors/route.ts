import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-helpers'
import type {
  CreateExternalFactorInput,
  ExternalFactorListItem,
  ExternalFactorType,
  ImpactEstimate,
  SeasonalityCoefficient,
  SegmentCoefficients,
  ConfidenceLevel,
  CalculationSource,
} from '@/types/strategy'

// 계수 포함 응답 타입
interface ExternalFactorWithCoefficient extends ExternalFactorListItem {
  coefficient?: SeasonalityCoefficient | null
}

// GET: 외부 요인 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type')
    const branchId = searchParams.get('branchId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const includeCoefficients = searchParams.get('includeCoefficients') === 'true'

    // 필터 조건 구성
    const where: Record<string, unknown> = {}

    if (type) {
      where.type = type
    }

    if (branchId) {
      where.branches = {
        some: { branchId },
      }
    }

    if (startDate && endDate) {
      where.OR = [
        {
          startDate: { gte: new Date(startDate), lte: new Date(endDate) },
        },
        {
          endDate: { gte: new Date(startDate), lte: new Date(endDate) },
        },
        {
          AND: [
            { startDate: { lte: new Date(startDate) } },
            { endDate: { gte: new Date(endDate) } },
          ],
        },
      ]
    }

    const factors = await prisma.externalFactor.findMany({
      where,
      include: {
        branches: {
          include: {
            branch: { select: { id: true, name: true } },
          },
        },
        ...(includeCoefficients && {
          coefficients: {
            where: branchId
              ? { OR: [{ branchId: null }, { branchId }] }
              : { branchId: null },
            orderBy: { branchId: 'desc' as const },
            take: 1,
          },
        }),
      },
      orderBy: { startDate: 'desc' },
    })

    const result: ExternalFactorWithCoefficient[] = factors.map((factor) => {
      const base: ExternalFactorListItem = {
        id: factor.id,
        type: factor.type as ExternalFactorType,
        name: factor.name,
        startDate: factor.startDate.toISOString().split('T')[0],
        endDate: factor.endDate.toISOString().split('T')[0],
        impactEstimate: factor.impactEstimate as ImpactEstimate | undefined,
        isRecurring: factor.isRecurring,
        branches: factor.branches.map((b) => ({
          id: b.branch.id,
          name: b.branch.name,
        })),
      }

      // 계수 포함 요청 시
      if (includeCoefficients && 'coefficients' in factor) {
        console.log(`[조회] factorId=${factor.id}, name=${factor.name}, coefficients count=${(factor.coefficients as unknown[])?.length}`)
        const coef = (factor.coefficients as Array<{
          id: string
          factorId: string
          branchId: string | null
          factorType: string
          revenueCoefficient: unknown
          visitsCoefficient: unknown
          segmentCoefficients: unknown
          sampleCount: number
          confidence: string
          calculationSource: string
          calculatedAt: Date
        }>)[0]

        return {
          ...base,
          coefficient: coef
            ? {
                id: coef.id,
                factorId: coef.factorId,
                branchId: coef.branchId,
                factorType: coef.factorType as ExternalFactorType,
                revenueCoefficient: Number(coef.revenueCoefficient),
                visitsCoefficient: Number(coef.visitsCoefficient),
                segmentCoefficients: coef.segmentCoefficients as SegmentCoefficients,
                sampleCount: coef.sampleCount,
                confidence: coef.confidence as ConfidenceLevel,
                calculationSource: coef.calculationSource as CalculationSource,
                calculatedAt: coef.calculatedAt.toISOString(),
              }
            : null,
        }
      }

      return base
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Failed to fetch external factors:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch external factors' },
      { status: 500 }
    )
  }
}

// POST: 외부 요인 생성
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body: CreateExternalFactorInput = await request.json()

    // 유효성 검사
    if (!body.type || !body.name || !body.startDate || !body.endDate || !body.branchIds?.length) {
      return NextResponse.json(
        { success: false, error: '필수 필드를 입력해주세요.' },
        { status: 400 }
      )
    }

    const factor = await prisma.externalFactor.create({
      data: {
        type: body.type,
        name: body.name,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        impactEstimate: body.impactEstimate,
        description: body.description,
        isRecurring: body.isRecurring ?? false,
        recurringRule: body.recurringRule ? JSON.parse(JSON.stringify(body.recurringRule)) : undefined,
        createdBy: session.user.id,
        branches: {
          create: body.branchIds.map((branchId) => ({
            branchId,
          })),
        },
      },
      include: {
        branches: {
          include: {
            branch: { select: { id: true, name: true } },
          },
        },
      },
    })

    return NextResponse.json({ success: true, data: factor })
  } catch (error) {
    console.error('Failed to create external factor:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create external factor' },
      { status: 500 }
    )
  }
}

// DELETE: 외부 요인 삭제
export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 })
    }

    await prisma.externalFactor.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete external factor:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete external factor' },
      { status: 500 }
    )
  }
}
