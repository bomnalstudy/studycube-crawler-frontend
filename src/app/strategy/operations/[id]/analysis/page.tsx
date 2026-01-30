'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { OPERATION_SUB_TYPES } from '@/types/strategy'
import type {
  OperationPerformanceData,
  SegmentMigration,
  TicketUpgradeData,
} from '@/types/strategy'

interface OperationInfo {
  id: string
  name: string
  implementedAt: string
  cost?: number
  branches: { id: string; name: string }[]
}

interface AnalysisSummary {
  avgRevenueGrowth3m: number
  avgRevenueGrowth6m: number
  avgCustomerGrowth: number
  avgPerformanceScore: number
  totalBranches: number
  significantCount: number
  totalNewCustomers: number
  totalReturnedCustomers: number
  segmentMigrations: SegmentMigration[]
  ticketUpgrades: TicketUpgradeData[]
}

interface AnalysisData {
  operation: OperationInfo
  performances: OperationPerformanceData[]
  summary: AnalysisSummary
}

const VERDICT_STYLES = {
  EXCELLENT: { bg: 'bg-green-100', text: 'text-green-700', label: '매우 좋음' },
  GOOD: { bg: 'bg-blue-100', text: 'text-blue-700', label: '좋음' },
  NEUTRAL: { bg: 'bg-gray-100', text: 'text-gray-700', label: '보통' },
  POOR: { bg: 'bg-orange-100', text: 'text-orange-700', label: '미흡' },
  FAILED: { bg: 'bg-red-100', text: 'text-red-700', label: '실패' },
}

