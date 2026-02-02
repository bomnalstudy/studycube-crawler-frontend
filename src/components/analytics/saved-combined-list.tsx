'use client'

import { useEffect, useState } from 'react'
import { formatCurrency, formatGrowth } from '@/lib/utils/formatters'

interface BranchAnalysisData {
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
  roi: number
  roas: number
}

interface CombinedAnalysis {
  id: string
  name: string
  startDate: string
  endDate: string
  cost: number | null
  impressions: number | null
  clicks: number | null
  strategyType: string | null
  reason: string | null
  description: string | null
  status: string
  createdAt: string
  updatedAt: string
  branches: Array<{
    branchId: string
    branch: {
      id: string
      name: string
    }
  }>
  analysis?: {
    // 새 형식: branchAnalyses 배열
    branchAnalyses?: BranchAnalysisData[]
    adMetrics?: {
      ctr: number
      cpc: number
      cost: number
      impressions: number
      clicks: number
    }
    // 기존 형식: 단일 changes 객체 (하위 호환성)
    changes?: {
      revenueGrowth: number
      newUsersGrowth: number
    }
  }
}

interface Branch {
  id: string
  name: string
}

interface GroupedCombined {
  [branchId: string]: {
    branchName: string
    items: CombinedAnalysis[]
  }
}

interface CombinedFormData {
  name: string
  branchIds: string[]
  startDate: string
  endDate: string
  cost: number | null
  impressions: number | null
  clicks: number | null
  strategyType: string | null
  reason: string | null
  description: string | null
}

interface SavedCombinedListProps {
  onSelect?: (combined: CombinedAnalysis) => void
}

