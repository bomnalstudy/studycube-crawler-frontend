import { prisma } from '@/lib/prisma'
import type { Prisma, OperationPerformance } from '@prisma/client'
import type {
  OperationPerformanceData,
  ComparisonType,
  SegmentChangeData,
  SegmentChangeComparison,
  SegmentMigration,
  SegmentMigrationComparison,
  TicketTypeChangeData,
  TicketUpgradeData,
  VerdictType,
  VisitPatternData,
  ScoreBreakdown,
} from '@/types/strategy'

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

type OperationPerformanceWithBranch = OperationPerformance & {
  branch: { id: string; name: string }
}

/** DB 레코드를 OperationPerformanceData로 변환 */
export function dbRecordToPerformanceData(
  record: OperationPerformanceWithBranch
): OperationPerformanceData {
  return {
    id: record.id,
    operationId: record.operationId,
    branchId: record.branchId,
    branchName: record.branch.name,
    calculatedAt: record.calculatedAt.toISOString(),
    comparisonType: record.comparisonType as ComparisonType,
    revenueBefore1m: record.revenueBefore1m != null ? Number(record.revenueBefore1m) : undefined,
    revenueAfter1m: record.revenueAfter1m != null ? Number(record.revenueAfter1m) : undefined,
    revenueGrowth1m: record.revenueGrowth1m != null ? Number(record.revenueGrowth1m) : undefined,
    revenueBefore3m: Number(record.revenueBefore3m ?? 0),
    revenueAfter3m: Number(record.revenueAfter3m ?? 0),
    revenueGrowth3m: Number(record.revenueGrowth3m ?? 0),
    revenueBefore6m: record.revenueBefore6m != null ? Number(record.revenueBefore6m) : undefined,
    revenueAfter6m: record.revenueAfter6m != null ? Number(record.revenueAfter6m) : undefined,
    revenueGrowth6m: record.revenueGrowth6m != null ? Number(record.revenueGrowth6m) : undefined,
    avgCustomersBefore: Number(record.avgCustomersBefore ?? 0),
    avgCustomersAfter: Number(record.avgCustomersAfter ?? 0),
    customerGrowth: Number(record.customerGrowth ?? 0),
    // 방문
    visitsBefore: record.visitsBefore ?? undefined,
    visitsAfter: record.visitsAfter ?? undefined,
    visitsGrowth: record.visitsGrowth != null ? Number(record.visitsGrowth) : undefined,

    newCustomers: record.newCustomers ?? undefined,
    returnedCustomers: record.returnedCustomers ?? undefined,

    // 이용권별 매출
    dayTicketRevenue: record.dayTicketRevenue != null ? Number(record.dayTicketRevenue) : undefined,
    dayTicketRevenueBefore: record.dayTicketRevenueBefore != null ? Number(record.dayTicketRevenueBefore) : undefined,
    timeTicketRevenue: record.timeTicketRevenue != null ? Number(record.timeTicketRevenue) : undefined,
    timeTicketRevenueBefore: record.timeTicketRevenueBefore != null ? Number(record.timeTicketRevenueBefore) : undefined,
    termTicketRevenue: record.termTicketRevenue != null ? Number(record.termTicketRevenue) : undefined,
    termTicketRevenueBefore: record.termTicketRevenueBefore != null ? Number(record.termTicketRevenueBefore) : undefined,
    fixedTicketRevenue: record.fixedTicketRevenue != null ? Number(record.fixedTicketRevenue) : undefined,
    fixedTicketRevenueBefore: record.fixedTicketRevenueBefore != null ? Number(record.fixedTicketRevenueBefore) : undefined,

    // 기대 매출 예측
    useForecast: record.useForecast ?? undefined,
    forecast: (record.forecastData as unknown as ForecastJson) ?? undefined,
    isNewBranch: record.isNewBranch ?? undefined,
    noYoyDataReason: record.noYoyDataReason ?? undefined,

    segmentChanges: (record.segmentChanges as unknown as SegmentChangeComparison[]) ?? [],
    segmentMigrations: (record.segmentMigrations as unknown as SegmentMigrationComparison[]) ?? [],
    hasSegmentComparisonData: record.hasSegmentComparisonData ?? undefined,
    segmentPeriodInfo: (record.segmentPeriodInfo as unknown as OperationPerformanceData['segmentPeriodInfo']) ?? undefined,
    ticketTypeChanges: (record.ticketTypeChanges as unknown as TicketTypeChangeData[]) ?? [],
    ticketUpgrades: (record.ticketUpgrades as unknown as TicketUpgradeData[]) ?? [],
    visitPattern: (record.visitPattern as unknown as VisitPatternData) ?? undefined,

    isSignificant: record.isSignificant ?? undefined,
    pValue: record.pValue != null ? Number(record.pValue) : undefined,
    effectSize: record.effectSize != null ? Number(record.effectSize) : undefined,

    scoreBreakdown: (record.scoreBreakdown as unknown as ScoreBreakdown) ?? undefined,
    performanceScore: record.performanceScore ?? undefined,
    verdict: (record.verdict as VerdictType) ?? undefined,
    insights: (record.insights as unknown as string[]) ?? [],
  }
}

