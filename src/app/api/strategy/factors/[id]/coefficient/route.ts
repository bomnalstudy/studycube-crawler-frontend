import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import {
  calculateSeasonalityCoefficient,
  checkBranchDataSufficiency,
} from '@/lib/strategy/seasonality-calculator'
import { saveSeasonalityCoefficient, getSeasonalityCoefficientByFactor } from '@/lib/db/seasonality'
import { CalculateCoefficientRequest, SeasonalityCoefficient } from '@/types/strategy'

/**
 * GET /api/strategy/factors/[id]/coefficient
 * 외부 요인의 저장된 시즌성 계수 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const { id: factorId } = await params
  const { searchParams } = new URL(request.url)
  const branchId = searchParams.get('branchId')

  try {
    const coefficient = await getSeasonalityCoefficientByFactor(factorId, branchId)

    if (!coefficient) {
      return NextResponse.json({
        success: true,
        data: null,
        message: '저장된 계수가 없습니다. 계산을 실행해주세요.',
      })
    }

    return NextResponse.json({
      success: true,
      data: coefficient,
    })
  } catch (error) {
    console.error('계수 조회 실패:', error)
    return NextResponse.json(
      { success: false, error: '계수 조회에 실패했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/strategy/factors/[id]/coefficient
 * 시즌성 계수 계산 및 저장
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const { id: factorId } = await params

  try {
    const body = (await request.json()) as CalculateCoefficientRequest
    const { branchIds, forceRecalculate } = body

    // 외부 요인 존재 확인
    const factor = await prisma.externalFactor.findUnique({
      where: { id: factorId },
      include: {
        branches: {
          select: { branchId: true },
        },
      },
    })

    if (!factor) {
      return NextResponse.json(
        { success: false, error: '외부 요인을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const results: SeasonalityCoefficient[] = []

    // 1. 전체 매장 기준 계수 계산
    if (!branchIds || branchIds.length === 0) {
      // 기존 계수 확인
      const existing = await getSeasonalityCoefficientByFactor(factorId, null)

      if (existing && !forceRecalculate) {
        results.push(existing)
      } else {
        const calcResult = await calculateSeasonalityCoefficient(factorId, null)
        const saved = await saveSeasonalityCoefficient(calcResult)
        results.push(saved)
      }
    }

    // 2. 지점별 계수 계산
    if (branchIds && branchIds.length > 0) {
      for (const branchId of branchIds) {
        // 기존 계수 확인
        const existing = await getSeasonalityCoefficientByFactor(factorId, branchId)

        if (existing && !forceRecalculate) {
          results.push(existing)
        } else {
          // 데이터 충분성 확인
          const sufficiency = await checkBranchDataSufficiency(branchId)

          if (sufficiency.hasEnoughData) {
            // 개별 매장 기준 계산
            const calcResult = await calculateSeasonalityCoefficient(factorId, branchId)
            const saved = await saveSeasonalityCoefficient(calcResult)
            results.push(saved)
          } else {
            // 데이터 부족 → 전체 매장 기준 계수 사용
            const allBranchCoef = await getSeasonalityCoefficientByFactor(factorId, null)

            if (!allBranchCoef) {
              // 전체 기준도 없으면 계산
              const calcResult = await calculateSeasonalityCoefficient(factorId, null)
              const saved = await saveSeasonalityCoefficient(calcResult)
              results.push(saved)
            } else {
              results.push(allBranchCoef)
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        factorId,
        factorType: factor.type,
        factorName: factor.name,
        coefficients: results,
      },
    })
  } catch (error) {
    console.error('계수 계산 실패:', error)
    return NextResponse.json(
      { success: false, error: '계수 계산에 실패했습니다.' },
      { status: 500 }
    )
  }
}
