'use client'

import { formatDate } from '@/lib/utils/date-helpers'

interface DateRangePickerProps {
  startDate: Date
  endDate: Date
  onStartDateChange: (date: Date) => void
  onEndDateChange: (date: Date) => void
  onPreviousMonth: () => void
  onNextMonth: () => void
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onPreviousMonth,
  onNextMonth
}: DateRangePickerProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onPreviousMonth}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        title="이전 달"
      >
        <svg
          className="w-5 h-5 text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
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
        <svg
          className="w-5 h-5 text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )
}
