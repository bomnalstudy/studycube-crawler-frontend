'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRole } from '@/hooks/useRole'
import { signOut } from 'next-auth/react'

interface MenuItem {
  name: string
  href: string
  icon: string
}

interface MenuGroup {
  label: string
  items: MenuItem[]
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const { isAdmin, branchName, session } = useRole()

  // 로그인, 홈 페이지에서는 사이드바 숨김
  if (pathname === '/login' || pathname === '/') {
    return null
  }

  const currentUsername = session?.user?.username || ''
  const isCrmSection = pathname.startsWith('/crm')

  // 매출 대시보드 섹션 메뉴
  const dashboardMenuGroups: MenuGroup[] = [
    {
      label: '매출',
      items: [
        { name: '대시보드', href: '/dashboard', icon: '📊' },
      ]
    },
    ...(isAdmin ? [{
      label: '비교 분석',
      items: [
        { name: '고객 생애가치', href: '/analytics/customers', icon: '💰' },
        { name: '광고 성과', href: '/analytics/campaigns', icon: '📈' },
        { name: '지점 전략', href: '/analytics/strategies', icon: '🎯' },
        { name: '통합 분석', href: '/analytics/combined', icon: '📉' },
      ]
    }] : [])
  ]

  // CRM 섹션 메뉴
  const crmMenuGroups: MenuGroup[] = [
    {
      label: 'CRM',
      items: [
        { name: '대시보드', href: '/crm', icon: '🎯' },
        { name: '고객 리스트', href: '/crm/customers', icon: '👥' },
      ]
    }
  ]

  const menuGroups = isCrmSection ? crmMenuGroups : dashboardMenuGroups

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    if (href === '/crm') return pathname === '/crm'
    return pathname.startsWith(href)
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* 상단: 로고 */}
      <div className="p-5 border-b border-gray-100">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span className="text-base font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
            Studycube
          </span>
        </Link>
      </div>

      {/* 홈으로 돌아가기 */}
      <div className="px-3 pt-3">
        <Link
          href="/"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          홈으로 돌아가기
        </Link>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 px-3 pt-2 pb-4 overflow-y-auto">
        {menuGroups.map((group) => (
          <div key={group.label} className="mt-5 first:mt-0">
            <p className="px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                    isActive(item.href)
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* 하단: 사용자 정보 */}
      <div className="border-t border-gray-100 p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-gray-600 font-semibold text-sm">
              {currentUsername.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-700 truncate">{currentUsername}</p>
            <p className="text-xs text-gray-400 truncate">
              {isAdmin ? '관리자' : branchName || '지점'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0"
            title="로그아웃"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* 모바일 토글 버튼 */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed left-4 top-4 z-50 p-2 bg-white rounded-lg shadow-lg hover:bg-gray-100 transition-colors"
        aria-label="Toggle sidebar"
      >
        <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {mobileOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* 모바일 오버레이 */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* 데스크탑: 항상 고정 사이드바 */}
      <aside className="hidden lg:block fixed left-0 top-0 h-full w-60 bg-white border-r border-gray-200 z-40">
        {sidebarContent}
      </aside>

      {/* 모바일: 슬라이드 사이드바 */}
      <aside
        className={`lg:hidden fixed left-0 top-0 h-full w-60 bg-white shadow-xl z-40 transform transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
