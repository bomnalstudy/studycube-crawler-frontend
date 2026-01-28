'use client'

import Link from 'next/link'
import { AutomationFlow, FLOW_TYPE_LABELS, FLOW_TYPE_COLORS, FlowType } from '@/types/automation'
import { formatTriggerSummary } from '../utils/formatters'
import './FlowList.css'

interface FlowListProps {
  flows: AutomationFlow[]
  onToggleActive: (flowId: string, isActive: boolean) => void
  onDelete: (flowId: string) => void
}

export function FlowList({ flows, onToggleActive, onDelete }: FlowListProps) {
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
                <span className="text-xs text-gray-400">
                  {(flow._count?.sendLogs ?? 0) + (flow._count?.pointLogs ?? 0)}건
                </span>
              </td>
              <td className="flow-td">
                <div className="flex items-center gap-2">
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
