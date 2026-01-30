/**
 * DB 유틸리티 레이어
 *
 * 모든 API에서 재사용 가능한 최적화된 DB 쿼리 함수들
 *
 * 사용 예시:
 * ```
 * import { db } from '@/lib/db'
 *
 * // 단일 지점 매출 조회
 * const summary = await db.metrics.getMetricsSummary(branchId, { start, end })
 *
 * // 여러 지점 일괄 조회 (배치)
 * const summaries = await db.metrics.getMetricsSummaryBatch(branchIds, { start, end })
 *
 * // 방문자 통계
 * const visits = await db.visitors.getVisitCount(branchId, { start, end })
 *
 * // 고객 세그먼트 데이터
 * const segmentData = await db.customers.getCustomerSegmentDataBatch(branchId, customerIds, range, beforeDate)
 * ```
 */

import * as metricsModule from './metrics'
import * as visitorsModule from './visitors'
import * as customersModule from './customers'

// 타입 재export
export type { DateRange, MetricsSummary, MetricsComparison } from './metrics'
export type { VisitorStats, CustomerVisitInfo } from './visitors'
export type { CustomerBasicInfo, CustomerSegmentData } from './customers'

// 모듈화된 db 객체
export const db = {
  metrics: metricsModule,
  visitors: visitorsModule,
  customers: customersModule,
}

// 개별 함수 export (기존 방식 호환)
export {
  getMetricsSummary,
  getMetricsSummaryBatch,
  getOldestDataDates,
  getMonthlyAverages,
  compareMetrics,
  compareMetricsBatch,
  getDailyRevenues,
  getDailyRevenuesBatch,
} from './metrics'

export {
  getVisitCount,
  getVisitCountBatch,
  getUniqueVisitors,
  getUniqueVisitorsBatch,
  getCustomerVisitCounts,
  getLastVisitDates,
  getHourlyUsage,
  getHourlyUsageBatch,
  findPeakHour,
  compareVisitorStats,
} from './visitors'

export {
  getCustomersBasicInfo,
  countNewCustomers,
  getReturnedCustomers,
  getCustomersWithFixedSeat,
  getCustomerSegmentDataBatch,
  getPreviousPurchases,
  getPurchasesInRange,
} from './customers'
