'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { OPERATION_SUB_TYPES, OPERATION_STATUS } from '@/types/strategy'
import type { OperationListItem, OperationStatus, OperationSubType } from '@/types/strategy'

const STATUS_STYLES: Record<OperationStatus, { bg: string; text: string; dot: string }> = {
  PLANNED: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  IMPLEMENTED: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  CANCELLED: { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-400' },
}

const SUBTYPE_STYLES: Record<OperationSubType, { bg: string; text: string }> = {
  NEW_SERVICE: { bg: 'bg-purple-100', text: 'text-purple-700' },
  FACILITY_UPGRADE: { bg: 'bg-amber-100', text: 'text-amber-700' },
  SEAT_CHANGE: { bg: 'bg-teal-100', text: 'text-teal-700' },
}

export default function OperationsPage() {
  const [operations, setOperations] = useState<OperationListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [subTypeFilter, setSubTypeFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchOperations()
  }, [statusFilter, subTypeFilter])

  const fetchOperations = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'ALL') params.set('status', statusFilter)
      if (subTypeFilter !== 'ALL') params.set('subType', subTypeFilter)

      const res = await fetch(`/api/strategy/operations?${params.toString()}`)
      const data = await res.json()
      if (data.operations) {
        setOperations(data.operations)
      }
    } catch (error) {
      console.error('Failed to fetch operations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (operationId: string, operationName: string) => {
    if (!confirm(`"${operationName}" 운영 변경을 삭제하시겠습니까?`)) return

    try {
      const res = await fetch(`/api/strategy/operations/${operationId}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        fetchOperations()
      } else {
        alert('삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('Failed to delete operation:', error)
      alert('삭제에 실패했습니다.')
    }
  }

  const filteredOperations = operations.filter((op) =>
    op.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // 통계 계산
  const stats = {
    total: operations.length,
    planned: operations.filter((o) => o.status === 'PLANNED').length,
    implemented: operations.filter((o) => o.status === 'IMPLEMENTED').length,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30">
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
              <Link href="/strategy" className="hover:text-orange-600 transition-colors">
                전략
              </Link>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-slate-800 font-medium">운영 변경 관리</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">운영 변경 관리</h1>
            <p className="text-sm text-slate-500 mt-1">
              시설 개선, 좌석 변경 등 영구적인 운영 변경사항을 기록하고 성과를 추적합니다
            </p>
          </div>
          <Link
            href="/strategy/operations/new"
            className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-200 transition-all hover:shadow-xl hover:shadow-orange-300"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            운영 변경 등록
          </Link>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-500">전체</p>
                <p className="text-xl font-bold text-slate-800">{stats.total}건</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-500">예정</p>
                <p className="text-xl font-bold text-blue-600">{stats.planned}건</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-500">적용 완료</p>
                <p className="text-xl font-bold text-green-600">{stats.implemented}건</p>
              </div>
            </div>
          </div>
        </div>

        {/* 필터 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="운영 변경 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white transition-all"
            >
              <option value="ALL">전체 상태</option>
              {Object.entries(OPERATION_STATUS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <select
              value={subTypeFilter}
              onChange={(e) => setSubTypeFilter(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white transition-all"
            >
              <option value="ALL">전체 유형</option>
              {Object.entries(OPERATION_SUB_TYPES).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 운영 변경 목록 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">
              운영 변경 목록
              <span className="ml-2 text-sm font-normal text-slate-500">({filteredOperations.length}개)</span>
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-3 border-orange-200 border-t-orange-600" />
                <p className="text-sm text-slate-500">불러오는 중...</p>
              </div>
            </div>
          ) : filteredOperations.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="mt-4 text-slate-600 font-medium">등록된 운영 변경이 없습니다</p>
              <p className="mt-1 text-sm text-slate-400">새 운영 변경을 등록해보세요</p>
              <Link
                href="/strategy/operations/new"
                className="inline-flex items-center mt-4 px-4 py-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                운영 변경 등록하기
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredOperations.map((operation) => {
                const statusStyle = STATUS_STYLES[operation.status]
                const subTypeStyle = SUBTYPE_STYLES[operation.subType]

                return (
                  <div
                    key={operation.id}
                    className="p-5 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/strategy/operations/${operation.id}`}
                            className="font-semibold text-slate-800 hover:text-orange-600 transition-colors truncate"
                          >
                            {operation.name}
                          </Link>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                            {OPERATION_STATUS[operation.status]}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            적용일: {new Date(operation.implementedAt).toLocaleDateString('ko-KR')}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 mt-3">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${subTypeStyle.bg} ${subTypeStyle.text}`}>
                            {OPERATION_SUB_TYPES[operation.subType]}
                          </span>
                        </div>

                        {operation.branches.length > 0 && (
                          <p className="text-xs text-slate-400 mt-2">
                            <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {operation.branches.map((b) => b.name).join(', ')}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/strategy/operations/${operation.id}/analysis`}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="성과 분석"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </Link>
                        <Link
                          href={`/strategy/operations/${operation.id}`}
                          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="수정"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Link>
                        <button
                          onClick={() => handleDelete(operation.id, operation.name)}
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
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
