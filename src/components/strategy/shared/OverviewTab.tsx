import { formatRevenue, formatGrowth } from '@/lib/utils/formatters'
import type { ComparisonType } from '@/types/strategy'
import { VERDICT_STYLES, type VerdictType } from './constants'
import { ScoreItem } from './ScoreItem'
import { TicketRevenueItem } from './TicketRevenueItem'
import type { PerformanceOverviewData, DataAvailabilityInfo } from './types'

interface OverviewTabProps {
  performances: PerformanceOverviewData[]
  dataAvailability?: DataAvailabilityInfo[]
  /** "이벤트" 또는 "운영변경" - 해석 텍스트에 사용 */
  contextLabel?: string
}

function getVerdictStyle(verdict: PerformanceOverviewData['verdict']) {
  return VERDICT_STYLES[verdict as VerdictType || 'NEUTRAL'] || VERDICT_STYLES.NEUTRAL
}

function getComparisonTypeLabel(type: ComparisonType) {
  return type === 'YOY' ? '전년 동기 대비' : '전월 동일 요일 대비'
}

export function OverviewTab({ performances, dataAvailability, contextLabel = '이벤트' }: OverviewTabProps) {
  return (
    <div className="space-y-4">
      {performances.map((perf) => {
        const dataInfo = dataAvailability?.find((d) => d.branchId === perf.branchId)
        const verdictStyle = getVerdictStyle(perf.verdict)

        return (
          <div key={perf.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-slate-800">{perf.branchName}</h3>
                  {perf.isNewBranch && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                      신규 지점
                    </span>
                  )}
                  {perf.isSignificant && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      통계적 유의미
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  {getComparisonTypeLabel(perf.comparisonType)}
                  {perf.isNewBranch && perf.noYoyDataReason && (
                    <span className="ml-2 text-amber-600 text-xs font-medium">{perf.noYoyDataReason}</span>
                  )}
                  {dataInfo && !dataInfo.hasYoyData && !perf.isNewBranch && perf.comparisonType === 'MOM' && (
                    <span className="ml-2 text-orange-600 text-xs font-medium">1년 미만 데이터</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-3xl font-bold text-slate-800">{perf.performanceScore}</p>
                  <p className="text-xs text-slate-500">종합 점수</p>
                </div>
                {perf.verdict && (
                  <span className={`px-4 py-2 rounded-xl text-sm font-semibold ${verdictStyle.bg} ${verdictStyle.text} border ${verdictStyle.border}`}>
                    {verdictStyle.label}
                  </span>
                )}
              </div>
            </div>
            <div className="p-6">
              {/* 주요 지표 */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl border border-blue-100">
                  <p className="text-sm text-blue-600 font-medium">매출</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{formatRevenue(perf.revenueAfter)}</p>
                  <p className={`text-sm font-semibold mt-1 ${perf.revenueGrowth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatGrowth(perf.revenueGrowth)}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">이전: {formatRevenue(perf.revenueBefore)}</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl border border-emerald-100">
                  <p className="text-sm text-emerald-600 font-medium">방문 수</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{perf.visitsAfter}회</p>
                  <p className={`text-sm font-semibold mt-1 ${perf.visitsGrowth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatGrowth(perf.visitsGrowth)}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">이전: {perf.visitsBefore}회</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl border border-purple-100">
                  <p className="text-sm text-purple-600 font-medium">신규 고객</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{perf.newCustomers}명</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl border border-amber-100">
                  <p className="text-sm text-amber-600 font-medium">복귀 고객</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{perf.returnedCustomers}명</p>
                </div>
              </div>

              {/* 기대 매출 예측 기반 분석 */}
              {perf.useForecast && perf.forecast && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <div className="p-4 bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-violet-100">
                    <p className="text-sm font-semibold text-violet-700 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      기대 매출 예측 기반 분석
                      <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                        perf.forecast.confidence === 'HIGH' ? 'bg-green-100 text-green-700' :
                        perf.forecast.confidence === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        신뢰도: {perf.forecast.confidence === 'HIGH' ? '높음' : perf.forecast.confidence === 'MEDIUM' ? '보통' : '낮음'}
                      </span>
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                      <div className="p-3 bg-white/60 rounded-lg">
                        <p className="text-violet-600 text-xs">기대 매출</p>
                        <p className="font-bold text-lg text-slate-800">
                          {perf.forecast.expectedRevenue.toLocaleString()}원
                        </p>
                      </div>
                      <div className="p-3 bg-white/60 rounded-lg">
                        <p className="text-violet-600 text-xs">실제 매출</p>
                        <p className="font-bold text-lg text-slate-800">
                          {perf.revenueAfter.toLocaleString()}원
                        </p>
                      </div>
                    </div>
                    <div className="p-3 bg-white/60 rounded-lg mb-3">
                      <p className="text-violet-600 text-xs mb-1">예측 대비 성과</p>
                      <p className={`font-bold text-xl ${perf.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatGrowth(perf.revenueGrowth)}
                        <span className="text-sm font-normal text-slate-500 ml-2">
                          ({(perf.revenueAfter - perf.forecast.expectedRevenue).toLocaleString()}원)
                        </span>
                      </p>
                    </div>
                    <div className="text-xs text-violet-600 space-y-1">
                      <p>• {perf.forecast.breakdown.baseRevenueReason}</p>
                      <p>• 시즌 지수: {perf.forecast.seasonIndex} ({perf.forecast.breakdown.seasonReason})</p>
                      {perf.forecast.externalFactorIndex !== 1 && (
                        <p>• 외부 요인: {perf.forecast.externalFactorIndex} ({perf.forecast.breakdown.externalReason})</p>
                      )}
                      {perf.forecast.trendCoefficient !== 1 && (
                        <p>• 추세: {perf.forecast.trendCoefficient} ({perf.forecast.breakdown.trendReason})</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 대조군 비교 정보 (예측 기반이 아닐 때만) */}
              {!perf.useForecast && perf.revenueGrowthAdjusted !== undefined && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                    <p className="text-sm font-semibold text-indigo-700 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      대조군 비교 분석
                    </p>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-indigo-600">{contextLabel} 지점 성장률</p>
                        <p className={`font-semibold ${perf.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatGrowth(perf.revenueGrowth)}
                        </p>
                      </div>
                      <div>
                        <p className="text-indigo-600">대조군 성장률</p>
                        <p className="font-semibold text-slate-600">
                          {formatGrowth(perf.revenueGrowth - perf.revenueGrowthAdjusted)}
                        </p>
                      </div>
                      <div>
                        <p className="text-indigo-600">순수 {contextLabel} 효과</p>
                        <p className={`font-bold ${perf.revenueGrowthAdjusted >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatGrowth(perf.revenueGrowthAdjusted)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 점수 계산 근거 */}
              {perf.scoreBreakdown && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    점수 계산 근거
                  </p>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    <ScoreItem
                      label="매출 성장"
                      score={perf.scoreBreakdown.revenueGrowthScore}
                      reason={perf.scoreBreakdown.revenueGrowthReason}
                      positive={perf.scoreBreakdown.revenueGrowthScore >= 0}
                    />
                    <ScoreItem
                      label="방문 성장"
                      score={perf.scoreBreakdown.visitsGrowthScore}
                      reason={perf.scoreBreakdown.visitsGrowthReason}
                      positive={perf.scoreBreakdown.visitsGrowthScore >= 0}
                    />
                    <ScoreItem
                      label="통계적 유의성"
                      score={perf.scoreBreakdown.statisticalScore}
                      reason={perf.scoreBreakdown.statisticalReason}
                      positive={perf.scoreBreakdown.statisticalScore > 0}
                    />
                    <ScoreItem
                      label="고객 변화"
                      score={perf.scoreBreakdown.customerScore}
                      reason={perf.scoreBreakdown.customerReason}
                      positive={perf.scoreBreakdown.customerScore >= 0}
                    />
                    <ScoreItem
                      label="세그먼트 이동"
                      score={perf.scoreBreakdown.segmentScore}
                      reason={perf.scoreBreakdown.segmentReason}
                      positive={perf.scoreBreakdown.segmentScore >= 0}
                    />
                    <ScoreItem
                      label="이용권 업그레이드"
                      score={perf.scoreBreakdown.ticketUpgradeScore}
                      reason={perf.scoreBreakdown.ticketUpgradeReason}
                      positive={perf.scoreBreakdown.ticketUpgradeScore >= 0}
                    />
                  </div>
                  <div className="mt-4 p-3 bg-slate-100 rounded-xl flex items-center justify-between">
                    <span className="font-semibold text-slate-700">총합</span>
                    <span className="text-xl font-bold text-slate-800">{perf.scoreBreakdown.totalScore}점</span>
                  </div>
                </div>
              )}

              {/* 이용권별 매출 */}
              <div className="mt-6 pt-6 border-t border-slate-100">
                <p className="text-sm font-semibold text-slate-700 mb-3">이용권별 매출</p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <TicketRevenueItem label="당일권" after={perf.dayTicketRevenue} before={perf.dayTicketRevenueBefore} />
                  <TicketRevenueItem label="시간권" after={perf.timeTicketRevenue} before={perf.timeTicketRevenueBefore} />
                  <TicketRevenueItem label="기간권" after={perf.termTicketRevenue} before={perf.termTicketRevenueBefore} />
                  <TicketRevenueItem label="고정석" after={perf.fixedTicketRevenue} before={perf.fixedTicketRevenueBefore} />
                </div>
              </div>

              {/* 통계적 유의성 */}
              <div className="mt-6 pt-6 border-t border-slate-100">
                <p className="text-sm font-semibold text-slate-700 mb-3">통계적 분석</p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border border-slate-200">
                    <p className="text-xs text-slate-500">통계적 유의성</p>
                    <p className={`font-semibold mt-1 ${perf.isSignificant ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {perf.isSignificant ? '유의미함' : '유의미하지 않음'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">p = {perf.pValue?.toFixed(4)}</p>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-200">
                    <p className="text-xs text-slate-500">효과 크기 (Cohen&apos;s d)</p>
                    <p className="font-semibold text-slate-700 mt-1">{(perf.effectSize || 0).toFixed(2)}</p>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-200">
                    <p className="text-xs text-slate-500">해석</p>
                    <p className="text-sm text-slate-600 mt-1 font-medium">
                      {perf.isSignificant && perf.revenueGrowth > 0
                        ? `${contextLabel} 효과 확인됨`
                        : perf.isSignificant && perf.revenueGrowth < 0
                        ? '부정적 영향 확인됨'
                        : '자연 변동 범위 내'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 인사이트 */}
              {perf.insights && perf.insights.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <p className="text-sm font-semibold text-slate-700 mb-3">AI 인사이트</p>
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <ul className="space-y-2">
                      {perf.insights.map((insight, idx) => (
                        <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                          <span className="text-blue-500 mt-0.5">•</span>
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
