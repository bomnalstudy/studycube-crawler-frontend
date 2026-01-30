'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type {
  CreateEventInput,
  UpdateEventInput,
  EventDetail,
  EventMainType,
  EventSubType,
  EventTypeInput,
  EventStatus,
} from '@/types/strategy'
import { EVENT_TYPES, EVENT_SUB_TYPES } from './eventTypeConfig'
import './EventForm.css'

interface Branch {
  id: string
  name: string
}

interface EventFormProps {
  event?: EventDetail
  isEdit?: boolean
}

export function EventForm({ event, isEdit = false }: EventFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])

  const [name, setName] = useState(event?.name || '')
  const [startDate, setStartDate] = useState(event?.startDate || '')
  const [endDate, setEndDate] = useState(event?.endDate || '')
  const [cost, setCost] = useState<string>(event?.cost?.toString() || '')
  const [description, setDescription] = useState(event?.description || '')
  const [hypothesis, setHypothesis] = useState(event?.hypothesis || '')
  const [primaryKpi, setPrimaryKpi] = useState(event?.primaryKpi || '')
  const [status, setStatus] = useState<EventStatus>(event?.status || 'PLANNED')
  const [selectedTypes, setSelectedTypes] = useState<EventTypeInput[]>(event?.types || [])
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>(
    event?.branches.map((b) => b.id) || []
  )

  useEffect(() => {
    fetchBranches()
  }, [])

  const fetchBranches = async () => {
    try {
      const res = await fetch('/api/branches')
      const data = await res.json()
      if (data.success) {
        setBranches(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error)
    }
  }

  const handleTypeToggle = (mainType: EventMainType, subType: EventSubType) => {
    const exists = selectedTypes.some((t) => t.type === mainType && t.subType === subType)
    if (exists) {
      setSelectedTypes(selectedTypes.filter((t) => !(t.type === mainType && t.subType === subType)))
    } else {
      setSelectedTypes([...selectedTypes, { type: mainType, subType }])
    }
  }

  const isTypeSelected = (mainType: EventMainType, subType: EventSubType) => {
    return selectedTypes.some((t) => t.type === mainType && t.subType === subType)
  }

  const handleBranchToggle = (branchId: string) => {
    if (selectedBranchIds.includes(branchId)) {
      setSelectedBranchIds(selectedBranchIds.filter((id) => id !== branchId))
    } else {
      setSelectedBranchIds([...selectedBranchIds, branchId])
    }
  }

  const handleSelectAllBranches = () => {
    if (selectedBranchIds.length === branches.length) {
      setSelectedBranchIds([])
    } else {
      setSelectedBranchIds(branches.map((b) => b.id))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      alert('이벤트명을 입력해주세요.')
      return
    }
    if (!startDate || !endDate) {
      alert('기간을 입력해주세요.')
      return
    }
    if (selectedTypes.length === 0) {
      alert('최소 하나의 이벤트 유형을 선택해주세요.')
      return
    }
    if (selectedBranchIds.length === 0) {
      alert('최소 하나의 지점을 선택해주세요.')
      return
    }

    setLoading(true)

    try {
      const payload: CreateEventInput | UpdateEventInput = {
        name,
        startDate,
        endDate,
        types: selectedTypes,
        branchIds: selectedBranchIds,
        cost: cost ? Number(cost) : undefined,
        description: description || undefined,
        hypothesis: hypothesis || undefined,
        primaryKpi: primaryKpi || undefined,
        status: isEdit ? status : undefined,
      }

      const url = isEdit ? `/api/strategy/events/${event?.id}` : '/api/strategy/events'
      const method = isEdit ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (data.success) {
        router.push('/strategy/events')
      } else {
        alert(data.error || '저장에 실패했습니다.')
      }
    } catch (error) {
      console.error('Failed to save event:', error)
      alert('저장에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const getMainTypeColor = (mainType: EventMainType) => {
    const colors: Record<EventMainType, { bg: string; border: string; text: string }> = {
      PRICING: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
      PROMOTION: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
      MARKETING: { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700' },
      ENGAGEMENT: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' },
    }
    return colors[mainType]
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 기본 정보 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            기본 정보
          </h2>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">이벤트명 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 크리스마스 할인 이벤트"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">시작일 *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">종료일 *</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {isEdit && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">상태</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as EventStatus)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white transition-all"
              >
                <option value="PLANNED">예정</option>
                <option value="ONGOING">진행중</option>
                <option value="COMPLETED">완료</option>
                <option value="CANCELLED">취소</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">비용 (원)</label>
            <input
              type="number"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="이벤트 진행 비용"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
          </div>
        </div>
      </div>

      {/* 이벤트 유형 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            이벤트 유형 * <span className="text-sm font-normal text-slate-500">(복수 선택 가능)</span>
          </h2>
        </div>
        <div className="p-6">
          <div className="space-y-6">
            {EVENT_TYPES.map((mainType) => {
              const colorStyle = getMainTypeColor(mainType.value)
              return (
                <div key={mainType.value} className={`p-4 rounded-xl ${colorStyle.bg} border ${colorStyle.border}`}>
                  <p className={`font-semibold ${colorStyle.text} mb-3`}>{mainType.label}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {EVENT_SUB_TYPES[mainType.value].map((subType) => {
                      const selected = isTypeSelected(mainType.value, subType.value)
                      return (
                        <button
                          key={subType.value}
                          type="button"
                          onClick={() => handleTypeToggle(mainType.value, subType.value)}
                          className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                            selected
                              ? 'bg-purple-600 text-white shadow-md'
                              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                          }`}
                        >
                          {subType.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
          {selectedTypes.length > 0 && (
            <div className="mt-5 pt-5 border-t border-slate-200">
              <p className="text-sm text-slate-500 mb-3">선택된 유형:</p>
              <div className="flex flex-wrap gap-2">
                {selectedTypes.map((t, i) => (
                  <span key={i} className="inline-flex items-center px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                    {t.subType}
                    <button
                      type="button"
                      onClick={() => handleTypeToggle(t.type, t.subType)}
                      className="ml-2 hover:text-purple-900"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 대상 지점 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            대상 지점 *
          </h2>
          <button
            type="button"
            onClick={handleSelectAllBranches}
            className="px-4 py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
          >
            {selectedBranchIds.length === branches.length ? '전체 해제' : '전체 선택'}
          </button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {branches.map((branch) => (
              <label
                key={branch.id}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedBranchIds.includes(branch.id)
                    ? 'bg-purple-50 border-purple-300'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedBranchIds.includes(branch.id)}
                  onChange={() => handleBranchToggle(branch.id)}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-slate-700">{branch.name}</span>
              </label>
            ))}
          </div>
          {branches.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-6">지점을 불러오는 중...</p>
          )}
        </div>
      </div>

      {/* 상세 정보 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            상세 정보 <span className="text-sm font-normal text-slate-500">(선택)</span>
          </h2>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">이벤트 설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="이벤트에 대한 상세 설명"
              rows={3}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">가설</label>
            <textarea
              value={hypothesis}
              onChange={(e) => setHypothesis(e.target.value)}
              placeholder="예: 크리스마스 시즌 할인으로 신규 고객 유입이 20% 증가할 것이다"
              rows={2}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">주요 KPI</label>
            <input
              type="text"
              value={primaryKpi}
              onChange={(e) => setPrimaryKpi(e.target.value)}
              placeholder="예: 신규 고객 수, 매출 성장률"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
          </div>
        </div>
      </div>

      {/* 버튼 */}
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={loading}
          className="px-6 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 shadow-lg shadow-purple-200 disabled:opacity-50 transition-all"
        >
          {loading ? '저장 중...' : isEdit ? '수정하기' : '등록하기'}
        </button>
      </div>
    </form>
  )
}
