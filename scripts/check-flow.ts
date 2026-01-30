import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const flow = await prisma.automationFlow.findUnique({
    where: { id: 'cmkz7uu6j000333f5z224e50g' }
  })

  if (!flow) {
    console.log('플로우 없음')
    return
  }

  console.log('=== 플로우 설정 ===')
  console.log('branchId:', flow.branchId)
  console.log('filterConfig:', JSON.stringify(flow.filterConfig, null, 2))

  const filterConfig = flow.filterConfig as any

  if (filterConfig?.manualPhones?.length) {
    console.log('\n=== 수동 입력된 전화번호 ===')
    console.log(filterConfig.manualPhones)

    // 이 전화번호가 customers 테이블에 있는지 확인
    const customers = await prisma.customer.findMany({
      where: {
        phone: { in: filterConfig.manualPhones },
        mainBranchId: flow.branchId
      },
      select: { id: true, phone: true }
    })

    console.log('\n=== DB에서 찾은 고객 ===')
    console.log(`${customers.length}명 찾음`)
    customers.forEach(c => console.log(`- ${c.phone}: ${c.name}`))

    if (customers.length === 0) {
      console.log('\n⚠️ 문제: 입력한 전화번호가 DB customers 테이블에 없거나, 해당 지점 고객이 아님')
    }
  } else {
    console.log('\n수동 전화번호 없음 (조건 기반 모드)')
  }
}

main().finally(() => prisma.$disconnect())