export default function SavedCombinedList({ onSelect }: SavedCombinedListProps) {
  const [combined, setCombined] = useState<CombinedAnalysis[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set(['all']))
  const [editModalCombined, setEditModalCombined] = useState<CombinedAnalysis | null>(null)
  const [editFormData, setEditFormData] = useState<CombinedFormData | null>(null)

  useEffect(() => {
    fetchCombined()
    loadBranches()
  }, [])

  const fetchCombined = async () => {
    try {
      const response = await fetch('/api/combined')
      const data = await response.json()
      if (data.success) {
        setCombined(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch combined:', error)
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

  // 전체 통합분석 삭제
  const handleDelete = async (e: React.MouseEvent, combinedId: string, combinedName: string) => {
    e.stopPropagation()

    if (!confirm(`"${combinedName}" 통합분석을 모든 지점에서 삭제하시겠습니까?`)) {
      return
    }

    try {
      const response = await fetch(`/api/combined?id=${combinedId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        await fetchCombined()
      } else {
        alert('통합분석 삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('통합분석 삭제 실패:', error)
      alert('통합분석 삭제에 실패했습니다.')
    }
  }

  // 특정 지점에서만 통합분석 삭제
  const handleDeleteFromBranch = async (e: React.MouseEvent, combinedId: string, combinedName: string, branchId: string, branchName: string) => {
    e.stopPropagation()

    if (!confirm(`"${combinedName}" 통합분석을 "${branchName}" 지점에서만 삭제하시겠습니까?`)) {
      return
    }

    try {
      const response = await fetch(`/api/combined?id=${combinedId}&branchId=${branchId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        alert(`${branchName} 지점에서 통합분석이 삭제되었습니다!`)
        await fetchCombined()
      } else {
        alert('삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('삭제 실패:', error)
      alert('삭제에 실패했습니다.')
    }
  }

  const handleOpenEditModal = (e: React.MouseEvent, item: CombinedAnalysis) => {
    e.stopPropagation()
    setEditModalCombined(item)
    setEditFormData({
      name: item.name,
      branchIds: item.branches.map(cb => cb.branchId),
      startDate: item.startDate.split('T')[0],
      endDate: item.endDate.split('T')[0],
      cost: item.cost,
      impressions: item.impressions,
      clicks: item.clicks,
      strategyType: item.strategyType,
      reason: item.reason,
      description: item.description
    })
  }

  const handleSaveEdit = async () => {
    if (!editModalCombined || !editFormData) return

    if (editFormData.branchIds.length === 0) {
      alert('최소 1개의 지점을 선택해주세요.')
      return
    }

    try {
      const response = await fetch('/api/combined', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editModalCombined.id,
          ...editFormData
        })
      })

      const result = await response.json()

      if (result.success) {
        setEditModalCombined(null)
        setEditFormData(null)
        await fetchCombined()
      } else {
        alert('통합분석 수정에 실패했습니다.')
      }
    } catch (error) {
      console.error('통합분석 수정 실패:', error)
      alert('통합분석 수정에 실패했습니다.')
    }
  }

  const formatPercent = (value: number) => formatGrowth(value, 2)

  const strategyTypeLabels: Record<string, string> = {
    PRICE_DISCOUNT: '가격 할인',
    REVIEW_EVENT: '이벤트',
    NEW_CONTENT: '신규 콘텐츠'
  }

  // 지점별로 통합분석 그룹화 (하나의 통합분석이 여러 지점에 표시될 수 있음)
  const groupedCombined: GroupedCombined = {}
  combined.forEach((item) => {
    item.branches.forEach((cb) => {
      if (!groupedCombined[cb.branchId]) {
        groupedCombined[cb.branchId] = {
          branchName: cb.branch.name,
          items: []
        }
      }
      // 중복 방지
      if (!groupedCombined[cb.branchId].items.find(c => c.id === item.id)) {
        groupedCombined[cb.branchId].items.push(item)
      }
    })
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (combined.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        저장된 통합 분석이 없습니다.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {Object.entries(groupedCombined).map(([branchId, group]) => (
        <div key={branchId} className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleBranch(group.branchName)}
            className="w-full px-6 py-4 bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 transition-colors flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {expandedBranches.has(group.branchName) ? '📂' : '📁'}
              </span>
              <span className="font-bold text-lg text-gray-800">{group.branchName}</span>
              <span className="px-3 py-1 bg-white rounded-full text-sm text-gray-600">
                {group.items.length}개
              </span>
            </div>
            <span className="text-gray-400">
              {expandedBranches.has(group.branchName) ? '▼' : '▶'}
            </span>
          </button>

          {expandedBranches.has(group.branchName) && (
            <div className="divide-y divide-gray-100">
              {group.items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelect ? onSelect(item) : window.location.href = `/analytics/combined/${item.id}`}
                  className="p-6 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 cursor-pointer transition-colors"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800 mb-2">{item.name}</h3>
                      <p className="text-sm text-gray-500 mb-3">
                        {new Date(item.startDate).toLocaleDateString('ko-KR')} ~ {new Date(item.endDate).toLocaleDateString('ko-KR')}
                      </p>
                      <p className="text-xs text-gray-400 mb-3">
                        적용 지점: {item.branches.map(cb => cb.branch.name).join(', ')}
                      </p>

                      <div className="grid grid-cols-2 gap-4 mb-3">
                        {/* Campaign metrics */}
                        {item.cost !== null && (
                          <div>
                            <p className="text-xs text-gray-500">광고 비용</p>
                            <p className="text-sm font-semibold text-gray-700">{formatCurrency(Number(item.cost))}</p>
                          </div>
                        )}
                        {item.impressions !== null && (
                          <div>
                            <p className="text-xs text-gray-500">노출수</p>
                            <p className="text-sm font-semibold text-gray-700">{item.impressions.toLocaleString()}</p>
                          </div>
                        )}
                        {item.clicks !== null && (
                          <div>
                            <p className="text-xs text-gray-500">클릭수</p>
                            <p className="text-sm font-semibold text-gray-700">{item.clicks.toLocaleString()}</p>
                          </div>
                        )}
                        {item.strategyType && (
                          <div>
                            <p className="text-xs text-gray-500">전략 유형</p>
                            <p className="text-sm font-semibold text-gray-700">{strategyTypeLabels[item.strategyType] || item.strategyType}</p>
                          </div>
                        )}
                      </div>

                      {/* 성과 미리보기 - 현재 폴더의 지점 분석 결과만 표시 */}
                      {item.analysis && item.analysis.branchAnalyses && (() => {
                        // 현재 폴더(branchId)에 해당하는 분석 결과만 필터링
                        const currentBranchAnalysis = item.analysis.branchAnalyses.find(
                          (ba) => ba.branchId === branchId
                        )

                        if (!currentBranchAnalysis) return null

                        return (
                          <div className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                            <p className="text-sm font-semibold text-blue-600 mb-2">시행 전/후 변화 ({currentBranchAnalysis.branchName})</p>
                            <div className="bg-white p-3 rounded-lg">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div>
                                  <p className="text-xs text-gray-600">매출 증가율</p>
                                  <p className={`text-sm font-bold ${currentBranchAnalysis.changes.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatPercent(currentBranchAnalysis.changes.revenueGrowth)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-600">신규 이용자</p>
                                  <p className={`text-sm font-bold ${currentBranchAnalysis.changes.newUsersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatPercent(currentBranchAnalysis.changes.newUsersGrowth)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-600">ROI</p>
                                  <p className={`text-sm font-bold ${currentBranchAnalysis.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatPercent(currentBranchAnalysis.roi)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-600">ROAS</p>
                                  <p className={`text-sm font-bold ${currentBranchAnalysis.roas >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatPercent(currentBranchAnalysis.roas)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })()}
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={(e) => handleOpenEditModal(e, item)}
                        className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        상세 수정
                      </button>
                      {item.branches.length > 1 && (
                        <button
                          onClick={(e) => handleDeleteFromBranch(e, item.id, item.name, branchId, group.branchName)}
                          className="px-3 py-2 text-sm text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors"
                        >
                          이 지점에서만 삭제
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDelete(e, item.id, item.name)}
                        className="px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        전체 삭제
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          window.location.href = `/api/combined/export?id=${item.id}&name=${encodeURIComponent(item.name)}`
                        }}
                        className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        Excel 다운로드
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* 수정 모달 */}
      {editModalCombined && editFormData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-2xl font-bold mb-6">통합분석 상세 수정</h3>

              <div className="space-y-6">
                {/* 분석명 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    분석명 *
                  </label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="분석명을 입력하세요"
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

                {/* 광고 지표 */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      광고 비용 (원)
                    </label>
                    <input
                      type="number"
                      value={editFormData.cost ?? ''}
                      onChange={(e) => setEditFormData({ ...editFormData, cost: e.target.value ? Number(e.target.value) : null })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      노출수
                    </label>
                    <input
                      type="number"
                      value={editFormData.impressions ?? ''}
                      onChange={(e) => setEditFormData({ ...editFormData, impressions: e.target.value ? Number(e.target.value) : null })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      클릭수
                    </label>
                    <input
                      type="number"
                      value={editFormData.clicks ?? ''}
                      onChange={(e) => setEditFormData({ ...editFormData, clicks: e.target.value ? Number(e.target.value) : null })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* 전략 유형 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    전략 유형
                  </label>
                  <select
                    value={editFormData.strategyType ?? ''}
                    onChange={(e) => setEditFormData({ ...editFormData, strategyType: e.target.value || null })}
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
                    전략 수립 이유
                  </label>
                  <textarea
                    value={editFormData.reason ?? ''}
                    onChange={(e) => setEditFormData({ ...editFormData, reason: e.target.value || null })}
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
                    value={editFormData.description ?? ''}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value || null })}
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
                    setEditModalCombined(null)
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