/** performances 배열로부터 요약 계산 */
export function computeSummary(performances: OperationPerformanceData[]) {
  const len = performances.length || 1
  const avgGrowth1m = performances.reduce((sum, p) => sum + (p.revenueGrowth1m ?? 0), 0) / len
  const avgGrowth3m = performances.reduce((sum, p) => sum + p.revenueGrowth3m, 0) / len
  const avgGrowth6m = performances.reduce((sum, p) => sum + (p.revenueGrowth6m ?? 0), 0) / len
  const avgCustomerGrowth = performances.reduce((sum, p) => sum + p.customerGrowth, 0) / len
  const avgScore = performances.reduce((sum, p) => sum + (p.performanceScore ?? 0), 0) / len

  const migrationMap: Record<string, SegmentMigration> = {}
  const upgradeMap: Record<string, TicketUpgradeData> = {}

  for (const p of performances) {
    p.segmentMigrations?.forEach((m) => {
      const key = `${m.fromSegment}→${m.toSegment}`
      if (!migrationMap[key]) migrationMap[key] = { ...m, count: 0 }
      migrationMap[key].count += m.count
    })
    p.ticketUpgrades?.forEach((u) => {
      const key = `${u.fromTicket}→${u.toTicket}`
      if (!upgradeMap[key]) upgradeMap[key] = { ...u, count: 0 }
      upgradeMap[key].count += u.count
    })
  }

  return {
    avgRevenueGrowth1m: Math.round(avgGrowth1m * 100) / 100,
    avgRevenueGrowth3m: Math.round(avgGrowth3m * 100) / 100,
    avgRevenueGrowth6m: Math.round(avgGrowth6m * 100) / 100,
    avgCustomerGrowth: Math.round(avgCustomerGrowth * 100) / 100,
    avgPerformanceScore: Math.round(avgScore),
    totalBranches: performances.length,
    significantCount: performances.filter((p) => p.isSignificant).length,
    totalNewCustomers: performances.reduce((sum, p) => sum + (p.newCustomers ?? 0), 0),
    totalReturnedCustomers: performances.reduce((sum, p) => sum + (p.returnedCustomers ?? 0), 0),
    segmentMigrations: Object.values(migrationMap),
    ticketUpgrades: Object.values(upgradeMap),
  }
}

