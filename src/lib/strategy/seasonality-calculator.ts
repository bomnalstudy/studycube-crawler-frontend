import { prisma } from '@/lib/prisma'
import {
  ExternalFactorType,
  ConfidenceLevel,
  CalculationSource,
  SegmentCoefficients,
  SeasonalityCoefficient,
  MergedCoefficient,
} from '@/types/strategy'

/**
 * 시즌성 계수 자동 계산 시스템
 *
 * 공식: 계수 = 외부요인 기간 평균 / 비외부요인 기간 평균
 * - 1.0 = 변화없음
 * - 1.35 = 35% 증가
 * - 0.85 = 15% 감소
 */

// 방문 세그먼트 목록
const VISIT_SEGMENTS = ['VIP', '단골', '일반', '신규', '이탈위험', '이탈', '복귀'] as const

export interface SeasonalityCalculationResult {
  factorId: string
  branchId: string | null
  factorType: ExternalFactorType
  revenueCoefficient: number
  visitsCoefficient: number
  segmentCoefficients: SegmentCoefficients
  sampleCount: number
  confidence: ConfidenceLevel
  calculationSource: CalculationSource
}

export interface BranchDataSufficiency {
  hasEnoughData: boolean  // 1년 이상 데이터 보유 여부
  dataMonths: number      // 보유한 데이터 월 수
  oldestDate: Date | null // 가장 오래된 데이터 날짜
}

/**
 * 매장 데이터 충분성 확인
 * 1년 이상 데이터가 있으면 개별 매장 기준, 아니면 전체 매장 기준
 */
export async function checkBranchDataSufficiency(branchId: string): Promise<BranchDataSufficiency> {
  const oldestMetric = await prisma.dailyMetric.findFirst({
    where: { branchId },
    orderBy: { date: 'asc' },
    select: { date: true },
  })

  if (!oldestMetric) {
    return { hasEnoughData: false, dataMonths: 0, oldestDate: null }
  }

  const now = new Date()
  const oldestDate = oldestMetric.date
  const diffMs = now.getTime() - oldestDate.getTime()
  const diffMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30))

  return {
    hasEnoughData: diffMonths >= 12,
    dataMonths: diffMonths,
    oldestDate,
  }
}

/**
 * 개별 외부 요인의 기간들 조회
 * - 해당 외부 요인의 실제 기간 포함
 * - 반복 설정된 경우 과거 연도의 같은 월/일 기간 데이터도 포함
 */
async function getFactorPeriods(
  factorId: string
): Promise<{ periods: Array<{ startDate: Date; endDate: Date }>; factorName: string }> {
  // 해당 외부 요인 조회
  const factor = await prisma.externalFactor.findUnique({
    where: { id: factorId },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      isRecurring: true,
    },
  })

  if (!factor) {
    return { periods: [], factorName: '' }
  }

  const result: Array<{ startDate: Date; endDate: Date }> = []
  const now = new Date()

  // 종료된 기간만 포함 (현재 진행 중인 기간은 제외)
  if (factor.endDate < now) {
    result.push({
      startDate: factor.startDate,
      endDate: factor.endDate,
    })
  }

  // 반복 설정된 외부 요인: 과거 연도의 같은 월/일 기간 데이터도 생성
  if (factor.isRecurring) {
    const startMonth = factor.startDate.getMonth()
    const startDay = factor.startDate.getDate()
    const endMonth = factor.endDate.getMonth()
    const endDay = factor.endDate.getDate()
    const factorYear = factor.startDate.getFullYear()
    const currentYear = now.getFullYear()

    // 과거 5년간의 같은 기간 추가
    for (let year = factorYear - 1; year >= currentYear - 5 && year >= 2020; year--) {
      const pastStart = new Date(year, startMonth, startDay)
      const pastEnd = new Date(year, endMonth, endDay)

      // 현재보다 과거인 경우만
      if (pastEnd < now) {
        const alreadyExists = result.some(
          r => r.startDate.getTime() === pastStart.getTime() &&
               r.endDate.getTime() === pastEnd.getTime()
        )
        if (!alreadyExists) {
          result.push({
            startDate: pastStart,
            endDate: pastEnd,
          })
        }
      }
    }
  }

  return { periods: result, factorName: factor.name }
}

/**
 * 날짜를 로컬 타임존 기준 YYYY-MM-DD 문자열로 변환
 * (toISOString은 UTC 기준이라 한국시간에서 하루 밀릴 수 있음)
 */
