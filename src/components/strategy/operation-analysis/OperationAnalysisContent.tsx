'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { formatGrowth } from '@/lib/utils/formatters'
import type { AnalysisData } from './types'
import { OverviewTab } from './OverviewTab'
import { SegmentTab } from './SegmentTab'
import { TicketTab } from './TicketTab'
import { VisitTab } from './VisitTab'

export function OperationAnalysisContent() {
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
              {formatGrowth(selectedPeriod === '3m' ? summary.avgRevenueGrowth3m : summary.avgRevenueGrowth6m)}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500 mb-1">고객 성장률</p>
            <p className={`text-2xl font-bold ${summary.avgCustomerGrowth >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {formatGrowth(summary.avgCustomerGrowth)}
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
          />
        )}

        {activeTab === 'visit' && (
          <VisitTab performances={performances} />
        )}
      </div>
    </div>
  )
}
