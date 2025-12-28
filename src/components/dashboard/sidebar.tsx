'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRole } from '@/hooks/useRole'

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const { isAdmin, branchName } = useRole()

  // 로그인 페이지에서는 사이드바 숨김
  if (pathname === '/login') {
    return null
  }

  // 기본 메뉴 (모든 사용자)
  const baseMenuItems = [
    { name: '대시보드', href: '/', icon: '📊' }
  ]

  // 어드민 전용 메뉴
  const adminMenuItems = [
    { name: '고객 생애가치 분석', href: '/analytics/customers', icon: '👥' },
    { name: '광고 성과 분석', href: '/analytics/campaigns', icon: '📈' },
    { name: '지점 전략 성과 분석', href: '/analytics/strategies', icon: '🎯' },
    { name: '광고 + 전략 성과 분석', href: '/analytics/combined', icon: '📉' }
  ]

  const menuItems = isAdmin
    ? [...baseMenuItems, ...adminMenuItems]
    : baseMenuItems

  return (
    <>
      {/* 토글 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed left-4 top-4 z-50 p-2 bg-white rounded-lg shadow-lg hover:bg-gray-100 transition-colors"
        aria-label="Toggle sidebar"
      >
        <svg
          className="w-6 h-6 text-gray-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* 오버레이 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 사이드바 */}
      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-white shadow-xl z-40 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 h-full flex flex-col">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Studycube</h2>
            {/* 지점 계정이면 지점명 표시 */}
            {branchName && (
              <p className="text-sm text-gray-500 mt-1">{branchName}</p>
            )}
            {isAdmin && (
              <p className="text-xs text-blue-600 mt-1 font-medium">관리자</p>
            )}
          </div>

          <nav className="space-y-2 mt-6 flex-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>
    </>
  )
}
