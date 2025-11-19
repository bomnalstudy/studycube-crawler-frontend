'use client'

import { useState, useEffect } from 'react'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils/formatters'
import { SavedCampaignsList } from '@/components/analytics/saved-campaigns-list'

interface Branch {
  id: string
  name: string
}

interface CampaignForm {
  name: string
  branchIds: string[]
  startDate: string
  endDate: string
  cost: number
  impressions: number
  clicks: number
}

interface CampaignAnalysis {
  // 광고 전 데이터
  beforeMetrics: {
    revenue: number
    newUsers: number
    avgDailyUsers: number
    revisitRate: number
  }
  // 광고 후 데이터
  afterMetrics: {
    revenue: number
    newUsers: number
    avgDailyUsers: number
    revisitRate: number
  }
  // 변화량
  changes: {
    revenueGrowth: number
    newUsersGrowth: number
    avgDailyUsersGrowth: number
    revisitRateGrowth: number
  }
  // ROI/ROAS
  roi: number
  roas: number
  ctr: number // Click Through Rate
  cpc: number // Cost Per Click
}

export default function CampaignsAnalyticsPage() {
  const [formData, setFormData] = useState<CampaignForm>({
    name: '',
    branchIds: [],
    startDate: '',
    endDate: '',
    cost: 0,
    impressions: 0,
    clicks: 0
  })
  const [analysis, setAnalysis] = useState<CampaignAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savedCampaigns, setSavedCampaigns] = useState<any[]>([])
  const [branches, setBranches] = useState<Branch[]>([])

  // 지점 목록 불러오기
  useEffect(() => {
    async function fetchBranches() {
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

    fetchBranches()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/analytics/campaigns/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (result.success) {
        setAnalysis(result.data)
        setSaved(false)  // 새 분석 시 저장 상태 초기화
      }
    } catch (error) {
      console.error('분석 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!analysis || saving || saved) return

    setSaving(true)
    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          analysis
        })
      })

      const result = await response.json()

      if (result.success) {
        alert('캠페인이 저장되었습니다!')
        setSaved(true)
        loadSavedCampaigns()
      }
    } catch (error) {
      console.error('저장 실패:', error)
      alert('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const loadSavedCampaigns = async () => {
    try {
      const response = await fetch('/api/campaigns')
      const result = await response.json()

      if (result.success) {
        setSavedCampaigns(result.data)
      }
    } catch (error) {
      console.error('캠페인 로드 실패:', error)
    }
  }

  const handleExport = () => {
    if (!analysis) return
    // Excel 내보내기 기능 (추후 구현)
    window.location.href = `/api/campaigns/export?name=${encodeURIComponent(formData.name)}`
  }

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">광고 성과 분석</h1>

        {/* 광고 입력 폼 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">광고 캠페인 정보</h2>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                캠페인 이름
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                지점 선택 (여러 개 선택 가능)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {branches.map((branch) => (
                  <label
                    key={branch.id}
                    className="flex items-center space-x-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={formData.branchIds.includes(branch.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            branchIds: [...formData.branchIds, branch.id]
                          })
                        } else {
                          setFormData({
                            ...formData,
                            branchIds: formData.branchIds.filter(id => id !== branch.id)
                          })
                        }
                      }}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{branch.name}</span>
                  </label>
                ))}
              </div>
              {formData.branchIds.length === 0 && (
                <p className="mt-2 text-sm text-red-600">* 최소 1개 이상의 지점을 선택해주세요</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                시작일
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                종료일
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                광고 비용 (원)
              </label>
              <input
                type="number"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                노출수
              </label>
              <input
                type="number"
                value={formData.impressions}
                onChange={(e) => setFormData({ ...formData, impressions: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                클릭수
              </label>
              <input
                type="number"
                value={formData.clicks}
                onChange={(e) => setFormData({ ...formData, clicks: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={loading || formData.branchIds.length === 0}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
              >
                {loading ? '분석 중...' : '성과 분석'}
              </button>
            </div>
          </form>
        </div>

        {/* 분석 결과 */}
        {analysis && (
          <div className="space-y-6">
            {/* 주요 지표 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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

            {/* 비교 테이블 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">성과 비교</h2>

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

            {/* 액션 버튼 */}
            <div className="flex gap-4">
              <button
                onClick={handleSave}
                disabled={saving || saved}
                className={`flex-1 px-6 py-3 text-white rounded-lg transition-colors font-medium ${
                  saved
                    ? 'bg-gray-400 cursor-not-allowed'
                    : saving
                      ? 'bg-gray-400 cursor-wait'
                      : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {saving ? '저장 중...' : saved ? '저장 완료' : '캠페인 저장'}
              </button>
              <button
                onClick={handleExport}
                className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Excel로 내보내기
              </button>
            </div>
          </div>
        )}

        {/* 저장된 캠페인 목록 */}
        <div className="mt-8">
          <SavedCampaignsList />
        </div>
      </div>
    </main>
  )
}
