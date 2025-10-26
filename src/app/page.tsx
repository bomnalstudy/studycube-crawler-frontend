'use client'

import { useEffect, useState } from 'react'
import { BarChart } from '@/components/charts/bar-chart'
import { DonutChart } from '@/components/charts/donut-chart'
import { MetricsCard } from '@/components/dashboard/metrics-card'
import { LoadingSkeleton } from '@/components/dashboard/loading-skeleton'
import { DashboardMetrics, BarChartData, DonutChartData } from '@/types/dashboard'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils/formatters'

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const response = await fetch('/api/metrics')
        const result = await response.json()

        if (result.success) {
          setMetrics(result.data)
        } else {
          setError(result.error || 'Failed to load data')
        }
      } catch (err) {
        setError('Failed to fetch metrics')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen p-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <LoadingSkeleton />
        </div>
      </main>
    )
  }

  if (error || !metrics) {
    return (
      <main className="min-h-screen p-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-red-800 font-semibold mb-2">데이터 로드 실패</h2>
            <p className="text-red-600">{error || '알 수 없는 오류가 발생했습니다.'}</p>
            <p className="text-sm text-red-500 mt-2">
              .env 파일에 DATABASE_URL이 설정되어 있는지 확인하세요.
            </p>
          </div>
        </div>
      </main>
    )
  }

  // 재방문자 수 차트 데이터
  const revisitChartData: BarChartData[] = metrics.weeklyRevisitData.map(item => ({
    label: item.visitCount === 4 ? '4회 이상' : `${item.visitCount}회`,
    value: item.count
  }))

  // 이용권 타입별 매출 비율 차트 데이터
  const ticketTypeData: DonutChartData[] = [
    { name: '당일권', value: metrics.revenueByTicketType.day },
    { name: '시간권', value: metrics.revenueByTicketType.hour },
    { name: '기간권', value: metrics.revenueByTicketType.period }
  ]

  // 나이대별 고객 수 집계
  const ageGroupMap = new Map<string, number>()
  metrics.customerDemographics.forEach(item => {
    const current = ageGroupMap.get(item.ageGroup) || 0
    ageGroupMap.set(item.ageGroup, current + item.count)
  })

  const ageGroupData: DonutChartData[] = Array.from(ageGroupMap.entries()).map(([ageGroup, count]) => ({
    name: ageGroup,
    value: count
  }))

  // 성별 고객 수 집계
  const genderMap = new Map<string, number>()
  metrics.customerDemographics.forEach(item => {
    const current = genderMap.get(item.gender) || 0
    genderMap.set(item.gender, current + item.count)
  })

  const genderData: DonutChartData[] = Array.from(genderMap.entries()).map(([gender, count]) => ({
    name: gender,
    value: count
  }))

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Studycube 대시보드</h1>
          <p className="text-gray-600 mt-2">이번 달 매출 및 고객 데이터 현황</p>
        </div>

        {/* 주요 지표 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricsCard
            title="이번달 신규 이용자"
            value={formatNumber(metrics.newUsersThisMonth)}
            subtitle="명"
          />
          <MetricsCard
            title="일 평균 이용권 사용"
            value={formatNumber(metrics.avgDailyTicketUsage)}
            subtitle="건"
          />
          <MetricsCard
            title="이번달 총 매출"
            value={formatCurrency(metrics.monthlyRevenue)}
            trend={{
              value: Math.abs(metrics.revenueGrowthRate),
              isPositive: metrics.revenueGrowthRate >= 0
            }}
          />
          <MetricsCard
            title="일 평균 매출"
            value={formatCurrency(metrics.avgDailyRevenue)}
          />
        </div>

        {/* 차트 그리드 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 이전 달 대비 매출 상승률 */}
          <BarChart
            data={[
              {
                label: '매출 변화율',
                value: metrics.revenueGrowthRate
              }
            ]}
            title="이전 달 대비 매출 상승률 (%)"
            color={metrics.revenueGrowthRate >= 0 ? '#10b981' : '#ef4444'}
          />

          {/* 월별 매장 매출 */}
          <BarChart
            data={[
              {
                label: '이번 달',
                value: metrics.monthlyRevenue
              }
            ]}
            title="월별 매장 매출 합계"
            color="#3b82f6"
          />

          {/* 이용권 타입별 매출 비율 */}
          <DonutChart
            data={ticketTypeData}
            title="이용권 타입별 매출 비율"
            colors={['#3b82f6', '#8b5cf6', '#ec4899']}
          />

          {/* 재방문자 수 */}
          <BarChart
            data={revisitChartData}
            title="일주일 고객 재방문자 수"
            color="#8b5cf6"
          />

          {/* 고객 나이대 분포 */}
          <DonutChart
            data={ageGroupData}
            title="고객 나이대 분포"
            colors={['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1']}
          />

          {/* 고객 성별 분포 */}
          <DonutChart
            data={genderData}
            title="고객 성별 분포"
            colors={['#3b82f6', '#ec4899']}
          />
        </div>
      </div>
    </main>
  )
}
