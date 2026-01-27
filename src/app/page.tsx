'use client'

import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { useRole } from '@/hooks/useRole'

export default function Home() {
  const { branchName, isAdmin, isLoading, session } = useRole()
  const currentUsername = session?.user?.username || ''

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 헤더 */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="text-lg font-bold text-gray-800">Studycube</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-700">{currentUsername}</p>
              <p className="text-xs text-gray-400">
                {isAdmin ? '관리자' : branchName || '지점'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="로그아웃"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-gray-900">통합 데이터 플랫폼</h1>
          <p className="text-sm text-gray-500 mt-2">사용할 도구를 선택하세요.</p>
        </div>

        {/* 카드 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 매출 대시보드 */}
          <Link
            href="/dashboard"
            className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-blue-300 transition-all"
          >
            <div className="h-32 bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <svg className="w-12 h-12 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
            <div className="p-5">
              <h2 className="text-base font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                매출 대시보드
              </h2>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                매출 현황, 이용권 분석, 시간대별 이용자 등 매장 운영 데이터를 확인합니다.
              </p>
            </div>
          </Link>

          {/* CRM 데이터 */}
          <Link
            href="/crm"
            className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-green-300 transition-all"
          >
            <div className="h-32 bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <svg className="w-12 h-12 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </div>
            <div className="p-5">
              <h2 className="text-base font-bold text-gray-800 group-hover:text-emerald-600 transition-colors">
                CRM 데이터
              </h2>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                고객 세그먼트, 이탈위험 관리, 고객 상세 이력 및 클레임을 관리합니다.
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