function formatDateLocal(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 특정 기간의 모든 날짜 문자열 배열 생성 (로컬 타임존 기준)
 */
function getDateStringsInRange(start: Date, end: Date): string[] {
  const dates: string[] = []
  const current = new Date(start)

  while (current <= end) {
    dates.push(formatDateLocal(current))
    current.setDate(current.getDate() + 1)
  }

  return dates
}

/**
 * 각 매장의 오픈 월 조회 (지점 설정의 openedAt 사용)
 */
async function getBranchOpeningMonths(): Promise<Map<string, Date>> {
  const result = new Map<string, Date>()

  const branches = await prisma.branch.findMany({
    select: { id: true, openedAt: true },
  })

  for (const branch of branches) {
    if (branch.openedAt) {
      // openedAt이 있으면 해당 월의 첫째 날로 설정
      const openingMonth = new Date(branch.openedAt.getFullYear(), branch.openedAt.getMonth(), 1)
      result.set(branch.id, openingMonth)
    }
  }

  return result
}

/**
 * 신규 매장 ID 조회 (오픈 6개월 미만)
 * 신규 매장은 데이터가 불안정하므로 계수 계산에서 제외
 */
async function getNewBranchIds(): Promise<Set<string>> {
  const now = new Date()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())

  const branches = await prisma.branch.findMany({
    select: { id: true, name: true, openedAt: true },
  })

  const newBranchIds = new Set<string>()
  const newBranchNames: string[] = []

  for (const branch of branches) {
    if (branch.openedAt && branch.openedAt > sixMonthsAgo) {
      newBranchIds.add(branch.id)
      newBranchNames.push(branch.name)
    }
  }

  if (newBranchNames.length > 0) {
    console.log(`[계수계산] 신규 매장 제외 (오픈 6개월 미만): ${newBranchNames.join(', ')}`)
  }

  return newBranchIds
}

/**
 * 날짜가 오픈 월에 해당하는지 확인
 */
function isInOpeningMonth(date: Date, branchId: string, openingMonths: Map<string, Date>): boolean {
  const openingMonth = openingMonths.get(branchId)
  if (!openingMonth) return false

  return date.getFullYear() === openingMonth.getFullYear() &&
         date.getMonth() === openingMonth.getMonth()
}

/**
 * 매출 계수 계산 (매장별 계수의 평균)
 * 1. 각 매장별로 계수 계산 (외부요인 일평균 / 전체 일평균)
 * 2. 완전한 외부요인 기간 데이터가 있는 매장만 포함
 * 3. 각 매장 계수들의 평균 = 최종 계수
 *
 * 핵심: 각 외부요인 기간(연도별)마다 80% 이상 데이터가 있어야 유효한 기간으로 인정
 */
