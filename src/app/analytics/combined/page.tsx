'use client'

import { useState, useEffect } from 'react'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils/formatters'
import SavedCombinedList from '@/components/analytics/saved-combined-list'

interface Branch {
  id: string
  name: string
}

interface CombinedForm {
  name: string
  branchIds: string[]
  startDate: string
  endDate: string
  // 광고 지표
  cost: number
  impressions: number
  clicks: number
  // 전략 정보
  strategyType: string
  reason: string
  description: string
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

interface CombinedAnalysis {
  branchAnalyses: BranchAnalysis[]
  adMetrics: {
    ctr: number
    cpc: number
    cost: number
    impressions: number
    clicks: number
  }
}

export default function CombinedAnalyticsPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [formData, setFormData] = useState<CombinedForm>({
    name: '',
    branchIds: [],
    startDate: '',
    endDate: '',
    cost: 0,
    impressions: 0,
    clicks: 0,
    strategyType: 'PRICE_DISCOUNT',
    reason: '',
    description: ''
  })
  const [analysis, setAnalysis] = useState<CombinedAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

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
      const response = await fetch('/api/analytics/combined/analyze', {
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
      const response = await fetch('/api/combined', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          analysis
        })
      })

      const result = await response.json()

      if (result.success) {
        alert('분석이 저장되었습니다!')
        setSaved(true)
        setRefreshKey(prev => prev + 1)
      }
    } catch (error) {
      console.error('저장 실패:', error)
      alert('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const strategyTypes = [
    { value: 'PRICE_DISCOUNT', label: '가격 할인' },
    { value: 'REVIEW_EVENT', label: '이벤트' },
    { value: 'NEW_CONTENT', label: '신규 콘텐츠' }
  ]

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">통합 성과 분석 (광고 + 전략)</h1>

        {/* 분석 입력 폼 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">분석 정보</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 기본 정보 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  분석명
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
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">{branch.name}</span>
                    </label>
                  ))}
                </div>
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
            </div>

            {/* 광고 지표 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">광고 지표</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    광고 비용 (원)
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    노출수
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    클릭수
                  </label>
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
              </div>
            </div>

            {/* 전략 정보 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">전략 정보</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    전략 유형
                  </label>
                  <select
                    value={formData.strategyType}
                    onChange={(e) => setFormData({ ...formData, strategyType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {strategyTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    전략 수립 이유
                  </label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="예: 최근 경쟁 업체의 가격 인하로 인한 고객 이탈 방지"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    전략 상세 내용
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder="예: 주중 시간권 20% 할인, 신규 가입자 대상 첫 달 기간권 30% 할인"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
            >
              {loading ? '분석 중...' : '성과 분석'}
            </button>
          </form>
        </div>

        {/* 분석 결과 */}
        {analysis && analysis.branchAnalyses && (
          <div className="space-y-6">
            {/* 광고 지표 (공통) */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">광고 지표 (전체 공통)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-600 mb-1">CTR (클릭률)</h3>
                  <p className="text-2xl font-bold text-blue-600">{formatPercent(analysis.adMetrics.ctr)}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-600 mb-1">CPC (클릭당 비용)</h3>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(analysis.adMetrics.cpc)}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-600 mb-1">총 광고 비용</h3>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(analysis.adMetrics.cost)}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-600 mb-1">노출수 / 클릭수</h3>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatNumber(analysis.adMetrics.impressions)} / {formatNumber(analysis.adMetrics.clicks)}
                  </p>
                </div>
              </div>
            </div>

            {/* 각 지점별 분석 결과 */}
            {analysis.branchAnalyses.map((branchAnalysis) => (
              <div key={branchAnalysis.branchId} className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4 text-blue-600">{branchAnalysis.branchName}</h2>

                {/* 주요 지표 */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-600 mb-1">ROI</h3>
                    <p className={`text-2xl font-bold ${branchAnalysis.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {branchAnalysis.roi >= 0 ? '+' : ''}{formatPercent(branchAnalysis.roi)}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-600 mb-1">ROAS</h3>
                    <p className={`text-2xl font-bold ${branchAnalysis.roas >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercent(branchAnalysis.roas)}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-600 mb-1">매출 변화</h3>
                    <p className={`text-2xl font-bold ${branchAnalysis.changes.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {branchAnalysis.changes.revenueGrowth >= 0 ? '+' : ''}{formatPercent(branchAnalysis.changes.revenueGrowth)}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-600 mb-1">신규 이용자 변화</h3>
                    <p className={`text-2xl font-bold ${branchAnalysis.changes.newUsersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {branchAnalysis.changes.newUsersGrowth >= 0 ? '+' : ''}{formatPercent(branchAnalysis.changes.newUsersGrowth)}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-600 mb-1">일평균 이용자 변화</h3>
                    <p className={`text-2xl font-bold ${branchAnalysis.changes.avgDailyUsersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {branchAnalysis.changes.avgDailyUsersGrowth >= 0 ? '+' : ''}{formatPercent(branchAnalysis.changes.avgDailyUsersGrowth)}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-600 mb-1">재방문률 변화</h3>
                    <p className={`text-2xl font-bold ${branchAnalysis.changes.revisitRateGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {branchAnalysis.changes.revisitRateGrowth >= 0 ? '+' : ''}{formatPercent(branchAnalysis.changes.revisitRateGrowth)}
                    </p>
                  </div>
                </div>

                {/* 비교 테이블 */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">지표</th>
                        <th className="text-right py-3 px-4">시행 전</th>
                        <th className="text-right py-3 px-4">시행 후</th>
                        <th className="text-right py-3 px-4">변화량</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-3 px-4">총 매출</td>
                        <td className="text-right py-3 px-4">{formatCurrency(branchAnalysis.beforeMetrics.revenue)}</td>
                        <td className="text-right py-3 px-4">{formatCurrency(branchAnalysis.afterMetrics.revenue)}</td>
                        <td className={`text-right py-3 px-4 font-semibold ${
                          branchAnalysis.changes.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {branchAnalysis.changes.revenueGrowth >= 0 ? '+' : ''}{formatPercent(branchAnalysis.changes.revenueGrowth)}
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4">신규 이용자</td>
                        <td className="text-right py-3 px-4">{formatNumber(branchAnalysis.beforeMetrics.newUsers)}</td>
                        <td className="text-right py-3 px-4">{formatNumber(branchAnalysis.afterMetrics.newUsers)}</td>
                        <td className={`text-right py-3 px-4 font-semibold ${
                          branchAnalysis.changes.newUsersGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {branchAnalysis.changes.newUsersGrowth >= 0 ? '+' : ''}{formatPercent(branchAnalysis.changes.newUsersGrowth)}
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4">일 평균 이용자</td>
                        <td className="text-right py-3 px-4">{formatNumber(branchAnalysis.beforeMetrics.avgDailyUsers)}</td>
                        <td className="text-right py-3 px-4">{formatNumber(branchAnalysis.afterMetrics.avgDailyUsers)}</td>
                        <td className={`text-right py-3 px-4 font-semibold ${
                          branchAnalysis.changes.avgDailyUsersGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {branchAnalysis.changes.avgDailyUsersGrowth >= 0 ? '+' : ''}{formatPercent(branchAnalysis.changes.avgDailyUsersGrowth)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4">재방문률</td>
                        <td className="text-right py-3 px-4">{formatPercent(branchAnalysis.beforeMetrics.revisitRate)}</td>
                        <td className="text-right py-3 px-4">{formatPercent(branchAnalysis.afterMetrics.revisitRate)}</td>
                        <td className={`text-right py-3 px-4 font-semibold ${
                          branchAnalysis.changes.revisitRateGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {branchAnalysis.changes.revisitRateGrowth >= 0 ? '+' : ''}{formatPercent(branchAnalysis.changes.revisitRateGrowth)}
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
                {saving ? '저장 중...' : saved ? '저장 완료' : '분석 저장'}
              </button>
            </div>
          </div>
        )}

        {/* 저장된 분석 목록 */}
        <div className="mt-8">
          <SavedCombinedList key={refreshKey} />
        </div>
      </div>
    </main>
  )
}
