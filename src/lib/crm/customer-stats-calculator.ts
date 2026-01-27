import { CustomerStats } from '@/types/crm'

interface VisitRecord {
  visitDate: Date
  duration: number | null
  startTime: Date | null
  seat: string | null
}

interface PurchaseRecord {
  purchaseDate: Date
  ticketName: string
  amount: number
}

/**
 * 고객 상세 통계 계산
 */
export function calculateCustomerStats(
  visits: VisitRecord[],
  purchases: PurchaseRecord[]
): CustomerStats {
  return {
    avgDuration: calculateAvgDuration(visits),
    peakHour: calculatePeakHour(visits),
    visitCycleDays: calculateCycleDays(visits.map(v => v.visitDate)),
    monthlyAvgSpent: calculateMonthlyAvgSpent(purchases),
    purchaseCycleDays: calculateCycleDays(purchases.map(p => p.purchaseDate)),
    favoriteTicket: calculateFavoriteTicket(purchases),
    favoriteSeat: calculateFavoriteSeat(visits),
  }
}

function calculateAvgDuration(visits: VisitRecord[]): number | null {
  const durations = visits
    .map(v => v.duration)
    .filter((d): d is number => d !== null && d > 0)
  if (durations.length === 0) return null
  return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
}

function calculatePeakHour(visits: VisitRecord[]): number | null {
  const hours = visits
    .filter(v => v.startTime !== null)
    .map(v => v.startTime!.getHours())
  if (hours.length === 0) return null

  const hourCount: Record<number, number> = {}
  for (const h of hours) {
    hourCount[h] = (hourCount[h] || 0) + 1
  }

  return Number(
    Object.entries(hourCount).sort((a, b) => b[1] - a[1])[0][0]
  )
}

function calculateCycleDays(dates: Date[]): number | null {
  if (dates.length < 2) return null

  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime())
  const gaps: number[] = []
  for (let i = 1; i < sorted.length; i++) {
    const diff = Math.floor(
      (sorted[i].getTime() - sorted[i - 1].getTime()) / (1000 * 60 * 60 * 24)
    )
    if (diff > 0) gaps.push(diff)
  }

  if (gaps.length === 0) return null
  return Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length)
}

function calculateMonthlyAvgSpent(purchases: PurchaseRecord[]): number {
  if (purchases.length === 0) return 0

  const sorted = [...purchases].sort(
    (a, b) => a.purchaseDate.getTime() - b.purchaseDate.getTime()
  )
  const first = sorted[0].purchaseDate
  const last = sorted[sorted.length - 1].purchaseDate

  const monthSpan = Math.max(
    1,
    (last.getFullYear() - first.getFullYear()) * 12 +
      (last.getMonth() - first.getMonth()) + 1
  )

  const totalSpent = purchases.reduce((sum, p) => sum + p.amount, 0)
  return Math.round(totalSpent / monthSpan)
}

function calculateFavoriteTicket(purchases: PurchaseRecord[]): string | null {
  const realPurchases = purchases.filter(p => p.amount > 0)
  if (realPurchases.length === 0) return null

  const ticketCount: Record<string, number> = {}
  for (const p of realPurchases) {
    ticketCount[p.ticketName] = (ticketCount[p.ticketName] || 0) + 1
  }

  return Object.entries(ticketCount).sort((a, b) => b[1] - a[1])[0][0]
}

function calculateFavoriteSeat(visits: VisitRecord[]): string | null {
  const seats = visits
    .map(v => v.seat)
    .filter((s): s is string => s !== null && s !== '')
  if (seats.length === 0) return null

  const seatCount: Record<string, number> = {}
  for (const s of seats) {
    seatCount[s] = (seatCount[s] || 0) + 1
  }

  return Object.entries(seatCount).sort((a, b) => b[1] - a[1])[0][0]
}
