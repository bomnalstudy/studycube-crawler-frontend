'use client'

import { usePathname } from 'next/navigation'

export function ContentWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // 홈, 로그인 페이지에서는 사이드바가 없으므로 풀 너비
  const isFullWidth = pathname === '/' || pathname === '/login'

  if (isFullWidth) {
    return <>{children}</>
  }

  return (
    <div className="lg:ml-60">
      {children}
    </div>
  )
}
