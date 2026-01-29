'use client'

import { usePathname } from 'next/navigation'
import { useRole } from '@/hooks/useRole'
import { AIChat } from './AIChat'

export function AIChatWrapper() {
  const pathname = usePathname()
  const { branchName, branchId } = useRole()

  // 로그인, 홈 페이지에서는 챗봇 숨김
  if (pathname === '/login' || pathname === '/') {
    return null
  }

  return (
    <AIChat
      context={{
        branchId: branchId || undefined,
        branchName: branchName || undefined,
      }}
    />
  )
}
