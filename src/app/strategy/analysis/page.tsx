'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type {
  EventListItem,
  EventPerformanceData,
  ExternalFactorListItem,
  ComparisonType,
  SegmentMigration,
  TicketUpgradeData,
} from '@/types/strategy'

interface AnalysisSummary {
  avgRevenueGrowth: number
  avgVisitsGrowth: number
  avgPerformanceScore: number
  totalBranches: number
  significantCount: number
  totalNewCustomers: number
  totalReturnedCustomers: number
  segmentMigrations: SegmentMigration[]
  ticketUpgrades: TicketUpgradeData[]
}

interface AnalysisResponse {
  event: {
    id: string
    name: string
    startDate: string
    endDate: string
    status: string
    types: { type: string; subType: string }[]
    branches: { id: string; name: string }[]
  }
  performances: EventPerformanceData[]
  externalFactors: ExternalFactorListItem[]
  dataAvailability: {
    branchId: string
    branchName: string
    hasYoyData: boolean
    oldestDataDate: string
  }[]
  summary: AnalysisSummary
}

const VERDICT_STYLES = {
  EXCELLENT: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: '매우 좋음' },
  GOOD: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: '좋음' },
  NEUTRAL: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', label: '보통' },
  POOR: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', label: '미흡' },
  FAILED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: '실패' },
}

