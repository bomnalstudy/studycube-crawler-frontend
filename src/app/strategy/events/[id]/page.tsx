'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { formatGrowth } from '@/lib/utils/formatters'
import { isAnalysisReady, getAnalysisReadyDate, getAnalysisEndDate, formatDateStr } from '@/lib/strategy/analysis-helpers'
import { OverviewTab, SegmentTab, TicketTab, VisitTab } from '@/components/strategy/analysis'
import type { AnalysisResponse } from '@/components/strategy/analysis'
import type { EventDetail, EventStatus, EventMainType } from '@/types/strategy'

const STATUS_LABELS: Record<EventStatus, string> = {
  PLANNED: '예정', ONGOING: '진행중', COMPLETED: '완료', CANCELLED: '취소',
}

const STATUS_STYLES: Record<EventStatus, { bg: string; text: string; dot: string }> = {
  PLANNED: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  ONGOING: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  COMPLETED: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  CANCELLED: { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-400' },
}

const TYPE_COLORS: Record<EventMainType, string> = {
  PRICING: 'bg-blue-100 text-blue-700',
  PROMOTION: 'bg-purple-100 text-purple-700',
  MARKETING: 'bg-pink-100 text-pink-700',
  ENGAGEMENT: 'bg-orange-100 text-orange-700',
}

export default function EventDetailPage() {
  const params = useParams()
  const eventId = params.id as string

  const [event, setEvent] = useState<EventDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [analysisData, setAnalysisData] = useState<AnalysisResponse | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [initialCheckDone, setInitialCheckDone] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'segment' | 'ticket' | 'visit'>('overview')
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all')

  useEffect(() => {
    fetchEvent()
  }, [eventId])

  const fetchEvent = async () => {
    try {
      const res = await fetch(`/api/strategy/events/${eventId}`)
      const data = await res.json()

      if (data.success) {
        setEvent(data.data)
      } else {
        setError(data.error || '이벤트를 찾을 수 없습니다.')
      }
    } catch (err) {
      console.error('Failed to fetch event:', err)
      setError('이벤트를 불러오는 데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 저장된 분석 결과 자동 로드
  const loadSavedAnalysis = useCallback(async () => {
    if (!eventId) return
    try {
      const res = await fetch(`/api/strategy/events/${eventId}/analysis`)
      const data = await res.json()
      if (data.success && data.data) {
        setAnalysisData(data.data)
        setSelectedBranchId('all')
      }
    } catch (err) {
      console.error('Failed to load saved analysis:', err)
    } finally {
      setInitialCheckDone(true)
    }
  }, [eventId])

  // 분석 실행 (재분석 포함)
  const fetchAnalysis = async () => {
    if (!eventId) return
    setAnalysisLoading(true)
    try {
      const res = await fetch('/api/strategy/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      })
      const data = await res.json()
      if (data.success) {
        setAnalysisData(data.data)
        setSelectedBranchId('all')
      }
    } catch (err) {
      console.error('Failed to fetch analysis:', err)
    } finally {
      setAnalysisLoading(false)
    }
  }

  // 이벤트 로드 후 저장된 분석 결과 자동 확인
  useEffect(() => {
    if (event && isAnalysisReady(event.startDate, event.endDate, event.status) && !analysisData) {
      loadSavedAnalysis()
    } else if (event) {
      setInitialCheckDone(true)
    }
  }, [event, loadSavedAnalysis, analysisData])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50/30 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-purple-200 border-t-purple-600" />
          <p className="text-sm text-slate-500">이벤트 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50/30">
        <div className="p-6 lg:p-8 max-w-4xl mx-auto">
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="mt-4 text-slate-600 font-medium">{error || '이벤트를 찾을 수 없습니다.'}</p>
            <Link
              href="/strategy/events"
              className="inline-flex items-center mt-6 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 shadow-lg shadow-purple-200 transition-all"
            >
              목록으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const ready = isAnalysisReady(event.startDate, event.endDate, event.status)
  const readyDate = getAnalysisReadyDate(event.startDate, event.endDate)
  const analysisEnd = getAnalysisEndDate(event.startDate, event.endDate)
  const statusStyle = STATUS_STYLES[event.status]

  const filteredPerformances = analysisData?.performances.filter(
    (p) => selectedBranchId === 'all' || p.branchId === selectedBranchId
  ) || []

  const filteredSummary = {
    avgRevenueGrowth: filteredPerformances.length > 0
      ? filteredPerformances.reduce((sum, p) => sum + p.revenueGrowth, 0) / filteredPerformances.length : 0,
    avgVisitsGrowth: filteredPerformances.length > 0
      ? filteredPerformances.reduce((sum, p) => sum + p.visitsGrowth, 0) / filteredPerformances.length : 0,
    avgPerformanceScore: filteredPerformances.length > 0
      ? filteredPerformances.reduce((sum, p) => sum + (p.performanceScore || 0), 0) / filteredPerformances.length : 0,
    totalNewCustomers: filteredPerformances.reduce((sum, p) => sum + p.newCustomers, 0),
    totalReturnedCustomers: filteredPerformances.reduce((sum, p) => sum + p.returnedCustomers, 0),
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50/30">
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
              <Link href="/strategy" className="hover:text-purple-600 transition-colors">전략</Link>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <Link href="/strategy/events" className="hover:text-purple-600 transition-colors">이벤트</Link>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-slate-800 font-medium truncate max-w-[200px]">{event.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-800">{event.name}</h1>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                {STATUS_LABELS[event.status]}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/strategy/events/${eventId}/edit`}
              className="inline-flex items-center px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              편집
            </Link>
            <Link
              href="/strategy/events"
              className="inline-flex items-center px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
            >
              목록으로
            </Link>
          </div>
        </div>

        {/* 이벤트 정보 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <h2 className="font-semibold text-slate-800">이벤트 정보</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-slate-500 mb-1">이벤트 기간</p>
                <p className="font-medium text-slate-700">{event.startDate} ~ {event.endDate}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">분석 기간</p>
                <p className="font-medium text-slate-700">{event.startDate} ~ {formatDateStr(analysisEnd)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">유형</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {event.types.map((t, i) => (
                    <span key={i} className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[t.type as EventMainType] || 'bg-slate-100 text-slate-700'}`}>
                      {t.subType}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">대상 지점</p>
                <p className="font-medium text-slate-700">{event.branches.map((b) => b.name).join(', ')}</p>
              </div>
            </div>
            {event.description && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-sm text-slate-500 mb-1">설명</p>
                <p className="text-slate-700">{event.description}</p>
              </div>
            )}
            {event.hypothesis && (
              <div className="mt-3">
                <p className="text-sm text-slate-500 mb-1">가설</p>
                <p className="text-slate-700">{event.hypothesis}</p>
              </div>
            )}
          </div>
        </div>

        {/* 분석 섹션 */}
        {!ready ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="mt-4 text-slate-600 font-medium">성과 분석 대기 중</p>
            <p className="mt-2 text-sm text-slate-400">
              {event.status === 'COMPLETED'
                ? `분석 가능 예정일: ${formatDateStr(readyDate)}`
                : event.status === 'CANCELLED'
                ? '취소된 이벤트는 분석할 수 없습니다.'
                : `이벤트가 완료되면 분석할 수 있습니다. (분석 가능 예정일: ${formatDateStr(readyDate)})`
              }
            </p>
          </div>
        ) : !initialCheckDone || analysisLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600" />
              <p className="text-sm text-slate-500">
                {analysisLoading ? '성과를 분석하는 중...' : '저장된 분석 결과를 확인하는 중...'}
              </p>
            </div>
          </div>
        ) : analysisData ? (
          <div className="space-y-6">
            {/* 재분석 버튼 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {analysisData.calculatedAt && (
                  <span className="text-sm text-slate-400">
                    마지막 분석: {new Date(analysisData.calculatedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                )}
              </div>
              <button
                onClick={fetchAnalysis}
                disabled={analysisLoading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-xl hover:bg-purple-100 disabled:opacity-50 transition-all"
              >
                <svg className={`w-4 h-4 ${analysisLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {analysisLoading ? '재분석 중...' : '재분석'}
              </button>
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
                  <p className="text-sm text-orange-700 mb-3">분석 기간 중 아래 외부 요인이 영향을 미칠 수 있습니다.</p>
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

            {/* 요약 카드 */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <p className="text-sm text-slate-500 mb-1">매출 성장률</p>
                <p className={`text-2xl font-bold ${filteredSummary.avgRevenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatGrowth(filteredSummary.avgRevenueGrowth)}
                </p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <p className="text-sm text-slate-500 mb-1">방문 성장률</p>
                <p className={`text-2xl font-bold ${filteredSummary.avgVisitsGrowth >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {formatGrowth(filteredSummary.avgVisitsGrowth)}
                </p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <p className="text-sm text-slate-500 mb-1">신규 고객</p>
                <p className="text-2xl font-bold text-purple-600">{filteredSummary.totalNewCustomers}명</p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <p className="text-sm text-slate-500 mb-1">복귀 고객</p>
                <p className="text-2xl font-bold text-teal-600">{filteredSummary.totalReturnedCustomers}명</p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <p className="text-sm text-slate-500 mb-1">평균 성과 점수</p>
                <p className="text-2xl font-bold text-slate-800">{filteredSummary.avgPerformanceScore.toFixed(0)}점</p>
              </div>
            </div>

            {/* 지점 필터 & 탭 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-slate-600">지점 선택:</label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-sm"
                >
                  <option value="all">전체 지점</option>
                  {analysisData.performances.map((perf) => (
                    <option key={perf.branchId} value={perf.branchId}>{perf.branchName}</option>
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
                      activeTab === tab.id ? 'bg-purple-100 text-purple-700' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 탭 콘텐츠 */}
            {activeTab === 'overview' && (
              <OverviewTab performances={filteredPerformances} dataAvailability={analysisData.dataAvailability} />
            )}
            {activeTab === 'segment' && (
              <SegmentTab performances={filteredPerformances} />
            )}
            {activeTab === 'ticket' && (
              <TicketTab performances={filteredPerformances} summary={analysisData.summary} />
            )}
            {activeTab === 'visit' && (
              <VisitTab performances={filteredPerformances} />
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="mt-4 text-slate-600 font-medium">성과 분석이 가능합니다</p>
            <p className="mt-1 text-sm text-slate-400">분석 기간: {event.startDate} ~ {formatDateStr(analysisEnd)}</p>
            <button
              onClick={fetchAnalysis}
              disabled={analysisLoading}
              className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 shadow-lg shadow-purple-200 disabled:opacity-50 transition-all"
            >
              분석 실행
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
