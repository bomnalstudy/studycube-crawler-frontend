'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRole } from '@/hooks/useRole'
import { AutomationForm, CredentialsSection } from '@/components/automation/AutomationForm'
import { TriggerConfig, FilterConfig, PointConfig, FlowType } from '@/types/automation'

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
  deduplicateDays: 1,
}

export default function NewFlowPage() {
  const router = useRouter()
  const { isAdmin, branchId: userBranchId } = useRole()

  // 기본 정보
  const [name, setName] = useState('')
  const [branchId, setBranchId] = useState('')
  const [branches, setBranches] = useState<Branch[]>([])

  // 트리거
  const [triggerConfig, setTriggerConfig] = useState<TriggerConfig>(DEFAULT_TRIGGER)

  // 대상 (필터)
  const [filterConfig, setFilterConfig] = useState<FilterConfig>(DEFAULT_FILTER)

  // 액션
  const [enableSms, setEnableSms] = useState(true)
  const [messageTemplate, setMessageTemplate] = useState('')
  const [enablePoint, setEnablePoint] = useState(false)
  const [pointConfig, setPointConfig] = useState<PointConfig>(DEFAULT_POINT)

  // 스터디큐브 로그인
  const [studycubeUsername, setStudycubeUsername] = useState('')
  const [studycubePassword, setStudycubePassword] = useState('')

  // 상태
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

  const getFlowType = (): FlowType => {
    if (enableSms && enablePoint) return 'SMS_POINT'
    if (enablePoint) return 'POINT'
    return 'SMS'
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setError('플로우 이름을 입력하세요.')
      return
    }
    if (!branchId) {
      setError('지점을 선택하세요.')
      return
    }
    if (!enableSms && !enablePoint) {
      setError('문자 발송 또는 포인트 지급 중 하나 이상을 선택하세요.')
      return
    }
    if (!studycubeUsername.trim() || !studycubePassword.trim()) {
      setError('스터디큐브 로그인 정보를 입력하세요.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const flowType = getFlowType()
      const body: Record<string, unknown> = {
        name: name.trim(),
        flowType,
        branchId,
        triggerConfig,
        filterConfig,
        studycubeUsername: studycubeUsername || null,
        studycubePassword: studycubePassword || null,
      }

      if (enableSms) {
        body.messageTemplate = messageTemplate
      }
      if (enablePoint) {
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
      <div className="max-w-6xl mx-auto space-y-5">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">새 자동화 플로우</h1>
            <p className="text-sm text-gray-500 mt-1">
              언제, 누구에게, 무엇을 할지 설정하세요
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              취소
            </button>
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
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500">플로우 이름</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="예: 고정석 만료 임박 알림"
                className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-400"
              />
            </div>
            <div className="w-48">
              <label className="text-xs font-medium text-gray-500">지점</label>
              {isAdmin ? (
                <select
                  value={branchId}
                  onChange={e => setBranchId(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-400"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
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

        {/* 자동화 폼 (1,2,3번 섹션) */}
        <AutomationForm
          triggerConfig={triggerConfig}
          onTriggerChange={setTriggerConfig}
          filterConfig={filterConfig}
          onFilterChange={setFilterConfig}
          enableSms={enableSms}
          onEnableSmsChange={setEnableSms}
          messageTemplate={messageTemplate}
          onMessageChange={setMessageTemplate}
          enablePoint={enablePoint}
          onEnablePointChange={setEnablePoint}
          pointConfig={pointConfig}
          onPointChange={setPointConfig}
        />

        {/* 스터디큐브 로그인 (4번 섹션 - 별도 카드) */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <CredentialsSection
            username={studycubeUsername}
            password={studycubePassword}
            onUsernameChange={setStudycubeUsername}
            onPasswordChange={setStudycubePassword}
          />
        </div>
      </div>
    </div>
  )
}
