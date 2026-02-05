'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { formatGrowth } from '@/lib/utils/formatters'
import { OPERATION_SUB_TYPES, OPERATION_STATUS } from '@/types/strategy'
import type { OperationDetail } from '@/types/strategy'
import type { AnalysisData } from '@/components/strategy/operation-analysis'
import { OverviewTab, SegmentTab, TicketTab, VisitTab } from '@/components/strategy/operation-analysis'

export default function OperationDetailPage() {
  const params = useParams()
  const operationId = params.id as string

  const [operation, setOperation] = useState<OperationDetail | null>(null)
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [initialCheckDone, setInitialCheckDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<'1m' | '3m' | '6m'>('1m')
  const [activeTab, setActiveTab] = useState<'overview' | 'segment' | 'ticket' | 'visit'>('overview')

  useEffect(() => {
    fetchOperation()
  }, [operationId])

  const fetchOperation = async () => {
    try {
      const res = await fetch(`/api/strategy/operations/${operationId}`)
      const data = await res.json()

      if (data.operation) {
        setOperation(data.operation)
      } else {
        setError(data.error || '운영 변경을 찾을 수 없습니다.')
      }
    } catch (err) {
      console.error('Failed to fetch operation:', err)
      setError('운영 변경을 불러오는 데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 저장된 분석 결과 자동 로드
  const loadSavedAnalysis = useCallback(async () => {
    try {
      const res = await fetch(`/api/strategy/operations/${operationId}/analysis`)
      const result = await res.json()
      if (result.operation) {
        setAnalysisData(result)
      }
    } catch (err) {
      console.error('Failed to load saved analysis:', err)
    } finally {
      setInitialCheckDone(true)
    }
  }, [operationId])

  // operation이 로드되고 분석 가능한 상태면 저장된 분석 자동 로드
  useEffect(() => {
    if (!operation || initialCheckDone) return
    if (operation.status !== 'IMPLEMENTED') {
      setInitialCheckDone(true)
      return
    }
    const implemented = new Date(operation.implementedAt)
    const analysisReady = new Date(implemented)
    analysisReady.setDate(analysisReady.getDate() + 30)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (today > analysisReady) {
      loadSavedAnalysis()
    } else {
      setInitialCheckDone(true)
    }
  }, [operation, initialCheckDone, loadSavedAnalysis])

  // 분석 실행 (첫 분석 및 재분석 공용)
  const fetchAnalysis = async () => {
    console.log('[재분석] 시작 - operationId:', operationId)
    setAnalysisLoading(true)
    setError(null)
    try {
      console.log('[재분석] GET 요청 전송 중...')
      const res = await fetch(`/api/strategy/operations/${operationId}/analysis?compute=true`)

      console.log('[재분석] 응답 받음:', res.status, res.statusText)

      if (!res.ok) {
        throw new Error(`분석 요청 실패: ${res.status} ${res.statusText}`)
      }

      const result = await res.json()
      console.log('[재분석] 응답 데이터:', result)

      if (result.error) {
        setError(result.error)
        return
      }

      if (result.operation) {
        console.log('[재분석] 데이터 업데이트 중...')
        setAnalysisData(result)
        console.log('[재분석] 완료!')
      } else {
        setError('분석 결과를 불러오는 데 실패했습니다.')
      }
    } catch (err) {
      console.error('[재분석] 에러 발생:', err)
      setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.')
    } finally {
      setAnalysisLoading(false)
    }
  }

  const getMonthsSinceImplementation = () => {
    if (!operation) return 0
    const implementedDate = new Date(operation.implementedAt)
    const now = new Date()
    return (now.getFullYear() - implementedDate.getFullYear()) * 12 + (now.getMonth() - implementedDate.getMonth())
  }

  const monthsSince = getMonthsSinceImplementation()

  const isAnalysisAvailable = (() => {
    if (!operation || operation.status !== 'IMPLEMENTED') return false
    const implemented = new Date(operation.implementedAt)
    const analysisReady = new Date(implemented)
    analysisReady.setDate(analysisReady.getDate() + 30)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today > analysisReady
  })()

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-orange-200 border-t-orange-600" />
          <p className="text-sm text-slate-500">운영 변경 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error || !operation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30">
        <div className="p-6 lg:p-8 max-w-4xl mx-auto">
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="mt-4 text-slate-600 font-medium">{error || '운영 변경을 찾을 수 없습니다.'}</p>
            <Link
              href="/strategy/operations"
              className="inline-flex items-center mt-6 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-200 transition-all"
            >
              목록으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const statusStyle: Record<string, { bg: string; text: string; dot: string }> = {
    PLANNED: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
    IMPLEMENTED: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
    CANCELLED: { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-400' },
  }
  const currentStatusStyle = statusStyle[operation.status] || statusStyle.PLANNED

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30">
      <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
        {/* 브레드크럼 */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/strategy" className="hover:text-orange-600 transition-colors">전략</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <Link href="/strategy/operations" className="hover:text-orange-600 transition-colors">운영 변경</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-slate-800 font-medium truncate max-w-[200px]">{operation.name}</span>
        </div>

        {/* 헤더 */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-800">{operation.name}</h1>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${currentStatusStyle.bg} ${currentStatusStyle.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${currentStatusStyle.dot}`} />
                {OPERATION_STATUS[operation.status]}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">운영 변경 상세 정보 및 성과 분석</p>
          </div>
          <div className="flex gap-3">
            <Link
              href={`/strategy/operations/${operationId}/edit`}
              className="inline-flex items-center px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              수정
            </Link>
            <Link
              href="/strategy/operations"
              className="inline-flex items-center px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all"
            >
              목록으로
            </Link>
          </div>
        </div>

        {/* 운영 변경 상세 정보 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 className="font-semibold text-slate-800 mb-4">운영 변경 정보</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-slate-400 mb-1">유형</p>
              <p className="text-sm font-medium text-slate-700">
                {OPERATION_SUB_TYPES[operation.subType]}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">적용일</p>
              <p className="text-sm font-medium text-slate-700">
                {new Date(operation.implementedAt).toLocaleDateString('ko-KR')}
                {monthsSince > 0 && (
                  <span className="text-slate-400 ml-1">({monthsSince}개월 경과)</span>
                )}
              </p>
            </div>
            {operation.branches.length > 0 && (
              <div>
                <p className="text-xs text-slate-400 mb-1">적용 지점</p>
                <div className="flex flex-wrap gap-1">
                  {operation.branches.map((b) => (
                    <span key={b.id} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                      {b.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {operation.cost != null && operation.cost > 0 && (
              <div>
                <p className="text-xs text-slate-400 mb-1">비용</p>
                <p className="text-sm font-medium text-slate-700">
                  {operation.cost.toLocaleString('ko-KR')}원
                </p>
              </div>
            )}
          </div>
          {operation.description && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400 mb-1">설명</p>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{operation.description}</p>
            </div>
          )}
          {operation.expectedEffect && (
            <div className="mt-3">
              <p className="text-xs text-slate-400 mb-1">예상 효과</p>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{operation.expectedEffect}</p>
            </div>
          )}
        </div>

        {/* 성과 분석 섹션 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">성과 분석</h2>
          </div>

          {!isAnalysisAvailable ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="mt-4 font-medium text-slate-700">성과 분석 대기 중</p>
              <p className="text-sm text-slate-500 mt-1">
                {operation.status !== 'IMPLEMENTED'
                  ? '운영 변경이 적용 완료된 후 분석이 가능합니다.'
                  : `적용일로부터 30일 이후 분석이 가능합니다. (${new Date(new Date(operation.implementedAt).getTime() + 31 * 24 * 60 * 60 * 1000).toLocaleDateString('ko-KR')} 이후)`}
              </p>
            </div>
          ) : !initialCheckDone ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-200 border-t-orange-600 mx-auto" />
              <p className="mt-4 text-sm text-slate-500">분석 데이터 확인 중...</p>
            </div>
          ) : !analysisData ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="mt-4 font-medium text-slate-700">성과 분석 준비 완료</p>
              <p className="text-sm text-slate-500 mt-1">
                적용 후 {monthsSince}개월이 경과했습니다. 분석을 실행해보세요.
              </p>
              <button
                onClick={fetchAnalysis}
                disabled={analysisLoading}
                className="mt-4 inline-flex items-center px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-200 transition-all disabled:opacity-60"
              >
                {analysisLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    분석 중...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    분석 실행
                  </>
                )}
              </button>
            </div>
          ) : null}
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium text-red-800">분석 오류</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* 분석 결과 */}
        {analysisData && (
          <>
            {/* 재분석 버튼 & 마지막 분석 시점 */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-400">
                {analysisData.calculatedAt && (
                  <span>
                    마지막 분석: {new Date(analysisData.calculatedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                )}
              </div>
              <button
                onClick={fetchAnalysis}
                disabled={analysisLoading}
                className="inline-flex items-center px-4 py-2 bg-white border border-orange-200 text-orange-600 rounded-xl hover:bg-orange-50 transition-all disabled:opacity-60"
              >
                {analysisLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-400 border-t-transparent mr-2" />
                    재분석 중...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    재분석
                  </>
                )}
              </button>
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
                {[
                  { id: '1m' as const, label: '1개월', minMonths: 1 },
                  { id: '3m' as const, label: '3개월', minMonths: 3 },
                  { id: '6m' as const, label: '6개월', minMonths: 6 },
                ].map((period) => (
                  <button
                    key={period.id}
                    onClick={() => setSelectedPeriod(period.id)}
                    disabled={monthsSince < period.minMonths}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      selectedPeriod === period.id
                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-200'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
                  >
                    {period.label} 비교
                  </button>
                ))}
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

            {/* 요약 카드 */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <p className="text-sm text-slate-500 mb-1">매출 성장률</p>
                <p className={`text-2xl font-bold ${(
                  selectedPeriod === '1m' ? analysisData.summary.avgRevenueGrowth1m
                  : selectedPeriod === '3m' ? analysisData.summary.avgRevenueGrowth3m
                  : analysisData.summary.avgRevenueGrowth6m
                ) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatGrowth(
                    selectedPeriod === '1m' ? analysisData.summary.avgRevenueGrowth1m
                    : selectedPeriod === '3m' ? analysisData.summary.avgRevenueGrowth3m
                    : analysisData.summary.avgRevenueGrowth6m
                  )}
                </p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <p className="text-sm text-slate-500 mb-1">고객 성장률</p>
                <p className={`text-2xl font-bold ${analysisData.summary.avgCustomerGrowth >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {formatGrowth(analysisData.summary.avgCustomerGrowth)}
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
                <p className="text-sm text-slate-500 mb-1">성과 점수</p>
                <p className="text-2xl font-bold text-slate-800">{analysisData.summary.avgPerformanceScore.toFixed(0)}점</p>
              </div>
            </div>

            {/* 탭 콘텐츠 */}
            {activeTab === 'overview' && (
              <OverviewTab performances={analysisData.performances} selectedPeriod={selectedPeriod} />
            )}
            {activeTab === 'segment' && (
              <SegmentTab performances={analysisData.performances} />
            )}
            {activeTab === 'ticket' && (
              <TicketTab performances={analysisData.performances} summary={analysisData.summary} />
            )}
            {activeTab === 'visit' && (
              <VisitTab performances={analysisData.performances} />
            )}
          </>
        )}
      </div>
    </div>
  )
}
