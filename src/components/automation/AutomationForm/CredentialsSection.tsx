'use client'

import { memo, useState } from 'react'

interface CredentialsSectionProps {
  username: string
  password: string
  onUsernameChange: (username: string) => void
  onPasswordChange: (password: string) => void
}

function CredentialsSectionInner({
  username,
  password,
  onUsernameChange,
  onPasswordChange,
}: CredentialsSectionProps) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-4">
        <span className="w-7 h-7 rounded-full bg-purple-600 text-white text-sm font-semibold flex items-center justify-center">
          4
        </span>
        <span className="text-base font-semibold text-gray-800">스터디큐브 로그인</span>
      </div>

      <p className="text-xs text-gray-500 mb-4">
        자동 문자/포인트 발송을 위해 스터디큐브 관리자 계정 정보가 필요합니다.
      </p>

      <div className="grid grid-cols-2 gap-4">
        {/* 아이디 */}
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <span className="text-xs font-medium text-gray-500">아이디</span>
          <input
            type="text"
            value={username}
            onChange={e => onUsernameChange(e.target.value)}
            placeholder="관리자 아이디"
            className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-400"
          />
        </div>

        {/* 비밀번호 */}
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <span className="text-xs font-medium text-gray-500">비밀번호</span>
          <div className="relative mt-1">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => onPasswordChange(e.target.value)}
              placeholder="관리자 비밀번호"
              className="w-full px-3 py-2 pr-16 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-400"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 bg-white border border-gray-300 rounded"
            >
              {showPassword ? '숨기기' : '보기'}
            </button>
          </div>
        </div>
      </div>

      {/* 상태 표시 */}
      <div className="mt-3">
        {username && password ? (
          <div className="flex items-center gap-2 text-sm text-green-600 p-2 bg-green-50 rounded-md">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>로그인 정보 입력 완료</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-amber-600 p-2 bg-amber-50 rounded-md">
            <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
            <span>로그인 정보를 입력해주세요</span>
          </div>
        )}
      </div>
    </div>
  )
}

export const CredentialsSection = memo(CredentialsSectionInner)
