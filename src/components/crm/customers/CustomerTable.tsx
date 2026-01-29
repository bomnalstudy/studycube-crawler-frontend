'use client'

import { useState, memo, useMemo } from 'react'
import {
  CustomerListItem,
  VISIT_SEGMENT_LABELS, VISIT_SEGMENT_COLORS,
  TICKET_SEGMENT_LABELS, TICKET_SEGMENT_COLORS,
  VisitSegment, TicketSegment,
} from '@/types/crm'
import { maskPhone } from '@/lib/crm/phone-masker'
import { formatCurrency, formatNumber } from '@/lib/utils/formatters'

type SortField = 'lastVisitDate' | 'totalVisits' | 'totalSpent' | 'recentVisits' | 'segmentDays'

interface CustomerTableProps {
  items: CustomerListItem[]
  total: number
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  selectedId?: string | null
  onRowClick: (customerId: string) => void
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  onSortChange?: (field: SortField) => void
}

export const CustomerTable = memo(function CustomerTable({ items, total, page, totalPages, onPageChange, selectedId, onRowClick, sortBy, sortOrder, onSortChange }: CustomerTableProps) {
  const [showPhone, setShowPhone] = useState(false)

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
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  <div className="flex items-center gap-1.5">
                    전화번호
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowPhone(!showPhone) }}
                      className="p-0.5 rounded hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-600"
                      title={showPhone ? '전화번호 숨기기' : '전화번호 보기'}
                    >
                      {showPhone ? (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      )}
                    </button>
                  </div>
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">세그먼트</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">성별</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">연령대</th>
                <SortableHeader field="recentVisits" label="최근 방문수" align="right" sortBy={sortBy} sortOrder={sortOrder} onSortChange={onSortChange} />
                <SortableHeader field="totalSpent" label="총 소비" align="right" sortBy={sortBy} sortOrder={sortOrder} onSortChange={onSortChange} />
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">잔여 정기권</th>
                <SortableHeader field="lastVisitDate" label="마지막 방문" align="left" sortBy={sortBy} sortOrder={sortOrder} onSortChange={onSortChange} />
                <SortableHeader field="segmentDays" label="경과일" align="right" sortBy={sortBy} sortOrder={sortOrder} onSortChange={onSortChange} />
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
                      {showPhone ? item.phone : maskPhone(item.phone)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${VISIT_SEGMENT_COLORS[item.visitSegment as VisitSegment]}20`,
                          color: VISIT_SEGMENT_COLORS[item.visitSegment as VisitSegment],
                        }}
                      >
                        {VISIT_SEGMENT_LABELS[item.visitSegment as VisitSegment]}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${TICKET_SEGMENT_COLORS[item.ticketSegment as TicketSegment]}20`,
                          color: TICKET_SEGMENT_COLORS[item.ticketSegment as TicketSegment],
                        }}
                      >
                        {TICKET_SEGMENT_LABELS[item.ticketSegment as TicketSegment]}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{item.gender || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{item.ageGroup || '-'}</td>
                  <td className="px-4 py-3 text-right text-gray-700 font-medium">{item.recentVisits}회</td>
                  <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(item.totalSpent)}</td>
                  <td className="px-4 py-3">
                    {item.remainingTickets ? (
                      <div className="space-y-0.5">
                        {item.remainingTickets.termTicket && (
                          <p className="text-[11px] text-purple-600">기간권 : {item.remainingTickets.termTicket}</p>
                        )}
                        {item.remainingTickets.timePackage && (
                          <p className="text-[11px] text-blue-600">시간패키지 : {item.remainingTickets.timePackage}</p>
                        )}
                        {item.remainingTickets.fixedSeat && (
                          <p className="text-[11px] text-amber-600">고정석 : {item.remainingTickets.fixedSeat}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-300 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{item.lastVisitDate || '-'}</td>
                  <td className="px-4 py-3 text-right text-gray-600 text-xs">
                    {item.segmentDays !== null ? `${item.segmentDays}일차` : '-'}
                  </td>
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
})

const SortableHeader = memo(function SortableHeader({
  field,
  label,
  align,
  sortBy,
  sortOrder,
  onSortChange,
}: {
  field: SortField
  label: string
  align: 'left' | 'right'
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  onSortChange?: (field: SortField) => void
}) {
  const isActive = sortBy === field
  const arrow = isActive ? (sortOrder === 'asc' ? ' ↑' : ' ↓') : ''

  return (
    <th
      className={`text-${align} px-4 py-3 text-xs font-medium select-none ${
        onSortChange ? 'cursor-pointer hover:text-blue-600' : ''
      } ${isActive ? 'text-blue-600' : 'text-gray-500'}`}
      onClick={() => onSortChange?.(field)}
    >
      {label}{arrow}
    </th>
  )
})

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
