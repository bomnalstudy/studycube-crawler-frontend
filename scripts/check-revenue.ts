import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 가정루원시티점 찾기
  const branch = await prisma.branch.findFirst({
    where: { name: { contains: '가정루원' } }
  })

  if (!branch) {
    console.log('지점을 찾을 수 없습니다')
    return
  }

  console.log('지점:', branch.name, branch.id)

  // ticket_buyers에서 실제 결제 금액 확인 (포인트 차감 후)
  const ticketBuyers = await prisma.ticketBuyer.findMany({
    where: {
      branchId: branch.id,
      date: {
        gte: new Date('2025-12-01'),
        lte: new Date('2025-12-31')
      }
    },
    orderBy: { date: 'asc' }
  })

  console.log('\n=== Ticket Buyers (12월) ===')
  console.log('총 구매 건수:', ticketBuyers.length)

  let buyerTotal = 0
  let pointUsedTotal = 0

  // 날짜별 집계
  const dailyBuyers = new Map<string, { amount: number, pointUsed: number, count: number }>()

  ticketBuyers.forEach(tb => {
    const dateStr = tb.date.toISOString().split('T')[0]
    const amount = Number(tb.amount || 0)
    const pointUsed = Number(tb.pointUsed || 0)

    buyerTotal += amount
    pointUsedTotal += pointUsed

    if (!dailyBuyers.has(dateStr)) {
      dailyBuyers.set(dateStr, { amount: 0, pointUsed: 0, count: 0 })
    }
    const daily = dailyBuyers.get(dateStr)!
    daily.amount += amount
    daily.pointUsed += pointUsed
    daily.count++
  })

  // 날짜별 출력
  Array.from(dailyBuyers.entries()).sort().forEach(([date, data]) => {
    const net = data.amount - data.pointUsed
    console.log(`${date}: 금액 ${data.amount.toLocaleString()}원 - 포인트 ${data.pointUsed.toLocaleString()}원 = ${net.toLocaleString()}원 (${data.count}건)`)
  })

  console.log('\n=== 합계 ===')
  console.log('ticket_buyers 총 금액:', buyerTotal.toLocaleString(), '원')
  console.log('ticket_buyers 포인트 사용:', pointUsedTotal.toLocaleString(), '원')
  console.log('ticket_buyers 순 매출:', (buyerTotal - pointUsedTotal).toLocaleString(), '원')

  // ticket_revenue에서도 확인
  const ticketRevenues = await prisma.ticketRevenue.findMany({
    where: {
      branchId: branch.id,
      date: {
        gte: new Date('2025-12-01'),
        lte: new Date('2025-12-31')
      }
    }
  })

  let ticketRevenueTotal = 0
  ticketRevenues.forEach(tr => {
    ticketRevenueTotal += Number(tr.revenue || 0)
  })

  console.log('\nticket_revenue 총 매출:', ticketRevenueTotal.toLocaleString(), '원')

  // daily_metrics 합계
  const metrics = await prisma.dailyMetric.findMany({
    where: {
      branchId: branch.id,
      date: {
        gte: new Date('2025-12-01'),
        lte: new Date('2025-12-31')
      }
    }
  })

  let metricsTotal = 0
  metrics.forEach(m => {
    metricsTotal += Number(m.totalRevenue || 0)
  })

  console.log('daily_metrics 총 매출:', metricsTotal.toLocaleString(), '원')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
