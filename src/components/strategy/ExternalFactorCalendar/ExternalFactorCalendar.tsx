'use client'

import { useMemo, useState } from 'react'
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { ExternalFactorListItem, ExternalFactorType } from '@/types/strategy'
import './ExternalFactorCalendar.css'

const locales = {
  'ko': ko,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource: ExternalFactorListItem
}

interface ExternalFactorCalendarProps {
  factors: ExternalFactorListItem[]
  onEventClick?: (factor: ExternalFactorListItem) => void
}

const TYPE_COLORS: Record<ExternalFactorType, string> = {
  EXAM: '#8b5cf6', // purple
  VACATION: '#fb923c', // orange
  HOLIDAY: '#ec4899', // pink
  WEATHER: '#06b6d4', // cyan
  COMPETITOR: '#facc15', // yellow
}

const TYPE_LABELS: Record<ExternalFactorType, string> = {
  EXAM: '📝 시험',
  VACATION: '🏖️ 방학',
  HOLIDAY: '🎉 공휴일',
  WEATHER: '🌦️ 날씨',
  COMPETITOR: '🏢 경쟁사',
}

export default function ExternalFactorCalendar({
  factors,
  onEventClick,
}: ExternalFactorCalendarProps) {
  const [view, setView] = useState<typeof Views[keyof typeof Views]>(Views.MONTH)
  const [date, setDate] = useState(new Date())

  // 외부 요인을 캘린더 이벤트로 변환
  const events: CalendarEvent[] = useMemo(() => {
    return factors.map((factor) => ({
      id: factor.id,
      title: `${TYPE_LABELS[factor.type]} ${factor.name}`,
      start: new Date(factor.startDate),
      end: new Date(factor.endDate),
      resource: factor,
    }))
  }, [factors])

  // 이벤트 스타일 커스터마이징
  const eventStyleGetter = (event: CalendarEvent) => {
    const backgroundColor = TYPE_COLORS[event.resource.type]
    return {
      style: {
        backgroundColor,
        borderRadius: '6px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '0.85rem',
        fontWeight: '500',
        padding: '2px 6px',
      },
    }
  }

  const handleSelectEvent = (event: CalendarEvent) => {
    if (onEventClick) {
      onEventClick(event.resource)
    }
  }

  const formats = {
    monthHeaderFormat: (date: Date) => format(date, 'yyyy년 M월', { locale: ko }),
    dayHeaderFormat: (date: Date) => format(date, 'M월 d일 (E)', { locale: ko }),
    dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
      `${format(start, 'M월 d일', { locale: ko })} - ${format(end, 'M월 d일', { locale: ko })}`,
    agendaDateFormat: (date: Date) => format(date, 'M월 d일 (E)', { locale: ko }),
    agendaHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
      `${format(start, 'M월 d일', { locale: ko })} - ${format(end, 'M월 d일', { locale: ko })}`,
  }

  const messages = {
    today: '오늘',
    previous: '이전',
    next: '다음',
    month: '월',
    week: '주',
    day: '일',
    agenda: '목록',
    date: '날짜',
    time: '시간',
    event: '이벤트',
    showMore: (total: number) => `+${total}개 더보기`,
  }

  const handleNavigate = (action: 'PREV' | 'NEXT' | 'TODAY') => {
    const newDate = new Date(date)

    if (action === 'TODAY') {
      setDate(new Date())
    } else if (action === 'PREV') {
      if (view === Views.MONTH) {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setDate(newDate.getDate() - 7)
      }
      setDate(newDate)
    } else if (action === 'NEXT') {
      if (view === Views.MONTH) {
        newDate.setMonth(newDate.getMonth() + 1)
      } else {
        newDate.setDate(newDate.getDate() + 7)
      }
      setDate(newDate)
    }
  }

  const getCurrentDateLabel = () => {
    if (view === Views.MONTH) {
      return format(date, 'yyyy년 M월', { locale: ko })
    }
    return format(date, 'yyyy년 M월 d일', { locale: ko })
  }

  return (
    <div className="external-factor-calendar">
      <div className="calendar-header">
        <div className="calendar-nav">
          <button onClick={() => handleNavigate('PREV')} className="nav-button">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button onClick={() => handleNavigate('TODAY')} className="today-button">
            오늘
          </button>
          <button onClick={() => handleNavigate('NEXT')} className="nav-button">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <span className="current-date">{getCurrentDateLabel()}</span>
        </div>
        <div className="view-buttons">
          <button
            onClick={() => setView(Views.MONTH)}
            className={view === Views.MONTH ? 'active' : ''}
          >
            월간
          </button>
          <button
            onClick={() => setView(Views.WEEK)}
            className={view === Views.WEEK ? 'active' : ''}
          >
            주간
          </button>
        </div>
        <div className="legend">
          {(Object.entries(TYPE_COLORS) as [ExternalFactorType, string][]).map(([type, color]) => (
            <div key={type} className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: color }} />
              <span className="legend-label">{TYPE_LABELS[type]}</span>
            </div>
          ))}
        </div>
      </div>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 600 }}
        views={[Views.MONTH, Views.WEEK]}
        view={view}
        onView={setView}
        date={date}
        onNavigate={setDate}
        eventPropGetter={eventStyleGetter}
        onSelectEvent={handleSelectEvent}
        formats={formats}
        messages={messages}
        culture="ko"
        popup
        tooltipAccessor={(event: CalendarEvent) => {
          const branches = event.resource.branches.map(b => b.name).join(', ')
          return `${event.title}\n기간: ${event.resource.startDate} ~ ${event.resource.endDate}\n지점: ${branches}`
        }}
      />
    </div>
  )
}
