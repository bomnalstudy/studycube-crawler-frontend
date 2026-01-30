'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type {
  BranchRegion,
  BranchSize,
  BranchTargetAudience,
  BRANCH_REGIONS,
  BRANCH_SIZES,
  BRANCH_TARGET_AUDIENCES,
} from '@/types/strategy'

interface BranchWithCharacteristics {
  id: string
  name: string
  characteristics: {
    region?: BranchRegion
    size?: BranchSize
    targetAudience?: BranchTargetAudience
    openedAt?: string
    maturity?: 'NEW' | 'STABLE' | 'MATURE'
  }
}

const REGION_OPTIONS: { value: BranchRegion; label: string }[] = [
  { value: 'CAPITAL', label: '수도권' },
  { value: 'GYEONGGI', label: '경기' },
  { value: 'PROVINCE', label: '지방' },
]

const SIZE_OPTIONS: { value: BranchSize; label: string }[] = [
  { value: 'SMALL', label: '소형 (<50석)' },
  { value: 'MEDIUM', label: '중형 (50-100석)' },
  { value: 'LARGE', label: '대형 (100+석)' },
]

const TARGET_OPTIONS: { value: BranchTargetAudience; label: string }[] = [
  { value: 'STUDENT', label: '학생가' },
  { value: 'RESIDENTIAL', label: '주거지' },
  { value: 'OFFICE', label: '오피스' },
]