export async function calculateRevenueCoefficient(
  factorId: string
): Promise<{ coefficient: number; sampleCount: number; factorName: string }> {
  // 1. 각 매장의 오픈 월 조회
  const openingMonths = await getBranchOpeningMonths()

  // 1-1. 신규 매장 ID 조회 (오픈 6개월 미만 - 계수 계산에서 완전히 제외)
  const newBranchIds = await getNewBranchIds()

  // 2. 해당 외부 요인의 기간들 조회 (반복 설정 시 과거 동일 기간 포함)
  const { periods: pastPeriods, factorName } = await getFactorPeriods(factorId)

  if (pastPeriods.length === 0) {
    return { coefficient: 1.0, sampleCount: 0, factorName }
  }

  // 3. 각 외부요인 기간별 날짜 목록 생성 (기간 단위로 관리)
  const factorPeriods: Array<{ dates: Set<string>; expectedDays: number }> = []
  for (const period of pastPeriods) {
    const dates = getDateStringsInRange(period.startDate, period.endDate)
    factorPeriods.push({
      dates: new Set(dates),
      expectedDays: dates.length,
    })
  }

  // 4. 전체 매출 데이터 조회
  const allMetrics = await prisma.dailyMetric.findMany({
    select: { date: true, branchId: true, totalRevenue: true },
  })

  // 5. 오픈 월 제외한 데이터 필터링
  const validMetrics = allMetrics.filter(
    m => !isInOpeningMonth(m.date, m.branchId, openingMonths)
  )

  if (validMetrics.length === 0) {
    return { coefficient: 1.0, sampleCount: 0, factorName }
  }

  // 6. 매장별로 데이터 그룹화
  const branchMetrics = new Map<string, typeof validMetrics>()
  for (const m of validMetrics) {
    const existing = branchMetrics.get(m.branchId) || []
    existing.push(m)
    branchMetrics.set(m.branchId, existing)
  }

  // 6-1. 매장 이름 조회
  const branches = await prisma.branch.findMany({
    select: { id: true, name: true },
  })
  const branchNames = new Map(branches.map(b => [b.id, b.name]))

  // 7. 각 매장별 일평균 수집 (완전한 기간만 사용)
  const branchOverallAvgs: number[] = []  // A 계산용
  const branchFactorAvgs: number[] = []   // B 계산용
  const branchDetails: Array<{
    branchId: string
    branchName: string
    overallAvg: number
    factorAvg: number
    factorDays: number
    overallDays: number
    validPeriods: number
    excludedPeriods: number
  }> = []

  console.log(`[계수계산] 외부요인: ${factorName}`)
  console.log(`[계수계산] 외부요인 기간 수: ${factorPeriods.length}개`)
  console.log(`[계수계산] 전체 매장 수: ${branchMetrics.size}개, 신규 매장 제외: ${newBranchIds.size}개`)

  // 데이터 충분성 기준: 기간의 80% 이상 데이터가 있어야 유효
  const DATA_COVERAGE_THRESHOLD = 0.8

  for (const [branchId, metrics] of branchMetrics) {
    // 신규 매장(오픈 6개월 미만)은 계수 계산에서 제외
    if (newBranchIds.has(branchId)) {
      continue
    }
    // 매장의 전체 일평균
    const overallTotal = metrics.reduce((sum, m) => sum + Number(m.totalRevenue ?? 0), 0)
    const overallDays = metrics.length
    const overallDailyAvg = overallTotal / overallDays

    if (overallDailyAvg === 0) continue

    // 매장 데이터를 날짜 키로 변환
    const metricsDateMap = new Map<string, number>()
    for (const m of metrics) {
      const dateStr = formatDateLocal(m.date)
      metricsDateMap.set(dateStr, Number(m.totalRevenue ?? 0))
    }

    // 각 외부요인 기간별로 충분한 데이터가 있는지 확인
    let factorTotal = 0
    let factorDays = 0
    let validPeriods = 0
    let excludedPeriods = 0

    for (const period of factorPeriods) {
      // 이 기간에 매장이 가진 데이터 일수 계산
      let periodDays = 0
      let periodTotal = 0
      for (const dateStr of period.dates) {
        if (metricsDateMap.has(dateStr)) {
          periodDays++
          periodTotal += metricsDateMap.get(dateStr) || 0
        }
      }

      // 데이터 커버리지 확인 (80% 이상이어야 유효)
      const coverage = periodDays / period.expectedDays
      if (coverage >= DATA_COVERAGE_THRESHOLD) {
        factorTotal += periodTotal
        factorDays += periodDays
        validPeriods++
      } else {
        excludedPeriods++
      }
    }

    // 유효한 기간이 1개도 없으면 이 매장은 제외
    if (validPeriods === 0 || factorDays === 0) continue

    const factorDailyAvg = factorTotal / factorDays

    // 두 값 모두 수집 (같은 매장에서 나온 값이므로 쌍으로 추가)
    branchOverallAvgs.push(overallDailyAvg)
    branchFactorAvgs.push(factorDailyAvg)
    branchDetails.push({
      branchId,
      branchName: branchNames.get(branchId) || branchId,
      overallAvg: overallDailyAvg,
      factorAvg: factorDailyAvg,
      factorDays,
      overallDays,
      validPeriods,
      excludedPeriods,
    })
  }

  if (branchOverallAvgs.length === 0) {
    console.log('[매출계수] 유효한 매장이 없습니다')
    return { coefficient: 1.0, sampleCount: 0, factorName }
  }

  // 8. A = 각 매장 전체 일평균들의 평균
  const A = branchOverallAvgs.reduce((a, b) => a + b, 0) / branchOverallAvgs.length

  // 9. B = 각 매장 외부요인 기간 일평균들의 평균
  const B = branchFactorAvgs.reduce((a, b) => a + b, 0) / branchFactorAvgs.length

  // 10. 최종 계수 = B / A
  const coefficient = A > 0 ? B / A : 1.0

  // 디버깅 로그
  console.log(`[매출계수] =========================================`)
  console.log(`[매출계수] 유효 매장 수: ${branchOverallAvgs.length}개`)
  console.log(`[매출계수] 매장별 상세:`)
  for (const detail of branchDetails) {
    const branchCoef = detail.factorAvg / detail.overallAvg
    console.log(`  - ${detail.branchName}: 전체평균=${Math.round(detail.overallAvg).toLocaleString()}원(${detail.overallDays}일), 외부요인평균=${Math.round(detail.factorAvg).toLocaleString()}원(${detail.factorDays}일), 유효기간=${detail.validPeriods}개, 제외기간=${detail.excludedPeriods}개, 개별계수=${((branchCoef - 1) * 100).toFixed(1)}%`)
  }
  console.log(`[매출계수] A(전체평균들의 평균): ${Math.round(A).toLocaleString()}원`)
  console.log(`[매출계수] B(외부요인평균들의 평균): ${Math.round(B).toLocaleString()}원`)
  console.log(`[매출계수] 최종계수: ${coefficient.toFixed(4)} (${((coefficient - 1) * 100).toFixed(1)}%)`)
  console.log(`[매출계수] =========================================`)

  return {
    coefficient: Math.round(coefficient * 10000) / 10000,
    sampleCount: pastPeriods.length,
    factorName,
  }
}

