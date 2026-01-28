'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRole } from '@/hooks/useRole'
import { AutomationFlow, FLOW_TYPE_LABELS, FLOW_TYPE_COLORS } from '@/types/automation'

interface DashboardStats {
  totalFlows: number
  activeFlows: number
  smsFlows: number
  pointFlows: number
  recentFlows: AutomationFlow[]
}

export default function AutomationDashboardPage() {
  const { isAdmin } = useRole()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/crm/automation/flows')
        const json = await res.json()
        if (json.success) {
          const flows: AutomationFlow[] = json.data
          setStats({
            totalFlows: flows.length,
            activeFlows: flows.filter(f => f.isActive).length,
            smsFlows: flows.filter(f => f.flowType === 'SMS' || f.flowType === 'SMS_POINT').length,
            pointFlows: flows.filter(f => f.flowType === 'POINT' || f.flowType === 'SMS_POINT').length,
            recentFlows: flows.slice(0, 5),
          })
        }
      } catch {
        // 무시
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">자동화 대시보드</h1>
            <p className="text-sm text-gray-500 mt-1">문자 발송 및 포인트 지급 자동화를 관리합니다.</p>
          </div>
          <Link
            href="/crm/automation/flows/new"
            className="px-4 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
          >
            + 새 플로우
          </Link>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="전체 플로우" value={stats?.totalFlows ?? 0} color="gray" />
          <StatCard label="활성 플로우" value={stats?.activeFlows ?? 0} color="green" />
          <StatCard label="문자 자동화" value={stats?.smsFlows ?? 0} color="blue" />
          <StatCard label="포인트 자동화" value={stats?.pointFlows ?? 0} color="purple" />
        </div>

        {/* 최근 플로우 */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-700">최근 플로우</h2>
            <Link href="/crm/automation/flows" className="text-xs text-purple-600 hover:text-purple-700">
              전체 보기 →
            </Link>
          </div>
          {stats?.recentFlows.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm text-gray-400">등록된 자동화 플로우가 없습니다.</p>
              <Link
                href="/crm/automation/flows/new"
                className="inline-block mt-3 px-4 py-2 bg-purple-50 text-purple-600 text-sm rounded-lg hover:bg-purple-100 transition-colors"
              >
                첫 플로우 만들기
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {stats?.recentFlows.map(flow => (
                <Link
                  key={flow.id}
                  href={`/crm/automation/flows/${flow.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: flow.isActive ? '#22C55E' : '#D1D5DB' }}
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{flow.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {flow.branch?.name || '전체'}
                      </p>
                    </div>
                  </div>
                  <span
                    className="text-xs font-medium px-2 py-1 rounded-full"
                    style={{
                      color: FLOW_TYPE_COLORS[flow.flowType],
                      backgroundColor: `${FLOW_TYPE_COLORS[flow.flowType]}15`,
                    }}
                  >
                    {FLOW_TYPE_LABELS[flow.flowType]}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    gray: 'bg-gray-50 text-gray-600',
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${colorMap[color]?.split(' ')[1] || 'text-gray-800'}`}>
        {value}
      </p>
    </div>
  )
}
