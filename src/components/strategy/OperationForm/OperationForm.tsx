'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { OPERATION_SUB_TYPES, OPERATION_STATUS } from '@/types/strategy'
import type { OperationSubType, OperationDetail, OperationStatus } from '@/types/strategy'
import './OperationForm.css'

interface Branch {
  id: string
  name: string
}

const SUBTYPE_DESCRIPTIONS: Record<OperationSubType, string> = {
  NEW_SERVICE: '새로운 서비스나 상품을 도입합니다',
  FACILITY_UPGRADE: '시설, 장비, 환경을 개선합니다',
  SEAT_CHANGE: '좌석 구성이나 배치를 변경합니다',
}

const SUBTYPE_ICONS: Record<OperationSubType, React.ReactNode> = {
  NEW_SERVICE: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
  ),
  FACILITY_UPGRADE: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
  ),
  SEAT_CHANGE: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
  ),
}

interface OperationFormProps {
  operation?: OperationDetail
  isEdit?: boolean
}

export function OperationForm({ operation, isEdit }: OperationFormProps) {
  const router = useRouter()

  const [branches, setBranches] = useState<Branch[]>([])
  const [loadingBranches, setLoadingBranches] = useState(true)

  const [formData, setFormData] = useState({
    name: operation?.name || '',
    subType: operation?.subType || ('' as OperationSubType | ''),
    implementedAt: operation?.implementedAt || '',
    branchIds: operation?.branches.map((b) => b.id) || [],
    cost: operation?.cost?.toString() || '',
    description: operation?.description || '',
    expectedEffect: operation?.expectedEffect || '',
    status: operation?.status || ('PLANNED' as OperationStatus),
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  // 지점 목록 로드
  useEffect(() => {
    fetchBranches()
  }, [])

  const fetchBranches = async () => {
    try {
      const res = await fetch('/api/branches')
      const data = await res.json()
      if (data.success && data.data) {
        setBranches(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error)
    } finally {
      setLoadingBranches(false)
    }
  }

  const handleSubTypeSelect = (subType: OperationSubType) => {
    setFormData((prev) => ({
      ...prev,
      subType,
    }))
  }

  const handleBranchToggle = (branchId: string) => {
    setFormData((prev) => ({
      ...prev,
      branchIds: prev.branchIds.includes(branchId)
        ? prev.branchIds.filter((id) => id !== branchId)
        : [...prev.branchIds, branchId],
    }))
  }

  const handleSelectAllBranches = () => {
    if (formData.branchIds.length === branches.length) {
      setFormData((prev) => ({ ...prev, branchIds: [] }))
    } else {
      setFormData((prev) => ({ ...prev, branchIds: branches.map((b) => b.id) }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const url = isEdit
        ? `/api/strategy/operations/${operation?.id}`
        : '/api/strategy/operations'

      const method = isEdit ? 'PUT' : 'POST'

      const body = {
        name: formData.name,
        subType: formData.subType,
        implementedAt: formData.implementedAt,
        branchIds: formData.branchIds,
        cost: formData.cost ? parseInt(formData.cost) : undefined,
        description: formData.description || undefined,
        expectedEffect: formData.expectedEffect || undefined,
        ...(isEdit && { status: formData.status }),
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (data.operation || data.success) {
        router.push('/strategy/operations')
      } else {
        alert(data.error || '저장에 실패했습니다.')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('저장에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 기본 정보 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">기본 정보</h2>
            <p className="text-sm text-slate-500">운영 변경의 기본 정보를 입력하세요</p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              운영 변경명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="예: 프리미엄 좌석 도입"
              required
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                적용일 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.implementedAt}
                onChange={(e) => setFormData((prev) => ({ ...prev, implementedAt: e.target.value }))}
                required
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              />
            </div>

            {isEdit && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  상태
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as OperationStatus }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all bg-white"
                >
                  {Object.entries(OPERATION_STATUS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              투입 비용
            </label>
            <div className="relative">
              <input
                type="number"
                value={formData.cost}
                onChange={(e) => setFormData((prev) => ({ ...prev, cost: e.target.value }))}
                placeholder="0"
                className="w-full px-4 py-3 pr-12 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">원</span>
            </div>
          </div>
        </div>
      </div>

      {/* 유형 선택 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">변경 유형</h2>
            <p className="text-sm text-slate-500">운영 변경의 유형을 선택하세요</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(Object.keys(OPERATION_SUB_TYPES) as OperationSubType[]).map((subType) => {
            const isSelected = formData.subType === subType

            return (
              <button
                key={subType}
                type="button"
                onClick={() => handleSubTypeSelect(subType)}
                className={`relative p-5 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-slate-200 hover:border-orange-300 hover:bg-orange-50/30'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                  isSelected ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {SUBTYPE_ICONS[subType]}
                </div>
                <h3 className={`font-medium mb-1 ${isSelected ? 'text-orange-700' : 'text-slate-700'}`}>
                  {OPERATION_SUB_TYPES[subType]}
                </h3>
                <p className="text-xs text-slate-500">{SUBTYPE_DESCRIPTIONS[subType]}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* 적용 지점 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">적용 지점</h2>
              <p className="text-sm text-slate-500">운영 변경을 적용할 지점을 선택하세요</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSelectAllBranches}
            className="text-sm text-teal-600 hover:text-teal-700 font-medium"
          >
            {formData.branchIds.length === branches.length ? '전체 해제' : '전체 선택'}
          </button>
        </div>

        {loadingBranches ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-200 border-t-teal-600" />
          </div>
        ) : branches.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            등록된 지점이 없습니다
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {branches.map((branch) => {
              const isSelected = formData.branchIds.includes(branch.id)

              return (
                <label
                  key={branch.id}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-slate-200 hover:border-teal-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleBranchToggle(branch.id)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    isSelected
                      ? 'border-teal-500 bg-teal-500'
                      : 'border-slate-300'
                  }`}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className={`font-medium ${isSelected ? 'text-teal-700' : 'text-slate-600'}`}>
                    {branch.name}
                  </span>
                </label>
              )
            })}
          </div>
        )}

        {formData.branchIds.length > 0 && (
          <p className="mt-4 text-sm text-slate-500">
            {formData.branchIds.length}개 지점 선택됨
          </p>
        )}
      </div>

      {/* 상세 정보 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">상세 정보</h2>
            <p className="text-sm text-slate-500">추가 정보를 입력하세요 (선택사항)</p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              상세 설명
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="운영 변경에 대한 상세 설명을 입력하세요"
              rows={3}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              기대 효과
            </label>
            <textarea
              value={formData.expectedEffect}
              onChange={(e) => setFormData((prev) => ({ ...prev, expectedEffect: e.target.value }))}
              placeholder="이 변경으로 기대하는 효과를 입력하세요"
              rows={3}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none"
            />
          </div>
        </div>
      </div>

      {/* 제출 버튼 */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 text-slate-600 hover:text-slate-800 font-medium transition-colors"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !formData.name || !formData.subType || !formData.implementedAt || formData.branchIds.length === 0}
          className="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-medium shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              저장 중...
            </span>
          ) : (
            isEdit ? '수정하기' : '등록하기'
          )}
        </button>
      </div>
    </form>
  )
}
