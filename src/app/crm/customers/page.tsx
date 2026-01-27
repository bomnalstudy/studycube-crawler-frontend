'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRole } from '@/hooks/useRole'
import { CustomerListItem, PaginatedResponse } from '@/types/crm'
import { CustomerFilters, FilterValues } from '@/components/crm/customers/CustomerFilters'
import { CustomerTable } from '@/components/crm/customers/CustomerTable'

export default function CustomerListPage() {
  const { branchId } = useRole()
  const [data, setData] = useState<PaginatedResponse<CustomerListItem> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterValues>({})
  const [page, setPage] = useState(1)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (branchId) params.set('branchId', branchId)
      params.set('page', String(page))
      params.set('limit', '20')

      if (filters.segment) params.set('segment', filters.segment)
      if (filters.ageGroup) params.set('ageGroup', filters.ageGroup)
      if (filters.gender) params.set('gender', filters.gender)
      if (filters.hasClaim) params.set('hasClaim', filters.hasClaim)
      if (filters.search) params.set('search', filters.search)
      if (filters.sortBy) params.set('sortBy', filters.sortBy)
      if (filters.sortOrder) params.set('sortOrder', filters.sortOrder)

      const res = await fetch(`/api/crm/customers?${params}`)
      const json = await res.json()

      if (!json.success) {
        setError(json.error || '데이터를 불러올 수 없습니다')
        return
      }
      setData(json.data)
    } catch {
      setError('네트워크 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }, [branchId, page, filters])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleFilterChange = (newFilters: FilterValues) => {
    setFilters(newFilters)
    setPage(1)
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 헤더 */}
        <div>
          <h1 className="text-xl font-bold text-gray-800">고객 리스트</h1>
          <p className="text-sm text-gray-500 mt-1">전체 고객 데이터 조회 및 필터링</p>
        </div>

        {/* 필터 */}
        <CustomerFilters
          onFilterChange={handleFilterChange}
          initialFilters={filters}
        />

        {/* 테이블 */}
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
            <p className="text-sm text-gray-400 mt-3">불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600 text-sm">{error}</p>
            <button
              onClick={fetchData}
              className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 transition-colors"
            >
              다시 시도
            </button>
          </div>
        ) : data ? (
          <CustomerTable
            items={data.items}
            total={data.total}
            page={data.page}
            totalPages={data.totalPages}
            onPageChange={handlePageChange}
          />
        ) : null}
      </div>
    </div>
  )
}
