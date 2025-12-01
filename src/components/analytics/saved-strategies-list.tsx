'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface BranchAnalysis {
  branchId: string
  branchName: string
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
}

interface Strategy {
  id: string
  name: string
  startDate: string
  endDate: string
  type: string
  reason: string
  description: string
  createdAt: string
  branches: Array<{
    branchId: string
    branch: {
      id: string
      name: string
    }
  }>
  analysis?: {
    // 새 형식: branchAnalyses 배열
    branchAnalyses?: BranchAnalysis[]
    // 기존 형식: 단일 changes 객체 (하위 호환성)
    changes?: {
      revenueGrowth: number
      newUsersGrowth: number
      avgDailyUsersGrowth: number
      revisitRateGrowth: number
    }
  }
}

interface Branch {
  id: string
  name: string
}

interface GroupedStrategies {
  [branchId: string]: {
    branchName: string
    strategies: Strategy[]
  }
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

export function SavedStrategiesList() {
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set())
  const [editModalStrategy, setEditModalStrategy] = useState<Strategy | null>(null)
  const [editFormData, setEditFormData] = useState<StrategyFormData | null>(null)
  const router = useRouter()

  useEffect(() => {
    loadStrategies()
    loadBranches()
  }, [])

  const loadStrategies = async () => {
    try {
      const response = await fetch('/api/strategies')
      const result = await response.json()

      if (result.success) {
        setStrategies(result.data)
      }
    } catch (error) {
      console.error('전략 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadBranches = async () => {
    try {
      const response = await fetch('/api/branches')
      const result = await response.json()

      if (result.success) {
        setBranches(result.data)
      }
    } catch (error) {
      console.error('지점 로드 실패:', error)
    }
  }

  const toggleBranch = (branchId: string) => {
    const newExpanded = new Set(expandedBranches)
    if (newExpanded.has(branchId)) {
      newExpanded.delete(branchId)
    } else {
      newExpanded.add(branchId)
    }
    setExpandedBranches(newExpanded)
  }

  // 전체 전략 삭제
  const handleDelete = async (e: React.MouseEvent, strategyId: string, strategyName: string) => {
    e.stopPropagation()

    if (!confirm(`"${strategyName}" 전략을 모든 지점에서 삭제하시겠습니까?`)) {
      return
    }

    try {
      const response = await fetch(`/api/strategies?id=${strategyId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        await loadStrategies()
      } else {
        alert('전략 삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('전략 삭제 실패:', error)
      alert('전략 삭제에 실패했습니다.')
    }
  }

  // 특정 지점에서만 전략 삭제
  const handleDeleteFromBranch = async (e: React.MouseEvent, strategyId: string, strategyName: string, branchId: string, branchName: string) => {
    e.stopPropagation()

    if (!confirm(`"${strategyName}" 전략을 "${branchName}" 지점에서만 삭제하시겠습니까?`)) {
      return
    }

    try {
      const response = await fetch(`/api/strategies?id=${strategyId}&branchId=${branchId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        alert(`${branchName} 지점에서 전략이 삭제되었습니다!`)
        await loadStrategies()
      } else {
        alert('삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('삭제 실패:', error)
      alert('삭제에 실패했습니다.')
    }
  }

  const handleOpenEditModal = (e: React.MouseEvent, strategy: Strategy) => {
    e.stopPropagation()
    setEditModalStrategy(strategy)
    setEditFormData({
      name: strategy.name,
      branchIds: strategy.branches.map(sb => sb.branchId),
      startDate: strategy.startDate.split('T')[0],
      endDate: strategy.endDate.split('T')[0],
      type: strategy.type,
      reason: strategy.reason,
      description: strategy.description
    })
  }

  const handleSaveEdit = async () => {
    if (!editModalStrategy || !editFormData) return

    if (editFormData.branchIds.length === 0) {
      alert('최소 1개의 지점을 선택해주세요.')
      return
    }

    try {
      const response = await fetch('/api/strategies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editModalStrategy.id,
          ...editFormData
        })
      })

      const result = await response.json()

      if (result.success) {
        setEditModalStrategy(null)
        setEditFormData(null)
        await loadStrategies()
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

  // 지점별로 전략 그룹화 (하나의 전략이 여러 지점에 표시될 수 있음)
  const groupedStrategies: GroupedStrategies = {}
  strategies.forEach((strategy) => {
    strategy.branches.forEach((sb) => {
      if (!groupedStrategies[sb.branchId]) {
        groupedStrategies[sb.branchId] = {
          branchName: sb.branch.name,
          strategies: []
        }
      }
      // 중복 방지
      if (!groupedStrategies[sb.branchId].strategies.find(s => s.id === strategy.id)) {
        groupedStrategies[sb.branchId].strategies.push(strategy)
      }
    })
  })

  if (loading) {
    return <div className="text-center py-4">로딩 중...</div>
  }

  if (strategies.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">저장된 전략</h2>
        <p className="text-gray-500 text-center py-8">저장된 전략이 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">저장된 전략</h2>

      <div className="space-y-4">
        {Object.entries(groupedStrategies).map(([branchId, { branchName, strategies: branchStrategies }]) => (
          <div key={branchId} className="border rounded-lg">
            {/* 폴더 헤더 */}
            <div className="bg-gray-100 px-4 py-3 flex items-center justify-between">
              <button
                onClick={() => toggleBranch(branchId)}
                className="flex items-center gap-2 flex-1 text-left"
              >
                <span className="text-lg">
                  {expandedBranches.has(branchId) ? '📂' : '📁'}
                </span>
                <span className="font-semibold text-gray-700">
                  {branchName} ({branchStrategies.length})
                </span>
              </button>
            </div>

            {/* 폴더 내용 */}
            {expandedBranches.has(branchId) && (
              <div className="p-4 space-y-3">
                {branchStrategies.map((strategy) => (
                  <div
                    key={strategy.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => router.push(`/analytics/strategies/${strategy.id}`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900">{strategy.name}</h3>
                        <p className="text-sm text-gray-500">
                          {strategyTypeLabels[strategy.type] || strategy.type} | {new Date(strategy.startDate).toLocaleDateString()} ~ {new Date(strategy.endDate).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          적용 지점: {strategy.branches.map(sb => sb.branch.name).join(', ')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => handleOpenEditModal(e, strategy)}
                          className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          상세 수정
                        </button>
                        {strategy.branches.length > 1 && (
                          <button
                            onClick={(e) => handleDeleteFromBranch(e, strategy.id, strategy.name, branchId, branchName)}
                            className="px-3 py-2 text-sm text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors"
                          >
                            이 지점에서만 삭제
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDelete(e, strategy.id, strategy.name)}
                          className="px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          전체 삭제
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            window.location.href = `/api/strategies/export?id=${strategy.id}&name=${encodeURIComponent(strategy.name)}`
                          }}
                          className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          Excel 다운로드
                        </button>
                      </div>
                    </div>

                    {/* 전략 수립 이유 */}
                    <div className="mb-2">
                      <p className="text-xs text-gray-500">수립 이유:</p>
                      <p className="text-sm text-gray-700">{strategy.reason}</p>
                    </div>

                    {/* 성과 미리보기 - 현재 폴더의 지점 분석 결과만 표시 */}
                    {strategy.analysis && strategy.analysis.branchAnalyses && (() => {
                      // 현재 폴더(branchId)에 해당하는 분석 결과만 필터링
                      const currentBranchAnalysis = strategy.analysis.branchAnalyses.find(
                        (ba) => ba.branchId === branchId
                      )

                      if (!currentBranchAnalysis) return null

                      return (
                        <div className="pt-3 border-t">
                          <p className="text-xs text-gray-500 mb-2">전략 전/후 변화 ({currentBranchAnalysis.branchName})</p>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div>
                                <span className="text-xs text-gray-600">매출 변화:</span>
                                <p className={`font-bold text-sm ${currentBranchAnalysis.changes.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {currentBranchAnalysis.changes.revenueGrowth >= 0 ? '+' : ''}{currentBranchAnalysis.changes.revenueGrowth.toFixed(1)}%
                                </p>
                              </div>
                              <div>
                                <span className="text-xs text-gray-600">신규 이용자:</span>
                                <p className={`font-bold text-sm ${currentBranchAnalysis.changes.newUsersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {currentBranchAnalysis.changes.newUsersGrowth >= 0 ? '+' : ''}{currentBranchAnalysis.changes.newUsersGrowth.toFixed(1)}%
                                </p>
                              </div>
                              <div>
                                <span className="text-xs text-gray-600">일평균 이용자:</span>
                                <p className={`font-bold text-sm ${currentBranchAnalysis.changes.avgDailyUsersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {currentBranchAnalysis.changes.avgDailyUsersGrowth >= 0 ? '+' : ''}{currentBranchAnalysis.changes.avgDailyUsersGrowth.toFixed(1)}%
                                </p>
                              </div>
                              <div>
                                <span className="text-xs text-gray-600">재방문률:</span>
                                <p className={`font-bold text-sm ${currentBranchAnalysis.changes.revisitRateGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {currentBranchAnalysis.changes.revisitRateGrowth >= 0 ? '+' : ''}{currentBranchAnalysis.changes.revisitRateGrowth.toFixed(1)}%
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 수정 모달 */}
      {editModalStrategy && editFormData && (
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
                    <option value="">선택하세요</option>
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
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="전략을 수립한 이유를 입력하세요"
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
                    setEditModalStrategy(null)
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
  )
}
