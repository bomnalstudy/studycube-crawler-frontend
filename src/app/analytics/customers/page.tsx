'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

interface CustomerAnalytics {
  ltvByAge: Array<{
    segment: string
    totalCustomers: number
    totalPurchases: number
    avgPurchasePerCustomer: number
    estimatedLTV: number
  }>
  ltvByGender: Array<{
    segment: string
    totalCustomers: number
    totalPurchases: number
    avgPurchasePerCustomer: number
    estimatedLTV: number
  }>
  ltvByBehavior: Array<{
    behavior: string
    customerCount: number
    estimatedLTV: number
  }>
  repurchaseCycle: {
    overall: {
      avgDays: number
      medianDays: number
      repeatRate: number
      totalCustomers: number
      repeatCustomers: number
      label: string
    }
    periodTicket: {
      avgDays: number
      medianDays: number
      repeatRate: number
      totalCustomers: number
      repeatCustomers: number
      label: string
    }
    dayTicket: {
      avgDays: number
      medianDays: number
      repeatRate: number
      totalCustomers: number
      repeatCustomers: number
      label: string
    }
  }
  customerSegments: Array<{
    segment: string
    count: number
    percentage: number
  }>
  ltvByAgeGender: Array<{
    segment: string
    totalCustomers: number
    totalPurchases: number
    avgPurchasePerCustomer: number
    estimatedLTV: number
  }>
  ltvByAgeGenderBehavior: Array<{
    segment: string
    customerCount: number
    avgPurchasePerCustomer: number
    estimatedLTV: number
  }>
}

interface Branch {
  id: string
  name: string
}

