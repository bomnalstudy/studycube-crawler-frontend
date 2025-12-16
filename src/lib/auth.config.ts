import type { NextAuthConfig } from 'next-auth'

// 미들웨어에서 사용할 최소한의 auth 설정 (DB 연결 없음)
// providers는 auth.ts에서만 정의
export const authConfig: NextAuthConfig = {
  providers: [], // 미들웨어용 빈 배열 (auth.ts에서 실제 provider 추가)
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.username = user.username
        token.role = user.role
        token.branchId = user.branchId
        token.branchName = user.branchName
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.sub!
      session.user.username = token.username as string
      session.user.role = token.role as 'ADMIN' | 'BRANCH'
      session.user.branchId = token.branchId as string | null
      session.user.branchName = token.branchName as string | undefined
      return session
    },
    authorized({ auth, request: { nextUrl } }) {
      const session = auth
      const pathname = nextUrl.pathname

      // 공개 라우트
      const publicRoutes = ['/login']

      // 어드민 전용 라우트
      const adminOnlyRoutes = ['/analytics']

      // API 라우트는 각 API에서 처리
      if (pathname.startsWith('/api')) {
        return true
      }

      // 정적 파일 무시
      if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon') ||
        pathname.includes('.')
      ) {
        return true
      }

      // 공개 라우트
      if (publicRoutes.includes(pathname)) {
        // 이미 로그인된 사용자는 메인으로 리다이렉트
        if (session) {
          return Response.redirect(new URL('/', nextUrl))
        }
        return true
      }

      // 인증 필요한 라우트
      if (!session) {
        return Response.redirect(new URL('/login', nextUrl))
      }

      // 어드민 전용 라우트 체크
      const isAdminRoute = adminOnlyRoutes.some((route) =>
        pathname.startsWith(route)
      )

      if (isAdminRoute && session.user.role !== 'ADMIN') {
        return Response.redirect(new URL('/', nextUrl))
      }

      return true
    }
  },
  pages: {
    signIn: '/login'
  },
  session: {
    strategy: 'jwt'
  }
}
