'use client'

import { CustomerListItem, SEGMENT_LABELS, SEGMENT_COLORS } from '@/types/crm'
import { maskPhone } from '@/lib/crm/phone-masker'
import { formatCurrency, formatNumber } from '@/lib/utils/formatters'

interface CustomerTableProps {
  items: CustomerListItem[]
  total: number
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  selectedId?: string | null
  onRowClick: (customerId: string) => void
}

export function CustomerTable({ items, total, page, totalPages, onPageChange, selectedId, onRowClick }: CustomerTableProps) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
        <p className="text-sm text-gray-400">조건에 맞는 고객이 없습니다</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* 결과 수 */}
      <p className="text-xs text-gray-500">
        총 {formatNumber(total)}명
      </p>

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">전화번호</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">세그먼트</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">성별</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">연령대</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">최근 방문수</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">총 소비</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">마지막 방문</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">클레임</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => onRowClick(item.id)}
                  className={`border-b border-gray-100 cursor-pointer transition-colors ${
                    selectedId === item.id
                      ? 'bg-blue-50 hover:bg-blue-50'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="px-4 py-3">
                    <span className="text-blue-600 font-medium">
                      {maskPhone(item.phone)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: `${SEGMENT_COLORS[item.segment]}20`,
                        color: SEGMENT_COLORS[item.segment],
                      }}
                    >
                      {SEGMENT_LABELS[item.segment]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{item.gender || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{item.ageGroup || '-'}</td>
                  <td className="px-4 py-3 text-right text-gray-700 font-medium">{item.recentVisits}회</td>
                  <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(item.totalSpent)}</td>
                  <td className="px-4 py-3 text-gray-500">{item.lastVisitDate || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    {item.claimCount > 0 ? (
                      <span className="text-red-600 font-medium">{item.claimCount}건</span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            이전
          </button>
          {generatePageNumbers(page, totalPages).map((p, i) =>
            p === '...' ? (
              <span key={`dots-${i}`} className="px-2 text-gray-400 text-xs">...</span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p as number)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                  page === p
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {p}
              </button>
            )
          )}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            다음
          </button>
        </div>
      )}
    </div>
  )
}

function generatePageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const pages: (number | string)[] = [1]

  if (current > 3) pages.push('...')

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  if (current < total - 2) pages.push('...')

  pages.push(total)
  return pages
}
