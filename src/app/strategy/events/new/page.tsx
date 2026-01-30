'use client'

import Link from 'next/link'
import { EventForm } from '@/components/strategy/EventForm'

export default function NewEventPage() {
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
            <span className="text-slate-800 font-medium">새 이벤트</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">새 이벤트 등록</h1>
          <p className="text-sm text-slate-500 mt-1">
            이벤트 정보를 입력하고 성과를 측정하세요
          </p>
        </div>

        {/* 폼 */}
        <EventForm />
      </div>
    </div>
  )
}
