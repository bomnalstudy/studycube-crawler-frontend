import { formatRevenue, formatGrowth } from '@/lib/utils/formatters'
import type { TicketTabPerformance, TicketTabSummary } from './types'

interface TicketTabProps {
  performances: TicketTabPerformance[]
  summary: TicketTabSummary
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
          {summary.ticketUpgrades?.map((upgrade, idx) => (
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
          {(!summary.ticketUpgrades || summary.ticketUpgrades.length === 0) && (
            <p className="text-sm text-slate-400 col-span-full">업그레이드 데이터가 없습니다.</p>
          )}
        </div>
      </div>

      {/* 지점별 이용권 업그레이드 */}
      {performances.length > 0 && performances[0]?.ticketUpgrades && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">지점별 이용권 업그레이드</h2>

          <div className="space-y-4">
            {performances.map((perf) => {
              const upgrades = perf.ticketUpgrades
              if (!upgrades || upgrades.length === 0) return null

              return (
                <div key={perf.id} className="p-4 bg-slate-50 rounded-xl">
                  <p className="font-medium text-slate-700 mb-3">{perf.branchName}</p>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                    {upgrades.map((u, idx) => (
                      <div key={idx} className="p-2 bg-purple-100 rounded-lg">
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          {u.fromTicket} → {u.toTicket}
                        </div>
                        <p className="font-semibold text-purple-700 mt-1">{u.count}명</p>
                        <p className="text-xs text-purple-600">{u.upgradeRate}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 이용권별 매출 비교 */}
      {firstPerf && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">이용권별 매출 변화</h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">이용권</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">이전</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">이후</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">변화</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: '당일권', before: firstPerf.dayTicketRevenueBefore, after: firstPerf.dayTicketRevenue },
                  { name: '시간권', before: firstPerf.timeTicketRevenueBefore, after: firstPerf.timeTicketRevenue },
                  { name: '기간권', before: firstPerf.termTicketRevenueBefore, after: firstPerf.termTicketRevenue },
                  { name: '고정석', before: firstPerf.fixedTicketRevenueBefore, after: firstPerf.fixedTicketRevenue },
                ].map((ticket, idx) => {
                  const beforeVal = ticket.before || 0
                  const afterVal = ticket.after || 0
                  const growth = beforeVal > 0 ? ((afterVal - beforeVal) / beforeVal) * 100 : 0

                  return (
                    <tr key={idx} className="border-b border-slate-100 last:border-0">
                      <td className="py-3 px-4 font-medium text-slate-700">{ticket.name}</td>
                      <td className="py-3 px-4 text-right text-slate-600">{formatRevenue(beforeVal)}</td>
                      <td className="py-3 px-4 text-right text-slate-700 font-medium">{formatRevenue(afterVal)}</td>
                      <td className={`py-3 px-4 text-right font-medium ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatGrowth(growth)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
