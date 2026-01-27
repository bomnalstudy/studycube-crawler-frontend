'use client'

import { useState } from 'react'
import { CustomerSegment, SEGMENT_LABELS } from '@/types/crm'

interface CustomerFiltersProps {
  onFilterChange: (filters: FilterValues) => void
  initialFilters?: FilterValues
}

export interface FilterValues {
  segment?: CustomerSegment
  ageGroup?: string
  gender?: string
  hasClaim?: string
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

const AGE_GROUPS = ['10대', '20대', '30대', '40대', '50대', '60대+']
const GENDERS = ['남자', '여자']
const SEGMENTS: CustomerSegment[] = [
  'claim', 'at_risk_7', 'new_0_7', 'day_ticket',
  'term_ticket', 'visit_over20', 'visit_10_20', 'visit_under10',
]

export function CustomerFilters({ onFilterChange, initialFilters = {} }: CustomerFiltersProps) {
  const [filters, setFilters] = useState<FilterValues>(initialFilters)
  const [showFilters, setShowFilters] = useState(false)

  const updateFilter = (key: keyof FilterValues, value: string | undefined) => {
    const newFilters = { ...filters, [key]: value || undefined }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const resetFilters = () => {
    const empty: FilterValues = { search: filters.search }
    setFilters(empty)
    onFilterChange(empty)
  }

  const hasActiveFilters = filters.segment || filters.ageGroup || filters.gender || filters.hasClaim

  return (
    <div className="space-y-3">
      {/* 검색 + 필터 토글 */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="전화번호 검색..."
            value={filters.search || ''}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full px-4 py-2.5 pl-9 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2.5 border rounded-lg text-sm font-medium transition-colors ${
            hasActiveFilters
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          필터 {hasActiveFilters && '(적용중)'}
        </button>
      </div>

      {/* 필터 패널 */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
          {/* 세그먼트 */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">세그먼트</label>
            <div className="flex flex-wrap gap-1.5">
              {SEGMENTS.map(seg => (
                <button
                  key={seg}
                  onClick={() => updateFilter('segment', filters.segment === seg ? undefined : seg)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    filters.segment === seg
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {SEGMENT_LABELS[seg]}
                </button>
              ))}
            </div>
          </div>

          {/* 연령대 */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">연령대</label>
            <div className="flex flex-wrap gap-1.5">
              {AGE_GROUPS.map(age => (
                <button
                  key={age}
                  onClick={() => updateFilter('ageGroup', filters.ageGroup === age ? undefined : age)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    filters.ageGroup === age
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {age}
                </button>
              ))}
            </div>
          </div>

          {/* 성별 */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">성별</label>
            <div className="flex gap-1.5">
              {GENDERS.map(g => (
                <button
                  key={g}
                  onClick={() => updateFilter('gender', filters.gender === g ? undefined : g)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    filters.gender === g
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* 클레임 여부 */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">클레임</label>
            <div className="flex gap-1.5">
              <button
                onClick={() => updateFilter('hasClaim', filters.hasClaim === 'true' ? undefined : 'true')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filters.hasClaim === 'true'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                있음
              </button>
              <button
                onClick={() => updateFilter('hasClaim', filters.hasClaim === 'false' ? undefined : 'false')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filters.hasClaim === 'false'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                없음
              </button>
            </div>
          </div>

          {/* 초기화 */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              필터 초기화
            </button>
          )}
        </div>
      )}

      {/* 정렬 */}
      <div className="flex gap-2 items-center">
        <select
          value={filters.sortBy || 'lastVisitDate'}
          onChange={(e) => updateFilter('sortBy', e.target.value)}
          className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-600"
        >
          <option value="lastVisitDate">최근 방문순</option>
          <option value="totalVisits">총 방문순</option>
          <option value="totalSpent">총 소비순</option>
          <option value="recentVisits">최근 방문수</option>
        </select>
        <button
          onClick={() => updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
          className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50"
        >
          {filters.sortOrder === 'asc' ? '오름차순 ↑' : '내림차순 ↓'}
        </button>
      </div>
    </div>
  )
}
