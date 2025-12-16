import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import ExcelJS from 'exceljs'
import { checkAdminApi, isErrorResponse } from '@/lib/auth-helpers'

// 전략 Excel 내보내기 (어드민 전용)
export async function GET(request: NextRequest) {
  try {
    // 어드민 권한 체크
    const authResult = await checkAdminApi()
    if (isErrorResponse(authResult)) return authResult

    const searchParams = request.nextUrl.searchParams
    const strategyId = searchParams.get('id')
    const strategyName = searchParams.get('name') || '전략'

    if (!strategyId) {
      return NextResponse.json(
        { success: false, error: 'Strategy ID is required' },
        { status: 400 }
      )
    }

    // 전략 정보 조회
    const strategy = await prisma.strategy.findUnique({
      where: { id: strategyId },
      include: {
        branches: {
          include: {
            branch: true
          }
        }
      }
    })

    if (!strategy) {
      return NextResponse.json(
        { success: false, error: 'Strategy not found' },
        { status: 404 }
      )
    }

    // 전략에 연결된 지점 ID 목록
    const strategyBranchIds = strategy.branches.map(sb => sb.branchId)

    // 전략 분석 실행
    const afterMetrics = await prisma.dailyMetric.findMany({
      where: {
        branchId: strategyBranchIds.length > 0 ? { in: strategyBranchIds } : undefined,
        date: {
          gte: strategy.startDate,
          lte: strategy.endDate
        }
      }
    })

    // 이전 기간
    const days = Math.ceil((strategy.endDate.getTime() - strategy.startDate.getTime()) / (1000 * 60 * 60 * 24))
    const beforeStartDate = new Date(strategy.startDate)
    beforeStartDate.setDate(beforeStartDate.getDate() - days)
    const beforeEndDate = new Date(strategy.startDate)
    beforeEndDate.setDate(beforeEndDate.getDate() - 1)

    const beforeMetrics = await prisma.dailyMetric.findMany({
      where: {
        branchId: strategyBranchIds.length > 0 ? { in: strategyBranchIds } : undefined,
        date: {
          gte: beforeStartDate,
          lte: beforeEndDate
        }
      }
    })

    // 메트릭 계산
    const afterRevenue = afterMetrics.reduce((sum, m) => sum + Number(m.totalRevenue || 0), 0)
    const beforeRevenue = beforeMetrics.reduce((sum, m) => sum + Number(m.totalRevenue || 0), 0)
    const afterNewUsers = afterMetrics.reduce((sum, m) => sum + (m.newUsers || 0), 0)
    const beforeNewUsers = beforeMetrics.reduce((sum, m) => sum + (m.newUsers || 0), 0)
    const afterAvgUsers = afterMetrics.length > 0 ? afterMetrics.reduce((sum, m) => sum + (m.seatUsage || 0), 0) / afterMetrics.length : 0
    const beforeAvgUsers = beforeMetrics.length > 0 ? beforeMetrics.reduce((sum, m) => sum + (m.seatUsage || 0), 0) / beforeMetrics.length : 0

    // 재방문률 계산
    const afterVisitors = await prisma.dailyVisitor.findMany({
      where: {
        branchId: strategyBranchIds.length > 0 ? { in: strategyBranchIds } : undefined,
        visitDate: {
          gte: strategy.startDate,
          lte: strategy.endDate
        }
      }
    })

    const beforeVisitors = await prisma.dailyVisitor.findMany({
      where: {
        branchId: strategyBranchIds.length > 0 ? { in: strategyBranchIds } : undefined,
        visitDate: {
          gte: beforeStartDate,
          lte: beforeEndDate
        }
      }
    })

    const calculateRevisitRate = (visitors: any[]) => {
      const phoneVisitDates = new Map<string, Set<string>>()
      visitors.forEach(visitor => {
        const dateStr = visitor.visitDate.toISOString().split('T')[0]
        if (!phoneVisitDates.has(visitor.phoneHash)) {
          phoneVisitDates.set(visitor.phoneHash, new Set())
        }
        phoneVisitDates.get(visitor.phoneHash)!.add(dateStr)
      })
      const revisitors = Array.from(phoneVisitDates.values()).filter(dates => dates.size > 1).length
      const totalUsers = phoneVisitDates.size
      return totalUsers > 0 ? (revisitors / totalUsers) * 100 : 0
    }

    const afterRevisitRate = calculateRevisitRate(afterVisitors)
    const beforeRevisitRate = calculateRevisitRate(beforeVisitors)

    // 전략 유형 레이블
    const strategyTypeLabels: Record<string, string> = {
      PRICE_DISCOUNT: '가격 할인',
      REVIEW_EVENT: '이벤트',
      NEW_CONTENT: '신규 콘텐츠'
    }

    // Excel 생성
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('전략 성과')

    // 스타일 정의
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } } as ExcelJS.Fill,
      alignment: { vertical: 'middle', horizontal: 'center' } as ExcelJS.Alignment
    }

    const titleStyle = {
      font: { bold: true, size: 14 },
      alignment: { vertical: 'middle', horizontal: 'left' } as ExcelJS.Alignment
    }

    // 제목
    worksheet.mergeCells('A1:E1')
    const titleCell = worksheet.getCell('A1')
    titleCell.value = `전략 성과 분석: ${strategyName}`
    titleCell.font = titleStyle.font
    titleCell.alignment = titleStyle.alignment

    // 빈 행
    worksheet.addRow([])

    // 전략 기본 정보
    worksheet.addRow(['전략 기본 정보']).font = { bold: true }
    worksheet.addRow(['적용 지점', strategy.branches.map(sb => sb.branch.name).join(', ')])
    worksheet.addRow(['전략 유형', strategyTypeLabels[strategy.type] || strategy.type])
    worksheet.addRow(['기간', `${strategy.startDate.toISOString().split('T')[0]} ~ ${strategy.endDate.toISOString().split('T')[0]}`])

    // 빈 행
    worksheet.addRow([])

    // 전략 상세
    worksheet.addRow(['전략 수립 이유']).font = { bold: true }
    worksheet.addRow([strategy.reason || ''])

    // 빈 행
    worksheet.addRow([])

    worksheet.addRow(['전략 상세 내용']).font = { bold: true }
    worksheet.addRow([strategy.description || ''])

    // 빈 행
    worksheet.addRow([])

    // 성과 비교 테이블 헤더
    const compareHeaderRow = worksheet.addRow(['지표', '전략 전', '전략 후', '변화량', '변화율'])
    compareHeaderRow.eachCell((cell) => {
      cell.font = headerStyle.font
      cell.fill = headerStyle.fill
      cell.alignment = headerStyle.alignment
    })

    // 성과 비교 데이터
    const revenueGrowth = beforeRevenue > 0 ? ((afterRevenue - beforeRevenue) / beforeRevenue) * 100 : 0
    const newUsersGrowth = beforeNewUsers > 0 ? ((afterNewUsers - beforeNewUsers) / beforeNewUsers) * 100 : 0
    const avgUsersGrowth = beforeAvgUsers > 0 ? ((afterAvgUsers - beforeAvgUsers) / beforeAvgUsers) * 100 : 0
    const revisitRateGrowth = beforeRevisitRate > 0 ? ((afterRevisitRate - beforeRevisitRate) / beforeRevisitRate) * 100 : 0

    worksheet.addRow([
      '총 매출',
      `${beforeRevenue.toLocaleString()}원`,
      `${afterRevenue.toLocaleString()}원`,
      `${(afterRevenue - beforeRevenue).toLocaleString()}원`,
      `${revenueGrowth >= 0 ? '+' : ''}${revenueGrowth.toFixed(2)}%`
    ])

    worksheet.addRow([
      '신규 이용자',
      `${beforeNewUsers}명`,
      `${afterNewUsers}명`,
      `${afterNewUsers - beforeNewUsers}명`,
      `${newUsersGrowth >= 0 ? '+' : ''}${newUsersGrowth.toFixed(2)}%`
    ])

    worksheet.addRow([
      '일평균 이용자',
      `${beforeAvgUsers.toFixed(1)}명`,
      `${afterAvgUsers.toFixed(1)}명`,
      `${(afterAvgUsers - beforeAvgUsers).toFixed(1)}명`,
      `${avgUsersGrowth >= 0 ? '+' : ''}${avgUsersGrowth.toFixed(2)}%`
    ])

    worksheet.addRow([
      '재방문률',
      `${beforeRevisitRate.toFixed(2)}%`,
      `${afterRevisitRate.toFixed(2)}%`,
      `${(afterRevisitRate - beforeRevisitRate).toFixed(2)}%p`,
      `${revisitRateGrowth >= 0 ? '+' : ''}${revisitRateGrowth.toFixed(2)}%`
    ])

    // 열 너비 조정
    worksheet.columns = [
      { width: 20 },
      { width: 20 },
      { width: 20 },
      { width: 20 },
      { width: 15 }
    ]

    // Excel 파일을 버퍼로 생성
    const buffer = await workbook.xlsx.writeBuffer()

    // 파일 이름 생성
    const fileName = `${strategyName.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`

    // 응답 헤더 설정
    const headers = new Headers()
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`)

    return new NextResponse(buffer, {
      status: 200,
      headers
    })
  } catch (error) {
    console.error('Failed to generate Excel:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate Excel file'
      },
      { status: 500 }
    )
  }
}
