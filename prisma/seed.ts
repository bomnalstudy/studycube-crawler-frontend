import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// 지점 데이터 (인덱스는 드롭다운 순서)
const branchData = [
  { name: '봄날의서재 진주경상대점', index: 0, username: 'bomnaldata_jj' },
  { name: '봄날의서재 파주운정점', index: 1, username: 'bomnaldata_pu' },
  { name: '봄날의 서재 광장점', index: 2, username: 'bomnaldata_gw' },
  { name: '봄날의서재 가정루원시티점', index: 3, username: 'bomnaldata_gr' },
  { name: '봄날의서재 구파발역점', index: 4, username: 'bomnaldata_gp' },
  { name: '봄날의서재 방이점', index: 5, username: 'bomnaldata_bi' },
  { name: '봄날의서재 용인보라점', index: 6, username: 'bomnaldata_yi' },
  { name: '봄날의서재 울산달동점', index: 7, username: 'bomnaldata_ud' },
  { name: '봄날의서재 잠실새내점', index: 8, username: 'bomnaldata_js' }
]

async function main() {
  console.log('🌱 시드 데이터 생성 시작...')

  // 공통 비밀번호 (1234)
  const commonPassword = await bcrypt.hash('1234', 12)

  // 기존 사용자 모두 삭제
  await prisma.user.deleteMany()
  console.log('🗑️ 기존 사용자 데이터 삭제 완료')

  // 어드민 계정 생성
  const admin = await prisma.user.create({
    data: {
      username: 'admin123',
      password: commonPassword,
      name: '관리자',
      role: 'ADMIN'
    }
  })
  console.log(`✅ 어드민 계정 생성: ${admin.username}`)

  // 지점 생성 또는 조회 후 계정 생성
  for (const data of branchData) {
    // 지점 생성 또는 기존 지점 조회
    const branch = await prisma.branch.upsert({
      where: { name: data.name },
      update: { index: data.index },
      create: {
        name: data.name,
        index: data.index
      }
    })
    console.log(`📍 지점 확인: ${branch.name}`)

    // 지점 계정 생성
    const user = await prisma.user.create({
      data: {
        username: data.username,
        password: commonPassword,
        name: `${branch.name} 담당자`,
        role: 'BRANCH',
        branchId: branch.id
      }
    })
    console.log(`✅ 지점 계정 생성: ${user.username} (${branch.name})`)
  }

  console.log('')
  console.log('🎉 시드 데이터 생성 완료!')
  console.log('')
  console.log('📋 생성된 계정 정보:')
  console.log('─────────────────────────────────────')
  console.log('어드민: admin123 / 1234')
  console.log('─────────────────────────────────────')
  console.log('진주경상대점: bomnaldata_jj / 1234')
  console.log('파주운정점: bomnaldata_pu / 1234')
  console.log('광장점: bomnaldata_gw / 1234')
  console.log('가정루원시티점: bomnaldata_gr / 1234')
  console.log('구파발역점: bomnaldata_gp / 1234')
  console.log('방이점: bomnaldata_bi / 1234')
  console.log('용인보라점: bomnaldata_yi / 1234')
  console.log('울산달동점: bomnaldata_ud / 1234')
  console.log('잠실새내점: bomnaldata_js / 1234')
  console.log('─────────────────────────────────────')
}

main()
  .catch((e) => {
    console.error('❌ 시드 생성 실패:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
