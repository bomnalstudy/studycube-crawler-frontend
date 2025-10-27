'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils/formatters'
import { formatDate } from '@/lib/utils/date-helpers'
import Link from 'next/link'
import { BarChart } from '@/components/charts/bar-chart'

interface Branch {
  id: string
  name: string
}

interface StrategyDetail {
  id: string
  name: string
  startDate: string
  endDate: string
  type: string
  reason: string
  description: string
  status: string
  updatedAt: string
  branches: Array<{
    branchId: string
    branch: {
      id: string
      name: string
    }
  }>
}

interface StrategyFormData {
  name: string
  branchIds: string[]
  startDate: string
  endDate: string
  type: string
  reason: string
  description: string
}

interface StrategyAnalysis {
  beforeMetrics: {
    revenue: number
    newUsers: number
    avgDailyUsers: number
    revisitRate: number
  }
  afterMetrics: {
    revenue: number
    newUsers: number
    avgDailyUsers: number
    revisitRate: number
  }
  changes: {
    revenueGrowth: number
    newUsersGrowth: number
    avgDailyUsersGrowth: number
    revisitRateGrowth: number
  }
  roi: number
}

export default function StrategyDetailPage() {
  const params = useParams()
  const strategyId = params.id as string

  const [strategy, setStrategy] = useState<StrategyDetail | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [analysis, setAnalysis] = useState<StrategyAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editFormData, setEditFormData] = useState<StrategyFormData | null>(null)

  const loadStrategy = useCallback(async () => {
    try {
      // 전략 정보 로드
      const strategyResponse = await fetch(`/api/strategies/${strategyId}`)
      const strategyResult = await strategyResponse.json()

      if (strategyResult.success) {
        setStrategy(strategyResult.data)

        // 전략 분석 실행
        const branchIds = strategyResult.data.branches.map((b: any) => b.branchId)
        const analysisResponse = await fetch('/api/analytics/strategies/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            branchIds,
            startDate: strategyResult.data.startDate,
            endDate: strategyResult.data.endDate
          })
        })

        const analysisResult = await analysisResponse.json()

        if (analysisResult.success) {
          setAnalysis(analysisResult.data)
        }
      }
    } catch (error) {
      console.error('전략 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }, [strategyId])

  const loadBranches = useCallback(async () => {
    try {
      const response = await fetch('/api/branches')
      const result = await response.json()
      if (result.success) {
        setBranches(result.data)
      }
    } catch (error) {
      console.error('지점 로드 실패:', error)
    }
  }, [])

  useEffect(() => {
    loadStrategy()
    loadBranches()
  }, [loadStrategy, loadBranches])

  const handleOpenEditModal = () => {
    if (!strategy) return
    setEditFormData({
      name: strategy.name,
      branchIds: strategy.branches.map(b => b.branchId),
      startDate: strategy.startDate.split('T')[0],
      endDate: strategy.endDate.split('T')[0],
      type: strategy.type,
      reason: strategy.reason || '',
      description: strategy.description || ''
    })
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!strategy || !editFormData) return

    if (editFormData.branchIds.length === 0) {
      alert('최소 1개의 지점을 선택해주세요.')
      return
    }

    try {
      const response = await fetch('/api/strategies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: strategy.id,
          ...editFormData
        })
      })

      const result = await response.json()

      if (result.success) {
        setShowEditModal(false)
        setEditFormData(null)
        await loadStrategy()
        alert('전략이 수정되었습니다!')
      } else {
        alert('전략 수정에 실패했습니다.')
      }
    } catch (error) {
      console.error('전략 수정 실패:', error)
      alert('전략 수정에 실패했습니다.')
    }
  }

  const strategyTypeLabels: Record<string, string> = {
    PRICE_DISCOUNT: '가격 할인',
    REVIEW_EVENT: '이벤트',
    NEW_CONTENT: '신규 콘텐츠'
  }

  if (loading) {
    return (
      <main className="min-h-screen p-8 bg-gray-50">
        <div className="max-w-7xl mx-auto text-center py-12">
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </main>
    )
  }

  if (!strategy) {
    return (
      <main className="min-h-screen p-8 bg-gray-50">
        <div className="max-w-7xl mx-auto text-center py-12">
          <p className="text-red-600">전략을 찾을 수 없습니다.</p>
          <Link href="/analytics/strategies" className="mt-4 inline-block text-blue-600 hover:underline">
            전략 목록으로 돌아가기
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <Link href="/analytics/strategies" className="text-blue-600 hover:underline mb-4 inline-block">
            ← 전략 목록으로 돌아가기
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">{strategy.name}</h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  strategy.status === 'COMPLETED'
                    ? 'bg-gray-200 text-gray-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {strategy.status === 'COMPLETED' ? '완료' : '진행중'}
                </span>
              </div>
              <p className="text-gray-600 mt-2">
                {strategy.branches.map(b => b.branch.name).join(', ')} • {formatDate(new Date(strategy.startDate))} ~ {formatDate(new Date(strategy.endDate))}
              </p>
              {strategy.status === 'ONGOING' && (
                <p className="text-sm text-blue-600 mt-1">
                  💡 이 전략은 진행 중이며, 매일 자동으로 최신 데이터로 업데이트됩니다.
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                마지막 업데이트: {new Date(strategy.updatedAt).toLocaleString('ko-KR')}
              </p>
            </div>
          </div>
        </div>

        {/* 전략 기본 정보 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">전략 정보</h2>
            <button
              onClick={handleOpenEditModal}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              ✏️ 상세 수정
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">전략 유형</p>
              <p className="text-2xl font-bold text-gray-900">{strategyTypeLabels[strategy.type] || strategy.type}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">적용 지점</p>
              <p className="text-lg font-semibold text-gray-900">{strategy.branches.map(b => b.branch.name).join(', ')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">시작일</p>
              <p className="text-lg font-semibold text-gray-900">{formatDate(new Date(strategy.startDate))}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">종료일</p>
              <p className="text-lg font-semibold text-gray-900">{formatDate(new Date(strategy.endDate))}</p>
            </div>
          </div>
        </div>

        {/* 전략 수립 이유 & 상세 내용 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">전략 수립 이유</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{strategy.reason}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">전략 상세 내용</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{strategy.description}</p>
          </div>
        </div>

        {/* 성과 분석 */}
        {analysis && (
          <>
            {/* 주요 지표 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-sm font-medium text-gray-600 mb-2">매출 변화</h3>
                <p className={`text-3xl font-bold ${analysis.changes.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {analysis.changes.revenueGrowth >= 0 ? '+' : ''}{formatPercent(analysis.changes.revenueGrowth)}
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-sm font-medium text-gray-600 mb-2">신규 이용자 변화</h3>
                <p className={`text-3xl font-bold ${analysis.changes.newUsersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {analysis.changes.newUsersGrowth >= 0 ? '+' : ''}{formatPercent(analysis.changes.newUsersGrowth)}
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-sm font-medium text-gray-600 mb-2">일평균 이용자 변화</h3>
                <p className={`text-3xl font-bold ${analysis.changes.avgDailyUsersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {analysis.changes.avgDailyUsersGrowth >= 0 ? '+' : ''}{formatPercent(analysis.changes.avgDailyUsersGrowth)}
                </p>
              </div>
            </div>

            {/* 성과 비교 그래프 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <BarChart
                data={[
                  { label: '전략 전', value: analysis.beforeMetrics.revenue },
                  { label: '전략 후', value: analysis.afterMetrics.revenue }
                ]}
                title="총 매출 전략 전/후 비교"
                color="#3b82f6"
              />

              <BarChart
                data={[
                  { label: '전략 전', value: analysis.beforeMetrics.newUsers },
                  { label: '전략 후', value: analysis.afterMetrics.newUsers }
                ]}
                title="신규 이용자 전략 전/후 비교"
                color="#10b981"
              />

              <BarChart
                data={[
                  { label: '전략 전', value: analysis.beforeMetrics.avgDailyUsers },
                  { label: '전략 후', value: analysis.afterMetrics.avgDailyUsers }
                ]}
                title="일평균 이용자 전략 전/후 비교"
                color="#8b5cf6"
              />

              <BarChart
                data={[
                  { label: '전략 전', value: analysis.beforeMetrics.revisitRate },
                  { label: '전략 후', value: analysis.afterMetrics.revisitRate }
                ]}
                title="재방문률 전략 전/후 비교 (%)"
                color="#f59e0b"
              />
            </div>

            {/* 비교 테이블 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">성과 상세 비교</h2>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">지표</th>
                      <th className="text-right py-3 px-4">전략 전</th>
                      <th className="text-right py-3 px-4">전략 후</th>
                      <th className="text-right py-3 px-4">변화량</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-3 px-4">총 매출</td>
                      <td className="text-right py-3 px-4">{formatCurrency(analysis.beforeMetrics.revenue)}</td>
                      <td className="text-right py-3 px-4">{formatCurrency(analysis.afterMetrics.revenue)}</td>
                      <td className={`text-right py-3 px-4 font-semibold ${
                        analysis.changes.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {analysis.changes.revenueGrowth >= 0 ? '+' : ''}{formatPercent(analysis.changes.revenueGrowth)}
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 px-4">신규 이용자</td>
                      <td className="text-right py-3 px-4">{formatNumber(analysis.beforeMetrics.newUsers)}</td>
                      <td className="text-right py-3 px-4">{formatNumber(analysis.afterMetrics.newUsers)}</td>
                      <td className={`text-right py-3 px-4 font-semibold ${
                        analysis.changes.newUsersGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {analysis.changes.newUsersGrowth >= 0 ? '+' : ''}{formatPercent(analysis.changes.newUsersGrowth)}
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 px-4">일 평균 이용자</td>
                      <td className="text-right py-3 px-4">{formatNumber(analysis.beforeMetrics.avgDailyUsers)}</td>
                      <td className="text-right py-3 px-4">{formatNumber(analysis.afterMetrics.avgDailyUsers)}</td>
                      <td className={`text-right py-3 px-4 font-semibold ${
                        analysis.changes.avgDailyUsersGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {analysis.changes.avgDailyUsersGrowth >= 0 ? '+' : ''}{formatPercent(analysis.changes.avgDailyUsersGrowth)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4">재방문률</td>
                      <td className="text-right py-3 px-4">{formatPercent(analysis.beforeMetrics.revisitRate)}</td>
                      <td className="text-right py-3 px-4">{formatPercent(analysis.afterMetrics.revisitRate)}</td>
                      <td className={`text-right py-3 px-4 font-semibold ${
                        analysis.changes.revisitRateGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {analysis.changes.revisitRateGrowth >= 0 ? '+' : ''}{formatPercent(analysis.changes.revisitRateGrowth)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* 수정 모달 */}
        {showEditModal && editFormData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h3 className="text-2xl font-bold mb-6">전략 상세 수정</h3>

                <div className="space-y-6">
                  {/* 전략명 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      전략명 *
                    </label>
                    <input
                      type="text"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="전략명을 입력하세요"
                    />
                  </div>

                  {/* 지점 선택 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      적용 지점 선택 * (최소 1개)
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {branches.map((branch) => (
                        <label
                          key={branch.id}
                          className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={editFormData.branchIds.includes(branch.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditFormData({
                                  ...editFormData,
                                  branchIds: [...editFormData.branchIds, branch.id]
                                })
                              } else {
                                setEditFormData({
                                  ...editFormData,
                                  branchIds: editFormData.branchIds.filter(id => id !== branch.id)
                                })
                              }
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-gray-700">{branch.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 기간 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        시작 날짜 *
                      </label>
                      <input
                        type="date"
                        value={editFormData.startDate}
                        onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        종료 날짜 *
                      </label>
                      <input
                        type="date"
                        value={editFormData.endDate}
                        onChange={(e) => setEditFormData({ ...editFormData, endDate: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* 전략 유형 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      전략 유형 *
                    </label>
                    <select
                      value={editFormData.type}
                      onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="PRICE_DISCOUNT">가격 할인</option>
                      <option value="REVIEW_EVENT">이벤트</option>
                      <option value="NEW_CONTENT">신규 콘텐츠</option>
                    </select>
                  </div>

                  {/* 전략 수립 이유 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      전략 수립 이유 *
                    </label>
                    <textarea
                      value={editFormData.reason}
                      onChange={(e) => setEditFormData({ ...editFormData, reason: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="전략 수립 이유를 입력하세요"
                    />
                  </div>

                  {/* 상세 내용 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      상세 내용
                    </label>
                    <textarea
                      value={editFormData.description}
                      onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="전략에 대한 상세 내용을 입력하세요"
                    />
                  </div>
                </div>

                {/* 버튼 */}
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowEditModal(false)
                      setEditFormData(null)
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    저장
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
