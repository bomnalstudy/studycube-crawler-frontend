'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { EventListItem, EventStatus, EventMainType } from '@/types/strategy'

export default function EventsPage() {
  const [events, setEvents] = useState<EventListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchEvents()
  }, [statusFilter, typeFilter])

  const fetchEvents = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'ALL') params.set('status', statusFilter)
      if (typeFilter !== 'ALL') params.set('type', typeFilter)

      const res = await fetch(`/api/strategy/events?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setEvents(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch events:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (eventId: string, eventName: string) => {
    if (!confirm(`"${eventName}" 이벤트를 삭제하시겠습니까?`)) return

    try {
      const res = await fetch(`/api/strategy/events/${eventId}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        fetchEvents()
      } else {
        alert('삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('Failed to delete event:', error)
      alert('삭제에 실패했습니다.')
    }
  }

  const filteredEvents = events.filter((event) =>
    event.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

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

  const getTypeColor = (type: EventMainType) => {
    const colors: Record<EventMainType, string> = {
      PRICING: 'bg-blue-100 text-blue-700',
      PROMOTION: 'bg-purple-100 text-purple-700',
      MARKETING: 'bg-pink-100 text-pink-700',
      ENGAGEMENT: 'bg-orange-100 text-orange-700',
    }
    return colors[type]
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50/30">
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
              <Link href="/strategy" className="hover:text-purple-600 transition-colors">전략</Link>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-slate-800 font-medium">이벤트 관리</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">이벤트 관리</h1>
            <p className="text-sm text-slate-500 mt-1">이벤트를 등록하고 관리하세요</p>
          </div>
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

        {/* 필터 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="이벤트 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white transition-all"
            >
              <option value="ALL">전체 상태</option>
              <option value="PLANNED">예정</option>
              <option value="ONGOING">진행중</option>
              <option value="COMPLETED">완료</option>
              <option value="CANCELLED">취소</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white transition-all"
            >
              <option value="ALL">전체 유형</option>
              <option value="PRICING">가격 정책</option>
              <option value="PROMOTION">프로모션</option>
              <option value="MARKETING">마케팅</option>
              <option value="ENGAGEMENT">고객 참여</option>
            </select>
          </div>
        </div>

        {/* 이벤트 목록 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">
              이벤트 목록
              <span className="ml-2 text-sm font-normal text-slate-500">({filteredEvents.length}개)</span>
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-3 border-purple-200 border-t-purple-600" />
                <p className="text-sm text-slate-500">불러오는 중...</p>
              </div>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="mt-4 text-slate-600 font-medium">등록된 이벤트가 없습니다</p>
              <p className="mt-1 text-sm text-slate-400">새 이벤트를 등록해보세요</p>
              <Link
                href="/strategy/events/new"
                className="inline-flex items-center mt-4 px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                이벤트 등록하기
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredEvents.map((event) => {
                const statusStyle = getStatusStyle(event.status)
                return (
                  <div
                    key={event.id}
                    className="p-5 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/strategy/events/${event.id}`}
                            className="font-semibold text-slate-800 hover:text-purple-600 transition-colors truncate"
                          >
                            {event.name}
                          </Link>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                            {getStatusLabel(event.status)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {event.startDate} ~ {event.endDate}
                        </div>

                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {event.types.map((t, i) => (
                            <span key={i} className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(t.type)}`}>
                              {t.subType}
                            </span>
                          ))}
                        </div>

                        {event.branches.length > 0 && (
                          <p className="text-xs text-slate-400 mt-2">
                            <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {event.branches.map((b) => b.name).join(', ')}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/strategy/analysis?eventId=${event.id}`}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="성과 분석"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </Link>
                        <Link
                          href={`/strategy/events/${event.id}`}
                          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="수정"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Link>
                        <button
                          onClick={() => handleDelete(event.id, event.name)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="삭제"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
