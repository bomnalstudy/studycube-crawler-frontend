'use client'

import { useState } from 'react'
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList
} from 'recharts'
import './ticket-revenue-chart.css'

interface TicketRevenueData {
  ticketName: string
  revenue: number
  salesCount: number
}

interface TicketRevenueChartProps {
  data: TicketRevenueData[]
  allData?: TicketRevenueData[]
  title: string
  height?: number
}

// 색상 배열 (그라데이션 효과)
const COLORS = [
  '#3b82f6', // blue-500
  '#60a5fa', // blue-400
  '#93c5fd', // blue-300
  '#6366f1', // indigo-500
  '#818cf8', // indigo-400
  '#a5b4fc', // indigo-300
  '#8b5cf6', // violet-500
  '#a78bfa', // violet-400
  '#c4b5fd', // violet-300
  '#d8b4fe', // violet-200
]

export function TicketRevenueChart({
  data,
  allData,
  title,
  height = 400
}: TicketRevenueChartProps) {
  const [showDetail, setShowDetail] = useState(false)

  // 금액 포맷터
  const formatRevenue = (value: number) => {
    if (value >= 10000) {
      return `${(value / 10000).toFixed(0)}만원`
    }
    return `${value.toLocaleString('ko-KR')}원`
  }

  // 이름이 길 경우 축약
  const truncateName = (name: string, maxLength: number = 12) => {
    if (name.length > maxLength) {
      return name.substring(0, maxLength) + '...'
    }
    return name
  }

  // 차트 데이터 가공
  const chartData = data.map((item, index) => ({
    ...item,
    displayName: truncateName(item.ticketName),
    rank: index + 1
  }))

  // 막대 옆 판매 수량 라벨
  const renderSalesLabel = (props: any) => {
    const { x, y, width, height: barHeight, value } = props
    if (!value) return null
    const item = chartData[props.index]
    if (!item) return null
    return (
      <text
        x={x + width + 6}
        y={y + barHeight / 2}
        fill="#6b7280"
        fontSize={11}
        dominantBaseline="middle"
      >
        {item.salesCount}건
      </text>
    )
  }

  // 전체 데이터 (자세히 보기용)
  const detailData = allData || data

  return (
    <>
      <div className="ticket-revenue-card">
        <div className="ticket-revenue-header">
          <h3 className="ticket-revenue-title">{title}</h3>
          {allData && allData.length > 0 && (
            <button
              className="ticket-revenue-detail-btn"
              onClick={() => setShowDetail(true)}
            >
              자세히 보기
            </button>
          )}
        </div>
        {data.length === 0 ? (
          <div className="ticket-revenue-empty">
            데이터가 없습니다
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <RechartsBarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 60, left: 100, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                type="number"
                tick={{ fontSize: 12 }}
                tickFormatter={formatRevenue}
              />
              <YAxis
                type="category"
                dataKey="displayName"
                tick={{ fontSize: 12 }}
                width={90}
              />
              <Tooltip
                formatter={(value: number) => [
                  `${value.toLocaleString('ko-KR')}원`,
                  '매출'
                ]}
                labelFormatter={(_, payload) => {
                  if (payload && payload.length > 0) {
                    const item = payload[0].payload
                    return `${item.rank}위: ${item.ticketName} (${item.salesCount}건)`
                  }
                  return ''
                }}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Bar
                dataKey="revenue"
                radius={[0, 4, 4, 0]}
              >
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
                <LabelList content={renderSalesLabel} />
              </Bar>
            </RechartsBarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 자세히 보기 모달 */}
      {showDetail && (
        <div className="ticket-detail-overlay" onClick={() => setShowDetail(false)}>
          <div className="ticket-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-detail-modal-header">
              <h3 className="ticket-detail-modal-title">이용권별 매출 전체</h3>
              <button
                className="ticket-detail-close-btn"
                onClick={() => setShowDetail(false)}
              >
                ✕
              </button>
            </div>

            {/* 상단: 그래프 */}
            <div className="ticket-detail-chart-area">
              <ResponsiveContainer width="100%" height={Math.max(400, detailData.length * 32)}>
                <RechartsBarChart
                  data={detailData.map((item, index) => ({
                    ...item,
                    displayName: truncateName(item.ticketName, 15),
                    rank: index + 1
                  }))}
                  layout="vertical"
                  margin={{ top: 5, right: 60, left: 120, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    tickFormatter={formatRevenue}
                  />
                  <YAxis
                    type="category"
                    dataKey="displayName"
                    tick={{ fontSize: 11 }}
                    width={110}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      `${value.toLocaleString('ko-KR')}원`,
                      '매출'
                    ]}
                    labelFormatter={(_, payload) => {
                      if (payload && payload.length > 0) {
                        const item = payload[0].payload
                        return `${item.rank}위: ${item.ticketName} (${item.salesCount}건)`
                      }
                      return ''
                    }}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                    {detailData.map((_, index) => (
                      <Cell
                        key={`cell-detail-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Bar>
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>

            {/* 하단: 매출 순위 리스트 */}
            <div className="ticket-detail-list-area">
              <h4 className="ticket-detail-list-title">매출 순위</h4>
              <div className="ticket-detail-list-header">
                <span className="ticket-detail-col-rank">순위</span>
                <span className="ticket-detail-col-name">이용권</span>
                <span className="ticket-detail-col-sales">판매 수</span>
                <span className="ticket-detail-col-revenue">매출</span>
              </div>
              <div className="ticket-detail-list">
                {detailData.map((item, index) => (
                  <div key={item.ticketName} className="ticket-detail-list-item">
                    <span className="ticket-detail-col-rank">
                      <span
                        className="ticket-detail-rank-badge"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      >
                        {index + 1}
                      </span>
                    </span>
                    <span className="ticket-detail-col-name">{item.ticketName}</span>
                    <span className="ticket-detail-col-sales">{item.salesCount.toLocaleString()}건</span>
                    <span className="ticket-detail-col-revenue">{item.revenue.toLocaleString('ko-KR')}원</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
