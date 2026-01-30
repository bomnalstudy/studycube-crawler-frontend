const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 최근 10개 데이터 조회
  const metrics = await prisma.dailyMetric.findMany({
    take: 10,
    orderBy: { date: 'desc' },
    select: {
      date: true,
      branchId: true,
      totalRevenue: true,
      dayTicketRevenue: true,
      timeTicketRevenue: true,
      termTicketRevenue: true,
    }
  });

  console.log('=== 최근 daily_metrics 데이터 ===');
  metrics.forEach(m => {
    console.log(`날짜: ${m.date.toISOString().split('T')[0]}, 지점: ${m.branchId}`);
    console.log(`  총매출: ${m.totalRevenue}, 당일권: ${m.dayTicketRevenue}, 시간권: ${m.timeTicketRevenue}, 기간권: ${m.termTicketRevenue}`);
  });

  // null이 아닌 이용권 매출 데이터 개수 확인
  const withTicketData = await prisma.dailyMetric.count({
    where: {
      OR: [
        { dayTicketRevenue: { not: null } },
        { timeTicketRevenue: { not: null } },
        { termTicketRevenue: { not: null } },
      ]
    }
  });

  const totalCount = await prisma.dailyMetric.count();

  console.log('\n=== 이용권 매출 데이터 현황 ===');
  console.log(`전체 레코드: ${totalCount}`);
  console.log(`이용권 매출 있는 레코드: ${withTicketData}`);
  console.log(`비율: ${((withTicketData / totalCount) * 100).toFixed(1)}%`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
