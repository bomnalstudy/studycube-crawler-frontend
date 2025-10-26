'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils/formatters'
import { BarChart } from '@/components/charts/bar-chart'

interface Strategy {
  id: string
  name: string
  branchId: string
  startDate: string
  endDate: string
  type: string
  reason: string
  description: string
  status: string
  updatedAt: string
  branch?: {
    id: string
    name: string
  }
}

interface StrategyAnalysis {
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
}

export default function StrategyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [strategy, setStrategy] = useState<Strategy | null>(null)
  const [analysis, setAnalysis] = useState<StrategyAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null)

  useEffect(() => {
    params.then(p => setResolvedParams(p))
  }, [params])

  useEffect(() => {
    if (!resolvedParams) return
    loadStrategyDetail()
  }, [resolvedParams])

  const loadStrategyDetail = async () => {
    if (!resolvedParams) return

    try {
      const response = await fetch(`/api/strategies/${resolvedParams.id}`)
      const result = await response.json()

      if (result.success) {
        setStrategy(result.data.strategy)
        setAnalysis(result.data.analysis)
      }
    } catch (error) {
      console.error('전략 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const strategyTypeLabels: Record<string, string> = {
    PRICE_DISCOUNT: '가격 할인',
    REVIEW_EVENT: '이벤트',
    NEW_CONTENT: '신규 콘텐츠'
  }

  if (loading) {
    return (
      <main className="min-h-screen p-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">로딩 중...</div>
        </div>
      </main>
    )
  }

  if (!strategy || !analysis) {
    return (
      <main className="min-h-screen p-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">전략을 찾을 수 없습니다.</div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:underline mb-4 inline-block"
          >
            ← 전략 목록으로 돌아가기
          </button>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">{strategy.name}</h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  strategy.status === 'COMPLETED'
                    ? 'bg-gray-200 text-gray-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {strategy.status === 'COMPLETED' ? '완료' : '진행중'}
                </span>
              </div>
              <p className="text-gray-600 mt-2">
                {strategy.branch?.name || '전체지점'} • {new Date(strategy.startDate).toLocaleDateString()} ~ {new Date(strategy.endDate).toLocaleDateString()}
              </p>
              {strategy.status === 'ONGOING' && (
                <p className="text-sm text-blue-600 mt-1">
                  💡 이 전략은 진행 중이며, 매일 자동으로 최신 데이터로 업데이트됩니다.
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                마지막 업데이트: {new Date(strategy.updatedAt).toLocaleString('ko-KR')}
              </p>
            </div>
          </div>
        </div>

        {/* 전략 기본 정보 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-600 mb-2">지점</h3>
            <p className="text-lg font-semibold text-gray-900">
              {strategy.branch?.name || '전체지점'}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-600 mb-2">전략 유형</h3>
            <p className="text-lg font-semibold text-gray-900">
              {strategyTypeLabels[strategy.type] || strategy.type}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-600 mb-2">시작일</h3>
            <p className="text-lg font-semibold text-gray-900">
              {new Date(strategy.startDate).toLocaleDateString()}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-600 mb-2">종료일</h3>
            <p className="text-lg font-semibold text-gray-900">
              {new Date(strategy.endDate).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* 전략 수립 이유 & 상세 내용 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">전략 수립 이유</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{strategy.reason}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">전략 상세 내용</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{strategy.description}</p>
          </div>
        </div>

        {/* 주요 지표 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-600 mb-2">일평균 이용자 변화</h3>
            <p className={`text-3xl font-bold ${analysis.changes.avgDailyUsersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {analysis.changes.avgDailyUsersGrowth >= 0 ? '+' : ''}{formatPercent(analysis.changes.avgDailyUsersGrowth)}
            </p>
          </div>
        </div>

        {/* 성과 비교 그래프 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <BarChart
            data={[
              { label: '전략 전', value: analysis.beforeMetrics.revenue },
              { label: '전략 후', value: analysis.afterMetrics.revenue }
            ]}
            title="총 매출 전략 전/후 비교"
            color="#3b82f6"
          />
          <BarChart
            data={[
              { label: '전략 전', value: analysis.beforeMetrics.newUsers },
              { label: '전략 후', value: analysis.afterMetrics.newUsers }
            ]}
            title="신규 이용자 전략 전/후 비교"
            color="#10b981"
          />
          <BarChart
            data={[
              { label: '전략 전', value: analysis.beforeMetrics.avgDailyUsers },
              { label: '전략 후', value: analysis.afterMetrics.avgDailyUsers }
            ]}
            title="일 평균 이용자 전략 전/후 비교"
            color="#f59e0b"
          />
          <BarChart
            data={[
              { label: '전략 전', value: analysis.beforeMetrics.revisitRate },
              { label: '전략 후', value: analysis.afterMetrics.revisitRate }
            ]}
            title="재방문률 전략 전/후 비교"
            color="#8b5cf6"
          />
        </div>

        {/* 상세 성과 테이블 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">상세 성과 비교</h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">지표</th>
                  <th className="text-right py-3 px-4">전략 전</th>
                  <th className="text-right py-3 px-4">전략 후</th>
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

          {/* Excel 다운로드 버튼 */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                window.location.href = `/api/strategies/export?id=${strategy.id}&name=${encodeURIComponent(strategy.name)}`
              }}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              📊 Excel 다운로드
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
