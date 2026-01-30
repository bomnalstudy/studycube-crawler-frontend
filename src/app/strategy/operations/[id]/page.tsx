'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { OperationForm } from '@/components/strategy/OperationForm'
import type { OperationDetail } from '@/types/strategy'

export default function OperationDetailPage() {
  const params = useParams()
  const operationId = params.id as string

  const [operation, setOperation] = useState<OperationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchOperation()
  }, [operationId])

  const fetchOperation = async () => {
    try {
      const res = await fetch(`/api/strategy/operations/${operationId}`)
      const data = await res.json()

      if (data.operation) {
        setOperation(data.operation)
      } else {
        setError(data.error || '운영 변경을 찾을 수 없습니다.')
      }
    } catch (err) {
      console.error('Failed to fetch operation:', err)
      setError('운영 변경을 불러오는 데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-orange-200 border-t-orange-600" />
          <p className="text-sm text-slate-500">운영 변경 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error || !operation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30">
        <div className="p-6 lg:p-8 max-w-4xl mx-auto">
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="mt-4 text-slate-600 font-medium">{error || '운영 변경을 찾을 수 없습니다.'}</p>
            <Link
              href="/strategy/operations"
              className="inline-flex items-center mt-6 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-200 transition-all"
            >
              목록으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30">
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        {/* 헤더 */}
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <Link href="/strategy" className="hover:text-orange-600 transition-colors">
              전략
            </Link>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <Link href="/strategy/operations" className="hover:text-orange-600 transition-colors">
              운영 변경
            </Link>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-slate-800 font-medium truncate max-w-[200px]">{operation.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">운영 변경 수정</h1>
          <p className="text-sm text-slate-500 mt-1">
            운영 변경 정보를 수정하세요
          </p>
        </div>

        {/* 폼 */}
        <OperationForm operation={operation} isEdit />
      </div>
    </div>
  )
}
