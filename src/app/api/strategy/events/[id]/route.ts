import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-helpers'
import type { UpdateEventInput, EventDetail, EventMainType, EventSubType, SegmentType } from '@/types/strategy'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET: 이벤트 상세 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        types: true,
        branches: {
          include: {
            branch: { select: { id: true, name: true } },
          },
        },
        targets: true,
        author: {
          select: { id: true, name: true },
        },
      },
    })

    if (!event) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 })
    }

    const result: EventDetail = {
      id: event.id,
      name: event.name,
      startDate: event.startDate.toISOString().split('T')[0],
      endDate: event.endDate.toISOString().split('T')[0],
      status: event.status as EventDetail['status'],
      cost: event.cost ? Number(event.cost) : undefined,
      description: event.description ?? undefined,
      hypothesis: event.hypothesis ?? undefined,
      primaryKpi: event.primaryKpi ?? undefined,
      secondaryKpis: event.secondaryKpis as string[] | undefined,
      types: event.types.map((t) => ({
        type: t.type as EventMainType,
        subType: t.subType as EventSubType,
      })),
      branches: event.branches.map((b) => ({
        id: b.branch.id,
        name: b.branch.name,
      })),
      targets: event.targets.map((t) => ({
        segmentType: t.segmentType as SegmentType,
        segmentValue: t.segmentValue,
      })),
      createdBy: {
        id: event.author.id,
        name: event.author.name,
      },
      createdAt: event.createdAt.toISOString(),
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Failed to fetch event:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch event' }, { status: 500 })
  }
}

// PATCH: 이벤트 수정
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body: UpdateEventInput = await request.json()

    // 기존 이벤트 확인
    const existingEvent = await prisma.event.findUnique({
      where: { id },
    })

    if (!existingEvent) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 })
    }

    // 트랜잭션으로 업데이트
    const event = await prisma.$transaction(async (tx) => {
      // types 업데이트 (있는 경우)
      if (body.types) {
        await tx.eventType.deleteMany({ where: { eventId: id } })
        await tx.eventType.createMany({
          data: body.types.map((t) => ({
            eventId: id,
            type: t.type,
            subType: t.subType,
          })),
        })
      }

      // branches 업데이트 (있는 경우)
      if (body.branchIds) {
        await tx.eventBranch.deleteMany({ where: { eventId: id } })
        await tx.eventBranch.createMany({
          data: body.branchIds.map((branchId) => ({
            eventId: id,
            branchId,
          })),
        })
      }

      // targets 업데이트 (있는 경우)
      if (body.targets !== undefined) {
        await tx.eventTarget.deleteMany({ where: { eventId: id } })
        if (body.targets.length > 0) {
          await tx.eventTarget.createMany({
            data: body.targets.map((t) => ({
              eventId: id,
              segmentType: t.segmentType,
              segmentValue: t.segmentValue,
            })),
          })
        }
      }

      // 기본 필드 업데이트
      return tx.event.update({
        where: { id },
        data: {
          name: body.name,
          startDate: body.startDate ? new Date(body.startDate) : undefined,
          endDate: body.endDate ? new Date(body.endDate) : undefined,
          cost: body.cost,
          description: body.description,
          hypothesis: body.hypothesis,
          primaryKpi: body.primaryKpi,
          secondaryKpis: body.secondaryKpis,
          status: body.status,
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
    })

    return NextResponse.json({ success: true, data: event })
  } catch (error) {
    console.error('Failed to update event:', error)
    return NextResponse.json({ success: false, error: 'Failed to update event' }, { status: 500 })
  }
}

// DELETE: 이벤트 삭제
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    await prisma.event.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete event:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete event' }, { status: 500 })
  }
}
