'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns'
import { useRole } from '@/hooks/useRole'
import { CustomerListItem, PaginatedResponse, VisitSegment, TicketSegment } from '@/types/crm'
import { CustomerFilters, FilterValues } from '@/components/crm/customers/CustomerFilters'
import { CustomerTable } from '@/components/crm/customers/CustomerTable'
import { CustomerDetailPanel } from '@/components/crm/customers/CustomerDetailPanel'
import { BranchSelector } from '@/components/dashboard/branch-selector'
import { DateRangePicker } from '@/components/dashboard/date-range-picker'
import { formatDate } from '@/lib/utils/date-helpers'

interface Branch {
  id: string
  name: string
}

export default function CustomerListPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    }>
      <CustomerListContent />
    </Suspense>
  )
}

function CustomerListContent() {
  const { isAdmin, branchId: userBranchId } = useRole()
  const searchParams = useSearchParams()

  const initialFilters: FilterValues = {}
  const urlVisitSegment = searchParams.get('visitSegment')
  const urlTicketSegment = searchParams.get('ticketSegment')
  if (urlVisitSegment) initialFilters.visitSegment = urlVisitSegment as VisitSegment
  if (urlTicketSegment) initialFilters.ticketSegment = urlTicketSegment as TicketSegment

  const [data, setData] = useState<PaginatedResponse<CustomerListItem> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterValues>(initialFilters)
  const [page, setPage] = useState(1)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)

  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all')
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()))
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()))

  // 지점 목록 가져오기
  useEffect(() => {
    async function fetchBranches() {
      try {
        const res = await fetch('/api/branches')
        const json = await res.json()
        if (json.success) {
          setBranches(json.data)
          if (!isAdmin && userBranchId) {
            setSelectedBranchId(userBranchId)
          }
        }
      } catch {
        // 무시
      }
    }
    fetchBranches()
  }, [isAdmin, userBranchId])

  const handlePreviousMonth = () => {
    const newDate = subMonths(startDate, 1)
    setStartDate(startOfMonth(newDate))
    setEndDate(endOfMonth(newDate))
  }

  const handleNextMonth = () => {
    const newDate = addMonths(startDate, 1)
    setStartDate(startOfMonth(newDate))
    setEndDate(endOfMonth(newDate))
  }

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      params.set('branchId', selectedBranchId)
      params.set('page', String(page))
      params.set('limit', '20')
      params.set('visitStartDate', formatDate(startDate))
      params.set('visitEndDate', formatDate(endDate))

      if (filters.visitSegment) params.set('visitSegment', filters.visitSegment)
      if (filters.ticketSegment) params.set('ticketSegment', filters.ticketSegment)
      if (filters.ageGroup) params.set('ageGroup', filters.ageGroup)
      if (filters.gender) params.set('gender', filters.gender)
      if (filters.hasClaim) params.set('hasClaim', filters.hasClaim)
      if (filters.search) params.set('search', filters.search)
      if (filters.sortBy) params.set('sortBy', filters.sortBy)
      if (filters.sortOrder) params.set('sortOrder', filters.sortOrder)
      if (filters.minSegmentDays) params.set('minSegmentDays', filters.minSegmentDays)
      if (filters.maxSegmentDays) params.set('maxSegmentDays', filters.maxSegmentDays)

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
  }, [selectedBranchId, page, filters, startDate, endDate])

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

  const handleRowClick = (customerId: string) => {
    setSelectedCustomerId(prev => prev === customerId ? null : customerId)
  }

  const handleSortChange = (field: string) => {
    const newOrder = filters.sortBy === field && filters.sortOrder !== 'asc' ? 'asc' : (filters.sortBy === field && filters.sortOrder === 'asc' ? 'desc' : 'desc')
    const newFilters = { ...filters, sortBy: field, sortOrder: newOrder as 'asc' | 'desc' }
    setFilters(newFilters)
    setPage(1)
  }

  const handleClosePanel = () => {
    setSelectedCustomerId(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 헤더 + 지점/기간 선택 */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-800">고객 리스트</h1>
              <p className="text-sm text-gray-500 mt-1">전체 고객 데이터 조회 및 필터링</p>
            </div>
            <div className="flex items-center gap-3">
              {isAdmin ? (
                <BranchSelector
                  branches={branches}
                  selectedBranchId={selectedBranchId}
                  onBranchChange={setSelectedBranchId}
                />
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                  <span className="text-sm text-gray-600">지점:</span>
                  <span className="text-sm font-medium">
                    {branches.find(b => b.id === userBranchId)?.name || '내 지점'}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              onPreviousMonth={handlePreviousMonth}
              onNextMonth={handleNextMonth}
            />
          </div>
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
            selectedId={selectedCustomerId}
            onRowClick={handleRowClick}
            sortBy={filters.sortBy || 'lastVisitDate'}
            sortOrder={filters.sortOrder || 'desc'}
            onSortChange={handleSortChange}
          />
        ) : null}

      </div>

      {/* 오버레이 패널 */}
      {selectedCustomerId && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={handleClosePanel}
          />
          <div className="fixed right-0 top-0 h-full w-[480px] bg-white shadow-2xl z-50 overflow-y-auto animate-slide-in-right">
            <CustomerDetailPanel
              key={selectedCustomerId}
              customerId={selectedCustomerId}
              onClose={handleClosePanel}
            />
          </div>
        </>
      )}
    </div>
  )
}
