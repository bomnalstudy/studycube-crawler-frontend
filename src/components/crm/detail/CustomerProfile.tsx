'use client'

import { CustomerDetail, SEGMENT_LABELS, SEGMENT_COLORS } from '@/types/crm'
import { maskPhone, formatPhone } from '@/lib/crm/phone-masker'
import { formatCurrency } from '@/lib/utils/formatters'

interface CustomerProfileProps {
  customer: CustomerDetail
}

export function CustomerProfile({ customer }: CustomerProfileProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800">
            {maskPhone(formatPhone(customer.phone))}
          </h2>
          <span
            className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium"
            style={{
              backgroundColor: `${SEGMENT_COLORS[customer.segment]}20`,
              color: SEGMENT_COLORS[customer.segment],
            }}
          >
            {SEGMENT_LABELS[customer.segment]}
          </span>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">총 소비</p>
          <p className="text-lg font-bold text-gray-800">{formatCurrency(customer.totalSpent)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <InfoItem label="성별" value={customer.gender || '-'} />
        <InfoItem label="연령대" value={customer.ageGroup || '-'} />
        <InfoItem label="첫 방문" value={customer.firstVisitDate} />
        <InfoItem label="마지막 방문" value={customer.lastVisitDate || '-'} />
        <InfoItem label="총 방문" value={`${customer.totalVisits}회`} />
        <InfoItem label="30일 방문" value={`${customer.recentVisits}회`} />
        <InfoItem label="마지막 구매" value={customer.lastPurchaseDate || '-'} />
        <InfoItem label="클레임" value={`${customer.claims.length}건`} highlight={customer.claims.length > 0} />
      </div>
    </div>
  )
}

function InfoItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-sm font-medium ${highlight ? 'text-red-600' : 'text-gray-700'}`}>
        {value}
      </p>
    </div>
  )
}
