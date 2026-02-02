import type { OperationPerformanceData } from '@/types/strategy'

interface VisitTabProps {
  performances: OperationPerformanceData[]
}

export function VisitTab({ performances }: VisitTabProps) {
  const firstPerf = performances[0]
  const visitPattern = firstPerf?.visitPattern

  if (!visitPattern) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <p className="text-slate-500 text-center py-8">방문 패턴 데이터가 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="font-semibold text-slate-800 mb-4">방문 패턴 변화</h2>

        <div className="grid sm:grid-cols-3 gap-6">
          {/* 방문 빈도 */}
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-sm text-blue-600 mb-2">고객당 평균 방문 횟수</p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-blue-700">{visitPattern.avgVisitsPerCustomerAfter}회</span>
              <span className={`text-sm font-medium mb-1 ${visitPattern.visitFrequencyChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ({visitPattern.visitFrequencyChange >= 0 ? '+' : ''}{visitPattern.visitFrequencyChange.toFixed(1)}%)
              </span>
            </div>
            <p className="text-xs text-blue-500 mt-1">이전: {visitPattern.avgVisitsPerCustomerBefore}회</p>
          </div>

          {/* 이용 시간 */}
          <div className="p-4 bg-teal-50 rounded-xl border border-teal-100">
            <p className="text-sm text-teal-600 mb-2">평균 이용 시간</p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-teal-700">{visitPattern.avgUsageTimeAfter}분</span>
              <span className={`text-sm font-medium mb-1 ${visitPattern.usageTimeChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ({visitPattern.usageTimeChange >= 0 ? '+' : ''}{visitPattern.usageTimeChange.toFixed(1)}%)
              </span>
            </div>
            <p className="text-xs text-teal-500 mt-1">이전: {visitPattern.avgUsageTimeBefore}분</p>
          </div>

          {/* 피크 시간 */}
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
            <p className="text-sm text-amber-600 mb-2">피크 시간대</p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-amber-700">{visitPattern.peakHourAfter}시</span>
              {visitPattern.peakHourBefore !== visitPattern.peakHourAfter && (
                <span className="text-sm text-slate-500 mb-1">
                  (이전: {visitPattern.peakHourBefore}시)
                </span>
              )}
            </div>
            <p className="text-xs text-amber-500 mt-1">가장 붐비는 시간대</p>
          </div>
        </div>
      </div>

      {/* 지점별 방문 패턴 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="font-semibold text-slate-800 mb-4">지점별 방문 패턴</h2>

        <div className="space-y-4">
          {performances.map((perf) => {
            const vp = perf.visitPattern
            if (!vp) return null

            return (
              <div key={perf.id} className="p-4 bg-slate-50 rounded-xl">
                <p className="font-medium text-slate-700 mb-3">{perf.branchName}</p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">방문 빈도</p>
                    <p className={`font-medium ${vp.visitFrequencyChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {vp.visitFrequencyChange >= 0 ? '+' : ''}{vp.visitFrequencyChange.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">이용 시간</p>
                    <p className={`font-medium ${vp.usageTimeChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {vp.usageTimeChange >= 0 ? '+' : ''}{vp.usageTimeChange.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">피크 시간</p>
                    <p className="font-medium text-slate-700">{vp.peakHourAfter}시</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
