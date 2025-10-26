'use client'

import { useEffect, useState } from 'react'
import { formatCurrency, formatNumber } from '@/lib/utils/formatters'
import { formatDate } from '@/lib/utils/date-helpers'

interface Campaign {
  id: string
  name: string
  branchId: string
  startDate: string
  endDate: string
  cost: number
  impressions: number
  clicks: number
  createdAt: string
  analysis?: {
    changes: {
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

interface GroupedCampaigns {
  [branchId: string]: {
    branchName: string
    campaigns: Campaign[]
  }
}

export function SavedCampaignsList() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set())
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null)
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null)
  const [newCampaignName, setNewCampaignName] = useState('')
  const [newFolderName, setNewFolderName] = useState('')

  useEffect(() => {
    loadBranches()
    loadCampaigns()
  }, [])

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

  const loadCampaigns = async () => {
    try {
      const response = await fetch('/api/campaigns')
      const result = await response.json()

      if (result.success) {
        setCampaigns(result.data)
      }
    } catch (error) {
      console.error('캠페인 로드 실패:', error)
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

  const handleExport = (campaignId: string, campaignName: string) => {
    window.location.href = `/api/campaigns/export?id=${campaignId}&name=${encodeURIComponent(campaignName)}`
  }

  const handleStartEditCampaign = (e: React.MouseEvent, campaignId: string, currentName: string) => {
    e.stopPropagation()
    setEditingCampaignId(campaignId)
    setNewCampaignName(currentName)
  }

  const handleSaveCampaignName = async (campaignId: string) => {
    if (!newCampaignName.trim()) return

    try {
      const response = await fetch('/api/campaigns/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, newName: newCampaignName })
      })

      const result = await response.json()

      if (result.success) {
        await loadCampaigns()
        setEditingCampaignId(null)
        alert('캠페인 이름이 변경되었습니다!')
      }
    } catch (error) {
      console.error('이름 변경 실패:', error)
      alert('이름 변경에 실패했습니다.')
    }
  }

  const handleStartEditFolder = (e: React.MouseEvent, branchId: string, currentName: string) => {
    e.stopPropagation()
    setEditingBranchId(branchId)
    setNewFolderName(currentName)
  }

  const handleSaveFolderName = async (branchId: string, oldBranchName: string) => {
    if (!newFolderName.trim()) return

    try {
      const response = await fetch('/api/campaigns/rename-folder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldBranchName, newBranchName: newFolderName })
      })

      const result = await response.json()

      if (result.success) {
        setEditingBranchId(null)
        alert('폴더 이름이 변경되었습니다!')
        window.location.reload()
      }
    } catch (error) {
      console.error('폴더 이름 변경 실패:', error)
      alert('폴더 이름 변경에 실패했습니다.')
    }
  }

  const handleViewCampaign = (campaignId: string) => {
    window.location.href = `/analytics/campaigns/${campaignId}`
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-500">로딩 중...</div>
  }

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        저장된 캠페인이 없습니다.
      </div>
    )
  }

  // 지점별로 캠페인 그룹화
  const groupedCampaigns: GroupedCampaigns = campaigns.reduce((acc, campaign) => {
    const branchId = campaign.branchId || 'all'
    if (!acc[branchId]) {
      const branch = branches.find(b => b.id === branchId)
      acc[branchId] = {
        branchName: branchId === 'all' ? '전체지점' : (branch?.name || '알 수 없는 지점'),
        campaigns: []
      }
    }
    acc[branchId].campaigns.push(campaign)
    return acc
  }, {} as GroupedCampaigns)

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">저장된 캠페인</h2>

      <div className="space-y-3">
        {Object.entries(groupedCampaigns).map(([branchId, group]) => (
          <div key={branchId} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* 폴더 헤더 */}
            <div className="flex items-center justify-between p-4 bg-gray-50">
              {editingBranchId === branchId ? (
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-xl">
                    {expandedBranches.has(branchId) ? '📂' : '📁'}
                  </span>
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveFolderName(branchId, group.branchName)
                      } else if (e.key === 'Escape') {
                        setEditingBranchId(null)
                      }
                    }}
                    className="px-2 py-1 border border-blue-500 rounded flex-1"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveFolderName(branchId, group.branchName)}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                  >
                    저장
                  </button>
                  <button
                    onClick={() => setEditingBranchId(null)}
                    className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400 transition-colors"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => toggleBranch(branchId)}
                    className="flex-1 flex items-center gap-3 hover:bg-gray-100 transition-colors rounded p-2 -m-2"
                  >
                    <span className="text-xl">
                      {expandedBranches.has(branchId) ? '📂' : '📁'}
                    </span>
                    <span className="font-semibold text-gray-900">{group.branchName}</span>
                    <span className="text-sm text-gray-500">({group.campaigns.length}개)</span>
                    <span className="ml-auto text-gray-400">
                      {expandedBranches.has(branchId) ? '▼' : '▶'}
                    </span>
                  </button>
                  <button
                    onClick={(e) => handleStartEditFolder(e, branchId, group.branchName)}
                    className="ml-2 px-3 py-1 text-sm text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded transition-colors"
                  >
                    ✏️ 수정
                  </button>
                </>
              )}
            </div>

            {/* 폴더 내용 */}
            {expandedBranches.has(branchId) && (
              <div className="p-4 space-y-3 bg-white">
                {group.campaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    onClick={() => handleViewCampaign(campaign.id)}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        {editingCampaignId === campaign.id ? (
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={newCampaignName}
                              onChange={(e) => setNewCampaignName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveCampaignName(campaign.id)
                                } else if (e.key === 'Escape') {
                                  setEditingCampaignId(null)
                                }
                              }}
                              className="px-2 py-1 border border-blue-500 rounded font-semibold text-lg text-gray-900 flex-1"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveCampaignName(campaign.id)}
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors whitespace-nowrap"
                            >
                              저장
                            </button>
                            <button
                              onClick={() => setEditingCampaignId(null)}
                              className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400 transition-colors whitespace-nowrap"
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <>
                            <h3 className="font-semibold text-lg text-gray-900">{campaign.name}</h3>
                            <p className="text-sm text-gray-500 mt-1">
                              {formatDate(new Date(campaign.startDate))} ~ {formatDate(new Date(campaign.endDate))}
                            </p>
                          </>
                        )}
                      </div>
                      {editingCampaignId !== campaign.id && (
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => handleStartEditCampaign(e, campaign.id, campaign.name)}
                            className="px-3 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            ✏️ 수정
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleExport(campaign.id, campaign.name)
                            }}
                            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            Excel 다운로드
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      {/* 캠페인 기본 정보 */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">비용:</span>
                          <p className="font-semibold">{formatCurrency(Number(campaign.cost))}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">노출수:</span>
                          <p className="font-semibold">{formatNumber(campaign.impressions)}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">클릭수:</span>
                          <p className="font-semibold">{formatNumber(campaign.clicks)}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">CTR:</span>
                          <p className="font-semibold">
                            {campaign.impressions > 0
                              ? `${((campaign.clicks / campaign.impressions) * 100).toFixed(2)}%`
                              : '0%'}
                          </p>
                        </div>
                      </div>

                      {/* 성과 변화 */}
                      {campaign.analysis && (
                        <div className="pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-500 mb-2 font-medium">광고 전/후 변화</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div>
                              <span className="text-gray-600 text-xs">매출 변화:</span>
                              <p className={`font-bold ${campaign.analysis.changes.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {campaign.analysis.changes.revenueGrowth >= 0 ? '+' : ''}
                                {campaign.analysis.changes.revenueGrowth.toFixed(1)}%
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-600 text-xs">신규 이용자:</span>
                              <p className={`font-bold ${campaign.analysis.changes.newUsersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {campaign.analysis.changes.newUsersGrowth >= 0 ? '+' : ''}
                                {campaign.analysis.changes.newUsersGrowth.toFixed(1)}%
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-600 text-xs">일평균 이용자:</span>
                              <p className={`font-bold ${campaign.analysis.changes.avgDailyUsersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {campaign.analysis.changes.avgDailyUsersGrowth >= 0 ? '+' : ''}
                                {campaign.analysis.changes.avgDailyUsersGrowth.toFixed(1)}%
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-600 text-xs">재방문률:</span>
                              <p className={`font-bold ${campaign.analysis.changes.revisitRateGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {campaign.analysis.changes.revisitRateGrowth >= 0 ? '+' : ''}
                                {campaign.analysis.changes.revisitRateGrowth.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
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
