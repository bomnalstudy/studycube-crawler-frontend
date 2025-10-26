'use client'

import { useEffect, useState } from 'react'
import { formatCurrency, formatNumber } from '@/lib/utils/formatters'
import { formatDate } from '@/lib/utils/date-helpers'

interface Campaign {
  id: string
  name: string
  branchId: string
  startDate: string
  endDate: string
  cost: number
  impressions: number
  clicks: number
  createdAt: string
}

export function SavedCampaignsList() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCampaigns()
  }, [])

  const loadCampaigns = async () => {
    try {
      const response = await fetch('/api/campaigns')
      const result = await response.json()

      if (result.success) {
        setCampaigns(result.data)
      }
    } catch (error) {
      console.error('캠페인 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = (campaignId: string, campaignName: string) => {
    window.location.href = `/api/campaigns/export?id=${campaignId}&name=${encodeURIComponent(campaignName)}`
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-500">로딩 중...</div>
  }

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        저장된 캠페인이 없습니다.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">저장된 캠페인</h2>

      <div className="space-y-4">
        {campaigns.map((campaign) => (
          <div
            key={campaign.id}
            className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-lg text-gray-900">{campaign.name}</h3>
                <p className="text-sm text-gray-500">
                  {formatDate(new Date(campaign.startDate))} ~ {formatDate(new Date(campaign.endDate))}
                </p>
              </div>
              <button
                onClick={() => handleExport(campaign.id, campaign.name)}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Excel 다운로드
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">비용:</span>
                <p className="font-semibold">{formatCurrency(Number(campaign.cost))}</p>
              </div>
              <div>
                <span className="text-gray-600">노출수:</span>
                <p className="font-semibold">{formatNumber(campaign.impressions)}</p>
              </div>
              <div>
                <span className="text-gray-600">클릭수:</span>
                <p className="font-semibold">{formatNumber(campaign.clicks)}</p>
              </div>
              <div>
                <span className="text-gray-600">CTR:</span>
                <p className="font-semibold">
                  {campaign.impressions > 0
                    ? `${((campaign.clicks / campaign.impressions) * 100).toFixed(2)}%`
                    : '0%'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
