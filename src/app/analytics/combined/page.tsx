'use client'

import { useState, useEffect } from 'react'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils/formatters'
import SavedCombinedList from '@/components/analytics/saved-combined-list'
import { BarChart } from '@/components/charts/bar-chart'

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

interface CombinedAnalysis {
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
  // 광고 지표
  roi: number
  roas: number
  ctr: number
  cpc: number
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
      }
    } catch (error) {
      console.error('분석 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!analysis) return

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
        setRefreshKey(prev => prev + 1)
      }
    } catch (error) {
      console.error('저장 실패:', error)
      alert('저장에 실패했습니다.')
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
        {analysis && (
          <div className="space-y-6">
            {/* 주요 지표 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-sm font-medium text-gray-600 mb-2">ROI</h3>
                <p className={`text-3xl font-bold ${analysis.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {analysis.roi >= 0 ? '+' : ''}{formatPercent(analysis.roi)}
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-sm font-medium text-gray-600 mb-2">ROAS</h3>
                <p className={`text-3xl font-bold ${analysis.roas >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercent(analysis.roas)}
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-sm font-medium text-gray-600 mb-2">매출 변화</h3>
                <p className={`text-3xl font-bold ${analysis.changes.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {analysis.changes.revenueGrowth >= 0 ? '+' : ''}{formatPercent(analysis.changes.revenueGrowth)}
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-sm font-medium text-gray-600 mb-2">신규 이용자 변화</h3>
                <p className={`text-3xl font-bold ${analysis.changes.newUsersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {analysis.changes.newUsersGrowth >= 0 ? '+' : ''}{formatPercent(analysis.changes.newUsersGrowth)}
                </p>
              </div>
            </div>

            {/* 그래프 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BarChart
                data={[
                  { label: '시행 전', value: analysis.beforeMetrics.revenue },
                  { label: '시행 후', value: analysis.afterMetrics.revenue }
                ]}
                title="총 매출 전/후 비교"
                color="#3b82f6"
              />
              <BarChart
                data={[
                  { label: '시행 전', value: analysis.beforeMetrics.newUsers },
                  { label: '시행 후', value: analysis.afterMetrics.newUsers }
                ]}
                title="신규 이용자 전/후 비교"
                color="#10b981"
              />
              <BarChart
                data={[
                  { label: '시행 전', value: analysis.beforeMetrics.avgDailyUsers },
                  { label: '시행 후', value: analysis.afterMetrics.avgDailyUsers }
                ]}
                title="일 평균 이용자 전/후 비교"
                color="#f59e0b"
              />
              <BarChart
                data={[
                  { label: '시행 전', value: analysis.beforeMetrics.revisitRate },
                  { label: '시행 후', value: analysis.afterMetrics.revisitRate }
                ]}
                title="재방문률 전/후 비교"
                color="#8b5cf6"
              />
            </div>

            {/* 상세 비교 테이블 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">상세 성과 비교</h2>

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
                    <tr className="border-b">
                      <td className="py-3 px-4">재방문률</td>
                      <td className="text-right py-3 px-4">{formatPercent(analysis.beforeMetrics.revisitRate)}</td>
                      <td className="text-right py-3 px-4">{formatPercent(analysis.afterMetrics.revisitRate)}</td>
                      <td className={`text-right py-3 px-4 font-semibold ${
                        analysis.changes.revisitRateGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {analysis.changes.revisitRateGrowth >= 0 ? '+' : ''}{formatPercent(analysis.changes.revisitRateGrowth)}
                      </td>
                    </tr>
                    <tr className="border-b bg-blue-50">
                      <td className="py-3 px-4 font-semibold">CTR (클릭률)</td>
                      <td className="text-right py-3 px-4" colSpan={2}>{formatPercent(analysis.ctr)}</td>
                      <td className="text-right py-3 px-4">-</td>
                    </tr>
                    <tr className="bg-blue-50">
                      <td className="py-3 px-4 font-semibold">CPC (클릭당 비용)</td>
                      <td className="text-right py-3 px-4" colSpan={2}>{formatCurrency(analysis.cpc)}</td>
                      <td className="text-right py-3 px-4">-</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 액션 버튼 */}
            <div className="flex gap-4">
              <button
                onClick={handleSave}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                분석 저장
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