/** 분석 결과를 DB에 upsert */
function buildDbData(perfData: OperationPerformanceData) {
  return {
    comparisonType: perfData.comparisonType,
    revenueBefore1m: perfData.revenueBefore1m,
    revenueAfter1m: perfData.revenueAfter1m,
    revenueGrowth1m: perfData.revenueGrowth1m,
    revenueBefore3m: perfData.revenueBefore3m,
    revenueAfter3m: perfData.revenueAfter3m,
    revenueGrowth3m: perfData.revenueGrowth3m,
    revenueBefore6m: perfData.revenueBefore6m,
    revenueAfter6m: perfData.revenueAfter6m,
    revenueGrowth6m: perfData.revenueGrowth6m,
    avgCustomersBefore: perfData.avgCustomersBefore,
    avgCustomersAfter: perfData.avgCustomersAfter,
    customerGrowth: perfData.customerGrowth,
    // 방문
    visitsBefore: perfData.visitsBefore,
    visitsAfter: perfData.visitsAfter,
    visitsGrowth: perfData.visitsGrowth,

    newCustomers: perfData.newCustomers,
    returnedCustomers: perfData.returnedCustomers,

    // 이용권별 매출
    dayTicketRevenue: perfData.dayTicketRevenue,
    dayTicketRevenueBefore: perfData.dayTicketRevenueBefore,
    timeTicketRevenue: perfData.timeTicketRevenue,
    timeTicketRevenueBefore: perfData.timeTicketRevenueBefore,
    termTicketRevenue: perfData.termTicketRevenue,
    termTicketRevenueBefore: perfData.termTicketRevenueBefore,
    fixedTicketRevenue: perfData.fixedTicketRevenue,
    fixedTicketRevenueBefore: perfData.fixedTicketRevenueBefore,

    // 기대 매출 예측
    useForecast: perfData.useForecast,
    forecastData: perfData.forecast as unknown as Prisma.InputJsonValue,
    isNewBranch: perfData.isNewBranch,
    noYoyDataReason: perfData.noYoyDataReason,

    isSignificant: perfData.isSignificant,
    pValue: perfData.pValue,
    effectSize: perfData.effectSize,
    scoreBreakdown: perfData.scoreBreakdown as unknown as Prisma.InputJsonValue,
    performanceScore: perfData.performanceScore,
    verdict: perfData.verdict,
    insights: perfData.insights as Prisma.InputJsonValue,
    hasSegmentComparisonData: perfData.hasSegmentComparisonData,
    segmentPeriodInfo: perfData.segmentPeriodInfo as unknown as Prisma.InputJsonValue,
    segmentChanges: perfData.segmentChanges as unknown as Prisma.InputJsonValue,
    segmentMigrations: perfData.segmentMigrations as unknown as Prisma.InputJsonValue,
    ticketTypeChanges: perfData.ticketTypeChanges as unknown as Prisma.InputJsonValue,
    ticketUpgrades: perfData.ticketUpgrades as unknown as Prisma.InputJsonValue,
    visitPattern: perfData.visitPattern as unknown as Prisma.InputJsonValue,
  }
}

export async function savePerformanceToDB(
  operationId: string,
  branchId: string,
  perfData: OperationPerformanceData,
): Promise<void> {
  const data = buildDbData(perfData)
  await prisma.operationPerformance.upsert({
    where: { operationId_branchId: { operationId, branchId } },
    create: { operationId, branchId, ...data },
    update: { calculatedAt: new Date(), ...data },
  })
}

/** 저장된 분석 결과 로드 */
export async function loadSavedPerformances(operationId: string): Promise<OperationPerformanceData[] | null> {
  const saved = await prisma.operationPerformance.findMany({
    where: { operationId },
    include: { branch: { select: { id: true, name: true } } },
  })
  if (saved.length === 0) return null
  return saved.map(dbRecordToPerformanceData)
}

/** 저장된 분석 결과의 calculatedAt 조회 */
export async function getSavedAnalysisDate(operationId: string): Promise<string | null> {
  const first = await prisma.operationPerformance.findFirst({
    where: { operationId },
    select: { calculatedAt: true },
    orderBy: { calculatedAt: 'desc' },
  })
  return first ? first.calculatedAt.toISOString() : null
}
