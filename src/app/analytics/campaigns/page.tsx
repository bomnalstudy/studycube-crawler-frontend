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
  roi: number
  roas: number
}

interface CampaignAnalysis {
  branchAnalyses: BranchAnalysis[]
  adMetrics: {
    ctr: number
    cpc: number
    cost: number
    impressions: number
    clicks: number
  }
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
  const [branches, setBranches] = useState<Branch[]>([])

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
        setSaved(false)
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
      }
    } catch (error) {
      console.error('저장 실패:', error)
      alert('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
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
              <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">종료일</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">광고 비용 (원)</label>
              <input
                type="number"
                value={formData.cost || ''}
                onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) || 0 })}
                onFocus={(e) => e.target.select()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">노출수</label>
              <input
                type="number"
                value={formData.impressions || ''}
                onChange={(e) => setFormData({ ...formData, impressions: Number(e.target.value) || 0 })}
                onFocus={(e) => e.target.select()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">클릭수</label>
              <input
                type="number"
                value={formData.clicks || ''}
                onChange={(e) => setFormData({ ...formData, clicks: Number(e.target.value) || 0 })}
                onFocus={(e) => e.target.select()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
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
            {/* 광고 지표 (공통) */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">광고 지표</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">CTR (클릭률)</p>
                  <p className="text-2xl font-bold text-blue-600">{formatPercent(analysis.adMetrics.ctr)}</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-gray-600">CPC (클릭당 비용)</p>
                  <p className="text-2xl font-bold text-orange-600">{formatCurrency(analysis.adMetrics.cpc)}</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">총 비용</p>
                  <p className="text-2xl font-bold text-gray-600">{formatCurrency(analysis.adMetrics.cost)}</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">노출수 / 클릭수</p>
                  <p className="text-2xl font-bold text-gray-600">{formatNumber(analysis.adMetrics.impressions)} / {formatNumber(analysis.adMetrics.clicks)}</p>
                </div>
              </div>
            </div>

            {/* 각 지점별 성과 */}
            {analysis.branchAnalyses.map((branch) => (
              <div key={branch.branchId} className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4 text-blue-600">{branch.branchName}</h2>

                {/* 주요 지표 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-600">ROI</p>
                    <p className={`text-2xl font-bold ${branch.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {branch.roi >= 0 ? '+' : ''}{formatPercent(branch.roi)}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-gray-600">ROAS</p>
                    <p className="text-2xl font-bold text-purple-600">{formatPercent(branch.roas)}</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600">매출 변화</p>
                    <p className={`text-2xl font-bold ${branch.changes.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {branch.changes.revenueGrowth >= 0 ? '+' : ''}{formatPercent(branch.changes.revenueGrowth)}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-gray-600">신규 이용자 변화</p>
                    <p className={`text-2xl font-bold ${branch.changes.newUsersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {branch.changes.newUsersGrowth >= 0 ? '+' : ''}{formatPercent(branch.changes.newUsersGrowth)}
                    </p>
                  </div>
                </div>

                {/* 비교 테이블 */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-2 px-3">지표</th>
                        <th className="text-right py-2 px-3">광고 전</th>
                        <th className="text-right py-2 px-3">광고 후</th>
                        <th className="text-right py-2 px-3">변화량</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2 px-3">총 매출</td>
                        <td className="text-right py-2 px-3">{formatCurrency(branch.beforeMetrics.revenue)}</td>
                        <td className="text-right py-2 px-3">{formatCurrency(branch.afterMetrics.revenue)}</td>
                        <td className={`text-right py-2 px-3 font-semibold ${branch.changes.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {branch.changes.revenueGrowth >= 0 ? '+' : ''}{formatPercent(branch.changes.revenueGrowth)}
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-3">신규 이용자</td>
                        <td className="text-right py-2 px-3">{formatNumber(branch.beforeMetrics.newUsers)}</td>
                        <td className="text-right py-2 px-3">{formatNumber(branch.afterMetrics.newUsers)}</td>
                        <td className={`text-right py-2 px-3 font-semibold ${branch.changes.newUsersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {branch.changes.newUsersGrowth >= 0 ? '+' : ''}{formatPercent(branch.changes.newUsersGrowth)}
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-3">일 평균 이용자</td>
                        <td className="text-right py-2 px-3">{formatNumber(branch.beforeMetrics.avgDailyUsers)}</td>
                        <td className="text-right py-2 px-3">{formatNumber(branch.afterMetrics.avgDailyUsers)}</td>
                        <td className={`text-right py-2 px-3 font-semibold ${branch.changes.avgDailyUsersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {branch.changes.avgDailyUsersGrowth >= 0 ? '+' : ''}{formatPercent(branch.changes.avgDailyUsersGrowth)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3">재방문률</td>
                        <td className="text-right py-2 px-3">{formatPercent(branch.beforeMetrics.revisitRate)}</td>
                        <td className="text-right py-2 px-3">{formatPercent(branch.afterMetrics.revisitRate)}</td>
                        <td className={`text-right py-2 px-3 font-semibold ${branch.changes.revisitRateGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {branch.changes.revisitRateGrowth >= 0 ? '+' : ''}{formatPercent(branch.changes.revisitRateGrowth)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

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