export default function CustomerAnalyticsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranch, setSelectedBranch] = useState<string>('all')
  const [analytics, setAnalytics] = useState<CustomerAnalytics | null>(null)
  const [activeTab, setActiveTab] = useState<'age' | 'gender' | 'behavior' | 'segments' | 'repurchase' | 'ageGender' | 'complex'>('age')

  // 날짜를 YYYY-MM-DD 형식 문자열로 변환 (로컬 타임존)
  const formatDateToLocal = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const [dateRange, setDateRange] = useState<{ from: string; to: string }>(() => {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return {
      from: formatDateToLocal(firstDay),
      to: formatDateToLocal(lastDay)
    }
  })

  // 한 달 전으로 이동
  const moveToPreviousMonth = () => {
    const [year, month] = dateRange.from.split('-').map(Number)
    // 이전 달의 1일
    const newFrom = new Date(year, month - 2, 1) // month는 1-12이므로 -2
    // 이전 달의 마지막 날
    const newTo = new Date(year, month - 1, 0)

    setDateRange({
      from: formatDateToLocal(newFrom),
      to: formatDateToLocal(newTo)
    })
  }

  // 한 달 후로 이동
  const moveToNextMonth = () => {
    const [year, month] = dateRange.from.split('-').map(Number)
    // 다음 달의 1일
    const newFrom = new Date(year, month, 1) // month는 1-12이므로 그대로
    // 다음 달의 마지막 날
    const newTo = new Date(year, month + 1, 0)

    setDateRange({
      from: formatDateToLocal(newFrom),
      to: formatDateToLocal(newTo)
    })
  }

  const fetchBranches = async () => {
    try {
      const res = await fetch('/api/branches')
      const data = await res.json()
      if (data.success) {
        setBranches(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error)
    }
  }

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        branchId: selectedBranch,
        startDate: dateRange.from,
        endDate: dateRange.to
      })

      const res = await fetch(`/api/customer-analytics?${params}`)
      const data = await res.json()

      if (data.success) {
        setAnalytics(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedBranch, dateRange])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    fetchBranches()
  }, [])

  useEffect(() => {
    if (selectedBranch) {
      fetchAnalytics()
    }
  }, [selectedBranch, fetchAnalytics])

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">고객 생애가치 분석</h1>
          <p className="text-gray-600 mt-2">
            연령대, 성별, 행동 패턴별 고객 가치 분석
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">전체 지점</option>
            {branches && branches.map(branch => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>

          <div className="flex gap-2 items-center">
            <button
              onClick={moveToPreviousMonth}
              className="px-3 py-2 border rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="이전 달"
            >
              &lt;
            </button>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="py-2">~</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={moveToNextMonth}
              className="px-3 py-2 border rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="다음 달"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      {analytics && (
        <>
          {/* 주요 지표 카드 */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-start">
                <p className="text-sm font-medium text-gray-600">총 고객 수</p>
                <span className="text-2xl">👥</span>
              </div>
              <p className="text-2xl font-bold mt-2">
                {analytics.repurchaseCycle.overall.totalCustomers.toLocaleString()}명
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-start">
                <p className="text-sm font-medium text-gray-600">재방문율</p>
                <span className="text-2xl">🔄</span>
              </div>
              <p className="text-2xl font-bold mt-2">
                {analytics.repurchaseCycle.overall.repeatRate}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {analytics.repurchaseCycle.overall.repeatCustomers.toLocaleString()}명 재방문
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-start">
                <p className="text-sm font-medium text-gray-600">평균 재구매 주기</p>
                <span className="text-2xl">⏰</span>
              </div>
              <p className="text-2xl font-bold mt-2">
                {analytics.repurchaseCycle.overall.avgDays}일
              </p>
              <p className="text-xs text-gray-500 mt-1">
                중앙값: {analytics.repurchaseCycle.overall.medianDays}일
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-start">
                <p className="text-sm font-medium text-gray-600">최고 LTV 연령대</p>
                <span className="text-2xl">📈</span>
              </div>
              <p className="text-2xl font-bold mt-2">
                {analytics.ltvByAge[0]?.segment || '-'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                예상 LTV: {analytics.ltvByAge[0]?.estimatedLTV.toLocaleString()}원
              </p>
            </div>
          </div>

          {/* 탭 */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('age')}
                  className={`px-6 py-3 font-medium ${
                    activeTab === 'age'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  연령대별 LTV
                </button>
                <button
                  onClick={() => setActiveTab('gender')}
                  className={`px-6 py-3 font-medium ${
                    activeTab === 'gender'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  성별 LTV
                </button>
                <button
                  onClick={() => setActiveTab('behavior')}
                  className={`px-6 py-3 font-medium ${
                    activeTab === 'behavior'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  행동 패턴별 LTV
                </button>
                <button
                  onClick={() => setActiveTab('segments')}
                  className={`px-6 py-3 font-medium ${
                    activeTab === 'segments'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  고객 세그먼트
                </button>
                <button
                  onClick={() => setActiveTab('repurchase')}
                  className={`px-6 py-3 font-medium ${
                    activeTab === 'repurchase'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  재구매 주기
                </button>
                <button
                  onClick={() => setActiveTab('ageGender')}
                  className={`px-6 py-3 font-medium ${
                    activeTab === 'ageGender'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  연령+성별 LTV
                </button>
                <button
                  onClick={() => setActiveTab('complex')}
                  className={`px-6 py-3 font-medium ${
                    activeTab === 'complex'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  복합 LTV
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* 연령대별 LTV */}
              {activeTab === 'age' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">연령대별 고객 생애가치</h3>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={analytics.ltvByAge}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="segment" />
                        <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                        <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="totalCustomers" fill="#8884d8" name="고객 수" />
                        <Bar yAxisId="left" dataKey="avgPurchasePerCustomer" fill="#ffc658" name="평균 구매 횟수" />
                        <Bar yAxisId="right" dataKey="estimatedLTV" fill="#82ca9d" name="예상 LTV (원)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {analytics.ltvByAge.map((item, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <h4 className="text-lg font-semibold mb-3">{item.segment}</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">총 고객 수</span>
                            <span className="font-medium">{item.totalCustomers.toLocaleString()}명</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">총 구매 횟수</span>
                            <span className="font-medium">{item.totalPurchases.toLocaleString()}회</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">평균 구매/고객</span>
                            <span className="font-medium">{item.avgPurchasePerCustomer}회</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t">
                            <span className="text-sm font-medium">예상 LTV</span>
                            <span className="text-lg font-bold text-blue-600">
                              {item.estimatedLTV.toLocaleString()}원
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 성별 LTV */}
              {activeTab === 'gender' && (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">성별 고객 분포</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={analytics.ltvByGender}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ segment, totalCustomers }) =>
                              `${segment}: ${totalCustomers}명`
                            }
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="totalCustomers"
                          >
                            {analytics.ltvByGender.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4">성별 LTV 비교</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analytics.ltvByGender} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="segment" type="category" />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="estimatedLTV" fill="#82ca9d" name="예상 LTV (원)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    {analytics.ltvByGender.map((item, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <h4 className="text-lg font-semibold mb-3">{item.segment}</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">고객 수</span>
                            <span className="font-medium">{item.totalCustomers.toLocaleString()}명</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">평균 구매</span>
                            <span className="font-medium">{item.avgPurchasePerCustomer}회</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t">
                            <span className="text-sm font-medium">예상 LTV</span>
                            <span className="text-lg font-bold text-blue-600">
                              {item.estimatedLTV.toLocaleString()}원
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 행동 패턴별 LTV */}
              {activeTab === 'behavior' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">구매 빈도별 고객 분포</h3>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={analytics.ltvByBehavior}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="behavior" />
                        <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                        <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="customerCount" fill="#8884d8" name="고객 수 (명)" />
                        <Bar yAxisId="right" dataKey="estimatedLTV" fill="#82ca9d" name="예상 LTV (원)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {analytics.ltvByBehavior.map((item, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <h4 className="text-lg font-semibold mb-3">{item.behavior}</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">고객 수</span>
                            <span className="font-medium">{item.customerCount.toLocaleString()}명</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t">
                            <span className="text-sm font-medium">예상 LTV</span>
                            <span className="text-lg font-bold text-blue-600">
                              {item.estimatedLTV.toLocaleString()}원
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 고객 세그먼트 */}
              {activeTab === 'segments' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">고객 세그먼트 분포</h3>
                    <ResponsiveContainer width="100%" height={400}>
                      <PieChart>
                        <Pie
                          data={analytics.customerSegments}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ segment, percentage }) =>
                            `${segment}: ${percentage}%`
                          }
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {analytics.customerSegments.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {analytics.customerSegments.map((item, index) => {
                      const segmentInfo = {
                        vip: { label: 'VIP 고객', desc: '11회 이상 구매', color: 'text-purple-600' },
                        loyal: { label: '충성 고객', desc: '6-10회 구매', color: 'text-blue-600' },
                        regular: { label: '단골 고객', desc: '3-5회 구매', color: 'text-green-600' },
                        occasional: { label: '가끔 고객', desc: '2회 구매', color: 'text-yellow-600' },
                        oneTime: { label: '신규 고객', desc: '1회 구매', color: 'text-gray-600' }
                      }

                      const info = segmentInfo[item.segment as keyof typeof segmentInfo]

                      return (
                        <div key={index} className="border rounded-lg p-4">
                          <h4 className={`text-lg font-semibold ${info.color}`}>
                            {info.label}
                          </h4>
                          <p className="text-sm text-gray-600 mb-3">{info.desc}</p>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">고객 수</span>
                              <span className="font-medium">{item.count.toLocaleString()}명</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t">
                              <span className="text-sm font-medium">비율</span>
                              <span className="text-lg font-bold">{item.percentage}%</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 재구매 주기 분석 */}
              {activeTab === 'repurchase' && (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    {[analytics.repurchaseCycle.overall, analytics.repurchaseCycle.periodTicket, analytics.repurchaseCycle.dayTicket].map((cycle, index) => (
                      <div key={index} className="border rounded-lg p-6">
                        <h4 className="text-lg font-semibold mb-4">{cycle.label}</h4>
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm text-gray-600">평균 재구매 주기</p>
                            <p className="text-2xl font-bold text-blue-600">{cycle.avgDays}일</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">중앙값</p>
                            <p className="text-xl font-semibold">{cycle.medianDays}일</p>
                          </div>
                          <div className="pt-3 border-t">
                            <p className="text-sm text-gray-600">재방문율</p>
                            <p className="text-xl font-semibold">{cycle.repeatRate}%</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {cycle.repeatCustomers.toLocaleString()}명 / {cycle.totalCustomers.toLocaleString()}명
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">이용권 타입별 비교</h3>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={[
                        { name: '전체', avgDays: analytics.repurchaseCycle.overall.avgDays, repeatRate: analytics.repurchaseCycle.overall.repeatRate },
                        { name: '정기권', avgDays: analytics.repurchaseCycle.periodTicket.avgDays, repeatRate: analytics.repurchaseCycle.periodTicket.repeatRate },
                        { name: '당일권', avgDays: analytics.repurchaseCycle.dayTicket.avgDays, repeatRate: analytics.repurchaseCycle.dayTicket.repeatRate }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                        <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="avgDays" fill="#8884d8" name="평균 재구매 주기 (일)" />
                        <Bar yAxisId="right" dataKey="repeatRate" fill="#82ca9d" name="재방문율 (%)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* 연령+성별 복합 LTV */}
              {activeTab === 'ageGender' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">연령대+성별 조합 LTV Top 15</h3>
                    <ResponsiveContainer width="100%" height={500}>
                      <BarChart data={analytics.ltvByAgeGender} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="segment" type="category" width={120} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="estimatedLTV" fill="#8884d8" name="예상 LTV (원)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {analytics.ltvByAgeGender.slice(0, 9).map((item, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <h4 className="text-lg font-semibold mb-3">{item.segment}</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">고객 수</span>
                            <span className="font-medium">{item.totalCustomers.toLocaleString()}명</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">평균 구매</span>
                            <span className="font-medium">{item.avgPurchasePerCustomer}회</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t">
                            <span className="text-sm font-medium">예상 LTV</span>
                            <span className="text-lg font-bold text-blue-600">
                              {item.estimatedLTV.toLocaleString()}원
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 연령+성별+행동패턴 복합 LTV */}
              {activeTab === 'complex' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">연령+성별+행동패턴 조합 LTV Top 20</h3>
                    <ResponsiveContainer width="100%" height={600}>
                      <BarChart data={analytics.ltvByAgeGenderBehavior} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="segment" type="category" width={180} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="estimatedLTV" fill="#82ca9d" name="예상 LTV (원)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {analytics.ltvByAgeGenderBehavior.slice(0, 12).map((item, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <h4 className="text-sm font-semibold mb-3">{item.segment}</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">고객 수</span>
                            <span className="font-medium">{item.customerCount.toLocaleString()}명</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">평균 구매</span>
                            <span className="font-medium">{item.avgPurchasePerCustomer}회</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t">
                            <span className="text-sm font-medium">예상 LTV</span>
                            <span className="text-lg font-bold text-green-600">
                              {item.estimatedLTV.toLocaleString()}원
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
