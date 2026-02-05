import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-helpers'
import { loadSavedEventPerformances, computeEventSummary, getSavedEventAnalysisDate } from '@/lib/strategy/event-performance-db'
import { getAnalysisEndDate } from '@/lib/strategy/analysis-helpers'
import type { ExternalFactorListItem, ExternalFactorType, ImpactEstimate } from '@/types/strategy'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET: 저장된 이벤트 분석 결과 로드
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id: eventId } = await params

    // 이벤트 조회
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        types: true,
        branches: {
          include: {
            branch: { select: { id: true, name: true } },
          },
        },
      },
    })

    if (!event) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 })
    }

    // 저장된 분석 결과 로드
    const performances = await loadSavedEventPerformances(eventId)

    if (!performances) {
      return NextResponse.json({ success: true, hasAnalysis: false })
    }

    // 분석 시점 조회
    const calculatedAt = await getSavedEventAnalysisDate(eventId)

    // 요약 계산
    const summary = computeEventSummary(performances)

    // 분석 기간 계산
    const startStr = event.startDate.toISOString().split('T')[0]
    const endStr = event.endDate.toISOString().split('T')[0]
    const analysisEnd = getAnalysisEndDate(startStr, endStr)

    // 외부 요인 조회
    const targetBranchIds = event.branches.map((b) => b.branchId)
    const externalFactors = await prisma.externalFactor.findMany({
      where: {
        OR: [
          { startDate: { gte: event.startDate, lte: analysisEnd } },
          { endDate: { gte: event.startDate, lte: analysisEnd } },
          { AND: [{ startDate: { lte: event.startDate } }, { endDate: { gte: analysisEnd } }] },
        ],
        branches: {
          some: { branchId: { in: targetBranchIds } },
        },
      },
      include: {
        branches: {
          include: {
            branch: { select: { id: true, name: true } },
          },
        },
      },
    })

    const externalFactorList: ExternalFactorListItem[] = externalFactors.map((f) => ({
      id: f.id,
      type: f.type as ExternalFactorType,
      name: f.name,
      startDate: f.startDate.toISOString().split('T')[0],
      endDate: f.endDate.toISOString().split('T')[0],
      impactEstimate: f.impactEstimate as ImpactEstimate | undefined,
      isRecurring: f.isRecurring,
      branches: f.branches.map((b) => ({
        id: b.branch.id,
        name: b.branch.name,
      })),
    }))

    return NextResponse.json({
      success: true,
      data: {
        event: {
          id: event.id,
          name: event.name,
          startDate: event.startDate.toISOString().split('T')[0],
          endDate: event.endDate.toISOString().split('T')[0],
          analysisEndDate: analysisEnd.toISOString().split('T')[0],
          status: event.status,
          types: event.types.map((t) => ({ type: t.type, subType: t.subType })),
          branches: event.branches.map((b) => ({
            id: b.branch.id,
            name: b.branch.name,
          })),
        },
        performances,
        summary,
        externalFactors: externalFactorList,
        dataAvailability: [],
        fromCache: true,
        calculatedAt,
      },
    })
  } catch (error) {
    console.error('Failed to load saved event analysis:', error)
    return NextResponse.json({ success: false, error: 'Failed to load analysis' }, { status: 500 })
  }
}
