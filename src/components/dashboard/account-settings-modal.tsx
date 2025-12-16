'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'

interface AccountSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  currentUsername: string
}

export function AccountSettingsModal({ isOpen, onClose, currentUsername }: AccountSettingsModalProps) {
  const [newUsername, setNewUsername] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // 유효성 검사
    if (!currentPassword) {
      setError('현재 비밀번호를 입력해주세요')
      return
    }

    if (!newUsername && !newPassword) {
      setError('변경할 아이디 또는 새 비밀번호를 입력해주세요')
      return
    }

    if (newPassword && newPassword !== confirmPassword) {
      setError('새 비밀번호가 일치하지 않습니다')
      return
    }

    if (newPassword && newPassword.length < 4) {
      setError('새 비밀번호는 최소 4자 이상이어야 합니다')
      return
    }

    if (newUsername && newUsername.length < 3) {
      setError('아이디는 최소 3자 이상이어야 합니다')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/user/account', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          newUsername: newUsername || undefined,
          currentPassword,
          newPassword: newPassword || undefined
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '변경에 실패했습니다')
        return
      }

      setSuccess('계정 정보가 변경되었습니다. 다시 로그인해주세요.')

      // 3초 후 로그아웃
      setTimeout(() => {
        signOut({ callbackUrl: '/login' })
      }, 2000)

    } catch {
      setError('서버 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setNewUsername('')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setError('')
    setSuccess('')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">계정 설정</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">현재 아이디: {currentUsername}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
              {success}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              새 아이디 (변경 시에만 입력)
            </label>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="새 아이디"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading || !!success}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              현재 비밀번호 <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="현재 비밀번호"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={isLoading || !!success}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              새 비밀번호 (변경 시에만 입력)
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="새 비밀번호 (최소 4자)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading || !!success}
            />
          </div>

          {newPassword && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                새 비밀번호 확인
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="새 비밀번호 확인"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading || !!success}
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={isLoading || !!success}
            >
              {isLoading ? '변경 중...' : '변경하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
