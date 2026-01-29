import { PrismaClient } from '@prisma/client'
import { writeFileSync } from 'fs'

const prisma = new PrismaClient()

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

  let output = `\n=== 전화번호가 아닌 데이터 (총 ${customers.length}건) ===\n\n`
  output += '첫방문일\t\t지점\t\t\t전화번호(앞24자)\n'
  output += '-'.repeat(80) + '\n'

  customers.forEach(c => {
    const date = c.firstVisitDate.toISOString().split('T')[0]
    const branch = (c.mainBranch?.name || '-').padEnd(16)
    const phone = c.phone.slice(0, 24) + '...'
    output += `${date}\t${branch}\t${phone}\n`
  })

  // 날짜별 집계
  const byDate = new Map()
  customers.forEach(c => {
    const date = c.firstVisitDate.toISOString().split('T')[0]
    byDate.set(date, (byDate.get(date) || 0) + 1)
  })

  output += '\n=== 날짜별 집계 ===\n\n'
  const sortedDates = [...byDate.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  sortedDates.forEach(([date, count]) => {
    output += `${date}: ${count}건\n`
  })

  writeFileSync('scripts/invalid-phones-result.txt', output, 'utf-8')
  console.log('Result saved to scripts/invalid-phones-result.txt')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
