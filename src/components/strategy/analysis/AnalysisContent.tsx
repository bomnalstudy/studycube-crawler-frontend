'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { formatGrowth } from '@/lib/utils/formatters'
import type { EventListItem } from '@/types/strategy'
import type { AnalysisResponse } from './types'
import { OverviewTab } from './OverviewTab'
import { SegmentTab } from './SegmentTab'
import { TicketTab } from './TicketTab'
import { VisitTab } from './VisitTab'

export function AnalysisContent() {
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

  const filteredPerformances = analysisData?.performances.filter(
    (p) => selectedBranchId === 'all' || p.branchId === selectedBranchId
  ) || []

  // 지점 필터링에 따른 요약 계산
  const filteredSummary = {
    avgRevenueGrowth: filteredPerformances.length > 0
      ? filteredPerformances.reduce((sum, p) => sum + p.revenueGrowth, 0) / filteredPerformances.length
      : 0,
    avgVisitsGrowth: filteredPerformances.length > 0
      ? filteredPerformances.reduce((sum, p) => sum + p.visitsGrowth, 0) / filteredPerformances.length
      : 0,
    avgPerformanceScore: filteredPerformances.length > 0
      ? filteredPerformances.reduce((sum, p) => sum + (p.performanceScore || 0), 0) / filteredPerformances.length
      : 0,
    totalNewCustomers: filteredPerformances.reduce((sum, p) => sum + p.newCustomers, 0),
    totalReturnedCustomers: filteredPerformances.reduce((sum, p) => sum + p.returnedCustomers, 0),
  }

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

            {/* 전체 요약 (지점 필터링 적용) */}
            {analysisData.summary && (
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                  <p className="text-sm text-slate-500 mb-1">
                    매출 성장률
                    {selectedBranchId !== 'all' && <span className="text-xs text-blue-500 ml-1">(선택 지점)</span>}
                  </p>
                  <p className={`text-2xl font-bold ${filteredSummary.avgRevenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatGrowth(filteredSummary.avgRevenueGrowth)}
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                  <p className="text-sm text-slate-500 mb-1">
                    방문 성장률
                    {selectedBranchId !== 'all' && <span className="text-xs text-blue-500 ml-1">(선택 지점)</span>}
                  </p>
                  <p className={`text-2xl font-bold ${filteredSummary.avgVisitsGrowth >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {formatGrowth(filteredSummary.avgVisitsGrowth)}
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                  <p className="text-sm text-slate-500 mb-1">
                    신규 고객
                    {selectedBranchId !== 'all' && <span className="text-xs text-blue-500 ml-1">(선택 지점)</span>}
                  </p>
                  <p className="text-2xl font-bold text-purple-600">{filteredSummary.totalNewCustomers}명</p>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                  <p className="text-sm text-slate-500 mb-1">
                    복귀 고객
                    {selectedBranchId !== 'all' && <span className="text-xs text-blue-500 ml-1">(선택 지점)</span>}
                  </p>
                  <p className="text-2xl font-bold text-teal-600">{filteredSummary.totalReturnedCustomers}명</p>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                  <p className="text-sm text-slate-500 mb-1">
                    평균 성과 점수
                    {selectedBranchId !== 'all' && <span className="text-xs text-blue-500 ml-1">(선택 지점)</span>}
                  </p>
                  <p className="text-2xl font-bold text-slate-800">{filteredSummary.avgPerformanceScore.toFixed(0)}점</p>
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
              />
            )}

            {activeTab === 'segment' && (
              <SegmentTab
                performances={filteredPerformances}
              />
            )}

            {activeTab === 'ticket' && (
              <TicketTab
                performances={filteredPerformances}
                summary={analysisData.summary}
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
