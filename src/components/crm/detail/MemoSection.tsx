'use client'

import { useState } from 'react'
import { CustomerMemoItem } from '@/types/crm'

interface MemoSectionProps {
  customerId: string
  memos: CustomerMemoItem[]
  onMemoCreated: (memo: CustomerMemoItem) => void
  onMemoDeleted: (memoId: string) => void
}

export function MemoSection({ customerId, memos, onMemoCreated, onMemoDeleted }: MemoSectionProps) {
  const [newMemo, setNewMemo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!newMemo.trim() || submitting) return

    try {
      setSubmitting(true)
      const res = await fetch(`/api/crm/customers/${customerId}/memos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMemo.trim() }),
      })
      const json = await res.json()
      if (json.success) {
        onMemoCreated(json.data)
        setNewMemo('')
      }
    } catch {
      // 에러 처리
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (memoId: string) => {
    if (deletingId) return

    try {
      setDeletingId(memoId)
      const res = await fetch(`/api/crm/customers/${customerId}/memos?memoId=${memoId}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (json.success) {
        onMemoDeleted(memoId)
      }
    } catch {
      // 에러 처리
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">메모</h3>

      {/* 메모 입력 */}
      <div className="flex gap-2 mb-4">
        <textarea
          value={newMemo}
          onChange={(e) => setNewMemo(e.target.value)}
          placeholder="메모를 입력하세요..."
          rows={2}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSubmit}
          disabled={!newMemo.trim() || submitting}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end"
        >
          {submitting ? '저장...' : '저장'}
        </button>
      </div>

      {/* 메모 목록 */}
      <div className="space-y-3 max-h-60 overflow-y-auto">
        {memos.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">메모가 없습니다</p>
        ) : (
          memos.map(memo => (
            <div key={memo.id} className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{memo.content}</p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-400">
                  {memo.authorName} · {formatDate(memo.createdAt)}
                </p>
                <button
                  onClick={() => handleDelete(memo.id)}
                  disabled={deletingId === memo.id}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  {deletingId === memo.id ? '삭제중...' : '삭제'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
