import type { OperationPerformanceData } from '@/types/strategy'
import type { AnalysisSummary } from './types'

interface SegmentTabProps {
  performances: OperationPerformanceData[]
  summary: AnalysisSummary
}

export function SegmentTab({ performances, summary }: SegmentTabProps) {
  const firstPerf = performances[0]

  return (
    <div className="space-y-6">
      {/* 세그먼트 이동 요약 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="font-semibold text-slate-800 mb-4">세그먼트 이동 요약</h2>
        <p className="text-sm text-slate-500 mb-4">운영 변경 전후 고객 세그먼트가 어떻게 이동했는지 보여줍니다.</p>

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
              {summary.segmentMigrations
                .filter((m) => m.isPositive)
                .map((m, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">
                      {m.fromSegment} → {m.toSegment}
                    </span>
                    <span className="font-semibold text-green-700">{m.count}명</span>
                  </div>
                ))}
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
              {summary.segmentMigrations
                .filter((m) => !m.isPositive)
                .map((m, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">
                      {m.fromSegment} → {m.toSegment}
                    </span>
                    <span className="font-semibold text-red-700">{m.count}명</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* 세그먼트별 변화 */}
      {firstPerf?.segmentChanges && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">세그먼트별 고객 수 변화</h2>

          <div className="space-y-4">
            {firstPerf.segmentChanges.map((seg, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <div className="w-20 text-sm font-medium text-slate-700">{seg.segmentName}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-slate-500">{seg.countBefore}명</span>
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    <span className="text-sm font-medium text-slate-700">{seg.countAfter}명</span>
                    <span className={`text-sm font-medium ${seg.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ({seg.changePercent >= 0 ? '+' : ''}{seg.changePercent}%)
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${seg.changePercent >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(Math.abs(seg.changePercent) * 2, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
