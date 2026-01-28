'use client'

import { useMemo } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameDay,
  getDay,
} from 'date-fns'
import { ko } from 'date-fns/locale'

interface TimelineDatePickerProps {
  date: Date
  onDateChange: (date: Date) => void
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

export function TimelineDatePicker({ date, onDateChange }: TimelineDatePickerProps) {
  const currentMonth = useMemo(() => {
    const start = startOfMonth(date)
    const end = endOfMonth(date)
    return eachDayOfInterval({ start, end })
  }, [date])

  const monthLabel = format(date, 'yyyy년 M월', { locale: ko })

  const handlePrevMonth = () => {
    const prev = subMonths(date, 1)
    onDateChange(startOfMonth(prev))
  }

  const handleNextMonth = () => {
    const next = addMonths(date, 1)
    onDateChange(startOfMonth(next))
  }

  return (
    <div className="flex flex-col gap-2">
      {/* 월 네비게이션 */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevMonth}
          className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          {format(subMonths(date, 1), 'M월', { locale: ko })}
        </button>
        <span className="text-sm font-semibold text-gray-800">{monthLabel}</span>
        <button
          onClick={handleNextMonth}
          className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          {format(addMonths(date, 1), 'M월', { locale: ko })}
        </button>
      </div>

      {/* 날짜 스트립 */}
      <div className="flex gap-0.5 overflow-x-auto pb-1 scrollbar-thin">
        {currentMonth.map((day) => {
          const isSelected = isSameDay(day, date)
          const dayOfWeek = getDay(day)
          const isSunday = dayOfWeek === 0
          const isSaturday = dayOfWeek === 6

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDateChange(day)}
              className={`flex flex-col items-center min-w-[36px] py-1.5 px-1 rounded-lg transition-all text-center
                ${isSelected
                  ? 'bg-blue-500 text-white'
                  : 'hover:bg-gray-100'
                }`}
            >
              <span className={`text-[10px] font-medium ${
                isSelected
                  ? 'text-blue-100'
                  : isSunday
                    ? 'text-red-400'
                    : isSaturday
                      ? 'text-blue-400'
                      : 'text-gray-400'
              }`}>
                {DAY_LABELS[dayOfWeek]}
              </span>
              <span className={`text-sm font-semibold mt-0.5 ${
                isSelected
                  ? 'text-white'
                  : isSunday
                    ? 'text-red-500'
                    : isSaturday
                      ? 'text-blue-500'
                      : 'text-gray-700'
              }`}>
                {format(day, 'd')}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
