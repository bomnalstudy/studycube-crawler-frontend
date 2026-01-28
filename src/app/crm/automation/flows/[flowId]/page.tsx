'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useRole } from '@/hooks/useRole'
import { FlowType, TriggerConfig, FilterConfig, PointConfig, AutomationFlow } from '@/types/automation'
import { TriggerBlock } from '@/components/automation/FlowEditor/TriggerBlock'
import { FilterBlock } from '@/components/automation/FlowEditor/FilterBlock'
import { MessageBlock } from '@/components/automation/FlowEditor/MessageBlock'
import { PointBlock } from '@/components/automation/FlowEditor/PointBlock'

interface Branch {
  id: string
  name: string
}

export default function FlowEditPage({ params }: { params: Promise<{ flowId: string }> }) {
  const { flowId } = use(params)
  const router = useRouter()
  const { isAdmin, branchId: userBranchId } = useRole()

  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [flowType, setFlowType] = useState<FlowType>('SMS')
  const [branchId, setBranchId] = useState('')
  const [branches, setBranches] = useState<Branch[]>([])
  const [triggerConfig, setTriggerConfig] = useState<TriggerConfig>({ type: 'manual' })
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({})
  const [messageTemplate, setMessageTemplate] = useState('')
  const [pointConfig, setPointConfig] = useState<PointConfig>({
    action: 'GRANT', amount: 1000, reason: '', expiryDays: 30, deduplicateDays: null,
  })
  const [isActive, setIsActive] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [flowRes, branchRes] = await Promise.all([
          fetch(`/api/crm/crm/automation/flows/${flowId}`),
          fetch('/api/branches'),
        ])

        const flowJson = await flowRes.json()
        const branchJson = await branchRes.json()

        if (branchJson.success) setBranches(branchJson.data)

        if (flowJson.success) {
          const flow: AutomationFlow = flowJson.data
          setName(flow.name)
          setFlowType(flow.flowType)
          setBranchId(flow.branchId)
          setTriggerConfig(flow.triggerConfig)
          setFilterConfig(flow.filterConfig)
          setMessageTemplate(flow.messageTemplate || '')
          setIsActive(flow.isActive)
          if (flow.pointConfig) setPointConfig(flow.pointConfig)
        }
      } catch {
        setError('플로우를 불러올 수 없습니다.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [flowId])

  const handleSave = async () => {
    if (!name.trim()) { setError('플로우 이름을 입력하세요.'); return }
    setSaving(true)
    setError(null)

    try {
      const body: Record<string, unknown> = {
        name: name.trim(), flowType, triggerConfig, filterConfig, isActive,
      }
      const showMessage = flowType === 'SMS' || flowType === 'SMS_POINT'
      const showPoint = flowType === 'POINT' || flowType === 'SMS_POINT'
      if (showMessage) body.messageTemplate = messageTemplate
      if (showPoint) body.pointConfig = pointConfig

      const res = await fetch(`/api/crm/crm/automation/flows/${flowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.success) {
        router.push('/crm/automation/flows')
      } else {
        setError(json.error || '저장에 실패했습니다.')
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('이 플로우를 삭제하시겠습니까?')) return
    try {
      const res = await fetch(`/api/crm/crm/automation/flows/${flowId}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) router.push('/crm/automation/flows')
    } catch {
      // 무시
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  const showMessage = flowType === 'SMS' || flowType === 'SMS_POINT'
  const showPoint = flowType === 'POINT' || flowType === 'SMS_POINT'

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">플로우 편집</h1>
            <p className="text-sm text-gray-500 mt-1">{name || '이름 없음'}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleDelete} className="text-sm text-red-400 hover:text-red-600">삭제</button>
            <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700">취소</button>
          </div>
        </div>

        {/* 기본 정보 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500">플로우 이름</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-400"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500">유형</label>
              <select
                value={flowType}
                onChange={e => setFlowType(e.target.value as FlowType)}
                className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-400"
              >
                <option value="SMS">문자</option>
                <option value="POINT">포인트</option>
                <option value="SMS_POINT">문자 + 포인트</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">지점</label>
              <p className="mt-1 px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-600">
                {branches.find(b => b.id === branchId)?.name || '-'}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">상태</label>
              <button
                onClick={() => setIsActive(!isActive)}
                className={`mt-1 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-gray-50 text-gray-500 border border-gray-200'
                }`}
              >
                {isActive ? '활성' : '비활성'}
              </button>
            </div>
          </div>
        </div>

        {/* 블록 에디터 */}
        <div className="space-y-3">
          <TriggerBlock config={triggerConfig} onChange={setTriggerConfig} />

          <div className="flex justify-center py-1 text-gray-300">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </div>

          <FilterBlock config={filterConfig} onChange={setFilterConfig} />

          <div className="flex justify-center py-1 text-gray-300">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </div>

          {showMessage && (
            <>
              <MessageBlock template={messageTemplate} onChange={setMessageTemplate} />
              {showPoint && (
                <div className="flex justify-center py-1 text-gray-300">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12l7 7 7-7" />
                  </svg>
                </div>
              )}
            </>
          )}

          {showPoint && <PointBlock config={pointConfig} onChange={setPointConfig} />}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={() => router.back()}
            className="px-5 py-2.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {saving ? '저장 중...' : '변경사항 저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
