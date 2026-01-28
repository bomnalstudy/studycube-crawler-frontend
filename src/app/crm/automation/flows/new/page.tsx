'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRole } from '@/hooks/useRole'
import { FlowType, TriggerConfig, FilterConfig, PointConfig } from '@/types/automation'
import { FlowCanvas } from '@/components/automation/FlowEditor/FlowCanvas'

interface Branch {
  id: string
  name: string
}

const DEFAULT_TRIGGER: TriggerConfig = {
  type: 'recurring',
  time: '10:00',
  recurring: { frequency: 'daily' },
}

const DEFAULT_FILTER: FilterConfig = {}

const DEFAULT_POINT: PointConfig = {
  action: 'GRANT',
  amount: 1000,
  reason: '',
  expiryDays: 30,
  deduplicateDays: null,
}

export default function NewFlowPage() {
  const router = useRouter()
  const { isAdmin, branchId: userBranchId } = useRole()

  const [name, setName] = useState('')
  const [flowType, setFlowType] = useState<FlowType>('SMS')
  const [branchId, setBranchId] = useState('')
  const [branches, setBranches] = useState<Branch[]>([])
  const [triggerConfig, setTriggerConfig] = useState<TriggerConfig>(DEFAULT_TRIGGER)
  const [filterConfig, setFilterConfig] = useState<FilterConfig>(DEFAULT_FILTER)
  const [messageTemplate, setMessageTemplate] = useState('')
  const [pointConfig, setPointConfig] = useState<PointConfig>(DEFAULT_POINT)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchBranches() {
      try {
        const res = await fetch('/api/branches')
        const json = await res.json()
        if (json.success) {
          setBranches(json.data)
          if (!isAdmin && userBranchId) {
            setBranchId(userBranchId)
          } else if (json.data.length > 0) {
            setBranchId(json.data[0].id)
          }
        }
      } catch {
        // 무시
      }
    }
    fetchBranches()
  }, [isAdmin, userBranchId])

  const handleSave = async () => {
    if (!name.trim()) { setError('플로우 이름을 입력하세요.'); return }
    if (!branchId) { setError('지점을 선택하세요.'); return }

    setSaving(true)
    setError(null)

    try {
      const body: Record<string, unknown> = {
        name: name.trim(), flowType, branchId, triggerConfig, filterConfig,
      }
      if (flowType === 'SMS' || flowType === 'SMS_POINT') {
        body.messageTemplate = messageTemplate
      }
      if (flowType === 'POINT' || flowType === 'SMS_POINT') {
        body.pointConfig = pointConfig
      }

      const res = await fetch('/api/crm/automation/flows', {
        method: 'POST',
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">새 자동화 플로우</h1>
            <p className="text-sm text-gray-500 mt-1">블록을 드래그하고 연결하여 자동화 플로우를 구성합니다.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700">취소</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {saving ? '저장 중...' : '플로우 저장'}
            </button>
          </div>
        </div>

        {/* 기본 정보 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500">플로우 이름</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="예: 이탈위험 고객 리마인드"
                className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-400"
              />
            </div>
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
              {isAdmin ? (
                <select
                  value={branchId}
                  onChange={e => setBranchId(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-400"
                >
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              ) : (
                <p className="mt-1 px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-600">
                  {branches.find(b => b.id === userBranchId)?.name || '내 지점'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 에러 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* React Flow 캔버스 */}
        <FlowCanvas
          flowType={flowType}
          triggerConfig={triggerConfig}
          filterConfig={filterConfig}
          messageTemplate={messageTemplate}
          pointConfig={pointConfig}
          onTriggerChange={setTriggerConfig}
          onFilterChange={setFilterConfig}
          onMessageChange={setMessageTemplate}
          onPointChange={setPointConfig}
        />
      </div>
    </div>
  )
}
