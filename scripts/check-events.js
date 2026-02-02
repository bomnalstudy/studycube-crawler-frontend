const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 이벤트 목록 조회
  const events = await prisma.event.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      branches: {
        include: { branch: { select: { name: true } } }
      }
    }
  });

  console.log('=== 최근 이벤트 목록 ===');
  for (const event of events) {
    console.log(`\n이벤트: ${event.name}`);
    console.log(`  기간: ${event.startDate.toISOString().split('T')[0]} ~ ${event.endDate.toISOString().split('T')[0]}`);
    console.log(`  지점: ${event.branches.map(b => b.branch.name).join(', ')}`);

    // 이 이벤트 기간의 데이터 확인
    const branchId = event.branches[0]?.branchId;
    if (branchId) {
      // 전년 동기
      const lastYearStart = new Date(event.startDate);
      lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
      const lastYearEnd = new Date(event.endDate);
      lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1);

      const lastYearData = await prisma.dailyMetric.findMany({
        where: {
          branchId,
          date: { gte: lastYearStart, lte: lastYearEnd }
        }
      });

      // 전월
      const lastMonthStart = new Date(event.startDate);
      lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
      const lastMonthEnd = new Date(event.endDate);
      lastMonthEnd.setMonth(lastMonthEnd.getMonth() - 1);

      const lastMonthData = await prisma.dailyMetric.findMany({
        where: {
          branchId,
          date: { gte: lastMonthStart, lte: lastMonthEnd }
        }
      });

      console.log(`  전년 동기 데이터: ${lastYearData.length}개 레코드 (${lastYearStart.toISOString().split('T')[0]} ~ ${lastYearEnd.toISOString().split('T')[0]})`);
      console.log(`  전월 데이터: ${lastMonthData.length}개 레코드 (${lastMonthStart.toISOString().split('T')[0]} ~ ${lastMonthEnd.toISOString().split('T')[0]})`);

      if (lastMonthData.length > 0) {
        const dayTicket = lastMonthData.reduce((sum, m) => sum + Number(m.dayTicketRevenue ?? 0), 0);
        const timeTicket = lastMonthData.reduce((sum, m) => sum + Number(m.timeTicketRevenue ?? 0), 0);
        const termTicket = lastMonthData.reduce((sum, m) => sum + Number(m.termTicketRevenue ?? 0), 0);
        console.log(`  전월 이용권별 매출: 당일권=${dayTicket}, 시간권=${timeTicket}, 기간권=${termTicket}`);
      }
    }
  }

  // 데이터 기간 확인
  const oldest = await prisma.dailyMetric.findFirst({ orderBy: { date: 'asc' } });
  const newest = await prisma.dailyMetric.findFirst({ orderBy: { date: 'desc' } });

  console.log('\n=== 데이터 보유 기간 ===');
  console.log(`가장 오래된 데이터: ${oldest?.date?.toISOString().split('T')[0]}`);
  console.log(`가장 최신 데이터: ${newest?.date?.toISOString().split('T')[0]}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
