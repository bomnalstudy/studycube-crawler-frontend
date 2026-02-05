import { formatRevenue } from '@/lib/utils/formatters'

interface TicketRevenueItemProps {
  label: string
  after?: number
  before?: number
}

export function TicketRevenueItem({ label, after, before }: TicketRevenueItemProps) {
  const afterVal = after || 0
  const beforeVal = before || 0
  const growth = beforeVal > 0 ? ((afterVal - beforeVal) / beforeVal) * 100 : 0

  return (
    <div className="p-3 bg-slate-50 rounded-xl">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-semibold text-slate-700 mt-1">{formatRevenue(afterVal)}</p>
      {beforeVal > 0 && (
        <p className={`text-xs mt-1 ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {growth >= 0 ? '+' : ''}{growth.toFixed(1)}% (이전: {formatRevenue(beforeVal)})
        </p>
      )}
    </div>
  )
}
