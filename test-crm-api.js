const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function test() {
  try {
    console.log('Testing CRM Dashboard API logic...')

    const now = new Date()
    const startDate = new Date('2026-01-01')
    const endDate = new Date('2026-01-31T23:59:59')

    // 테스트: recentVisitors 쿼리
    console.log('Fetching recent visitors...')
    const recentVisitors = await prisma.dailyVisitor.findMany({
      where: {
        visitDate: { gte: startDate, lte: endDate },
      },
      select: {
        phone: true,
        customerId: true,
        visitDate: true,
        remainingTermTicket: true,
        remainingTimePackage: true,
        remainingFixedSeat: true,
      },
      take: 5
    })

    console.log('Sample visitor:', recentVisitors[0])
    console.log('Total visitors:', recentVisitors.length)

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

test()
