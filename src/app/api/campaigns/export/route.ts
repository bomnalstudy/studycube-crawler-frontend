import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import ExcelJS from 'exceljs'
import { checkAdminApi, isErrorResponse } from '@/lib/auth-helpers'

// 캠페인 Excel 내보내기 (어드민 전용)
export async function GET(request: NextRequest) {
  try {
    // 어드민 권한 체크
    const authResult = await checkAdminApi()
    if (isErrorResponse(authResult)) return authResult

    const searchParams = request.nextUrl.searchParams
    const campaignId = searchParams.get('id')
    const campaignName = searchParams.get('name') || '캠페인'

    if (!campaignId) {
      return NextResponse.json(
        { success: false, error: 'Campaign ID is required' },
        { status: 400 }
      )
    }

    // 캠페인 정보 조회
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        branches: {
          include: {
            branch: true
          }
        }
      }
    })

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // 캠페인에 연결된 지점 ID 목록
    const campaignBranchIds = campaign.branches.map(cb => cb.branchId)

    // 캠페인 분석 실행
    const afterMetrics = await prisma.dailyMetric.findMany({
      where: {
        branchId: campaignBranchIds.length > 0 ? { in: campaignBranchIds } : undefined,
        date: {
          gte: campaign.startDate,
          lte: campaign.endDate
        }
      }
    })

    // 이전 기간
    const days = Math.ceil((campaign.endDate.getTime() - campaign.startDate.getTime()) / (1000 * 60 * 60 * 24))
    const beforeStartDate = new Date(campaign.startDate)
    beforeStartDate.setDate(beforeStartDate.getDate() - days)
    const beforeEndDate = new Date(campaign.startDate)
    beforeEndDate.setDate(beforeEndDate.getDate() - 1)

    const beforeMetrics = await prisma.dailyMetric.findMany({
      where: {
        branchId: campaignBranchIds.length > 0 ? { in: campaignBranchIds } : undefined,
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

    // ROI, ROAS 계산
    const cost = Number(campaign.cost || 0)
    const roi = cost > 0 ? ((afterRevenue - beforeRevenue - cost) / cost) * 100 : 0
    const roas = cost > 0 ? (afterRevenue / cost) * 100 : 0
    const clicks = campaign.clicks || 0
    const impressions = campaign.impressions || 0
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
    const cpc = clicks > 0 ? cost / clicks : 0

    // Excel 생성
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('캠페인 성과')

    // 스타일 정의
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } } as ExcelJS.Fill,
      alignment: { vertical: 'middle', horizontal: 'center' } as ExcelJS.Alignment
    }

    const titleStyle = {
      font: { bold: true, size: 14 },
      alignment: { vertical: 'middle', horizontal: 'left' } as ExcelJS.Alignment
    }

    // 제목
    worksheet.mergeCells('A1:E1')
    const titleCell = worksheet.getCell('A1')
    titleCell.value = `캠페인 성과 분석: ${campaignName}`
    titleCell.font = titleStyle.font
    titleCell.alignment = titleStyle.alignment

    // 빈 행
    worksheet.addRow([])

    // 캠페인 기본 정보
    worksheet.addRow(['캠페인 기본 정보']).font = { bold: true }
    worksheet.addRow(['적용 지점', campaign.branches.map(cb => cb.branch.name).join(', ')])
    worksheet.addRow(['기간', `${campaign.startDate.toISOString().split('T')[0]} ~ ${campaign.endDate.toISOString().split('T')[0]}`])
    worksheet.addRow(['광고 비용', `${Number(campaign.cost || 0).toLocaleString()}원`])
    worksheet.addRow(['노출수', (campaign.impressions || 0).toLocaleString()])
    worksheet.addRow(['클릭수', (campaign.clicks || 0).toLocaleString()])
    worksheet.addRow(['CTR', `${ctr.toFixed(2)}%`])
    worksheet.addRow(['CPC', `${cpc.toLocaleString()}원`])

    // 빈 행
    worksheet.addRow([])

    // 주요 성과 지표
    worksheet.addRow(['주요 성과 지표']).font = { bold: true }
    worksheet.addRow(['ROI', `${roi.toFixed(2)}%`])
    worksheet.addRow(['ROAS', `${roas.toFixed(2)}%`])

    // 빈 행
    worksheet.addRow([])

    // 성과 비교 테이블 헤더
    const compareHeaderRow = worksheet.addRow(['지표', '광고 전', '광고 후', '변화량', '변화율'])
    compareHeaderRow.eachCell((cell) => {
      cell.font = headerStyle.font
      cell.fill = headerStyle.fill
      cell.alignment = headerStyle.alignment
    })

    // 성과 비교 데이터
    const revenueGrowth = beforeRevenue > 0 ? ((afterRevenue - beforeRevenue) / beforeRevenue) * 100 : 0
    const newUsersGrowth = beforeNewUsers > 0 ? ((afterNewUsers - beforeNewUsers) / beforeNewUsers) * 100 : 0
    const avgUsersGrowth = beforeAvgUsers > 0 ? ((afterAvgUsers - beforeAvgUsers) / beforeAvgUsers) * 100 : 0

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
    const fileName = `${campaignName.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`

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
