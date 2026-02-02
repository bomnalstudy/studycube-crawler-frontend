'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { EventListItem, ExternalFactorListItem, EventStatus, OperationListItem, OperationStatus } from '@/types/strategy'
import { OPERATION_SUB_TYPES, OPERATION_STATUS } from '@/types/strategy'

interface DashboardStats {
  totalEvents: number
  ongoingEvents: number
  completedEvents: number
  plannedEvents: number
  totalOperations: number
  plannedOperations: number
  implementedOperations: number
}

export default function StrategyDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalEvents: 0,
    ongoingEvents: 0,
    completedEvents: 0,
    plannedEvents: 0,
    totalOperations: 0,
    plannedOperations: 0,
    implementedOperations: 0,
  })
  const [recentEvents, setRecentEvents] = useState<EventListItem[]>([])
  const [recentOperations, setRecentOperations] = useState<OperationListItem[]>([])
  const [upcomingFactors, setUpcomingFactors] = useState<ExternalFactorListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [eventsRes, factorsRes, operationsRes] = await Promise.all([
        fetch('/api/strategy/events'),
        fetch('/api/strategy/factors'),
        fetch('/api/strategy/operations'),
      ])

      const eventsData = await eventsRes.json()
      const factorsData = await factorsRes.json()
      const operationsData = await operationsRes.json()

      let eventStats = {
        totalEvents: 0,
        ongoingEvents: 0,
        completedEvents: 0,
        plannedEvents: 0,
      }

      if (eventsData.success) {
        const events = eventsData.data as EventListItem[]
        eventStats = {
          totalEvents: events.length,
          ongoingEvents: events.filter((e) => e.status === 'ONGOING').length,
          completedEvents: events.filter((e) => e.status === 'COMPLETED').length,
          plannedEvents: events.filter((e) => e.status === 'PLANNED').length,
        }
        setRecentEvents(events.slice(0, 5))
      }

      let operationStats = {
        totalOperations: 0,
        plannedOperations: 0,
        implementedOperations: 0,
      }

      if (operationsData.operations) {
        const operations = operationsData.operations as OperationListItem[]
        operationStats = {
          totalOperations: operations.length,
          plannedOperations: operations.filter((o) => o.status === 'PLANNED').length,
          implementedOperations: operations.filter((o) => o.status === 'IMPLEMENTED').length,
        }
        setRecentOperations(operations.slice(0, 3))
      }

      setStats({ ...eventStats, ...operationStats })

      if (factorsData.success) {
        setUpcomingFactors(factorsData.data.slice(0, 5))
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getOperationStatusStyle = (status: OperationStatus) => {
    const styles: Record<OperationStatus, { bg: string; text: string; dot: string }> = {
      PLANNED: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
      IMPLEMENTED: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
      CANCELLED: { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-400' },
    }
    return styles[status]
  }

  const getStatusStyle = (status: EventStatus) => {
    const styles: Record<EventStatus, { bg: string; text: string; dot: string }> = {
      PLANNED: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
      ONGOING: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
      COMPLETED: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
      CANCELLED: { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-400' },
    }
    return styles[status]
  }

  const getStatusLabel = (status: EventStatus) => {
    const labels: Record<EventStatus, string> = {
      PLANNED: '예정',
      ONGOING: '진행중',
      COMPLETED: '완료',
      CANCELLED: '취소',
    }
    return labels[status]
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50/30 p-6 lg:p-8">
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-3 border-purple-200 border-t-purple-600" />
            <p className="text-sm text-slate-500">데이터를 불러오는 중...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50/30">
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
        {/* 헤더 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-200">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">매장 전략 & 이벤트 측정</h1>
                <p className="text-sm text-slate-500 mt-0.5">이벤트 성과를 체계적으로 관리하고 분석하세요</p>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Link
              href="/strategy/events/new"
              className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 shadow-lg shadow-purple-200 transition-all hover:shadow-xl hover:shadow-purple-300"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              새 이벤트 등록
            </Link>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800 mt-4">{stats.totalEvents}</p>
            <p className="text-sm text-slate-500 mt-1">전체 이벤트</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-emerald-600 mt-4">{stats.ongoingEvents}</p>
            <p className="text-sm text-slate-500 mt-1">진행 중</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-600 mt-4">{stats.completedEvents}</p>
            <p className="text-sm text-slate-500 mt-1">완료됨</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-amber-600 mt-4">{stats.plannedEvents}</p>
            <p className="text-sm text-slate-500 mt-1">예정됨</p>
          </div>
        </div>

        {/* 빠른 액션 */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Link
            href="/strategy/events"
            className="group bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:border-purple-200 hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="font-semibold text-slate-700 mt-3 group-hover:text-purple-700 transition-colors">이벤트 관리</p>
            <p className="text-xs text-slate-400 mt-1">이벤트 목록 및 등록</p>
          </Link>

          <Link
            href="/strategy/operations"
            className="group bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:border-amber-200 hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="font-semibold text-slate-700 mt-3 group-hover:text-amber-700 transition-colors">운영 변경</p>
            <p className="text-xs text-slate-400 mt-1">시설 개선, 좌석 변경</p>
          </Link>

          <Link
            href="/strategy/analysis"
            className="group bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="font-semibold text-slate-700 mt-3 group-hover:text-blue-700 transition-colors">성과 분석</p>
            <p className="text-xs text-slate-400 mt-1">이벤트별 성과 측정</p>
          </Link>

          <Link
            href="/strategy/factors"
            className="group bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:border-orange-200 hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="font-semibold text-slate-700 mt-3 group-hover:text-orange-700 transition-colors">외부 요인</p>
            <p className="text-xs text-slate-400 mt-1">시험, 방학, 공휴일 등</p>
          </Link>

          <Link
            href="/strategy/branches"
            className="group bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:border-teal-200 hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center group-hover:bg-teal-500 group-hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <p className="font-semibold text-slate-700 mt-3 group-hover:text-teal-700 transition-colors">지점 설정</p>
            <p className="text-xs text-slate-400 mt-1">지점별 특성 관리</p>
          </Link>
        </div>

        {/* 최근 이벤트 & 운영 변경 & 외부 요인 */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* 최근 이벤트 */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">최근 이벤트</h2>
              <Link href="/strategy/events" className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                전체 보기 →
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {recentEvents.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="mt-3 text-slate-500 text-sm">등록된 이벤트가 없습니다</p>
                </div>
              ) : (
                recentEvents.map((event) => {
                  const statusStyle = getStatusStyle(event.status)
                  return (
                    <Link
                      key={event.id}
                      href={`/strategy/events/${event.id}`}
                      className="block p-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 truncate">{event.name}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {event.startDate} ~ {event.endDate}
                          </p>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                          {getStatusLabel(event.status)}
                        </span>
                      </div>
                    </Link>
                  )
                })
              )}
            </div>
          </div>

          {/* 운영 변경 */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">최근 운영 변경</h2>
              <Link href="/strategy/operations" className="text-sm text-amber-600 hover:text-amber-700 font-medium">
                전체 보기 →
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {recentOperations.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <p className="mt-3 text-slate-500 text-sm">등록된 운영 변경이 없습니다</p>
                </div>
              ) : (
                recentOperations.map((operation) => {
                  const statusStyle = getOperationStatusStyle(operation.status)
                  return (
                    <Link
                      key={operation.id}
                      href={`/strategy/operations/${operation.id}`}
                      className="block p-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 truncate">{operation.name}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {OPERATION_SUB_TYPES[operation.subType]} · {new Date(operation.implementedAt).toLocaleDateString('ko-KR')}
                          </p>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                          {OPERATION_STATUS[operation.status]}
                        </span>
                      </div>
                    </Link>
                  )
                })
              )}
            </div>
          </div>

          {/* 외부 요인 */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">다가오는 외부 요인</h2>
              <Link href="/strategy/factors" className="text-sm text-orange-600 hover:text-orange-700 font-medium">
                전체 보기 →
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {upcomingFactors.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="mt-3 text-slate-500 text-sm">등록된 외부 요인이 없습니다</p>
                </div>
              ) : (
                upcomingFactors.map((factor) => (
                  <div key={factor.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-800">{factor.name}</p>
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                            {factor.type}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {factor.startDate} ~ {factor.endDate}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
