'use client'

import { useEffect, useState } from 'react'

interface CombinedAnalysis {
  id: string
  branchId: string
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
  branch?: {
    id: string
    name: string
  }
  analysis?: {
    changes: {
      revenueGrowth: number
      newUsersGrowth: number
    }
  }
}

interface SavedCombinedListProps {
  onSelect?: (combined: CombinedAnalysis) => void
}

export default function SavedCombinedList({ onSelect }: SavedCombinedListProps) {
  const [combined, setCombined] = useState<CombinedAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set(['all']))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  useEffect(() => {
    fetchCombined()
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

  const toggleBranch = (branchId: string) => {
    const newExpanded = new Set(expandedBranches)
    if (newExpanded.has(branchId)) {
      newExpanded.delete(branchId)
    } else {
      newExpanded.add(branchId)
    }
    setExpandedBranches(newExpanded)
  }

  const startEdit = (combined: CombinedAnalysis, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(combined.id)
    setEditingName(combined.name)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingName('')
  }

  const saveEdit = async (combined: CombinedAnalysis) => {
    if (!editingName.trim() || editingName === combined.name) {
      cancelEdit()
      return
    }

    try {
      const response = await fetch(`/api/combined/${combined.id}/update-name`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingName.trim() })
      })

      if (response.ok) {
        await fetchCombined()
        cancelEdit()
      }
    } catch (error) {
      console.error('Failed to update name:', error)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, combined: CombinedAnalysis) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveEdit(combined)
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  const strategyTypeLabels: Record<string, string> = {
    PRICE_DISCOUNT: '가격 할인',
    REVIEW_EVENT: '이벤트',
    NEW_CONTENT: '신규 콘텐츠'
  }

  // Group by branch
  const groupedByBranch = combined.reduce((acc, item) => {
    const branchId = item.branchId || 'all'
    const branchName = item.branch?.name || '전체지점'
    if (!acc[branchId]) {
      acc[branchId] = {
        branchId,
        branchName,
        items: []
      }
    }
    acc[branchId].items.push(item)
    return acc
  }, {} as Record<string, { branchId: string; branchName: string; items: CombinedAnalysis[] }>)

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
      {Object.values(groupedByBranch).map((group) => (
        <div key={group.branchId} className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleBranch(group.branchId)}
            className="w-full px-6 py-4 bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 transition-colors flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {expandedBranches.has(group.branchId) ? '📂' : '📁'}
              </span>
              <span className="font-bold text-lg text-gray-800">{group.branchName}</span>
              <span className="px-3 py-1 bg-white rounded-full text-sm text-gray-600">
                {group.items.length}개
              </span>
            </div>
            <span className="text-gray-400">
              {expandedBranches.has(group.branchId) ? '▼' : '▶'}
            </span>
          </button>

          {expandedBranches.has(group.branchId) && (
            <div className="divide-y divide-gray-100">
              {group.items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelect ? onSelect(item) : window.location.href = `/analytics/combined/${item.id}`}
                  className="p-6 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 cursor-pointer transition-colors"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      {editingId === item.id ? (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, item)}
                            className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                          <button
                            onClick={() => saveEdit(item)}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                          >
                            저장
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <h3 className="text-xl font-bold text-gray-800 mb-2">{item.name}</h3>
                      )}
                      <p className="text-sm text-gray-500 mb-3">
                        {new Date(item.startDate).toLocaleDateString('ko-KR')} ~ {new Date(item.endDate).toLocaleDateString('ko-KR')}
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

                      {item.analysis && (
                        <div className="grid grid-cols-2 gap-4 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                          <div>
                            <p className="text-xs text-gray-600">매출 증가율</p>
                            <p className={`text-lg font-bold ${item.analysis.changes.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatPercent(item.analysis.changes.revenueGrowth)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">신규 이용자 증가율</p>
                            <p className={`text-lg font-bold ${item.analysis.changes.newUsersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatPercent(item.analysis.changes.newUsersGrowth)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={(e) => startEdit(item, e)}
                        className="px-3 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        ✏️ 수정
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
    </div>
  )
}