/**
 * 방문 계수 계산 (매장별 계수의 평균)
 * 1. 각 매장별로 계수 계산 (외부요인 일평균 / 전체 일평균)
 * 2. 해당 기간에 데이터가 없는 매장은 제외
 * 3. 각 매장 계수들의 평균 = 최종 계수
 */
export async function calculateVisitsCoefficient(
  factorId: string
): Promise<{ coefficient: number; sampleCount: number }> {
  // 1. 각 매장의 오픈 월 조회
  const openingMonths = await getBranchOpeningMonths()

  // 1-1. 신규 매장 ID 조회 (오픈 6개월 미만 - 계수 계산에서 완전히 제외)
  const newBranchIds = await getNewBranchIds()

  // 2. 해당 외부 요인의 기간들 조회 (반복 설정 시 과거 동일 기간 포함)
  const { periods: pastPeriods } = await getFactorPeriods(factorId)

  if (pastPeriods.length === 0) {
    return { coefficient: 1.0, sampleCount: 0 }
  }

  // 3. 외부 요인 기간에 해당하는 모든 날짜 수집
  const factorDates = new Set<string>()
  for (const period of pastPeriods) {
    const dates = getDateStringsInRange(period.startDate, period.endDate)
    dates.forEach(d => factorDates.add(d))
  }

  // 4. 전체 방문 데이터 조회 (날짜별, 매장별)
  const allVisitors = await prisma.dailyVisitor.findMany({
    select: { visitDate: true, branchId: true },
  })

  // 5. 오픈 월 제외한 데이터 필터링
  const validVisitors = allVisitors.filter(
    v => !isInOpeningMonth(v.visitDate, v.branchId, openingMonths)
  )

  if (validVisitors.length === 0) {
    return { coefficient: 1.0, sampleCount: 0 }
  }

  // 6. 매장별, 날짜별 방문수 집계
  const branchDailyVisits = new Map<string, Map<string, number>>()
  for (const v of validVisitors) {
    const dateStr = formatDateLocal(v.visitDate)
    if (!branchDailyVisits.has(v.branchId)) {
      branchDailyVisits.set(v.branchId, new Map())
    }
    const dailyMap = branchDailyVisits.get(v.branchId)!
    dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + 1)
  }

  // 7. 각 매장별 일평균 수집
  const branchOverallAvgs: number[] = []  // A 계산용
  const branchFactorAvgs: number[] = []   // B 계산용

  for (const [branchId, dailyMap] of branchDailyVisits) {
    // 신규 매장(오픈 6개월 미만)은 계수 계산에서 제외
    if (newBranchIds.has(branchId)) {
      continue
    }

    // 매장의 전체 일평균
    let overallTotal = 0
    for (const count of dailyMap.values()) {
      overallTotal += count
    }
    const overallDays = dailyMap.size
    const overallDailyAvg = overallTotal / overallDays

    if (overallDailyAvg === 0) continue

    // 매장의 외부요인 기간 일평균
    let factorTotal = 0
    let factorDays = 0
    for (const [dateStr, count] of dailyMap) {
      if (factorDates.has(dateStr)) {
        factorTotal += count
        factorDays++
      }
    }

    // 외부요인 기간에 데이터가 없는 매장은 제외
    if (factorDays === 0) continue

    const factorDailyAvg = factorTotal / factorDays

    // 두 값 모두 수집 (같은 매장에서 나온 값이므로 쌍으로 추가)
    branchOverallAvgs.push(overallDailyAvg)
    branchFactorAvgs.push(factorDailyAvg)
  }

  if (branchOverallAvgs.length === 0) {
    return { coefficient: 1.0, sampleCount: 0 }
  }

  // 8. A = 각 매장 전체 일평균들의 평균
  const A = branchOverallAvgs.reduce((a, b) => a + b, 0) / branchOverallAvgs.length

  // 9. B = 각 매장 외부요인 기간 일평균들의 평균
  const B = branchFactorAvgs.reduce((a, b) => a + b, 0) / branchFactorAvgs.length

  // 10. 최종 계수 = B / A
  const coefficient = A > 0 ? B / A : 1.0

  return {
    coefficient: Math.round(coefficient * 10000) / 10000,
    sampleCount: pastPeriods.length,
  }
}

