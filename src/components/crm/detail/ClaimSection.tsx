'use client'

import { useState } from 'react'
import { CustomerClaimItem } from '@/types/crm'

interface ClaimSectionProps {
  customerId: string
  claims: CustomerClaimItem[]
  onClaimCreated: (claim: CustomerClaimItem) => void
  onClaimUpdated: (claim: CustomerClaimItem) => void
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: '진행중',
  RESOLVED: '해결됨',
  CLOSED: '종료',
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-red-100 text-red-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-500',
}

export function ClaimSection({ customerId, claims, onClaimCreated, onClaimUpdated }: ClaimSectionProps) {
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!title.trim() || submitting) return

    try {
      setSubmitting(true)
      const res = await fetch(`/api/crm/customers/${customerId}/claims`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (json.success) {
        onClaimCreated(json.data)
        setTitle('')
        setDescription('')
        setShowForm(false)
      }
    } catch {
      // 에러 처리
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusChange = async (claimId: string, newStatus: string) => {
    if (updatingId) return

    try {
      setUpdatingId(claimId)
      const res = await fetch(`/api/crm/customers/${customerId}/claims`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId, status: newStatus }),
      })
      const json = await res.json()
      if (json.success) {
        onClaimUpdated(json.data)
      }
    } catch {
      // 에러 처리
    } finally {
      setUpdatingId(null)
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">클레임</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
        >
          {showForm ? '취소' : '+ 클레임 등록'}
        </button>
      </div>

      {/* 클레임 등록 폼 */}
      {showForm && (
        <div className="mb-4 p-3 border border-gray-200 rounded-lg space-y-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="클레임 제목"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="상세 내용 (선택)"
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || submitting}
            className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            {submitting ? '등록중...' : '등록'}
          </button>
        </div>
      )}

      {/* 클레임 목록 */}
      <div className="space-y-3 max-h-60 overflow-y-auto">
        {claims.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">클레임이 없습니다</p>
        ) : (
          claims.map(claim => (
            <div key={claim.id} className="p-3 border border-gray-100 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-gray-800">{claim.title}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[claim.status]}`}>
                      {STATUS_LABELS[claim.status]}
                    </span>
                  </div>
                  {claim.description && (
                    <p className="text-xs text-gray-500 mt-1">{claim.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {claim.authorName} · {claim.branchName} · {formatDate(claim.createdAt)}
                    {claim.resolvedAt && ` · 해결: ${formatDate(claim.resolvedAt)}`}
                  </p>
                </div>

                {/* 상태 변경 */}
                {claim.status === 'OPEN' && (
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => handleStatusChange(claim.id, 'RESOLVED')}
                      disabled={updatingId === claim.id}
                      className="px-2 py-1 text-xs bg-green-50 text-green-600 rounded hover:bg-green-100 transition-colors"
                    >
                      해결
                    </button>
                    <button
                      onClick={() => handleStatusChange(claim.id, 'CLOSED')}
                      disabled={updatingId === claim.id}
                      className="px-2 py-1 text-xs bg-gray-50 text-gray-500 rounded hover:bg-gray-100 transition-colors"
                    >
                      종료
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
