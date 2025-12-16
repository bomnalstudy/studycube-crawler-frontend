'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { signOut } from 'next-auth/react'
import { BarChart } from '@/components/charts/bar-chart'
import { DonutChart } from '@/components/charts/donut-chart'
import { HourlyUsageChart } from '@/components/charts/hourly-usage-chart'
import { TicketRevenueChart } from '@/components/charts/ticket-revenue-chart'
import { MetricsCard } from '@/components/dashboard/metrics-card'
import { LoadingSkeleton } from '@/components/dashboard/loading-skeleton'
import { BranchSelector } from '@/components/dashboard/branch-selector'
import { DateRangePicker } from '@/components/dashboard/date-range-picker'
import { AccountSettingsModal } from '@/components/dashboard/account-settings-modal'
import { DashboardMetrics, BarChartData, DonutChartData } from '@/types/dashboard'
import { formatCurrency, formatNumber } from '@/lib/utils/formatters'
import { formatDate } from '@/lib/utils/date-helpers'
import { useRole } from '@/hooks/useRole'

interface Branch {
  id: string
  name: string
}

export default function DashboardPage() {
  const { isAdmin, branchId: userBranchId, session } = useRole()
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all')
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()))
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAccountModal, setShowAccountModal] = useState(false)

  const currentUsername = session?.user?.username || ''

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  // 지점 목록 가져오기
  useEffect(() => {
    async function fetchBranches() {
      try {
        const response = await fetch('/api/branches')
        const result = await response.json()

        if (result.success) {
          setBranches(result.data)

          // 지점 계정인 경우 자동으로 해당 지점 선택
          if (!isAdmin && userBranchId) {
            setSelectedBranchId(userBranchId)
          }
        }
      } catch (err) {
        console.error('Failed to fetch branches:', err)
      }
    }

    fetchBranches()
  }, [isAdmin, userBranchId])

  // 메트릭 데이터 가져오기
  useEffect(() => {
    async function fetchMetrics() {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          branchId: selectedBranchId,
          startDate: formatDate(startDate),
          endDate: formatDate(endDate)
        })

        const response = await fetch(`/api/metrics?${params}`)
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
  }, [selectedBranchId, startDate, endDate])

  // 이전 달로 이동
  const handlePreviousMonth = () => {
    const newDate = subMonths(startDate, 1)
    setStartDate(startOfMonth(newDate))
    setEndDate(endOfMonth(newDate))
  }

  // 다음 달로 이동
  const handleNextMonth = () => {
    const newDate = addMonths(startDate, 1)
    setStartDate(startOfMonth(newDate))
    setEndDate(endOfMonth(newDate))
  }

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

  // 나이대별 고객 수 집계 (gender가 '전체'인 것만)
  const ageGroupData: DonutChartData[] = metrics.customerDemographics
    .filter(item => item.gender === '전체')
    .map(item => ({
      name: item.ageGroup,
      value: item.count
    }))

  // 성별 고객 수 집계 (ageGroup이 '전체'인 것만)
  const genderData: DonutChartData[] = metrics.customerDemographics
    .filter(item => item.ageGroup === '전체')
    .map(item => ({
      name: item.gender,
      value: item.count
    }))

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* 계정 정보 바 */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-lg">
                  {currentUsername.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500">로그인 계정</p>
                <p className="font-medium text-gray-900">{currentUsername}</p>
              </div>
              {isAdmin && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                  관리자
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAccountModal(true)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                계정 설정
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                로그아웃
              </button>
            </div>
          </div>
        </div>

        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-900">Studycube 대시보드</h1>

            {/* 어드민만 분석 버튼 표시 */}
            {isAdmin && (
              <div className="flex gap-3">
                <Link
                  href="/analytics/campaigns"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-md"
                >
                  📊 광고 성과 분석
                </Link>
                <Link
                  href="/analytics/strategies"
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-md"
                >
                  📈 지점 전략 분석
                </Link>
                <Link
                  href="/analytics/combined"
                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-colors shadow-md"
                >
                  🚀 통합 성과 분석
                </Link>
              </div>
            )}
          </div>

          {/* 필터 컨트롤 */}
          <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-lg shadow">
            {/* 어드민은 모든 지점 선택 가능, 지점 계정은 자기 지점만 */}
            {isAdmin ? (
              <BranchSelector
                branches={branches}
                selectedBranchId={selectedBranchId}
                onBranchChange={setSelectedBranchId}
              />
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                <span className="text-gray-600">지점:</span>
                <span className="font-medium">
                  {branches.find(b => b.id === userBranchId)?.name || '내 지점'}
                </span>
              </div>
            )}
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              onPreviousMonth={handlePreviousMonth}
              onNextMonth={handleNextMonth}
            />
          </div>

          {/* 선택된 지점 표시 */}
          <p className="text-gray-600 mt-4">
            {selectedBranchId === 'all'
              ? '전체 지점 합산 데이터'
              : `${branches.find(b => b.id === selectedBranchId)?.name || '지점'} 데이터`}
            {' '}({formatDate(startDate)} ~ {formatDate(endDate)})
          </p>
        </div>

        {/* 주요 지표 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricsCard
            title="신규 이용자"
            value={formatNumber(metrics.newUsersThisMonth)}
            subtitle="명"
          />
          <MetricsCard
            title="일 평균 이용권 사용"
            value={formatNumber(metrics.avgDailyTicketUsage)}
            subtitle="건"
          />
          <MetricsCard
            title="총 매출"
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
          {/* 이전 기간 대비 매출 상승률 */}
          <BarChart
            data={[
              {
                label: '매출 변화율',
                value: metrics.revenueGrowthRate
              }
            ]}
            title="이전 기간 대비 매출 변화율 (%)"
            color={metrics.revenueGrowthRate >= 0 ? '#10b981' : '#ef4444'}
          />

          {/* 총 매출 */}
          <BarChart
            data={[
              {
                label: '기간 총 매출',
                value: metrics.monthlyRevenue
              }
            ]}
            title="기간 총 매출"
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
            title="최근 일주일 재방문자 수"
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

        {/* 이용권별 매출 Top 10 차트 (전체 너비) */}
        <div className="mb-8">
          <TicketRevenueChart
            data={metrics.ticketRevenueTop10}
            title="이용권별 매출 Top 10"
          />
        </div>

        {/* 시간대별 이용자 차트 (전체 너비) */}
        <div className="mb-8">
          <HourlyUsageChart
            data={metrics.hourlyUsageData}
            title="시간대별 평균 이용자 수"
          />
        </div>
      </div>

      {/* 계정 설정 모달 */}
      <AccountSettingsModal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        currentUsername={currentUsername}
      />
    </main>
  )
}
