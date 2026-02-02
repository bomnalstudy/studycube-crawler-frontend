import { formatRevenue, formatGrowth } from '@/lib/utils/formatters'
import type { OperationPerformanceData } from '@/types/strategy'
import type { AnalysisSummary } from './types'

interface TicketTabProps {
  performances: OperationPerformanceData[]
  summary: AnalysisSummary
}

export function TicketTab({ performances, summary }: TicketTabProps) {
  const firstPerf = performances[0]

  return (
    <div className="space-y-6">
      {/* 이용권 업그레이드 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="font-semibold text-slate-800 mb-4">이용권 업그레이드 현황</h2>
        <p className="text-sm text-slate-500 mb-4">고객들이 더 높은 등급의 이용권으로 업그레이드한 현황입니다.</p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {summary.ticketUpgrades.map((upgrade, idx) => (
            <div key={idx} className="p-4 bg-purple-50 rounded-xl border border-purple-100">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-slate-600">{upgrade.fromTicket}</span>
                <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
                <span className="text-sm font-medium text-purple-700">{upgrade.toTicket}</span>
              </div>
              <p className="text-2xl font-bold text-purple-700">{upgrade.count}명</p>
              <p className="text-xs text-purple-600">업그레이드율 {upgrade.upgradeRate}%</p>
            </div>
          ))}
        </div>
      </div>

      {/* 이용권별 매출 변화 */}
      {firstPerf?.ticketTypeChanges && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">이용권별 매출 변화</h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">이용권</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">적용 전 매출</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">적용 후 매출</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">변화율</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">구매자 변화</th>
                </tr>
              </thead>
              <tbody>
                {firstPerf.ticketTypeChanges.map((ticket, idx) => (
                  <tr key={idx} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 px-4 font-medium text-slate-700">{ticket.ticketType}</td>
                    <td className="py-3 px-4 text-right text-slate-600">{formatRevenue(ticket.revenueBefore)}</td>
                    <td className="py-3 px-4 text-right text-slate-700 font-medium">{formatRevenue(ticket.revenueAfter)}</td>
                    <td className={`py-3 px-4 text-right font-medium ${ticket.revenueChangePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatGrowth(ticket.revenueChangePercent)}
                    </td>
                    <td className={`py-3 px-4 text-right ${ticket.buyersChange >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {ticket.buyersChange >= 0 ? '+' : ''}{ticket.buyersChange}명
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
