import { prisma } from '@/lib/prisma'
import type { EventPerformance } from '@prisma/client'
import type {
  EventPerformanceData,
  ComparisonType,
  VerdictType,
  SegmentChangeData,
  SegmentMigration,
  TicketUpgradeData,
  VisitPatternData,
  ScoreBreakdown,
  ExternalFactorImpactPrediction,
} from '@/types/strategy'

type EventPerformanceWithBranch = EventPerformance & {
  branch: { id: string; name: string }
}

// forecastData JSON 타입
interface ForecastJson {
  expectedRevenue: number
  baseRevenue: number
  seasonIndex: number
  externalFactorIndex: number
  trendCoefficient: number
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  breakdown: {
    baseRevenueReason: string
    seasonReason: string
    externalReason: string
    trendReason: string
  }
}

/** DB 레코드를 EventPerformanceData로 변환 */
export function dbRecordToEventPerformanceData(
  record: EventPerformanceWithBranch
): EventPerformanceData {
  const forecastData = record.forecastData as unknown as ForecastJson | null

  return {
    id: record.id,
    eventId: record.eventId,
    branchId: record.branchId,
    branchName: record.branch.name,
    calculatedAt: record.calculatedAt.toISOString(),
    comparisonType: record.comparisonType as ComparisonType,

    // 매출
    revenueBefore: Number(record.revenueBefore ?? 0),
    revenueAfter: Number(record.revenueAfter ?? 0),
    revenueGrowth: Number(record.revenueGrowth ?? 0),
    revenueGrowthAdjusted: record.revenueGrowthAdjusted != null ? Number(record.revenueGrowthAdjusted) : undefined,

    // 방문
    visitsBefore: record.visitsBefore ?? 0,
    visitsAfter: record.visitsAfter ?? 0,
    visitsGrowth: Number(record.visitsGrowth ?? 0),

    // 고객
    newCustomers: record.newCustomers ?? 0,
    returnedCustomers: record.returnedCustomers ?? 0,
    churnedCustomers: record.churnedCustomers ?? 0,

    // 이용권별 매출 (이후)
    dayTicketRevenue: record.dayTicketRevenue != null ? Number(record.dayTicketRevenue) : undefined,
    timeTicketRevenue: record.timeTicketRevenue != null ? Number(record.timeTicketRevenue) : undefined,
    termTicketRevenue: record.termTicketRevenue != null ? Number(record.termTicketRevenue) : undefined,
    fixedTicketRevenue: record.fixedTicketRevenue != null ? Number(record.fixedTicketRevenue) : undefined,

    // 이용권별 매출 (이전/비교)
    dayTicketRevenueBefore: record.dayTicketRevenueBefore != null ? Number(record.dayTicketRevenueBefore) : undefined,
    timeTicketRevenueBefore: record.timeTicketRevenueBefore != null ? Number(record.timeTicketRevenueBefore) : undefined,
    termTicketRevenueBefore: record.termTicketRevenueBefore != null ? Number(record.termTicketRevenueBefore) : undefined,
    fixedTicketRevenueBefore: record.fixedTicketRevenueBefore != null ? Number(record.fixedTicketRevenueBefore) : undefined,

    // 세그먼트 (segmentTransitions in DB = segmentMigrations in type)
    segmentChanges: (record.segmentChanges as unknown as SegmentChangeData[]) ?? [],
    segmentMigrations: (record.segmentTransitions as unknown as SegmentMigration[]) ?? [],
    ticketUpgrades: (record.ticketUpgrades as unknown as TicketUpgradeData[]) ?? [],
    visitPattern: (record.visitPattern as unknown as VisitPatternData) ?? undefined,

    // 기대 매출 예측
    useForecast: record.useForecast ?? undefined,
    forecast: forecastData ?? undefined,
    isNewBranch: record.isNewBranch ?? undefined,
    noYoyDataReason: record.noYoyDataReason ?? undefined,

    // 외부요인 예측
    externalFactorPredictions: (record.externalFactorPredictions as unknown as ExternalFactorImpactPrediction) ?? undefined,

    // 통계
    isSignificant: record.isSignificant ?? undefined,
    pValue: record.pValue != null ? Number(record.pValue) : undefined,
    effectSize: record.effectSize != null ? Number(record.effectSize) : undefined,

    // 점수
    scoreBreakdown: (record.scoreBreakdown as unknown as ScoreBreakdown) ?? undefined,
    performanceScore: record.performanceScore ?? undefined,
    verdict: (record.verdict as VerdictType) ?? undefined,
    insights: (record.insights as unknown as string[]) ?? [],
  }
}

/** performances 배열로부터 이벤트 요약 계산 */
export function computeEventSummary(performances: EventPerformanceData[]) {
  const len = performances.length || 1
  return {
    avgRevenueGrowth: performances.reduce((sum, p) => sum + p.revenueGrowth, 0) / len,
    avgVisitsGrowth: performances.reduce((sum, p) => sum + p.visitsGrowth, 0) / len,
    avgPerformanceScore: performances.reduce((sum, p) => sum + (p.performanceScore || 0), 0) / len,
    totalNewCustomers: performances.reduce((sum, p) => sum + p.newCustomers, 0),
    totalReturnedCustomers: performances.reduce((sum, p) => sum + p.returnedCustomers, 0),
    significantCount: performances.filter((p) => p.isSignificant).length,
    totalBranches: performances.length,
    segmentMigrations: performances.length > 0 ? (performances[0].segmentMigrations ?? []) : [],
    ticketUpgrades: performances.length > 0 ? (performances[0].ticketUpgrades ?? []) : [],
  }
}

/** 저장된 이벤트 분석 결과 로드 */
export async function loadSavedEventPerformances(
  eventId: string
): Promise<EventPerformanceData[] | null> {
  const saved = await prisma.eventPerformance.findMany({
    where: { eventId },
    include: { branch: { select: { id: true, name: true } } },
  })
  if (saved.length === 0) return null
  return saved.map(dbRecordToEventPerformanceData)
}

/** 저장된 이벤트 분석의 calculatedAt 조회 */
export async function getSavedEventAnalysisDate(
  eventId: string
): Promise<string | null> {
  const first = await prisma.eventPerformance.findFirst({
    where: { eventId },
    select: { calculatedAt: true },
    orderBy: { calculatedAt: 'desc' },
  })
  return first ? first.calculatedAt.toISOString() : null
}
