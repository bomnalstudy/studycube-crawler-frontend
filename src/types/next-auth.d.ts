import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface User {
    username: string
    role: 'ADMIN' | 'BRANCH'
    branchId: string | null
    branchName?: string
  }

  interface Session {
    user: {
      id: string
      username: string
      role: 'ADMIN' | 'BRANCH'
      branchId: string | null
      branchName?: string
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    username: string
    role: 'ADMIN' | 'BRANCH'
    branchId: string | null
    branchName?: string
  }
}
