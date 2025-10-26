'use client'

import { useEffect, useState, use } from 'react'
import { BarChart } from '@/components/charts/bar-chart'

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
}

interface Analysis {
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

export default function CombinedDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [combined, setCombined] = useState<CombinedAnalysis | null>(null)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditingMetrics, setIsEditingMetrics] = useState(false)
  const [editedMetrics, setEditedMetrics] = useState({
    cost: 0,
    impressions: 0,
    clicks: 0
  })

  useEffect(() => {
    fetchCombinedDetail()
  }, [id])

  const fetchCombinedDetail = async () => {
    try {
      const response = await fetch(`/api/combined/${id}`)
      const data = await response.json()

      if (data.success) {
        setCombined(data.data.combined)
        setAnalysis(data.data.analysis)
        setEditedMetrics({
          cost: Number(data.data.combined.cost || 0),
          impressions: data.data.combined.impressions || 0,
          clicks: data.data.combined.clicks || 0
        })
      }
    } catch (error) {
      console.error('Failed to fetch combined detail:', error)
    } finally {
      setLoading(false)
    }
  }

  const startEditingMetrics = () => {
    if (combined) {
      setEditedMetrics({
        cost: Number(combined.cost || 0),
        impressions: combined.impressions || 0,
        clicks: combined.clicks || 0
      })
      setIsEditingMetrics(true)
    }
  }

  const cancelEditingMetrics = () => {
    setIsEditingMetrics(false)
  }

  const saveMetrics = async () => {
    try {
      const response = await fetch(`/api/combined/${id}/update-metrics`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedMetrics)
      })

      if (response.ok) {
        await fetchCombinedDetail()
        setIsEditingMetrics(false)
      }
    } catch (error) {
      console.error('Failed to update metrics:', error)
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

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('ko-KR').format(value)
  }

  const strategyTypeLabels: Record<string, string> = {
    PRICE_DISCOUNT: '가격 할인',
    REVIEW_EVENT: '이벤트',
    NEW_CONTENT: '신규 콘텐츠'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-gray-500 text-lg">로딩 중...</div>
          </div>
        </div>
      </div>
    )
  }

  if (!combined || !analysis) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20 text-gray-500">통합 분석을 찾을 수 없습니다.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => window.history.back()}
            className="mb-4 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors flex items-center gap-2"
          >
            ← 돌아가기
          </button>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">{combined.name}</h1>
              <p className="text-gray-600">
                {combined.branch?.name || '전체지점'} • {' '}
                {new Date(combined.startDate).toLocaleDateString('ko-KR')} ~ {new Date(combined.endDate).toLocaleDateString('ko-KR')}
              </p>
            </div>

            <button
              onClick={() => window.location.href = `/api/combined/export?id=${combined.id}&name=${encodeURIComponent(combined.name)}`}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-colors shadow-lg"
            >
              📊 Excel 다운로드
            </button>
          </div>
        </div>

        {/* 기본 정보 */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">기본 정보</h2>
            {!isEditingMetrics && (
              <button
                onClick={startEditingMetrics}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                ✏️ 광고 지표 수정
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {combined.cost !== null && (
              <div>
                <p className="text-sm text-gray-500 mb-1">광고 비용</p>
                {isEditingMetrics ? (
                  <input
                    type="number"
                    value={editedMetrics.cost}
                    onChange={(e) => setEditedMetrics({ ...editedMetrics, cost: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-bold"
                  />
                ) : (
                  <p className="text-2xl font-bold text-gray-800">{formatCurrency(Number(combined.cost))}</p>
                )}
              </div>
            )}

            {combined.impressions !== null && (
              <div>
                <p className="text-sm text-gray-500 mb-1">노출수</p>
                {isEditingMetrics ? (
                  <input
                    type="number"
                    value={editedMetrics.impressions}
                    onChange={(e) => setEditedMetrics({ ...editedMetrics, impressions: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-bold"
                  />
                ) : (
                  <p className="text-2xl font-bold text-gray-800">{formatNumber(combined.impressions)}</p>
                )}
              </div>
            )}

            {combined.clicks !== null && (
              <div>
                <p className="text-sm text-gray-500 mb-1">클릭수</p>
                {isEditingMetrics ? (
                  <input
                    type="number"
                    value={editedMetrics.clicks}
                    onChange={(e) => setEditedMetrics({ ...editedMetrics, clicks: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-bold"
                  />
                ) : (
                  <p className="text-2xl font-bold text-gray-800">{formatNumber(combined.clicks)}</p>
                )}
              </div>
            )}

            {combined.strategyType && (
              <div>
                <p className="text-sm text-gray-500 mb-1">전략 유형</p>
                <p className="text-2xl font-bold text-gray-800">{strategyTypeLabels[combined.strategyType] || combined.strategyType}</p>
              </div>
            )}
          </div>

          {isEditingMetrics && (
            <div className="flex gap-3 mt-6">
              <button
                onClick={saveMetrics}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
              >
                💾 저장
              </button>
              <button
                onClick={cancelEditingMetrics}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
              >
                취소
              </button>
            </div>
          )}

          {combined.cost !== null && combined.impressions !== null && combined.clicks !== null && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6 pt-6 border-t">
              <div>
                <p className="text-sm text-gray-500 mb-1">CTR (클릭률)</p>
                <p className="text-2xl font-bold text-blue-600">{formatPercent(analysis.ctr)}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-1">CPC (클릭당 비용)</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(analysis.cpc)}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-1">ROI</p>
                <p className={`text-2xl font-bold ${analysis.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercent(analysis.roi)}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-1">ROAS</p>
                <p className="text-2xl font-bold text-purple-600">{formatPercent(analysis.roas)}</p>
              </div>
            </div>
          )}

          {combined.reason && (
            <div className="mt-6 pt-6 border-t">
              <p className="text-sm font-semibold text-gray-700 mb-2">전략 수립 이유</p>
              <p className="text-gray-600 whitespace-pre-wrap">{combined.reason}</p>
            </div>
          )}

          {combined.description && (
            <div className="mt-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">전략 상세 내용</p>
              <p className="text-gray-600 whitespace-pre-wrap">{combined.description}</p>
            </div>
          )}
        </div>

        {/* 성과 그래프 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <BarChart
              data={[
                { label: '시행 전', value: analysis.beforeMetrics.revenue },
                { label: '시행 후', value: analysis.afterMetrics.revenue }
              ]}
              title="총 매출 전/후 비교"
              color="#10B981"
              unit="원"
            />
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6">
            <BarChart
              data={[
                { label: '시행 전', value: analysis.beforeMetrics.newUsers },
                { label: '시행 후', value: analysis.afterMetrics.newUsers }
              ]}
              title="신규 이용자 전/후 비교"
              color="#3B82F6"
              unit="명"
            />
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6">
            <BarChart
              data={[
                { label: '시행 전', value: analysis.beforeMetrics.avgDailyUsers },
                { label: '시행 후', value: analysis.afterMetrics.avgDailyUsers }
              ]}
              title="일평균 이용자 전/후 비교"
              color="#F59E0B"
              unit="명"
            />
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6">
            <BarChart
              data={[
                { label: '시행 전', value: analysis.beforeMetrics.revisitRate },
                { label: '시행 후', value: analysis.afterMetrics.revisitRate }
              ]}
              title="재방문률 전/후 비교"
              color="#8B5CF6"
              unit="%"
            />
          </div>
        </div>

        {/* 상세 성과 비교 테이블 */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">상세 성과 비교</h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">지표</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">시행 전</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">시행 후</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">변화량</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">변화율</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-700">총 매출</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-600">{formatCurrency(analysis.beforeMetrics.revenue)}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-600">{formatCurrency(analysis.afterMetrics.revenue)}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-600">
                    {formatCurrency(analysis.afterMetrics.revenue - analysis.beforeMetrics.revenue)}
                  </td>
                  <td className={`px-6 py-4 text-sm text-right font-bold ${analysis.changes.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercent(analysis.changes.revenueGrowth)}
                  </td>
                </tr>

                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-700">신규 이용자</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-600">{formatNumber(analysis.beforeMetrics.newUsers)}명</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-600">{formatNumber(analysis.afterMetrics.newUsers)}명</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-600">
                    {formatNumber(analysis.afterMetrics.newUsers - analysis.beforeMetrics.newUsers)}명
                  </td>
                  <td className={`px-6 py-4 text-sm text-right font-bold ${analysis.changes.newUsersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercent(analysis.changes.newUsersGrowth)}
                  </td>
                </tr>

                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-700">일평균 이용자</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-600">{analysis.beforeMetrics.avgDailyUsers.toFixed(1)}명</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-600">{analysis.afterMetrics.avgDailyUsers.toFixed(1)}명</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-600">
                    {(analysis.afterMetrics.avgDailyUsers - analysis.beforeMetrics.avgDailyUsers).toFixed(1)}명
                  </td>
                  <td className={`px-6 py-4 text-sm text-right font-bold ${analysis.changes.avgDailyUsersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercent(analysis.changes.avgDailyUsersGrowth)}
                  </td>
                </tr>

                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-700">재방문률</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-600">{analysis.beforeMetrics.revisitRate.toFixed(2)}%</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-600">{analysis.afterMetrics.revisitRate.toFixed(2)}%</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-600">
                    {(analysis.afterMetrics.revisitRate - analysis.beforeMetrics.revisitRate).toFixed(2)}%p
                  </td>
                  <td className={`px-6 py-4 text-sm text-right font-bold ${analysis.changes.revisitRateGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercent(analysis.changes.revisitRateGrowth)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
