'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type {
  ExternalFactorListItem,
  ExternalFactorType,
  ImpactEstimate,
  CreateExternalFactorInput,
} from '@/types/strategy'

interface Branch {
  id: string
  name: string
}

const FACTOR_TYPES: { value: ExternalFactorType; label: string }[] = [
  { value: 'EXAM', label: '시험 기간' },
  { value: 'VACATION', label: '방학' },
  { value: 'HOLIDAY', label: '공휴일' },
  { value: 'WEATHER', label: '날씨/재해' },
  { value: 'COMPETITOR', label: '경쟁업체 동향' },
]

const IMPACT_OPTIONS: { value: ImpactEstimate; label: string }[] = [
  { value: 'POSITIVE_HIGH', label: '긍정적 (높음)' },
  { value: 'POSITIVE_MEDIUM', label: '긍정적 (중간)' },
  { value: 'POSITIVE_LOW', label: '긍정적 (낮음)' },
  { value: 'NEUTRAL', label: '중립' },
  { value: 'NEGATIVE_LOW', label: '부정적 (낮음)' },
  { value: 'NEGATIVE_MEDIUM', label: '부정적 (중간)' },
  { value: 'NEGATIVE_HIGH', label: '부정적 (높음)' },
]

export default function FactorsPage() {
  const [factors, setFactors] = useState<ExternalFactorListItem[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [typeFilter, setTypeFilter] = useState<string>('ALL')

  const [formData, setFormData] = useState<CreateExternalFactorInput>({
    type: 'EXAM',
    name: '',
    startDate: '',
    endDate: '',
    branchIds: [],
    impactEstimate: 'NEUTRAL',
    description: '',
    isRecurring: false,
    recurringRule: undefined,
  })

  useEffect(() => {
    fetchFactors()
    fetchBranches()
  }, [])

  const fetchFactors = async () => {
    try {
      const params = new URLSearchParams()
      if (typeFilter !== 'ALL') params.set('type', typeFilter)

      const res = await fetch(`/api/strategy/factors?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setFactors(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch factors:', error)
    } finally {
      setLoading(false)
    }
  }

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

  useEffect(() => {
    if (!loading) {
      fetchFactors()
    }
  }, [typeFilter])

  const handleBranchToggle = (branchId: string) => {
    if (formData.branchIds.includes(branchId)) {
      setFormData({
        ...formData,
        branchIds: formData.branchIds.filter((id) => id !== branchId),
      })
    } else {
      setFormData({
        ...formData,
        branchIds: [...formData.branchIds, branchId],
      })
    }
  }

  const handleSelectAllBranches = () => {
    if (formData.branchIds.length === branches.length) {
      setFormData({ ...formData, branchIds: [] })
    } else {
      setFormData({ ...formData, branchIds: branches.map((b) => b.id) })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      alert('이름을 입력해주세요.')
      return
    }
    if (!formData.startDate || !formData.endDate) {
      alert('기간을 입력해주세요.')
      return
    }
    if (formData.branchIds.length === 0) {
      alert('최소 하나의 지점을 선택해주세요.')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/strategy/factors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()

      if (data.success) {
        setDialogOpen(false)
        resetForm()
        fetchFactors()
      } else {
        alert(data.error || '저장에 실패했습니다.')
      }
    } catch (error) {
      console.error('Failed to save factor:', error)
      alert('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (factorId: string, factorName: string) => {
    if (!confirm(`"${factorName}" 외부 요인을 삭제하시겠습니까?`)) return

    try {
      const res = await fetch(`/api/strategy/factors?id=${factorId}`, {
        method: 'DELETE',
      })
      const data = await res.json()

      if (data.success) {
        fetchFactors()
      } else {
        alert('삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('Failed to delete factor:', error)
      alert('삭제에 실패했습니다.')
    }
  }

  const resetForm = () => {
    setFormData({
      type: 'EXAM',
      name: '',
      startDate: '',
      endDate: '',
      branchIds: [],
      impactEstimate: 'NEUTRAL',
      description: '',
      isRecurring: false,
      recurringRule: undefined,
    })
  }

  const getTypeBadge = (type: ExternalFactorType) => {
    const styles: Record<ExternalFactorType, { bg: string; text: string; icon: string }> = {
      EXAM: { bg: 'bg-purple-100', text: 'text-purple-700', icon: '📝' },
      VACATION: { bg: 'bg-orange-100', text: 'text-orange-700', icon: '🏖️' },
      HOLIDAY: { bg: 'bg-pink-100', text: 'text-pink-700', icon: '🎉' },
      WEATHER: { bg: 'bg-cyan-100', text: 'text-cyan-700', icon: '🌦️' },
      COMPETITOR: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: '🏢' },
    }
    const labels: Record<ExternalFactorType, string> = {
      EXAM: '시험',
      VACATION: '방학',
      HOLIDAY: '공휴일',
      WEATHER: '날씨',
      COMPETITOR: '경쟁사',
    }
    const style = styles[type]
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        <span>{style.icon}</span>
        {labels[type]}
      </span>
    )
  }

  const getImpactBadge = (impact?: ImpactEstimate) => {
    if (!impact) return null
    const styles: Record<ImpactEstimate, { color: string; icon: string }> = {
      POSITIVE_HIGH: { color: 'text-emerald-600', icon: '↑↑↑' },
      POSITIVE_MEDIUM: { color: 'text-emerald-500', icon: '↑↑' },
      POSITIVE_LOW: { color: 'text-emerald-400', icon: '↑' },
      NEUTRAL: { color: 'text-slate-500', icon: '→' },
      NEGATIVE_LOW: { color: 'text-red-400', icon: '↓' },
      NEGATIVE_MEDIUM: { color: 'text-red-500', icon: '↓↓' },
      NEGATIVE_HIGH: { color: 'text-red-600', icon: '↓↓↓' },
    }
    const style = styles[impact]
    return <span className={`font-bold text-lg ${style.color}`}>{style.icon}</span>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30">
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
              <Link href="/strategy" className="hover:text-orange-600 transition-colors">전략</Link>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-slate-800 font-medium">외부 요인 관리</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">외부 요인 관리</h1>
            <p className="text-sm text-slate-500 mt-1">이벤트 성과에 영향을 미치는 외부 요인을 관리하세요</p>
          </div>
          <button
            onClick={() => setDialogOpen(true)}
            className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-200 transition-all hover:shadow-xl hover:shadow-orange-300"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            외부 요인 등록
          </button>
        </div>

        {/* 모달 */}
        {dialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => {
                setDialogOpen(false)
                resetForm()
              }}
            />
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-100">
                <h2 className="text-lg font-semibold text-slate-800">외부 요인 등록</h2>
                <p className="text-sm text-slate-500 mt-1">이벤트 분석에 영향을 주는 외부 요인을 등록합니다</p>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">유형 *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as ExternalFactorType })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white transition-all"
                  >
                    {FACTOR_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">이름 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="예: 2024년 수능"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">시작일 *</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">종료일 *</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">예상 영향</label>
                  <select
                    value={formData.impactEstimate}
                    onChange={(e) => setFormData({ ...formData, impactEstimate: e.target.value as ImpactEstimate })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white transition-all"
                  >
                    {IMPACT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-700">대상 지점 *</label>
                    <button
                      type="button"
                      onClick={handleSelectAllBranches}
                      className="px-3 py-1.5 text-sm text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                    >
                      {formData.branchIds.length === branches.length ? '전체 해제' : '전체 선택'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-3">
                    {branches.map((branch) => (
                      <label
                        key={branch.id}
                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                          formData.branchIds.includes(branch.id) ? 'bg-orange-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.branchIds.includes(branch.id)}
                          onChange={() => handleBranchToggle(branch.id)}
                          className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                        />
                        <span className="text-sm text-slate-700">{branch.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">설명</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="추가 설명"
                    rows={2}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
                  />
                </div>

                <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isRecurring}
                    onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                    className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-700">매년 반복</p>
                    <p className="text-xs text-slate-500">매년 같은 시기에 자동으로 생성됩니다</p>
                  </div>
                </label>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setDialogOpen(false)
                      resetForm()
                    }}
                    className="px-5 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 transition-all"
                  >
                    {saving ? '저장 중...' : '등록하기'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 필터 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600">유형 필터:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white transition-all"
            >
              <option value="ALL">전체 유형</option>
              {FACTOR_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 목록 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <h2 className="font-semibold text-slate-800">
              외부 요인 목록
              <span className="ml-2 text-sm font-normal text-slate-500">({factors.length}개)</span>
            </h2>
          </div>
          <div className="p-5">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-3 border-orange-200 border-t-orange-600" />
                  <p className="text-sm text-slate-500">불러오는 중...</p>
                </div>
              </div>
            ) : factors.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="mt-4 text-slate-600 font-medium">등록된 외부 요인이 없습니다</p>
                <p className="mt-1 text-sm text-slate-400">시험, 방학 등 외부 요인을 등록해보세요</p>
              </div>
            ) : (
              <div className="space-y-3">
                {factors.map((factor) => (
                  <div
                    key={factor.id}
                    className="p-5 rounded-xl border border-slate-100 hover:border-orange-200 hover:shadow-sm transition-all bg-gradient-to-r from-white to-slate-50/50"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <p className="font-semibold text-slate-800">{factor.name}</p>
                          {getTypeBadge(factor.type)}
                          {factor.isRecurring && (
                            <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                              🔄 반복
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {factor.startDate} ~ {factor.endDate}
                        </div>
                        {factor.branches.length > 0 && (
                          <p className="text-xs text-slate-400 mt-2">
                            <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {factor.branches.map((b) => b.name).join(', ')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        {getImpactBadge(factor.impactEstimate)}
                        <button
                          onClick={() => handleDelete(factor.id, factor.name)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="삭제"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