/**
 * 세그먼트별 계수 계산 (간소화 버전, 전체 매장 기준)
 * 실제 세그먼트 계산은 복잡하므로, 방문 수 기반으로 근사
 */
export async function calculateSegmentCoefficients(
  factorId: string
): Promise<SegmentCoefficients> {
  // 방문 계수를 기반으로 세그먼트별 계수 추정
  // 실제로는 각 세그먼트별로 별도 계산이 필요하지만,
  // 일단 방문 계수를 기준으로 조정값 적용
  const { coefficient: visitsCoef } = await calculateVisitsCoefficient(factorId)

  // 세그먼트별 조정 (가정 기반)
  // - 외부 요인이 방문을 증가시키면 신규/일반 증가, 이탈위험 감소
  // - 외부 요인이 방문을 감소시키면 반대
  const adjustmentFactor = visitsCoef - 1.0 // 변화량

  return {
    VIP: Math.round((1.0 + adjustmentFactor * 0.5) * 10000) / 10000,      // VIP는 영향 적음
    단골: Math.round((1.0 + adjustmentFactor * 0.7) * 10000) / 10000,     // 단골은 중간
    일반: Math.round((1.0 + adjustmentFactor * 1.0) * 10000) / 10000,     // 일반은 평균
    신규: Math.round((1.0 + adjustmentFactor * 1.2) * 10000) / 10000,     // 신규는 영향 큼
    이탈위험: Math.round((1.0 - adjustmentFactor * 0.8) * 10000) / 10000, // 이탈위험은 반대
    이탈: Math.round((1.0 - adjustmentFactor * 0.5) * 10000) / 10000,     // 이탈은 반대
    복귀: Math.round((1.0 + adjustmentFactor * 1.5) * 10000) / 10000,     // 복귀는 영향 큼
  }
}

/**
 * 신뢰도 계산
 */
function getConfidenceLevel(sampleCount: number): ConfidenceLevel {
  if (sampleCount >= 5) return 'HIGH'
  if (sampleCount >= 2) return 'MEDIUM'
  return 'LOW'
}

/**
 * 시즌성 계수 계산 메인 함수
 * 개별 외부 요인(factorId)의 기간을 기준으로 계수 계산
 * 모든 계수는 전체 매장(ALL_BRANCHES) 기준으로 계산
 */
export async function calculateSeasonalityCoefficient(
  factorId: string,
  _branchId: string | null // branchId는 무시하고 항상 전체 매장 기준으로 계산
): Promise<SeasonalityCalculationResult> {
  // 외부 요인 정보 조회
  const factor = await prisma.externalFactor.findUnique({
    where: { id: factorId },
    select: { type: true },
  })

  if (!factor) {
    throw new Error('외부 요인을 찾을 수 없습니다.')
  }

  const factorType = factor.type as ExternalFactorType

  // 항상 전체 매장 기준으로 계산
  const calculationSource: CalculationSource = 'ALL_BRANCHES'

  // 계수 계산 (개별 외부 요인의 기간 기준)
  const { coefficient: revenueCoefficient, sampleCount, factorName } = await calculateRevenueCoefficient(
    factorId
  )

  const { coefficient: visitsCoefficient } = await calculateVisitsCoefficient(
    factorId
  )

  const segmentCoefficients = await calculateSegmentCoefficients(factorId)

  console.log(`[계수계산] "${factorName}" 계수 계산 완료: 매출=${((revenueCoefficient - 1) * 100).toFixed(1)}%, 방문=${((visitsCoefficient - 1) * 100).toFixed(1)}%`)

  return {
    factorId,
    branchId: null, // 항상 전체 매장 기준
    factorType,
    revenueCoefficient,
    visitsCoefficient,
    segmentCoefficients,
    sampleCount,
    confidence: getConfidenceLevel(sampleCount),
    calculationSource,
  }
}