export default function BranchesPage() {
  const [branches, setBranches] = useState<BranchWithCharacteristics[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [editingBranch, setEditingBranch] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{
    region?: BranchRegion
    size?: BranchSize
    targetAudience?: BranchTargetAudience
    openedAt?: string
  }>({})

  useEffect(() => {
    fetchBranches()
  }, [])

  const fetchBranches = async () => {
    try {
      const res = await fetch('/api/strategy/branches')
      const data = await res.json()
      if (data.success) {
        setBranches(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (branch: BranchWithCharacteristics) => {
    setEditingBranch(branch.id)
    setEditForm({
      region: branch.characteristics.region,
      size: branch.characteristics.size,
      targetAudience: branch.characteristics.targetAudience,
      openedAt: branch.characteristics.openedAt,
    })
  }

  const handleSave = async (branchId: string) => {
    setSaving(branchId)
    try {
      const res = await fetch('/api/strategy/branches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId,
          ...editForm,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setEditingBranch(null)
        fetchBranches()
      } else {
        alert('저장에 실패했습니다.')
      }
    } catch (error) {
      console.error('Failed to save:', error)
      alert('저장에 실패했습니다.')
    } finally {
      setSaving(null)
    }
  }

  const handleCancel = () => {
    setEditingBranch(null)
    setEditForm({})
  }

  const getRegionBadge = (region?: BranchRegion) => {
    if (!region) return <span className="text-slate-400 text-sm">미설정</span>
    const labels: Record<BranchRegion, string> = {
      CAPITAL: '수도권',
      GYEONGGI: '경기',
      PROVINCE: '지방',
    }
    const colors: Record<BranchRegion, string> = {
      CAPITAL: 'bg-blue-100 text-blue-700',
      GYEONGGI: 'bg-emerald-100 text-emerald-700',
      PROVINCE: 'bg-purple-100 text-purple-700',
    }
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colors[region]}`}>
        {labels[region]}
      </span>
    )
  }

  const getSizeBadge = (size?: BranchSize) => {
    if (!size) return <span className="text-slate-400 text-sm">미설정</span>
    const labels: Record<BranchSize, string> = {
      SMALL: '소형',
      MEDIUM: '중형',
      LARGE: '대형',
    }
    const colors: Record<BranchSize, string> = {
      SMALL: 'bg-amber-100 text-amber-700',
      MEDIUM: 'bg-orange-100 text-orange-700',
      LARGE: 'bg-red-100 text-red-700',
    }
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colors[size]}`}>
        {labels[size]}
      </span>
    )
  }

  const getTargetBadge = (target?: BranchTargetAudience) => {
    if (!target) return <span className="text-slate-400 text-sm">미설정</span>
    const labels: Record<BranchTargetAudience, string> = {
      STUDENT: '학생가',
      RESIDENTIAL: '주거지',
      OFFICE: '오피스',
    }
    const colors: Record<BranchTargetAudience, string> = {
      STUDENT: 'bg-pink-100 text-pink-700',
      RESIDENTIAL: 'bg-teal-100 text-teal-700',
      OFFICE: 'bg-slate-200 text-slate-700',
    }
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colors[target]}`}>
        {labels[target]}
      </span>
    )
  }

  const getMaturityBadge = (maturity?: 'NEW' | 'STABLE' | 'MATURE') => {
    if (!maturity) return <span className="text-slate-400 text-sm">-</span>
    const labels: Record<string, string> = {
      NEW: '신규 (<1년)',
      STABLE: '안정 (1-3년)',
      MATURE: '성숙 (3년+)',
    }
    const colors: Record<string, string> = {
      NEW: 'bg-cyan-100 text-cyan-700',
      STABLE: 'bg-green-100 text-green-700',
      MATURE: 'bg-indigo-100 text-indigo-700',
    }
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colors[maturity]}`}>
        {labels[maturity]}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50/30">
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* 헤더 */}
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <Link href="/strategy" className="hover:text-teal-600 transition-colors">전략</Link>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-slate-800 font-medium">지점 특성 설정</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">지점 특성 설정</h1>
          <p className="text-sm text-slate-500 mt-1">
            지점별 특성을 설정하여 유사 지점 간 비교 분석에 활용합니다
          </p>
        </div>

        {/* 설명 카드 */}
        <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-2xl p-5">
          <h3 className="font-semibold text-teal-800 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            지점 특성이 필요한 이유
          </h3>
          <p className="text-sm text-teal-700 mt-2">
            이벤트 성과 분석 시, 유사한 특성의 지점끼리 비교하면 더 정확한 효과 측정이 가능합니다.
            예: 수도권 학생가 지점의 이벤트 효과를 비슷한 조건의 다른 지점과 비교
          </p>
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-teal-700">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-teal-500 rounded-full" />
              <span><strong>지역:</strong> 수도권, 경기, 지방</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-teal-500 rounded-full" />
              <span><strong>규모:</strong> 좌석 수 기준</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-teal-500 rounded-full" />
              <span><strong>타겟층:</strong> 주 고객층</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-teal-500 rounded-full" />
              <span><strong>성숙도:</strong> 오픈일 기준 자동 계산</span>
            </div>
          </div>
        </div>

        {/* 지점 목록 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <h2 className="font-semibold text-slate-800">
              지점 목록
              <span className="ml-2 text-sm font-normal text-slate-500">({branches.length}개)</span>
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-3 border-teal-200 border-t-teal-600" />
                <p className="text-sm text-slate-500">불러오는 중...</p>
              </div>
            </div>
          ) : branches.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <p className="mt-4 text-slate-600 font-medium">등록된 지점이 없습니다</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {branches.map((branch) => (
                <div key={branch.id} className="p-5 hover:bg-slate-50/50 transition-colors">
                  {editingBranch === branch.id ? (
                    /* 수정 모드 */
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-slate-800">{branch.name}</h3>
                        <div className="flex gap-2">
                          <button
                            onClick={handleCancel}
                            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                          >
                            취소
                          </button>
                          <button
                            onClick={() => handleSave(branch.id)}
                            disabled={saving === branch.id}
                            className="px-3 py-1.5 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
                          >
                            {saving === branch.id ? '저장 중...' : '저장'}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">지역</label>
                          <select
                            value={editForm.region || ''}
                            onChange={(e) => setEditForm({ ...editForm, region: e.target.value as BranchRegion || undefined })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                          >
                            <option value="">선택안함</option>
                            {REGION_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">규모</label>
                          <select
                            value={editForm.size || ''}
                            onChange={(e) => setEditForm({ ...editForm, size: e.target.value as BranchSize || undefined })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                          >
                            <option value="">선택안함</option>
                            {SIZE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">타겟층</label>
                          <select
                            value={editForm.targetAudience || ''}
                            onChange={(e) => setEditForm({ ...editForm, targetAudience: e.target.value as BranchTargetAudience || undefined })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                          >
                            <option value="">선택안함</option>
                            {TARGET_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">오픈일</label>
                          <input
                            type="date"
                            value={editForm.openedAt || ''}
                            onChange={(e) => setEditForm({ ...editForm, openedAt: e.target.value || undefined })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* 보기 모드 */
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-800">{branch.name}</h3>
                        <div className="flex flex-wrap items-center gap-3 mt-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">지역:</span>
                            {getRegionBadge(branch.characteristics.region)}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">규모:</span>
                            {getSizeBadge(branch.characteristics.size)}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">타겟:</span>
                            {getTargetBadge(branch.characteristics.targetAudience)}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">성숙도:</span>
                            {getMaturityBadge(branch.characteristics.maturity)}
                          </div>
                          {branch.characteristics.openedAt && (
                            <span className="text-xs text-slate-400">
                              (오픈: {branch.characteristics.openedAt})
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleEdit(branch)}
                        className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                        title="수정"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
