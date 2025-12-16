import { auth } from '@/lib/auth'
import { Session } from 'next-auth'
import { NextResponse } from 'next/server'

export async function getAuthSession() {
  const session = await auth()
  return session
}

export async function requireAuth() {
  const session = await auth()
  if (!session) {
    throw new Error('Unauthorized')
  }
  return session
}

export async function requireAdmin() {
  const session = await requireAuth()
  if (session.user.role !== 'ADMIN') {
    throw new Error('Forbidden')
  }
  return session
}

// API용 어드민 권한 체크 - 실패시 NextResponse 반환
export async function checkAdminApi(): Promise<{ session: Session } | NextResponse> {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }
  return { session }
}

// NextResponse인지 체크
export function isErrorResponse(result: { session: Session } | NextResponse): result is NextResponse {
  return result instanceof NextResponse
}

// 지점 필터 생성 (자동 권한 기반)
export function getBranchFilter(session: Session, requestedBranchId?: string | null): { branchId?: string } {
  // 어드민: 모든 지점 접근 가능
  if (session.user.role === 'ADMIN') {
    if (!requestedBranchId || requestedBranchId === 'all') {
      return {}
    }
    return { branchId: requestedBranchId }
  }

  // 지점 계정: 자신의 지점만 (강제)
  // branchId가 null이면 빈 객체 반환 (데이터 없음)
  if (!session.user.branchId) {
    return {}
  }
  return { branchId: session.user.branchId }
}

// 권한 체크: 지점 계정이 다른 지점 데이터에 접근하려는지
export function canAccessBranch(session: Session, targetBranchId: string | null) {
  if (session.user.role === 'ADMIN') return true
  if (!targetBranchId || targetBranchId === 'all') return false
  return session.user.branchId === targetBranchId
}
