import type { EventPerformanceData } from '@/types/strategy'
import type { AnalysisSummary } from './types'
import { SEGMENT_TEXT_COLORS } from './constants'
import { SegmentCard } from './SegmentCard'

interface SegmentTabProps {
  performances: EventPerformanceData[]
  summary: AnalysisSummary
}

export function SegmentTab({ performances, summary }: SegmentTabProps) {
  const firstPerf = performances[0]
  const segmentChanges = firstPerf?.segmentChanges || []
  const migrations = firstPerf?.segmentMigrations || []
  const hasSegmentComparisonData = firstPerf?.hasSegmentComparisonData || false
  const segmentPeriodInfo = firstPerf?.segmentPeriodInfo

  // 각 세그먼트별 유입/유출 계산
  const getFlowsForSegment = (segmentName: string) => {
    const inflows = migrations
      .filter((m) => m.toSegment === segmentName)
      .map((m) => ({ from: m.fromSegment, count: m.count }))
      .sort((a, b) => b.count - a.count)

    const outflows = migrations
      .filter((m) => m.fromSegment === segmentName)
      .map((m) => ({ to: m.toSegment, count: m.count }))
      .sort((a, b) => b.count - a.count)

    return { inflows, outflows }
  }

  return (
    <div className="space-y-6">
      {/* 세그먼트별 카드 그리드 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-slate-800">세그먼트별 변화</h2>
          {!hasSegmentComparisonData && (
            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">
              비교 데이터 없음
            </span>
          )}
        </div>

        {/* 기간 정보 표시 */}
        {segmentPeriodInfo && (
          <div className="space-y-2 mb-4">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">실제 기간:</span>
                <span className="font-medium text-slate-700">
                  {segmentPeriodInfo.actualPeriod.start} ~ {segmentPeriodInfo.actualPeriod.end}
                </span>
              </div>
              {segmentPeriodInfo.comparisonPeriod ? (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">비교 기간 ({segmentPeriodInfo.comparisonSource}):</span>
                  <span className="font-medium text-slate-700">
                    {segmentPeriodInfo.comparisonPeriod.start} ~ {segmentPeriodInfo.comparisonPeriod.end}
                  </span>
                </div>
              ) : segmentPeriodInfo.comparisonSource === 'SEASONAL' ? (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">예상값 산출:</span>
                  <span className="font-medium text-slate-700">전체 평균 × 시즌 지수 × 추세 계수</span>
                </div>
              ) : null}
            </div>
            {/* 시즌/추세 계수 표시 */}
            {segmentPeriodInfo.coefficients && (
              <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
                <div className="mb-1">
                  <span className="font-medium">데이터 기준:</span> 최근 {segmentPeriodInfo.coefficients.dataMonths}개월
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {Object.entries(segmentPeriodInfo.coefficients.seasonIndex || {}).map(([seg, season]) => {
                    const trend = segmentPeriodInfo.coefficients?.trendCoeff?.[seg] || 1
                    return (
                      <div key={seg} className="flex items-center gap-1">
                        <span className="font-medium">{seg}:</span>
                        <span>시즌 {(season as number).toFixed(2)}</span>
                        <span>×</span>
                        <span>추세 {(trend as number).toFixed(2)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <p className="text-sm text-slate-500 mb-6">
          {hasSegmentComparisonData
            ? '이벤트 전후 각 세그먼트의 고객 수 변화와 유입/유출 현황입니다.'
            : segmentPeriodInfo?.comparisonSource === 'SEASONAL'
              ? '전년/전월 비교 데이터가 없어 과거 평균 기반 예상값과 비교합니다.'
              : '전년/전월 비교 데이터가 없어 현재 세그먼트 현황만 표시됩니다.'
          }
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {segmentChanges.map((seg) => {
            const { inflows, outflows } = getFlowsForSegment(seg.segmentName)
            // 새 타입 구조에 맞게 캐스팅
            const segData = seg as {
              expectedCount?: number
              vsExpected?: number
              vsExpectedPercent?: number
              isBetterThanExpected?: boolean
            }
            return (
              <SegmentCard
                key={seg.segmentName}
                segmentName={seg.segmentName}
                countBefore={seg.countBefore}
                countAfter={seg.countAfter}
                expectedCount={segData.expectedCount ?? 0}
                change={seg.change}
                changePercent={seg.changePercent}
                vsExpected={segData.vsExpected ?? 0}
                vsExpectedPercent={segData.vsExpectedPercent ?? 0}
                isNegativeSegment={seg.isNegativeSegment}
                inflows={inflows}
                outflows={outflows}
                hasComparison={hasSegmentComparisonData}
                comparisonSource={segmentPeriodInfo?.comparisonSource}
                isBetterThanExpected={segData.isBetterThanExpected}
              />
            )
          })}
        </div>
      </div>

      {/* 전체 이동 요약 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="font-semibold text-slate-800 mb-4">전체 이동 요약</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* 긍정적 이동 */}
          <div className="p-4 bg-green-50 rounded-xl border border-green-100">
            <p className="text-sm font-medium text-green-700 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              긍정적 이동
            </p>
            <div className="space-y-2">
              {migrations
                .filter((m) => m.isPositive)
                .slice(0, 5)
                .map((m, idx) => {
                  const mWithComparison = m as { expectedCount?: number; vsExpected?: number; isBetterThanExpected?: boolean }
                  return (
                    <div key={idx} className="text-sm bg-white/60 p-2 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">
                          {m.fromSegment} → {m.toSegment}
                        </span>
                        <span className="font-semibold text-green-700">{m.count}명</span>
                      </div>
                      {hasSegmentComparisonData && mWithComparison.expectedCount !== undefined && (
                        <div className="mt-1 flex items-center justify-between text-xs">
                          <span className="text-slate-400">예상: {mWithComparison.expectedCount}명</span>
                          <span className={mWithComparison.isBetterThanExpected ? 'text-blue-600' : 'text-amber-600'}>
                            {mWithComparison.isBetterThanExpected ? '✓' : '△'} {mWithComparison.vsExpected! >= 0 ? '+' : ''}{mWithComparison.vsExpected}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              {migrations.filter((m) => m.isPositive).length === 0 && (
                <p className="text-sm text-slate-400">데이터 없음</p>
              )}
            </div>
          </div>

          {/* 부정적 이동 */}
          <div className="p-4 bg-red-50 rounded-xl border border-red-100">
            <p className="text-sm font-medium text-red-700 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              부정적 이동
            </p>
            <div className="space-y-2">
              {migrations
                .filter((m) => !m.isPositive)
                .slice(0, 5)
                .map((m, idx) => {
                  const mWithComparison = m as { expectedCount?: number; vsExpected?: number; isBetterThanExpected?: boolean }
                  return (
                    <div key={idx} className="text-sm bg-white/60 p-2 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">
                          {m.fromSegment} → {m.toSegment}
                        </span>
                        <span className="font-semibold text-red-700">{m.count}명</span>
                      </div>
                      {hasSegmentComparisonData && mWithComparison.expectedCount !== undefined && (
                        <div className="mt-1 flex items-center justify-between text-xs">
                          <span className="text-slate-400">예상: {mWithComparison.expectedCount}명</span>
                          <span className={mWithComparison.isBetterThanExpected ? 'text-blue-600' : 'text-amber-600'}>
                            {mWithComparison.isBetterThanExpected ? '✓' : '△'} {mWithComparison.vsExpected! >= 0 ? '+' : ''}{mWithComparison.vsExpected}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              {migrations.filter((m) => !m.isPositive).length === 0 && (
                <p className="text-sm text-slate-400">데이터 없음</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 지점별 세그먼트 변화 (여러 지점일 때만) */}
      {performances.length > 1 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">지점별 세그먼트 변화</h2>

          <div className="space-y-4">
            {performances.map((perf) => {
              if (!perf.segmentChanges) return null

              return (
                <div key={perf.id} className="p-4 bg-slate-50 rounded-xl">
                  <p className="font-medium text-slate-700 mb-3">{perf.branchName}</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-sm">
                    {perf.segmentChanges.map((seg) => {
                      const isPositiveChange = seg.isNegativeSegment ? seg.change < 0 : seg.change > 0
                      const isNeutral = seg.change === 0
                      const segTextColor = SEGMENT_TEXT_COLORS[seg.segmentName] || SEGMENT_TEXT_COLORS['일반']
                      return (
                        <div
                          key={seg.segmentName}
                          className="p-2 rounded-lg text-center bg-white border border-slate-100"
                        >
                          <p className="text-xs font-medium" style={{ color: segTextColor }}>{seg.segmentName}</p>
                          <p className={`font-semibold ${
                            isNeutral ? 'text-slate-600' :
                            isPositiveChange ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {seg.change >= 0 ? '+' : ''}{seg.change}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
