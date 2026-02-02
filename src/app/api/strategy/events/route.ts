import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-helpers'
import type { CreateEventInput, EventListItem, EventMainType, EventSubType } from '@/types/strategy'

// GET: 이벤트 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    // 종료일이 지난 이벤트를 자동으로 COMPLETED 상태로 변경
    // PLANNED나 ONGOING 상태인 이벤트 중 종료일이 오늘보다 이전인 경우
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    await prisma.event.updateMany({
      where: {
        endDate: { lt: today },
        status: { in: ['PLANNED', 'ONGOING'] },
      },
      data: {
        status: 'COMPLETED',
      },
    })

    // 시작일이 지났고 종료일이 아직 안 지난 이벤트는 ONGOING으로 변경
    await prisma.event.updateMany({
      where: {
        startDate: { lte: today },
        endDate: { gte: today },
        status: 'PLANNED',
      },
      data: {
        status: 'ONGOING',
      },
    })

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const branchId = searchParams.get('branchId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // 필터 조건 구성
    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    }

    if (startDate && endDate) {
      where.OR = [
        {
          startDate: { gte: new Date(startDate), lte: new Date(endDate) },
        },
        {
          endDate: { gte: new Date(startDate), lte: new Date(endDate) },
        },
        {
          AND: [
            { startDate: { lte: new Date(startDate) } },
            { endDate: { gte: new Date(endDate) } },
          ],
        },
      ]
    }

    if (type) {
      where.types = {
        some: { type },
      }
    }

    if (branchId) {
      where.branches = {
        some: { branchId },
      }
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        types: true,
        branches: {
          include: {
            branch: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { startDate: 'desc' },
    })

    const result: EventListItem[] = events.map((event) => ({
      id: event.id,
      name: event.name,
      startDate: event.startDate.toISOString().split('T')[0],
      endDate: event.endDate.toISOString().split('T')[0],
      status: event.status as EventListItem['status'],
      types: event.types.map((t) => ({
        type: t.type as EventMainType,
        subType: t.subType as EventSubType,
      })),
      branches: event.branches.map((b) => ({
        id: b.branch.id,
        name: b.branch.name,
      })),
      createdAt: event.createdAt.toISOString(),
    }))

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Failed to fetch events:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch events' }, { status: 500 })
  }
}

// POST: 이벤트 생성
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body: CreateEventInput = await request.json()

    // 유효성 검사
    if (!body.name || !body.startDate || !body.endDate || !body.types?.length || !body.branchIds?.length) {
      return NextResponse.json(
        { success: false, error: '필수 필드를 입력해주세요.' },
        { status: 400 }
      )
    }

    const event = await prisma.event.create({
      data: {
        name: body.name,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        cost: body.cost,
        description: body.description,
        hypothesis: body.hypothesis,
        primaryKpi: body.primaryKpi,
        secondaryKpis: body.secondaryKpis,
        createdBy: session.user.id,
        types: {
          create: body.types.map((t) => ({
            type: t.type,
            subType: t.subType,
          })),
        },
        branches: {
          create: body.branchIds.map((branchId) => ({
            branchId,
          })),
        },
        targets: body.targets?.length
          ? {
              create: body.targets.map((t) => ({
                segmentType: t.segmentType,
                segmentValue: t.segmentValue,
              })),
            }
          : undefined,
      },
      include: {
        types: true,
        branches: {
          include: {
            branch: { select: { id: true, name: true } },
          },
        },
        targets: true,
      },
    })

    return NextResponse.json({ success: true, data: event })
  } catch (error) {
    console.error('Failed to create event:', error)
    return NextResponse.json({ success: false, error: 'Failed to create event' }, { status: 500 })
  }
}
