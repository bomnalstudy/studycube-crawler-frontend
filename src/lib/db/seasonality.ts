import { prisma } from '@/lib/prisma'
import {
  SeasonalityCoefficient,
  ExternalFactorType,
  ConfidenceLevel,
  CalculationSource,
  SegmentCoefficients,
} from '@/types/strategy'

/**
 * 시즌성 계수 DB 유틸리티
 */

/**
 * 시즌성 계수 저장 (upsert)
 * Prisma에서 nullable unique field로 upsert할 때는 findFirst + create/update 패턴 사용
 */
export async function saveSeasonalityCoefficient(
  data: Omit<SeasonalityCoefficient, 'id' | 'calculatedAt'>
): Promise<SeasonalityCoefficient> {
  // branchId가 null인 경우 Prisma upsert가 제대로 작동하지 않으므로 직접 처리
  // 중복 레코드가 있을 수 있으므로 모두 조회
  const existingRecords = await prisma.seasonalityCoefficient.findMany({
    where: {
      factorId: data.factorId,
      branchId: data.branchId ?? null,
    },
  })

  console.log(`[DB조회] factorId=${data.factorId}, 기존 레코드 수=${existingRecords.length}`)

  // 중복 레코드가 있으면 가장 최근 것만 남기고 삭제
  let existing = existingRecords[0]
  if (existingRecords.length > 1) {
    console.log(`[DB정리] 중복 레코드 ${existingRecords.length}개 발견, 정리 중...`)
    // calculatedAt 기준 정렬 (최신 먼저)
    const sorted = [...existingRecords].sort((a, b) =>
      b.calculatedAt.getTime() - a.calculatedAt.getTime()
    )
    existing = sorted[0] // 가장 최근 레코드를 사용
    const toDelete = sorted.slice(1) // 첫 번째(최신)를 제외한 나머지 삭제

    for (const record of toDelete) {
      await prisma.seasonalityCoefficient.delete({ where: { id: record.id } })
    }
    console.log(`[DB정리] ${toDelete.length}개 중복 레코드 삭제 완료`)
  }

  let result
  if (existing) {
    console.log(`[DB저장] 기존 계수 업데이트: factorId=${data.factorId}, 매출계수=${data.revenueCoefficient}`)
    result = await prisma.seasonalityCoefficient.update({
      where: { id: existing.id },
      data: {
        factorType: data.factorType,
        revenueCoefficient: data.revenueCoefficient,
        visitsCoefficient: data.visitsCoefficient,
        segmentCoefficients: data.segmentCoefficients as Record<string, number>,
        sampleCount: data.sampleCount,
        confidence: data.confidence,
        calculationSource: data.calculationSource,
        calculatedAt: new Date(),
      },
    })
    console.log(`[DB저장] 업데이트 완료: id=${result.id}, 저장된매출계수=${result.revenueCoefficient}`)
  } else {
    console.log(`[DB저장] 새 계수 생성: factorId=${data.factorId}, 매출계수=${data.revenueCoefficient}`)
    result = await prisma.seasonalityCoefficient.create({
      data: {
        factorId: data.factorId,
        branchId: data.branchId,
        factorType: data.factorType,
        revenueCoefficient: data.revenueCoefficient,
        visitsCoefficient: data.visitsCoefficient,
        segmentCoefficients: data.segmentCoefficients as Record<string, number>,
        sampleCount: data.sampleCount,
        confidence: data.confidence,
        calculationSource: data.calculationSource,
      },
    })
    console.log(`[DB저장] 생성 완료: id=${result.id}, 저장된매출계수=${result.revenueCoefficient}`)
  }

  return {
    id: result.id,
    factorId: result.factorId,
    branchId: result.branchId,
    factorType: result.factorType as ExternalFactorType,
    revenueCoefficient: Number(result.revenueCoefficient),
    visitsCoefficient: Number(result.visitsCoefficient),
    segmentCoefficients: result.segmentCoefficients as SegmentCoefficients,
    sampleCount: result.sampleCount,
    confidence: result.confidence as ConfidenceLevel,
    calculationSource: result.calculationSource as CalculationSource,
    calculatedAt: result.calculatedAt.toISOString(),
  }
}

/**
 * 특정 외부 요인의 계수 조회
 */
