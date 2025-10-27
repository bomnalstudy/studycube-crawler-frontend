import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import ExcelJS from 'exceljs'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const combinedId = searchParams.get('id')
    const combinedName = searchParams.get('name') || '통합분석'

    if (!combinedId) {
      return NextResponse.json(
        { success: false, error: 'Combined ID is required' },
        { status: 400 }
      )
    }

    // 통합 분석 정보 조회
    const combined = await prisma.combinedAnalysis.findUnique({
      where: { id: combinedId },
      include: {
        branches: {
          include: {
            branch: true
          }
        }
      }
    })

    if (!combined) {
      return NextResponse.json(
        { success: false, error: 'Combined analysis not found' },
        { status: 404 }
      )
    }

    // 통합분석에 연결된 지점 ID 목록
    const combinedBranchIds = combined.branches.map(cb => cb.branchId)

    // 분석 실행
    const afterMetrics = await prisma.dailyMetric.findMany({
      where: {
        branchId: combinedBranchIds.length > 0 ? { in: combinedBranchIds } : undefined,
        date: {
          gte: combined.startDate,
          lte: combined.endDate
        }
      }
    })

    // 이전 기간
    const days = Math.ceil((combined.endDate.getTime() - combined.startDate.getTime()) / (1000 * 60 * 60 * 24))
    const beforeStartDate = new Date(combined.startDate)
    beforeStartDate.setDate(beforeStartDate.getDate() - days)
    const beforeEndDate = new Date(combined.startDate)
    beforeEndDate.setDate(beforeEndDate.getDate() - 1)

    const beforeMetrics = await prisma.dailyMetric.findMany({
      where: {
        branchId: combinedBranchIds.length > 0 ? { in: combinedBranchIds } : undefined,
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
        branchId: combinedBranchIds.length > 0 ? { in: combinedBranchIds } : undefined,
        visitDate: {
          gte: combined.startDate,
          lte: combined.endDate
        }
      }
    })

    const beforeVisitors = await prisma.dailyVisitor.findMany({
      where: {
        branchId: combinedBranchIds.length > 0 ? { in: combinedBranchIds } : undefined,
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

    // ROI, ROAS, CTR, CPC 계산
    const cost = Number(combined.cost || 0)
    const roi = cost > 0 ? ((afterRevenue - beforeRevenue - cost) / cost) * 100 : 0
    const roas = cost > 0 ? (afterRevenue / cost) * 100 : 0
    const ctr = combined.impressions && combined.impressions > 0 ? (combined.clicks! / combined.impressions) * 100 : 0
    const cpc = combined.clicks && combined.clicks > 0 ? cost / combined.clicks : 0

    // 전략 유형 레이블
    const strategyTypeLabels: Record<string, string> = {
      PRICE_DISCOUNT: '가격 할인',
      REVIEW_EVENT: '이벤트',
      NEW_CONTENT: '신규 콘텐츠'
    }

    // Excel 생성
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('통합 성과')

    // 스타일 정의
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9333EA' } } as ExcelJS.Fill,
      alignment: { vertical: 'middle', horizontal: 'center' } as ExcelJS.Alignment
    }

    const titleStyle = {
      font: { bold: true, size: 14 },
      alignment: { vertical: 'middle', horizontal: 'left' } as ExcelJS.Alignment
    }

    // 제목
    worksheet.mergeCells('A1:E1')
    const titleCell = worksheet.getCell('A1')
    titleCell.value = `통합 성과 분석 (광고+전략): ${combinedName}`
    titleCell.font = titleStyle.font
    titleCell.alignment = titleStyle.alignment

    // 빈 행
    worksheet.addRow([])

    // 기본 정보
    worksheet.addRow(['기본 정보']).font = { bold: true }
    worksheet.addRow(['지점', combined.branches.map(cb => cb.branch.name).join(', ')])
    worksheet.addRow(['기간', `${combined.startDate.toISOString().split('T')[0]} ~ ${combined.endDate.toISOString().split('T')[0]}`])

    // 빈 행
    worksheet.addRow([])

    // 광고 정보
    if (combined.cost !== null || combined.impressions !== null || combined.clicks !== null) {
      worksheet.addRow(['광고 정보']).font = { bold: true }
      if (combined.cost !== null) {
        worksheet.addRow(['광고 비용', `${Number(combined.cost).toLocaleString()}원`])
      }
      if (combined.impressions !== null) {
        worksheet.addRow(['노출수', combined.impressions.toLocaleString()])
      }
      if (combined.clicks !== null) {
        worksheet.addRow(['클릭수', combined.clicks.toLocaleString()])
      }
      worksheet.addRow(['CTR (클릭률)', `${ctr.toFixed(2)}%`])
      worksheet.addRow(['CPC (클릭당 비용)', `${cpc.toLocaleString()}원`])

      // 빈 행
      worksheet.addRow([])

      // 주요 성과 지표
      worksheet.addRow(['주요 성과 지표']).font = { bold: true }
      worksheet.addRow(['ROI', `${roi.toFixed(2)}%`])
      worksheet.addRow(['ROAS', `${roas.toFixed(2)}%`])

      // 빈 행
      worksheet.addRow([])
    }

    // 전략 정보
    if (combined.strategyType || combined.reason || combined.description) {
      worksheet.addRow(['전략 정보']).font = { bold: true }
      if (combined.strategyType) {
        worksheet.addRow(['전략 유형', strategyTypeLabels[combined.strategyType] || combined.strategyType])
      }

      // 빈 행
      worksheet.addRow([])

      if (combined.reason) {
        worksheet.addRow(['전략 수립 이유']).font = { bold: true }
        worksheet.addRow([combined.reason])
      }

      // 빈 행
      worksheet.addRow([])

      if (combined.description) {
        worksheet.addRow(['전략 상세 내용']).font = { bold: true }
        worksheet.addRow([combined.description])
      }

      // 빈 행
      worksheet.addRow([])
    }

    // 성과 비교 테이블 헤더
    const compareHeaderRow = worksheet.addRow(['지표', '시행 전', '시행 후', '변화량', '변화율'])
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
    const fileName = `${combinedName.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`

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
