'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { EventForm } from '@/components/strategy/EventForm'
import type { EventDetail } from '@/types/strategy'

export default function EventDetailPage() {
  const params = useParams()
  const eventId = params.id as string

  const [event, setEvent] = useState<EventDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchEvent()
  }, [eventId])

  const fetchEvent = async () => {
    try {
      const res = await fetch(`/api/strategy/events/${eventId}`)
      const data = await res.json()

      if (data.success) {
        setEvent(data.data)
      } else {
        setError(data.error || '이벤트를 찾을 수 없습니다.')
      }
    } catch (err) {
      console.error('Failed to fetch event:', err)
      setError('이벤트를 불러오는 데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50/30 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-purple-200 border-t-purple-600" />
          <p className="text-sm text-slate-500">이벤트 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50/30">
        <div className="p-6 lg:p-8 max-w-4xl mx-auto">
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="mt-4 text-slate-600 font-medium">{error || '이벤트를 찾을 수 없습니다.'}</p>
            <Link
              href="/strategy/events"
              className="inline-flex items-center mt-6 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 shadow-lg shadow-purple-200 transition-all"
            >
              목록으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50/30">
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        {/* 헤더 */}
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <Link href="/strategy" className="hover:text-purple-600 transition-colors">
              전략
            </Link>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <Link href="/strategy/events" className="hover:text-purple-600 transition-colors">
              이벤트
            </Link>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-slate-800 font-medium truncate max-w-[200px]">{event.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">이벤트 수정</h1>
          <p className="text-sm text-slate-500 mt-1">
            이벤트 정보를 수정하세요
          </p>
        </div>

        {/* 폼 */}
        <EventForm event={event} isEdit />
      </div>
    </div>
  )
}
