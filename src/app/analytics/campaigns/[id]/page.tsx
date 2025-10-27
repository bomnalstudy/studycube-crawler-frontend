'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils/formatters'
import { formatDate } from '@/lib/utils/date-helpers'
import Link from 'next/link'
import { BarChart } from '@/components/charts/bar-chart'

interface Branch {
  id: string
  name: string
}

interface CampaignDetail {
  id: string
  name: string
  startDate: string
  endDate: string
  cost: number
  impressions: number
  clicks: number
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

interface CampaignFormData {
  name: string
  branchIds: string[]
  startDate: string
  endDate: string
  cost: number
  impressions: number
  clicks: number
  description: string
}

interface CampaignAnalysis {
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
  ctr: number
  cpc: number
}

export default function CampaignDetailPage() {
  const params = useParams()
  const campaignId = params.id as string

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [analysis, setAnalysis] = useState<CampaignAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editFormData, setEditFormData] = useState<CampaignFormData | null>(null)

  const loadCampaign = useCallback(async () => {
    try {
      // 캠페인 정보 로드
      const campaignResponse = await fetch(`/api/campaigns/${campaignId}`)
      const campaignResult = await campaignResponse.json()

      if (campaignResult.success) {
        setCampaign(campaignResult.data)

        // 캠페인 분석 실행
        const branchIds = campaignResult.data.branches.map((b: any) => b.branchId)
        const analysisResponse = await fetch('/api/analytics/campaigns/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            branchIds,
            startDate: campaignResult.data.startDate,
            endDate: campaignResult.data.endDate,
            cost: campaignResult.data.cost,
            impressions: campaignResult.data.impressions,
            clicks: campaignResult.data.clicks
          })
        })

        const analysisResult = await analysisResponse.json()

        if (analysisResult.success) {
          setAnalysis(analysisResult.data)
        }
      }
    } catch (error) {
      console.error('캠페인 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }, [campaignId])

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
    loadCampaign()
    loadBranches()
  }, [loadCampaign, loadBranches])

  const handleOpenEditModal = () => {
    if (!campaign) return
    setEditFormData({
      name: campaign.name,
      branchIds: campaign.branches.map(b => b.branchId),
      startDate: campaign.startDate.split('T')[0],
      endDate: campaign.endDate.split('T')[0],
      cost: Number(campaign.cost),
      impressions: campaign.impressions,
      clicks: campaign.clicks,
      description: campaign.description || ''
    })
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!campaign || !editFormData) return

    if (editFormData.branchIds.length === 0) {
      alert('최소 1개의 지점을 선택해주세요.')
      return
    }

    try {
      const response = await fetch('/api/campaigns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: campaign.id,
          ...editFormData
        })
      })

      const result = await response.json()

      if (result.success) {
        setShowEditModal(false)
        setEditFormData(null)
        await loadCampaign()
        alert('캠페인이 수정되었습니다!')
      } else {
        alert('캠페인 수정에 실패했습니다.')
      }
    } catch (error) {
      console.error('캠페인 수정 실패:', error)
      alert('캠페인 수정에 실패했습니다.')
    }
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

  if (!campaign) {
    return (
      <main className="min-h-screen p-8 bg-gray-50">
        <div className="max-w-7xl mx-auto text-center py-12">
          <p className="text-red-600">캠페인을 찾을 수 없습니다.</p>
          <Link href="/analytics/campaigns" className="mt-4 inline-block text-blue-600 hover:underline">
            캠페인 목록으로 돌아가기
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
          <Link href="/analytics/campaigns" className="text-blue-600 hover:underline mb-4 inline-block">
            ← 캠페인 목록으로 돌아가기
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">{campaign.name}</h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  campaign.status === 'COMPLETED'
                    ? 'bg-gray-200 text-gray-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {campaign.status === 'COMPLETED' ? '완료' : '진행중'}
                </span>
              </div>
              <p className="text-gray-600 mt-2">
                {campaign.branches.map(b => b.branch.name).join(', ')} • {formatDate(new Date(campaign.startDate))} ~ {formatDate(new Date(campaign.endDate))}
              </p>
              {campaign.status === 'ONGOING' && (
                <p className="text-sm text-blue-600 mt-1">
                  💡 이 캠페인은 진행 중이며, 매일 자동으로 최신 데이터로 업데이트됩니다.
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                마지막 업데이트: {new Date(campaign.updatedAt).toLocaleString('ko-KR')}
              </p>
            </div>
          </div>
        </div>

        {/* 캠페인 기본 정보 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">캠페인 정보</h2>
            <button
              onClick={handleOpenEditModal}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              ✏️ 상세 수정
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">광고 비용</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(Number(campaign.cost))}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">노출수</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(campaign.impressions)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">클릭수</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(campaign.clicks)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">CTR</p>
              <p className="text-2xl font-bold text-gray-900">
                {campaign.impressions > 0
                  ? `${((campaign.clicks / campaign.impressions) * 100).toFixed(2)}%`
                  : '0%'}
              </p>
            </div>
          </div>
        </div>

        {/* 성과 분석 */}
        {analysis && (
          <>
            {/* 주요 지표 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-sm font-medium text-gray-600 mb-2">ROI</h3>
                <p className="text-3xl font-bold text-blue-600">{formatPercent(analysis.roi)}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-sm font-medium text-gray-600 mb-2">ROAS</h3>
                <p className="text-3xl font-bold text-green-600">{formatPercent(analysis.roas)}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-sm font-medium text-gray-600 mb-2">CTR</h3>
                <p className="text-3xl font-bold text-purple-600">{formatPercent(analysis.ctr)}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-sm font-medium text-gray-600 mb-2">CPC</h3>
                <p className="text-3xl font-bold text-orange-600">{formatCurrency(analysis.cpc)}</p>
              </div>
            </div>

            {/* 성과 비교 그래프 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <BarChart
                data={[
                  { label: '광고 전', value: analysis.beforeMetrics.revenue },
                  { label: '광고 후', value: analysis.afterMetrics.revenue }
                ]}
                title="총 매출 광고 전/후 비교"
                color="#3b82f6"
              />

              <BarChart
                data={[
                  { label: '광고 전', value: analysis.beforeMetrics.newUsers },
                  { label: '광고 후', value: analysis.afterMetrics.newUsers }
                ]}
                title="신규 이용자 광고 전/후 비교"
                color="#10b981"
              />

              <BarChart
                data={[
                  { label: '광고 전', value: analysis.beforeMetrics.avgDailyUsers },
                  { label: '광고 후', value: analysis.afterMetrics.avgDailyUsers }
                ]}
                title="일평균 이용자 광고 전/후 비교"
                color="#8b5cf6"
              />

              <BarChart
                data={[
                  { label: '광고 전', value: analysis.beforeMetrics.revisitRate },
                  { label: '광고 후', value: analysis.afterMetrics.revisitRate }
                ]}
                title="재방문률 광고 전/후 비교 (%)"
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
                      <th className="text-right py-3 px-4">광고 전</th>
                      <th className="text-right py-3 px-4">광고 후</th>
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
                <h3 className="text-2xl font-bold mb-6">캠페인 상세 수정</h3>

                <div className="space-y-6">
                  {/* 캠페인명 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      캠페인명 *
                    </label>
                    <input
                      type="text"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="캠페인명을 입력하세요"
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
                        광고 비용 (원) *
                      </label>
                      <input
                        type="number"
                        value={editFormData.cost}
                        onChange={(e) => setEditFormData({ ...editFormData, cost: Number(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        노출수 *
                      </label>
                      <input
                        type="number"
                        value={editFormData.impressions}
                        onChange={(e) => setEditFormData({ ...editFormData, impressions: Number(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        클릭수 *
                      </label>
                      <input
                        type="number"
                        value={editFormData.clicks}
                        onChange={(e) => setEditFormData({ ...editFormData, clicks: Number(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* 설명 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      설명
                    </label>
                    <textarea
                      value={editFormData.description}
                      onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="캠페인에 대한 설명을 입력하세요"
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
