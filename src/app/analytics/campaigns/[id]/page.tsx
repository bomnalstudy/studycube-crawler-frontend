'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils/formatters'
import { formatDate } from '@/lib/utils/date-helpers'
import Link from 'next/link'
import { BarChart } from '@/components/charts/bar-chart'

interface CampaignDetail {
  id: string
  name: string
  branchId: string
  startDate: string
  endDate: string
  cost: number
  impressions: number
  clicks: number
  status: string
  updatedAt: string
  branch?: {
    name: string
  }
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
  const [analysis, setAnalysis] = useState<CampaignAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditingMetrics, setIsEditingMetrics] = useState(false)
  const [editedMetrics, setEditedMetrics] = useState({
    cost: 0,
    impressions: 0,
    clicks: 0
  })

  const loadCampaign = useCallback(async () => {
    try {
      // 캠페인 정보 로드
      const campaignResponse = await fetch(`/api/campaigns/${campaignId}`)
      const campaignResult = await campaignResponse.json()

      if (campaignResult.success) {
        setCampaign(campaignResult.data)
        setEditedMetrics({
          cost: Number(campaignResult.data.cost),
          impressions: campaignResult.data.impressions,
          clicks: campaignResult.data.clicks
        })

        // 캠페인 분석 실행
        const analysisResponse = await fetch('/api/analytics/campaigns/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            branchId: campaignResult.data.branchId,
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

  useEffect(() => {
    loadCampaign()
  }, [loadCampaign])

  const handleStartEditMetrics = () => {
    if (campaign) {
      setEditedMetrics({
        cost: Number(campaign.cost),
        impressions: campaign.impressions,
        clicks: campaign.clicks
      })
      setIsEditingMetrics(true)
    }
  }

  const handleSaveMetrics = async () => {
    if (!campaign) return

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/update-metrics`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedMetrics)
      })

      const result = await response.json()

      if (result.success) {
        setIsEditingMetrics(false)
        loadCampaign() // 성과 분석 재계산
      } else {
        alert('메트릭 수정에 실패했습니다.')
      }
    } catch (error) {
      console.error('메트릭 수정 실패:', error)
      alert('메트릭 수정에 실패했습니다.')
    }
  }

  const handleCancelEditMetrics = () => {
    if (campaign) {
      setEditedMetrics({
        cost: Number(campaign.cost),
        impressions: campaign.impressions,
        clicks: campaign.clicks
      })
    }
    setIsEditingMetrics(false)
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
                {campaign.branch?.name || '전체지점'} • {formatDate(new Date(campaign.startDate))} ~ {formatDate(new Date(campaign.endDate))}
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
            {!isEditingMetrics ? (
              <button
                onClick={handleStartEditMetrics}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                ✏️ 지표 수정
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleSaveMetrics}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                >
                  저장
                </button>
                <button
                  onClick={handleCancelEditMetrics}
                  className="px-4 py-2 text-sm bg-gray-400 text-white rounded hover:bg-gray-500"
                >
                  취소
                </button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">광고 비용</p>
              {isEditingMetrics ? (
                <input
                  type="number"
                  value={editedMetrics.cost}
                  onChange={(e) => setEditedMetrics({...editedMetrics, cost: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded text-lg font-bold"
                />
              ) : (
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(Number(campaign.cost))}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">노출수</p>
              {isEditingMetrics ? (
                <input
                  type="number"
                  value={editedMetrics.impressions}
                  onChange={(e) => setEditedMetrics({...editedMetrics, impressions: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded text-lg font-bold"
                />
              ) : (
                <p className="text-2xl font-bold text-gray-900">{formatNumber(campaign.impressions)}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">클릭수</p>
              {isEditingMetrics ? (
                <input
                  type="number"
                  value={editedMetrics.clicks}
                  onChange={(e) => setEditedMetrics({...editedMetrics, clicks: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded text-lg font-bold"
                />
              ) : (
                <p className="text-2xl font-bold text-gray-900">{formatNumber(campaign.clicks)}</p>
              )}
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
      </div>
    </main>
  )
}
