import { SEGMENT_TEXT_COLORS } from './constants'

interface SegmentCardProps {
  segmentName: string
  countBefore: number | null  // 이전값 (YoY/MoM), SEASONAL이면 null
  countAfter: number  // 이후값 (실제)
  expectedCount: number  // 예상값
  change: number  // 이후 - 이전
  changePercent: number
  vsExpected: number  // 이후 - 예상
  vsExpectedPercent: number
  isNegativeSegment: boolean
  inflows: { from: string; count: number }[]
  outflows: { to: string; count: number }[]
  isBetterThanExpected?: boolean
  hasComparison?: boolean
  comparisonSource?: 'YOY' | 'MOM' | 'SEASONAL' | null
}

export function SegmentCard({
  segmentName,
  countBefore,
  countAfter,
  expectedCount,
  change,
  changePercent,
  vsExpected,
  vsExpectedPercent,
  isNegativeSegment,
  inflows,
  outflows,
  isBetterThanExpected,
  hasComparison,
  comparisonSource,
}: SegmentCardProps) {
  // 이전값이 있을 때 (YoY/MoM): 이전 vs 이후 변화 색상
  const isPositiveChange = countBefore !== null
    ? (isNegativeSegment ? change < 0 : change > 0)
    : false
  const isNeutralChange = countBefore !== null ? change === 0 : true

  // 예상 대비 성과 색상
  const isPositiveVsExpected = isNegativeSegment ? vsExpected < 0 : vsExpected > 0

  // 세그먼트별 텍스트 색상 (CRM과 통일)
  const textColor = SEGMENT_TEXT_COLORS[segmentName] || SEGMENT_TEXT_COLORS['일반']

  return (
    <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
      {/* 헤더 */}
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <span className="font-semibold" style={{ color: textColor }}>{segmentName}</span>
          {isNegativeSegment && (
            <span className="text-xs text-slate-500">(감소가 좋음)</span>
          )}
        </div>
      </div>

      {/* 본문 */}
      <div className="p-4">
        {/* Case 1: YoY/MoM 이전값이 있을 때 - 이전 → 이후 + 예상 대비 성과 */}
        {countBefore !== null ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="text-center">
                <p className="text-xs text-slate-500">이전</p>
                <p className="text-xl font-bold text-slate-700">{countBefore}명</p>
              </div>
              <div className="flex flex-col items-center">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">이후</p>
                <p className="text-xl font-bold text-slate-700">{countAfter}명</p>
              </div>
            </div>

            {/* 실제 변화율 */}
            <div className={`px-3 py-2 rounded-lg text-center ${
              isNeutralChange ? 'bg-slate-100' :
              isPositiveChange ? 'bg-green-100' : 'bg-red-100'
            }`}>
              <span className={`text-sm font-semibold ${
                isNeutralChange ? 'text-slate-600' :
                isPositiveChange ? 'text-green-700' : 'text-red-700'
              }`}>
                {change >= 0 ? '+' : ''}{change}명 ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(1)}%)
              </span>
            </div>

            {/* 예상 대비 성과 */}
            <div className={`mt-2 px-3 py-2 rounded-lg text-center ${
              isBetterThanExpected ? 'bg-blue-50' : 'bg-amber-50'
            }`}>
              <p className="text-xs text-slate-500 mb-1">
                예상: {expectedCount}명
              </p>
              <span className={`text-xs font-medium ${
                isBetterThanExpected ? 'text-blue-600' : 'text-amber-600'
              }`}>
                {isBetterThanExpected ? '✓ 예상보다 좋음' : '△ 예상보다 저조'}
                ({vsExpected >= 0 ? '+' : ''}{vsExpected}명, {vsExpectedPercent >= 0 ? '+' : ''}{vsExpectedPercent.toFixed(1)}%)
              </span>
            </div>
          </>
        ) : hasComparison && comparisonSource === 'SEASONAL' ? (
          /* Case 2: SEASONAL - 예상 vs 이후 */
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="text-center">
                <p className="text-xs text-slate-500">예상</p>
                <p className="text-xl font-bold text-slate-500">{expectedCount}명</p>
              </div>
              <div className="flex flex-col items-center">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">실제</p>
                <p className="text-xl font-bold text-slate-700">{countAfter}명</p>
              </div>
            </div>

            {/* 예상 대비 성과 */}
            <div className={`px-3 py-2 rounded-lg text-center ${
              vsExpected === 0 ? 'bg-slate-100' :
              isPositiveVsExpected ? 'bg-green-100' : 'bg-red-100'
            }`}>
              <span className={`text-sm font-semibold ${
                vsExpected === 0 ? 'text-slate-600' :
                isPositiveVsExpected ? 'text-green-700' : 'text-red-700'
              }`}>
                {vsExpected >= 0 ? '+' : ''}{vsExpected}명 ({vsExpectedPercent >= 0 ? '+' : ''}{vsExpectedPercent.toFixed(1)}%)
              </span>
            </div>
          </>
        ) : (
          /* Case 3: 비교 데이터 없음 */
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-1">현재</p>
            <p className="text-3xl font-bold text-slate-700">{countAfter}명</p>
            <p className="text-xs text-slate-400 mt-2">비교 데이터 없음</p>
          </div>
        )}

        {/* 유입/유출 */}
        {(inflows.length > 0 || outflows.length > 0) && (
          <div className="mt-3 pt-3 border-t border-slate-200/50 space-y-2">
            {/* 유입 */}
            {inflows.length > 0 && (
              <div>
                <p className="text-xs text-green-600 font-medium mb-1">↓ 유입</p>
                <div className="space-y-1">
                  {inflows.slice(0, 3).map((inf, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">{inf.from}에서</span>
                      <span className="text-green-600 font-medium">+{inf.count}명</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* 유출 */}
            {outflows.length > 0 && (
              <div>
                <p className="text-xs text-red-600 font-medium mb-1">↑ 유출</p>
                <div className="space-y-1">
                  {outflows.slice(0, 3).map((out, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">{out.to}로</span>
                      <span className="text-red-600 font-medium">-{out.count}명</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
