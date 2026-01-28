'use client'

import { startOfDay, subDays, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek } from 'date-fns'
import { formatDate } from '@/lib/utils/date-helpers'

interface DateRangePickerProps {
  startDate: Date
  endDate: Date
  onStartDateChange: (date: Date) => void
  onEndDateChange: (date: Date) => void
  onPreviousMonth: () => void
  onNextMonth: () => void
}

interface QuickOption {
  label: string
  getRange: () => { start: Date; end: Date }
}

const QUICK_OPTIONS: QuickOption[] = [
  {
    label: '오늘',
    getRange: () => {
      const today = startOfDay(new Date())
      return { start: today, end: today }
    },
  },
  {
    label: '어제',
    getRange: () => {
      const yesterday = startOfDay(subDays(new Date(), 1))
      return { start: yesterday, end: yesterday }
    },
  },
  {
    label: '최근 3일',
    getRange: () => ({
      start: startOfDay(subDays(new Date(), 2)),
      end: startOfDay(new Date()),
    }),
  },
  {
    label: '최근 7일',
    getRange: () => ({
      start: startOfDay(subDays(new Date(), 6)),
      end: startOfDay(new Date()),
    }),
  },
  {
    label: '이번 주',
    getRange: () => ({
      start: startOfWeek(new Date(), { weekStartsOn: 1 }),
      end: endOfWeek(new Date(), { weekStartsOn: 1 }),
    }),
  },
  {
    label: '이번 달',
    getRange: () => ({
      start: startOfMonth(new Date()),
      end: endOfMonth(new Date()),
    }),
  },
  {
    label: '지난 달',
    getRange: () => {
      const prev = subMonths(new Date(), 1)
      return { start: startOfMonth(prev), end: endOfMonth(prev) }
    },
  },
]

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onPreviousMonth,
  onNextMonth
}: DateRangePickerProps) {
  const handleQuickSelect = (option: QuickOption) => {
    const { start, end } = option.getRange()
    onStartDateChange(start)
    onEndDateChange(end)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <button
          onClick={onPreviousMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="이전 달"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <label htmlFor="start-date" className="text-sm font-medium text-gray-700">
            기간:
          </label>
          <input
            id="start-date"
            type="date"
            value={formatDate(startDate)}
            onChange={(e) => onStartDateChange(new Date(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <span className="text-gray-500">~</span>
          <input
            id="end-date"
            type="date"
            value={formatDate(endDate)}
            onChange={(e) => onEndDateChange(new Date(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <button
          onClick={onNextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="다음 달"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 빠른 선택 버튼 */}
      <div className="flex flex-wrap gap-1.5">
        {QUICK_OPTIONS.map(option => (
          <button
            key={option.label}
            onClick={() => handleQuickSelect(option)}
            className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-700 transition-colors"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