export async function getSeasonalityCoefficientByFactor(
  factorId: string,
  branchId?: string | null
): Promise<SeasonalityCoefficient | null> {
  // 매장별 계수가 있으면 우선, 없으면 전체 기준
  const coefficients = await prisma.seasonalityCoefficient.findMany({
    where: {
      factorId,
      OR: [
        { branchId: null },
        ...(branchId ? [{ branchId }] : []),
      ],
    },
    orderBy: {
      branchId: 'desc', // branchId가 있는 것(매장별)이 먼저
    },
  })

  if (coefficients.length === 0) {
    return null
  }

  // 매장별 계수 우선
  const target = branchId
    ? coefficients.find(c => c.branchId === branchId) || coefficients[0]
    : coefficients[0]

  return {
    id: target.id,
    factorId: target.factorId,
    branchId: target.branchId,
    factorType: target.factorType as ExternalFactorType,
    revenueCoefficient: Number(target.revenueCoefficient),
    visitsCoefficient: Number(target.visitsCoefficient),
    segmentCoefficients: target.segmentCoefficients as SegmentCoefficients,
    sampleCount: target.sampleCount,
    confidence: target.confidence as ConfidenceLevel,
    calculationSource: target.calculationSource as CalculationSource,
    calculatedAt: target.calculatedAt.toISOString(),
  }
}

/**
 * 외부 요인 목록에 계수 정보 포함하여 조회
 */
export async function getFactorsWithCoefficients(
  options?: {
    type?: ExternalFactorType
    branchId?: string
    startDate?: Date
    endDate?: Date
  }
): Promise<Array<{
  id: string
  type: ExternalFactorType
  name: string
  startDate: string
  endDate: string
  coefficient: SeasonalityCoefficient | null
}>> {
  const where: Record<string, unknown> = {}

  if (options?.type) {
    where.type = options.type
  }

  if (options?.branchId) {
    where.branches = { some: { branchId: options.branchId } }
  }

  if (options?.startDate && options?.endDate) {
    where.OR = [
      { startDate: { gte: options.startDate, lte: options.endDate } },
      { endDate: { gte: options.startDate, lte: options.endDate } },
      { startDate: { lte: options.startDate }, endDate: { gte: options.endDate } },
    ]
  }

  const factors = await prisma.externalFactor.findMany({
    where,
    include: {
      coefficients: {
        where: options?.branchId
          ? { OR: [{ branchId: null }, { branchId: options.branchId }] }
          : { branchId: null },
        orderBy: { branchId: 'desc' },
        take: 1,
      },
    },
    orderBy: { startDate: 'desc' },
  })

  return factors.map(f => ({
    id: f.id,
    type: f.type as ExternalFactorType,
    name: f.name,
    startDate: f.startDate.toISOString().split('T')[0],
    endDate: f.endDate.toISOString().split('T')[0],
    coefficient: f.coefficients[0]
      ? {
          id: f.coefficients[0].id,
          factorId: f.coefficients[0].factorId,
          branchId: f.coefficients[0].branchId,
          factorType: f.coefficients[0].factorType as ExternalFactorType,
          revenueCoefficient: Number(f.coefficients[0].revenueCoefficient),
          visitsCoefficient: Number(f.coefficients[0].visitsCoefficient),
          segmentCoefficients: f.coefficients[0].segmentCoefficients as SegmentCoefficients,
          sampleCount: f.coefficients[0].sampleCount,
          confidence: f.coefficients[0].confidence as ConfidenceLevel,
          calculationSource: f.coefficients[0].calculationSource as CalculationSource,
          calculatedAt: f.coefficients[0].calculatedAt.toISOString(),
        }
      : null,
  }))
}

/**
 * 특정 유형의 평균 계수 조회 (새 외부 요인 등록 시 예상값 표시용)
 */
export async function getAverageCoefficientByType(
  factorType: ExternalFactorType,
  branchId?: string | null
): Promise<{
  avgRevenueCoefficient: number
  avgVisitsCoefficient: number
  sampleCount: number
} | null> {
  const where: Record<string, unknown> = { factorType }

  if (branchId) {
    where.OR = [{ branchId: null }, { branchId }]
  } else {
    where.branchId = null
  }

  const coefficients = await prisma.seasonalityCoefficient.findMany({
    where,
    select: {
      revenueCoefficient: true,
      visitsCoefficient: true,
    },
  })

  if (coefficients.length === 0) {
    return null
  }

  const avgRevenue =
    coefficients.reduce((sum, c) => sum + Number(c.revenueCoefficient), 0) / coefficients.length
  const avgVisits =
    coefficients.reduce((sum, c) => sum + Number(c.visitsCoefficient), 0) / coefficients.length

  return {
    avgRevenueCoefficient: Math.round(avgRevenue * 10000) / 10000,
    avgVisitsCoefficient: Math.round(avgVisits * 10000) / 10000,
    sampleCount: coefficients.length,
  }
}
