'use client'

import Link from 'next/link'
import { AutomationFlow, FLOW_TYPE_LABELS, FLOW_TYPE_COLORS, FlowType, TriggerConfig } from '@/types/automation'
import { formatTriggerSummary } from '../utils/formatters'
import './FlowList.css'

interface LastExecuteResult {
  success: boolean
  successCount?: number
  failCount?: number
  totalCount?: number
  errorMessage?: string
  executedAt?: string
}

function getLastExecuteResult(triggerConfig: TriggerConfig): LastExecuteResult | null {
  const config = triggerConfig as TriggerConfig & { lastExecuteResult?: LastExecuteResult }
  return config.lastExecuteResult || null
}

interface FlowListProps {
  flows: AutomationFlow[]
  onToggleActive: (flowId: string, isActive: boolean) => void
  onDelete: (flowId: string) => void
  onExecute: (flowId: string) => void
  executingFlowId?: string | null
}

export function FlowList({ flows, onToggleActive, onDelete, onExecute, executingFlowId }: FlowListProps) {
  if (flows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
        <p className="text-sm text-gray-400">등록된 자동화 플로우가 없습니다.</p>
        <Link
          href="/crm/automation/flows/new"
          className="inline-block mt-3 px-4 py-2 bg-purple-50 text-purple-600 text-sm rounded-lg hover:bg-purple-100 transition-colors"
        >
          + 새 플로우 만들기
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="flow-table">
        <thead>
          <tr>
            <th className="flow-th">상태</th>
            <th className="flow-th">이름</th>
            <th className="flow-th">유형</th>
            <th className="flow-th">지점</th>
            <th className="flow-th">트리거</th>
            <th className="flow-th">실행 기록</th>
            <th className="flow-th">관리</th>
          </tr>
        </thead>
        <tbody>
          {flows.map(flow => (
            <tr key={flow.id} className="flow-row">
              <td className="flow-td">
                <button
                  onClick={() => onToggleActive(flow.id, !flow.isActive)}
                  className={`flow-toggle ${flow.isActive ? 'flow-toggle-active' : 'flow-toggle-inactive'}`}
                  title={flow.isActive ? '비활성화' : '활성화'}
                >
                  <span className="flow-toggle-dot" />
                </button>
              </td>
              <td className="flow-td">
                <Link href={`/crm/automation/flows/${flow.id}`} className="flow-name-link">
                  {flow.name}
                </Link>
              </td>
              <td className="flow-td">
                <span
                  className="flow-type-badge"
                  style={{
                    color: FLOW_TYPE_COLORS[flow.flowType as FlowType],
                    backgroundColor: `${FLOW_TYPE_COLORS[flow.flowType as FlowType]}15`,
                  }}
                >
                  {FLOW_TYPE_LABELS[flow.flowType as FlowType] || flow.flowType}
                </span>
              </td>
              <td className="flow-td">
                <span className="text-sm text-gray-600">{flow.branch?.name || '-'}</span>
              </td>
              <td className="flow-td">
                <span className="text-xs text-gray-500">
                  {formatTriggerSummary(flow.triggerConfig)}
                </span>
              </td>
              <td className="flow-td">
                {(() => {
                  const lastResult = getLastExecuteResult(flow.triggerConfig)
                  if (!lastResult) {
                    return <span className="text-xs text-gray-400">-</span>
                  }
                  if (lastResult.success) {
                    return (
                      <div className="text-xs">
                        <span className="text-green-600">
                          성공 {lastResult.successCount}/{lastResult.totalCount}
                        </span>
                        {lastResult.failCount ? (
                          <span className="text-red-500 ml-1">실패 {lastResult.failCount}</span>
                        ) : null}
                      </div>
                    )
                  }
                  return (
                    <div className="text-xs text-red-500" title={lastResult.errorMessage || '실패'}>
                      실패: {lastResult.errorMessage?.slice(0, 20) || '오류'}
                      {(lastResult.errorMessage?.length || 0) > 20 ? '...' : ''}
                    </div>
                  )
                })()}
              </td>
              <td className="flow-td">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (confirm(`"${flow.name}" 플로우를 지금 실행하시겠습니까?`)) {
                        onExecute(flow.id)
                      }
                    }}
                    disabled={executingFlowId === flow.id}
                    className={`text-xs font-medium px-2 py-1 rounded ${
                      executingFlowId === flow.id
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                    }`}
                  >
                    {executingFlowId === flow.id ? '실행중...' : '실행'}
                  </button>
                  <Link
                    href={`/crm/automation/flows/${flow.id}`}
                    className="text-xs text-purple-600 hover:text-purple-700"
                  >
                    편집
                  </Link>
                  <button
                    onClick={() => {
                      if (confirm(`"${flow.name}" 플로우를 삭제하시겠습니까?`)) {
                        onDelete(flow.id)
                      }
                    }}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    삭제
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