function AnalysisContent() {
  const searchParams = useSearchParams()
  const eventIdParam = searchParams.get('eventId')

  const [events, setEvents] = useState<EventListItem[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>(eventIdParam || '')
  const [analysisData, setAnalysisData] = useState<AnalysisResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [eventsLoading, setEventsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'segment' | 'ticket' | 'visit'>('overview')
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all')

  useEffect(() => {
    fetchEvents()
  }, [])

  useEffect(() => {
    if (selectedEventId) {
      fetchAnalysis()
    }
  }, [selectedEventId])

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/strategy/events')
      const data = await res.json()
      if (data.success) {
        setEvents(data.data)
        if (!eventIdParam && data.data.length > 0) {
          setSelectedEventId(data.data[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to fetch events:', error)
    } finally {
      setEventsLoading(false)
    }
  }

  const fetchAnalysis = async () => {
    if (!selectedEventId) return

    setLoading(true)
    try {
      const res = await fetch('/api/strategy/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: selectedEventId }),
      })
      const data = await res.json()
      if (data.success) {
        setAnalysisData(data.data)
        setSelectedBranchId('all')
      }
    } catch (error) {
      console.error('Failed to fetch analysis:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    if (value >= 100000000) return `${(value / 100000000).toFixed(1)}억원`
    if (value >= 10000) return `${(value / 10000).toFixed(0)}만원`
    return `${value.toLocaleString('ko-KR')}원`
  }

  const formatGrowth = (value: number) => {
    const prefix = value >= 0 ? '+' : ''
    return `${prefix}${value.toFixed(1)}%`
  }

  const getVerdictStyle = (verdict: EventPerformanceData['verdict']) => {
    return VERDICT_STYLES[verdict || 'NEUTRAL'] || VERDICT_STYLES.NEUTRAL
  }

  const getComparisonTypeLabel = (type: ComparisonType) => {
    return type === 'YOY' ? '전년 동기 대비' : '전월 동일 요일 대비'
  }

  const filteredPerformances = analysisData?.performances.filter(
    (p) => selectedBranchId === 'all' || p.branchId === selectedBranchId
  ) || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
              <Link href="/strategy" className="hover:text-blue-600 transition-colors">전략</Link>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-slate-800 font-medium">성과 분석</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">이벤트 성과 분석</h1>
            <p className="text-sm text-slate-500 mt-1">이벤트 성과를 분석하고 인사이트를 확인하세요</p>
          </div>
        </div>

        {/* 이벤트 선택 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 className="font-semibold text-slate-800 mb-4">분석 대상 선택</h2>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              disabled={eventsLoading}
              className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
            >
              <option value="">이벤트를 선택하세요</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name} ({event.startDate} ~ {event.endDate})
                </option>
              ))}
            </select>
            <button
              onClick={fetchAnalysis}
              disabled={!selectedEventId || loading}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none transition-all"
            >
              {loading ? '분석 중...' : '분석 실행'}
            </button>
          </div>
        </div>

        {/* 분석 결과 */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600" />
              <p className="text-sm text-slate-500">성과를 분석하는 중...</p>
            </div>
          </div>
        ) : analysisData ? (
          <div className="space-y-6">
            {/* 이벤트 요약 */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <h2 className="font-semibold text-slate-800">이벤트 정보</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">이벤트명</p>
                    <p className="font-semibold text-slate-800">{analysisData.event.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">기간</p>
                    <p className="font-medium text-slate-700">{analysisData.event.startDate} ~ {analysisData.event.endDate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">유형</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {analysisData.event.types.map((t, i) => (
                        <span key={i} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                          {t.subType}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">대상 지점</p>
                    <p className="font-medium text-slate-700">{analysisData.event.branches.map((b) => b.name).join(', ')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 외부 요인 경고 */}
            {analysisData.externalFactors.length > 0 && (
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-orange-200">
                  <h2 className="font-semibold text-orange-800 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    겹치는 외부 요인 감지
                  </h2>
                </div>
                <div className="p-5">
                  <p className="text-sm text-orange-700 mb-3">
                    이벤트 기간 중 아래 외부 요인이 영향을 미칠 수 있습니다.
                  </p>
                  <div className="space-y-2">
                    {analysisData.externalFactors.map((factor) => (
                      <div key={factor.id} className="flex items-center gap-2 text-sm bg-white/50 p-2 rounded-lg">
                        <span className="px-2 py-0.5 bg-orange-200 text-orange-800 rounded-full text-xs font-medium">{factor.type}</span>
                        <span className="text-orange-900 font-medium">{factor.name}</span>
                        <span className="text-orange-600">({factor.startDate} ~ {factor.endDate})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 전체 요약 */}
            {analysisData.summary && (
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                  <p className="text-sm text-slate-500 mb-1">매출 성장률</p>
                  <p className={`text-2xl font-bold ${analysisData.summary.avgRevenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatGrowth(analysisData.summary.avgRevenueGrowth)}
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                  <p className="text-sm text-slate-500 mb-1">방문 성장률</p>
                  <p className={`text-2xl font-bold ${analysisData.summary.avgVisitsGrowth >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {formatGrowth(analysisData.summary.avgVisitsGrowth)}
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                  <p className="text-sm text-slate-500 mb-1">신규 고객</p>
                  <p className="text-2xl font-bold text-purple-600">{analysisData.summary.totalNewCustomers}명</p>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                  <p className="text-sm text-slate-500 mb-1">복귀 고객</p>
                  <p className="text-2xl font-bold text-teal-600">{analysisData.summary.totalReturnedCustomers}명</p>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                  <p className="text-sm text-slate-500 mb-1">평균 성과 점수</p>
                  <p className="text-2xl font-bold text-slate-800">{analysisData.summary.avgPerformanceScore.toFixed(0)}점</p>
                </div>
              </div>
            )}

            {/* 지점 필터 & 탭 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-slate-600">지점 선택:</label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                >
                  <option value="all">전체 지점</option>
                  {analysisData.performances.map((perf) => (
                    <option key={perf.branchId} value={perf.branchId}>
                      {perf.branchName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-1 bg-white rounded-lg p-1 border border-slate-200">
                {[
                  { id: 'overview', label: '개요' },
                  { id: 'segment', label: '세그먼트' },
                  { id: 'ticket', label: '이용권' },
                  { id: 'visit', label: '방문패턴' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 탭 콘텐츠 */}
            {activeTab === 'overview' && (
              <OverviewTab
                performances={filteredPerformances}
                dataAvailability={analysisData.dataAvailability}
                formatCurrency={formatCurrency}
                formatGrowth={formatGrowth}
                getVerdictStyle={getVerdictStyle}
                getComparisonTypeLabel={getComparisonTypeLabel}
              />
            )}

            {activeTab === 'segment' && (
              <SegmentTab
                performances={filteredPerformances}
                summary={analysisData.summary}
              />
            )}

            {activeTab === 'ticket' && (
              <TicketTab
                performances={filteredPerformances}
                summary={analysisData.summary}
                formatCurrency={formatCurrency}
                formatGrowth={formatGrowth}
              />
            )}

            {activeTab === 'visit' && (
              <VisitTab performances={filteredPerformances} />
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="mt-4 text-slate-600 font-medium">이벤트를 선택하고 분석을 실행하세요</p>
            <p className="mt-1 text-sm text-slate-400">계절성 보정과 통계 분석 결과를 확인할 수 있습니다</p>
          </div>
        )}
      </div>
    </div>
  )
}

// 개요 탭
function OverviewTab({
  performances,
  dataAvailability,
  formatCurrency,
  formatGrowth,
  getVerdictStyle,
  getComparisonTypeLabel,
}: {
  performances: EventPerformanceData[]
  dataAvailability: { branchId: string; branchName: string; hasYoyData: boolean; oldestDataDate: string }[]
  formatCurrency: (v: number) => string
  formatGrowth: (v: number) => string
  getVerdictStyle: (v: EventPerformanceData['verdict']) => { bg: string; text: string; border: string; label: string }
  getComparisonTypeLabel: (v: ComparisonType) => string
}) {
  return (
    <div className="space-y-4">
      {performances.map((perf) => {
        const dataInfo = dataAvailability.find((d) => d.branchId === perf.branchId)
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
                  {!dataInfo?.hasYoyData && !perf.isNewBranch && perf.comparisonType === 'MOM' && (
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
                  <p className="text-2xl font-bold text-slate-800 mt-1">{formatCurrency(perf.revenueAfter)}</p>
                  <p className={`text-sm font-semibold mt-1 ${perf.revenueGrowth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatGrowth(perf.revenueGrowth)}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">이전: {formatCurrency(perf.revenueBefore)}</p>
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
                        <p className="text-indigo-600">이벤트 지점 성장률</p>
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
                        <p className="text-indigo-600">순수 이벤트 효과</p>
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
                  <TicketRevenueItem label="당일권" after={perf.dayTicketRevenue} before={perf.dayTicketRevenueBefore} formatCurrency={formatCurrency} />
                  <TicketRevenueItem label="시간권" after={perf.timeTicketRevenue} before={perf.timeTicketRevenueBefore} formatCurrency={formatCurrency} />
                  <TicketRevenueItem label="기간권" after={perf.termTicketRevenue} before={perf.termTicketRevenueBefore} formatCurrency={formatCurrency} />
                  <TicketRevenueItem label="고정석" after={perf.fixedTicketRevenue} before={perf.fixedTicketRevenueBefore} formatCurrency={formatCurrency} />
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
                        ? '이벤트 효과 확인됨'
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

// 점수 항목 컴포넌트
function ScoreItem({ label, score, reason, positive }: { label: string; score: number; reason: string; positive?: boolean }) {
  const isZero = score === 0
  return (
    <div className={`p-3 rounded-lg border ${isZero ? 'bg-slate-50 border-slate-200' : positive ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-600">{label}</span>
        <span className={`text-sm font-semibold ${isZero ? 'text-slate-600' : positive ? 'text-green-600' : 'text-red-600'}`}>
          {score > 0 ? '+' : ''}{score}점
        </span>
      </div>
      <p className="text-xs text-slate-500 mt-1 truncate" title={reason}>{reason}</p>
    </div>
  )
}

// 이용권 매출 항목 컴포넌트
function TicketRevenueItem({ label, after, before, formatCurrency }: { label: string; after?: number; before?: number; formatCurrency: (v: number) => string }) {
  const afterVal = after || 0
  const beforeVal = before || 0
  const growth = beforeVal > 0 ? ((afterVal - beforeVal) / beforeVal) * 100 : 0

  return (
    <div className="p-3 bg-slate-50 rounded-xl">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-semibold text-slate-700 mt-1">{formatCurrency(afterVal)}</p>
      {beforeVal > 0 && (
        <p className={`text-xs mt-1 ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {growth >= 0 ? '+' : ''}{growth.toFixed(1)}% (이전: {formatCurrency(beforeVal)})
        </p>
      )}
    </div>
  )
}

// 세그먼트 카드 컴포넌트
function SegmentCard({
  segmentName,
  countBefore,
  countAfter,
  change,
  changePercent,
  isNegativeSegment,
  inflows,
  outflows,
}: {
  segmentName: string
  countBefore: number
  countAfter: number
  change: number
  changePercent: number
  isNegativeSegment: boolean
  inflows: { from: string; count: number }[]
  outflows: { to: string; count: number }[]
}) {
  // 부정적 세그먼트의 감소는 긍정적 (초록색)
  // 부정적 세그먼트의 증가는 부정적 (빨간색)
  // 긍정적 세그먼트의 증가는 긍정적 (초록색)
  // 긍정적 세그먼트의 감소는 부정적 (빨간색)
  const isPositiveChange = isNegativeSegment ? change < 0 : change > 0
  const isNeutralChange = change === 0

  // 세그먼트별 색상 테마
  const segmentColors: Record<string, { bg: string; border: string; text: string; light: string }> = {
    'VIP': { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', light: 'bg-amber-100' },
    '단골': { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', light: 'bg-blue-100' },
    '일반': { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', light: 'bg-slate-100' },
    '신규': { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', light: 'bg-purple-100' },
    '이탈위험': { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', light: 'bg-orange-100' },
    '이탈': { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', light: 'bg-red-100' },
    '복귀': { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', light: 'bg-teal-100' },
  }

  const colors = segmentColors[segmentName] || segmentColors['일반']

  return (
    <div className={`rounded-2xl ${colors.bg} border ${colors.border} overflow-hidden`}>
      {/* 헤더 */}
      <div className={`px-4 py-3 ${colors.light} border-b ${colors.border}`}>
        <div className="flex items-center justify-between">
          <span className={`font-semibold ${colors.text}`}>{segmentName}</span>
          {isNegativeSegment && (
            <span className="text-xs text-slate-500">(감소가 좋음)</span>
          )}
        </div>
      </div>

      {/* 본문 */}
      <div className="p-4">
        {/* 인원 변화 */}
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

        {/* 변화율 막대 */}
        <div className={`px-3 py-2 rounded-lg text-center ${
          isNeutralChange ? 'bg-slate-100' :
          isPositiveChange ? 'bg-green-100' : 'bg-red-100'
        }`}>
          <span className={`text-sm font-semibold ${
            isNeutralChange ? 'text-slate-600' :
            isPositiveChange ? 'text-green-700' : 'text-red-700'
          }`}>
            {change >= 0 ? '+' : ''}{change}명 ({changePercent >= 0 ? '+' : ''}{changePercent}%)
          </span>
        </div>

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

// 세그먼트 탭
function SegmentTab({
  performances,
  summary,
}: {
  performances: EventPerformanceData[]
  summary: AnalysisSummary
}) {
  const firstPerf = performances[0]
  const segmentChanges = firstPerf?.segmentChanges || []
  const migrations = firstPerf?.segmentMigrations || []

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
        <h2 className="font-semibold text-slate-800 mb-2">세그먼트별 변화</h2>
        <p className="text-sm text-slate-500 mb-6">이벤트 전후 각 세그먼트의 고객 수 변화와 유입/유출 현황입니다.</p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {segmentChanges.map((seg) => {
            const { inflows, outflows } = getFlowsForSegment(seg.segmentName)
            return (
              <SegmentCard
                key={seg.segmentName}
                segmentName={seg.segmentName}
                countBefore={seg.countBefore}
                countAfter={seg.countAfter}
                change={seg.change}
                changePercent={seg.changePercent}
                isNegativeSegment={seg.isNegativeSegment}
                inflows={inflows}
                outflows={outflows}
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
                .map((m, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm bg-white/60 p-2 rounded-lg">
                    <span className="text-slate-600">
                      {m.fromSegment} → {m.toSegment}
                    </span>
                    <span className="font-semibold text-green-700">{m.count}명</span>
                  </div>
                ))}
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
                .map((m, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm bg-white/60 p-2 rounded-lg">
                    <span className="text-slate-600">
                      {m.fromSegment} → {m.toSegment}
                    </span>
                    <span className="font-semibold text-red-700">{m.count}명</span>
                  </div>
                ))}
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
                      return (
                        <div
                          key={seg.segmentName}
                          className={`p-2 rounded-lg text-center ${
                            isNeutral ? 'bg-white' :
                            isPositiveChange ? 'bg-green-100' : 'bg-red-100'
                          }`}
                        >
                          <p className="text-xs text-slate-500">{seg.segmentName}</p>
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

// 이용권 탭
function TicketTab({
  performances,
  summary,
  formatCurrency,
  formatGrowth,
}: {
  performances: EventPerformanceData[]
  summary: AnalysisSummary
  formatCurrency: (v: number) => string
  formatGrowth: (v: number) => string
}) {
  const firstPerf = performances[0]

  return (
    <div className="space-y-6">
      {/* 이용권 업그레이드 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="font-semibold text-slate-800 mb-4">이용권 업그레이드 현황</h2>
        <p className="text-sm text-slate-500 mb-4">고객들이 더 높은 등급의 이용권으로 업그레이드한 현황입니다.</p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {summary.ticketUpgrades?.map((upgrade, idx) => (
            <div key={idx} className="p-4 bg-purple-50 rounded-xl border border-purple-100">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-slate-600">{upgrade.fromTicket}</span>
                <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
                <span className="text-sm font-medium text-purple-700">{upgrade.toTicket}</span>
              </div>
              <p className="text-2xl font-bold text-purple-700">{upgrade.count}명</p>
              <p className="text-xs text-purple-600">업그레이드율 {upgrade.upgradeRate}%</p>
            </div>
          ))}
          {(!summary.ticketUpgrades || summary.ticketUpgrades.length === 0) && (
            <p className="text-sm text-slate-400 col-span-full">업그레이드 데이터가 없습니다.</p>
          )}
        </div>
      </div>

      {/* 지점별 이용권 업그레이드 */}
      {performances.length > 0 && performances[0]?.ticketUpgrades && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">지점별 이용권 업그레이드</h2>

          <div className="space-y-4">
            {performances.map((perf) => {
              const upgrades = perf.ticketUpgrades
              if (!upgrades || upgrades.length === 0) return null

              return (
                <div key={perf.id} className="p-4 bg-slate-50 rounded-xl">
                  <p className="font-medium text-slate-700 mb-3">{perf.branchName}</p>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                    {upgrades.map((u, idx) => (
                      <div key={idx} className="p-2 bg-purple-100 rounded-lg">
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          {u.fromTicket} → {u.toTicket}
                        </div>
                        <p className="font-semibold text-purple-700 mt-1">{u.count}명</p>
                        <p className="text-xs text-purple-600">{u.upgradeRate}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 이용권별 매출 비교 (첫 번째 지점 기준) */}
      {firstPerf && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">이용권별 매출 변화</h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">이용권</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">이벤트 전</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">이벤트 후</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">변화</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: '당일권', before: firstPerf.dayTicketRevenueBefore, after: firstPerf.dayTicketRevenue },
                  { name: '시간권', before: firstPerf.timeTicketRevenueBefore, after: firstPerf.timeTicketRevenue },
                  { name: '기간권', before: firstPerf.termTicketRevenueBefore, after: firstPerf.termTicketRevenue },
                  { name: '고정석', before: firstPerf.fixedTicketRevenueBefore, after: firstPerf.fixedTicketRevenue },
                ].map((ticket, idx) => {
                  const beforeVal = ticket.before || 0
                  const afterVal = ticket.after || 0
                  const growth = beforeVal > 0 ? ((afterVal - beforeVal) / beforeVal) * 100 : 0

                  return (
                    <tr key={idx} className="border-b border-slate-100 last:border-0">
                      <td className="py-3 px-4 font-medium text-slate-700">{ticket.name}</td>
                      <td className="py-3 px-4 text-right text-slate-600">{formatCurrency(beforeVal)}</td>
                      <td className="py-3 px-4 text-right text-slate-700 font-medium">{formatCurrency(afterVal)}</td>
                      <td className={`py-3 px-4 text-right font-medium ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatGrowth(growth)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// 방문 패턴 탭
function VisitTab({ performances }: { performances: EventPerformanceData[] }) {
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
      {performances.length > 1 && (
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
      )}
    </div>
  )
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-blue-200 border-t-blue-600" />
          <p className="text-sm text-slate-500">불러오는 중...</p>
        </div>
      </div>
    }>
      <AnalysisContent />
    </Suspense>
  )
}
