import { prisma } from '../src/lib/prisma'

async function main() {
  const customers = await prisma.customer.findMany({
    where: {
      NOT: {
        phone: { startsWith: '010' }
      }
    },
    select: {
      id: true,
      phone: true,
      firstVisitDate: true,
      lastVisitDate: true,
      createdAt: true,
      mainBranch: { select: { name: true } }
    },
    orderBy: { firstVisitDate: 'desc' },
  })

  console.log(`\n=== 전화번호가 아닌 데이터 (총 ${customers.length}건) ===\n`)
  console.log('첫방문일\t\t지점\t\t\t전화번호(앞20자)')
  console.log('-'.repeat(70))

  customers.forEach(c => {
    const date = c.firstVisitDate.toISOString().split('T')[0]
    const branch = (c.mainBranch?.name || '-').padEnd(16)
    const phone = c.phone.slice(0, 24) + '...'
    console.log(`${date}\t${branch}\t${phone}`)
  })

  // 날짜별 집계
  const byDate = new Map<string, number>()
  customers.forEach(c => {
    const date = c.firstVisitDate.toISOString().split('T')[0]
    byDate.set(date, (byDate.get(date) || 0) + 1)
  })

  console.log('\n=== 날짜별 집계 ===\n')
  const sortedDates = [...byDate.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  sortedDates.forEach(([date, count]) => {
    console.log(`${date}: ${count}건`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