/**
 * 중첩 외부 요인 계수 계산 (가중 평균)
 * 신뢰도 기반 가중치: HIGH=3, MEDIUM=2, LOW=1
 */
export function calculateOverlappingCoefficient(
  coefficients: SeasonalityCoefficient[]
): MergedCoefficient {
  if (coefficients.length === 0) {
    return {
      revenueCoefficient: 1.0,
      visitsCoefficient: 1.0,
      segmentCoefficients: {},
      factorIds: [],
      factorNames: [],
    }
  }

  if (coefficients.length === 1) {
    return {
      revenueCoefficient: coefficients[0].revenueCoefficient,
      visitsCoefficient: coefficients[0].visitsCoefficient,
      segmentCoefficients: coefficients[0].segmentCoefficients,
      factorIds: [coefficients[0].factorId],
      factorNames: [],
    }
  }

  // 신뢰도 기반 가중치
  const weights: Record<ConfidenceLevel, number> = {
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  }

  let totalWeight = 0
  let weightedRevenueSum = 0
  let weightedVisitsSum = 0

  const segmentWeightedSums: Record<string, number> = {}
  const segmentWeights: Record<string, number> = {}

  for (const coef of coefficients) {
    const weight = weights[coef.confidence]
    totalWeight += weight

    weightedRevenueSum += coef.revenueCoefficient * weight
    weightedVisitsSum += coef.visitsCoefficient * weight

    // 세그먼트별 가중 합계
    for (const [segment, value] of Object.entries(coef.segmentCoefficients)) {
      if (value !== undefined) {
        segmentWeightedSums[segment] = (segmentWeightedSums[segment] || 0) + value * weight
        segmentWeights[segment] = (segmentWeights[segment] || 0) + weight
      }
    }
  }

  // 세그먼트별 가중 평균
  const mergedSegments: SegmentCoefficients = {}
  for (const segment of VISIT_SEGMENTS) {
    if (segmentWeights[segment]) {
      (mergedSegments as Record<string, number>)[segment] =
        Math.round((segmentWeightedSums[segment] / segmentWeights[segment]) * 10000) / 10000
    }
  }

  return {
    revenueCoefficient: Math.round((weightedRevenueSum / totalWeight) * 10000) / 10000,
    visitsCoefficient: Math.round((weightedVisitsSum / totalWeight) * 10000) / 10000,
    segmentCoefficients: mergedSegments,
    factorIds: coefficients.map(c => c.factorId),
    factorNames: [],
  }
}

/**
 * 특정 기간에 겹치는 외부 요인들의 저장된 계수 조회
 */
export async function getOverlappingFactorCoefficients(
  branchId: string | null,
  startDate: Date,
  endDate: Date
): Promise<SeasonalityCoefficient[]> {
  // 기간과 겹치는 외부 요인 조회
  const overlappingFactors = await prisma.externalFactor.findMany({
    where: {
      OR: [
        // 시작일이 범위 내
        { startDate: { gte: startDate, lte: endDate } },
        // 종료일이 범위 내
        { endDate: { gte: startDate, lte: endDate } },
        // 범위를 완전히 포함
        { startDate: { lte: startDate }, endDate: { gte: endDate } },
      ],
      ...(branchId && { branches: { some: { branchId } } }),
    },
    select: { id: true },
  })

  if (overlappingFactors.length === 0) {
    return []
  }

  // 저장된 계수 조회
  const coefficients = await prisma.seasonalityCoefficient.findMany({
    where: {
      factorId: { in: overlappingFactors.map(f => f.id) },
      OR: [
        { branchId: null }, // 전체 매장 기준
        { branchId },       // 해당 매장 기준
      ],
    },
  })

  // 매장별 계수가 있으면 우선, 없으면 전체 기준 사용
  const factorCoefMap = new Map<string, SeasonalityCoefficient>()

  for (const coef of coefficients) {
    const existing = factorCoefMap.get(coef.factorId)

    // 매장별 계수가 더 우선
    if (!existing || (coef.branchId && !existing.branchId)) {
      factorCoefMap.set(coef.factorId, {
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
      })
    }
  }

  return Array.from(factorCoefMap.values())
}
