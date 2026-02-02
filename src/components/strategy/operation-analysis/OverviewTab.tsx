import { formatRevenue, formatGrowth } from '@/lib/utils/formatters'
import type { OperationPerformanceData } from '@/types/strategy'
import { VERDICT_STYLES } from './constants'

interface OverviewTabProps {
  performances: OperationPerformanceData[]
  selectedPeriod: '3m' | '6m'
}

export function OverviewTab({ performances, selectedPeriod }: OverviewTabProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-5 border-b border-slate-100">
        <h2 className="font-semibold text-slate-800">지점별 성과 분석</h2>
      </div>

      <div className="divide-y divide-slate-100">
        {performances.map((perf) => {
          const growth = selectedPeriod === '3m' ? perf.revenueGrowth3m : (perf.revenueGrowth6m || 0)
          const before = selectedPeriod === '3m' ? perf.revenueBefore3m : (perf.revenueBefore6m || 0)
          const after = selectedPeriod === '3m' ? perf.revenueAfter3m : (perf.revenueAfter6m || 0)
          const verdictStyle = perf.verdict ? VERDICT_STYLES[perf.verdict] : VERDICT_STYLES.NEUTRAL

          return (
            <div key={perf.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-slate-800">{perf.branchName}</h3>
                    {perf.verdict && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${verdictStyle.bg} ${verdictStyle.text}`}>
                        {verdictStyle.label}
                      </span>
                    )}
                    {perf.isSignificant && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        통계적 유의미
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                    <div>
                      <p className="text-xs text-slate-400">적용 전 매출</p>
                      <p className="font-medium text-slate-700">{formatRevenue(before)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">적용 후 매출</p>
                      <p className="font-medium text-slate-700">{formatRevenue(after)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">성장률</p>
                      <p className={`font-medium ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatGrowth(growth)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">고객 변화</p>
                      <p className={`font-medium ${perf.customerGrowth >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {formatGrowth(perf.customerGrowth)}
                      </p>
                    </div>
                  </div>

                  {/* 인사이트 */}
                  {perf.insights && perf.insights.length > 0 && (
                    <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs font-medium text-slate-500 mb-2">AI 인사이트</p>
                      <ul className="space-y-1">
                        {perf.insights.slice(0, 4).map((insight, idx) => (
                          <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                            <span className="text-orange-500">•</span>
                            {insight}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <p className="text-sm text-slate-400">성과 점수</p>
                  <p className="text-3xl font-bold text-slate-800">{perf.performanceScore}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
