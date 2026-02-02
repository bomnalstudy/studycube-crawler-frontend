import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const flows = await prisma.automationFlow.findMany({
    select: {
      id: true,
      name: true,
      branchId: true,
      isActive: true,
      studycubeUsername: true,
    },
  })

  console.log('\n=== 자동화 플로우 목록 ===\n')
  flows.forEach((f) => {
    console.log(`ID: ${f.id}`)
    console.log(`이름: ${f.name}`)
    console.log(`지점: ${f.branchId}`)
    console.log(`활성: ${f.isActive ? '예' : '아니오'}`)
    console.log(`스터디큐브 계정: ${f.studycubeUsername || '없음'}`)
    console.log('---')
  })
}

main().finally(() => prisma.$disconnect())