export default function OperationAnalysisPage() {
  const params = useParams()
  const operationId = params.id as string

  const [data, setData] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<'3m' | '6m'>('3m')
  const [activeTab, setActiveTab] = useState<'overview' | 'segment' | 'ticket' | 'visit'>('overview')

  useEffect(() => {
    fetchData()
  }, [operationId])

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/strategy/operations/${operationId}/analysis`)
      const result = await res.json()

      if (result.operation) {
        setData(result)
      } else {
        setError(result.error || '운영 변경을 찾을 수 없습니다.')
      }
    } catch (err) {
      console.error('Failed to fetch data:', err)
      setError('데이터를 불러오는 데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    if (value >= 100000000) {
      return `${(value / 100000000).toFixed(1)}억원`
    }
    if (value >= 10000) {
      return `${(value / 10000).toFixed(0)}만원`
    }
    return `${value.toLocaleString()}원`
  }

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(1)}%`
  }

  const getMonthsSinceImplementation = () => {
    if (!data) return 0
    const implementedDate = new Date(data.operation.implementedAt)
    const now = new Date()
    const months = (now.getFullYear() - implementedDate.getFullYear()) * 12 + (now.getMonth() - implementedDate.getMonth())
    return months
  }

  const monthsSince = getMonthsSinceImplementation()

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-orange-200 border-t-orange-600" />
          <p className="text-sm text-slate-500">성과 데이터를 분석하는 중...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30">
        <div className="p-6 lg:p-8 max-w-6xl mx-auto">
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="mt-4 text-slate-600 font-medium">{error}</p>
            <Link
              href="/strategy/operations"
              className="inline-flex items-center mt-6 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl transition-all"
            >
              목록으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const { operation, performances, summary } = data

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30">
      <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
        {/* 헤더 */}
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <Link href="/strategy" className="hover:text-orange-600 transition-colors">전략</Link>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <Link href="/strategy/operations" className="hover:text-orange-600 transition-colors">운영 변경</Link>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-slate-800 font-medium">성과 분석</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{operation.name}</h1>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-sm text-slate-500">
                  적용일: {new Date(operation.implementedAt).toLocaleDateString('ko-KR')} ({monthsSince}개월 경과)
                </span>
              </div>
            </div>
            <Link
              href={`/strategy/operations/${operationId}`}
              className="text-sm text-orange-600 hover:text-orange-700 font-medium"
            >
              ← 상세 정보
            </Link>
          </div>
        </div>

        {/* 경과 기간 경고 */}
        {monthsSince < 3 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-medium text-amber-800">아직 충분한 데이터가 수집되지 않았습니다</p>
              <p className="text-sm text-amber-700 mt-1">
                정확한 성과 분석을 위해서는 최소 3개월 이상의 데이터가 필요합니다.
              </p>
            </div>
          </div>
        )}

        {/* 기간 선택 & 탭 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedPeriod('3m')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedPeriod === '3m'
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-200'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              3개월 비교
            </button>
            <button
              onClick={() => setSelectedPeriod('6m')}
              disabled={monthsSince < 6}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedPeriod === '6m'
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-200'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              6개월 비교
            </button>
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
                    ? 'bg-orange-100 text-orange-700'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 전체 요약 */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500 mb-1">매출 성장률</p>
            <p className={`text-2xl font-bold ${(selectedPeriod === '3m' ? summary.avgRevenueGrowth3m : summary.avgRevenueGrowth6m) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercent(selectedPeriod === '3m' ? summary.avgRevenueGrowth3m : summary.avgRevenueGrowth6m)}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500 mb-1">고객 성장률</p>
            <p className={`text-2xl font-bold ${summary.avgCustomerGrowth >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {formatPercent(summary.avgCustomerGrowth)}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500 mb-1">신규 고객</p>
            <p className="text-2xl font-bold text-purple-600">{summary.totalNewCustomers}명</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500 mb-1">복귀 고객</p>
            <p className="text-2xl font-bold text-teal-600">{summary.totalReturnedCustomers}명</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500 mb-1">성과 점수</p>
            <p className="text-2xl font-bold text-slate-800">{summary.avgPerformanceScore.toFixed(0)}점</p>
          </div>
        </div>

        {/* 탭 콘텐츠 */}
        {activeTab === 'overview' && (
          <OverviewTab
            performances={performances}
            selectedPeriod={selectedPeriod}
            formatCurrency={formatCurrency}
            formatPercent={formatPercent}
          />
        )}

        {activeTab === 'segment' && (
          <SegmentTab
            performances={performances}
            summary={summary}
          />
        )}

        {activeTab === 'ticket' && (
          <TicketTab
            performances={performances}
            summary={summary}
            formatCurrency={formatCurrency}
            formatPercent={formatPercent}
          />
        )}

        {activeTab === 'visit' && (
          <VisitTab performances={performances} />
        )}
      </div>
    </div>
  )
}

// 개요 탭
function OverviewTab({
  performances,
  selectedPeriod,
  formatCurrency,
  formatPercent,
}: {
  performances: OperationPerformanceData[]
  selectedPeriod: '3m' | '6m'
  formatCurrency: (v: number) => string
  formatPercent: (v: number) => string
}) {
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
                      <p className="font-medium text-slate-700">{formatCurrency(before)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">적용 후 매출</p>
                      <p className="font-medium text-slate-700">{formatCurrency(after)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">성장률</p>
                      <p className={`font-medium ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercent(growth)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">고객 변화</p>
                      <p className={`font-medium ${perf.customerGrowth >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {formatPercent(perf.customerGrowth)}
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

// 세그먼트 탭
function SegmentTab({
  performances,
  summary,
}: {
  performances: OperationPerformanceData[]
  summary: AnalysisSummary
}) {
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

// 이용권 탭
function TicketTab({
  performances,
  summary,
  formatCurrency,
  formatPercent,
}: {
  performances: OperationPerformanceData[]
  summary: AnalysisSummary
  formatCurrency: (v: number) => string
  formatPercent: (v: number) => string
}) {
  const firstPerf = performances[0]

  return (
    <div className="space-y-6">
      {/* 이용권 업그레이드 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="font-semibold text-slate-800 mb-4">이용권 업그레이드 현황</h2>
        <p className="text-sm text-slate-500 mb-4">고객들이 더 높은 등급의 이용권으로 업그레이드한 현황입니다.</p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {summary.ticketUpgrades.map((upgrade, idx) => (
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
        </div>
      </div>

      {/* 이용권별 매출 변화 */}
      {firstPerf?.ticketTypeChanges && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">이용권별 매출 변화</h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">이용권</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">적용 전 매출</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">적용 후 매출</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">변화율</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">구매자 변화</th>
                </tr>
              </thead>
              <tbody>
                {firstPerf.ticketTypeChanges.map((ticket, idx) => (
                  <tr key={idx} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 px-4 font-medium text-slate-700">{ticket.ticketType}</td>
                    <td className="py-3 px-4 text-right text-slate-600">{formatCurrency(ticket.revenueBefore)}</td>
                    <td className="py-3 px-4 text-right text-slate-700 font-medium">{formatCurrency(ticket.revenueAfter)}</td>
                    <td className={`py-3 px-4 text-right font-medium ${ticket.revenueChangePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercent(ticket.revenueChangePercent)}
                    </td>
                    <td className={`py-3 px-4 text-right ${ticket.buyersChange >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {ticket.buyersChange >= 0 ? '+' : ''}{ticket.buyersChange}명
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// 방문 패턴 탭
function VisitTab({ performances }: { performances: OperationPerformanceData[] }) {
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
