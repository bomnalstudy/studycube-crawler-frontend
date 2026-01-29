/**
 * 스터디큐브 자동화 관련 타입 정의
 *
 * 실제 Puppeteer 실행은 GitHub Actions에서 수행됩니다.
 * scripts/run-automation.ts 참조
 */

export interface LoginCredentials {
  username: string
  password: string
}

export interface PointGrantParams {
  phone: string
  amount: number
  reason?: string
}

export interface PointGrantResult {
  phone: string
  success: boolean
  message: string
}
