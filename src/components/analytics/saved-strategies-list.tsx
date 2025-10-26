'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Strategy {
  id: string
  name: string
  branchId: string
  startDate: string
  endDate: string
  type: string
  reason: string
  description: string
  createdAt: string
  branch?: {
    id: string
    name: string
  }
  analysis?: {
    changes: {
      revenueGrowth: number
      newUsersGrowth: number
      avgDailyUsersGrowth: number
      revisitRateGrowth: number
    }
  }
}

export function SavedStrategiesList() {
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set())
  const [editingStrategyId, setEditingStrategyId] = useState<string | null>(null)
  const [newStrategyName, setNewStrategyName] = useState('')
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const router = useRouter()

  useEffect(() => {
    loadStrategies()
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

  const toggleBranch = (branchId: string) => {
    const newExpanded = new Set(expandedBranches)
    if (newExpanded.has(branchId)) {
      newExpanded.delete(branchId)
    } else {
      newExpanded.add(branchId)
    }
    setExpandedBranches(newExpanded)
  }

  const handleStartEdit = (strategy: Strategy) => {
    setEditingStrategyId(strategy.id)
    setNewStrategyName(strategy.name)
  }

  const handleSaveStrategyName = async (strategyId: string) => {
    try {
      const response = await fetch('/api/strategies/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategyId, newName: newStrategyName })
      })

      const result = await response.json()

      if (result.success) {
        setEditingStrategyId(null)
        loadStrategies()
      }
    } catch (error) {
      console.error('전략 이름 수정 실패:', error)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, strategyId: string) => {
    if (e.key === 'Enter') {
      handleSaveStrategyName(strategyId)
    } else if (e.key === 'Escape') {
      setEditingStrategyId(null)
    }
  }

  const handleStartEditFolder = (branchId: string, currentName: string) => {
    setEditingBranchId(branchId)
    setNewFolderName(currentName)
  }

  const handleSaveFolderName = async (oldBranchName: string) => {
    try {
      const response = await fetch('/api/strategies/rename-folder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldBranchName, newBranchName: newFolderName })
      })

      const result = await response.json()

      if (result.success) {
        setEditingBranchId(null)
        loadStrategies()
      }
    } catch (error) {
      console.error('폴더 이름 수정 실패:', error)
    }
  }

  const handleFolderKeyDown = (e: React.KeyboardEvent, oldBranchName: string) => {
    if (e.key === 'Enter') {
      handleSaveFolderName(oldBranchName)
    } else if (e.key === 'Escape') {
      setEditingBranchId(null)
    }
  }

  const strategyTypeLabels: Record<string, string> = {
    PRICE_DISCOUNT: '가격 할인',
    REVIEW_EVENT: '이벤트',
    NEW_CONTENT: '신규 콘텐츠'
  }

  // 지점별로 전략 그룹화
  const strategiesByBranch = strategies.reduce((acc, strategy) => {
    const branchId = strategy.branchId || 'all'
    const branchName = strategy.branch?.name || '전체지점'

    if (!acc[branchId]) {
      acc[branchId] = {
        branchName,
        strategies: []
      }
    }
    acc[branchId].strategies.push(strategy)
    return acc
  }, {} as Record<string, { branchName: string; strategies: Strategy[] }>)

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
        {Object.entries(strategiesByBranch).map(([branchId, { branchName, strategies: branchStrategies }]) => (
          <div key={branchId} className="border rounded-lg">
            {/* 폴더 헤더 */}
            <div className="bg-gray-100 px-4 py-3 flex items-center justify-between">
              {editingBranchId === branchId ? (
                <div className="flex items-center gap-3 flex-1">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => handleFolderKeyDown(e, branchName)}
                    className="px-2 py-1 border rounded flex-1"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveFolderName(branchName)}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    저장
                  </button>
                  <button
                    onClick={() => setEditingBranchId(null)}
                    className="px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500 text-sm"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <>
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleStartEditFolder(branchId, branchName)
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    ✏️ 수정
                  </button>
                </>
              )}
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
                      {editingStrategyId === strategy.id ? (
                        <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={newStrategyName}
                            onChange={(e) => setNewStrategyName(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, strategy.id)}
                            className="px-2 py-1 border rounded flex-1"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveStrategyName(strategy.id)}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                          >
                            저장
                          </button>
                          <button
                            onClick={() => setEditingStrategyId(null)}
                            className="px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500 text-sm"
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <>
                          <div>
                            <h3 className="font-semibold text-lg text-gray-900">{strategy.name}</h3>
                            <p className="text-sm text-gray-500">
                              {strategyTypeLabels[strategy.type] || strategy.type} | {new Date(strategy.startDate).toLocaleDateString()} ~ {new Date(strategy.endDate).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleStartEdit(strategy)
                              }}
                              className="px-3 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              ✏️ 수정
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
                        </>
                      )}
                    </div>

                    {/* 전략 수립 이유 */}
                    <div className="mb-2">
                      <p className="text-xs text-gray-500">수립 이유:</p>
                      <p className="text-sm text-gray-700">{strategy.reason}</p>
                    </div>

                    {/* 성과 미리보기 */}
                    {strategy.analysis && (
                      <div className="pt-3 border-t">
                        <p className="text-xs text-gray-500 mb-2">전략 전/후 변화</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <span className="text-xs text-gray-600">매출 변화:</span>
                            <p className={`font-bold text-sm ${strategy.analysis.changes.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {strategy.analysis.changes.revenueGrowth >= 0 ? '+' : ''}{strategy.analysis.changes.revenueGrowth.toFixed(1)}%
                            </p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-600">신규 이용자:</span>
                            <p className={`font-bold text-sm ${strategy.analysis.changes.newUsersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {strategy.analysis.changes.newUsersGrowth >= 0 ? '+' : ''}{strategy.analysis.changes.newUsersGrowth.toFixed(1)}%
                            </p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-600">일평균 이용자:</span>
                            <p className={`font-bold text-sm ${strategy.analysis.changes.avgDailyUsersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {strategy.analysis.changes.avgDailyUsersGrowth >= 0 ? '+' : ''}{strategy.analysis.changes.avgDailyUsersGrowth.toFixed(1)}%
                            </p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-600">재방문률:</span>
                            <p className={`font-bold text-sm ${strategy.analysis.changes.revisitRateGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {strategy.analysis.changes.revisitRateGrowth >= 0 ? '+' : ''}{strategy.analysis.changes.revisitRateGrowth.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
