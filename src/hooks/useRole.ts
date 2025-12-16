'use client'

import { useSession } from 'next-auth/react'

export function useRole() {
  const { data: session, status } = useSession()

  return {
    isAdmin: session?.user?.role === 'ADMIN',
    isBranch: session?.user?.role === 'BRANCH',
    branchId: session?.user?.branchId ?? null,
    branchName: session?.user?.branchName,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    session
  }
}
