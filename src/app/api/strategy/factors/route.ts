import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-helpers'
import type {
  CreateExternalFactorInput,
  ExternalFactorListItem,
  ExternalFactorType,
  ImpactEstimate,
} from '@/types/strategy'

// GET: 외부 요인 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type')
    const branchId = searchParams.get('branchId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // 필터 조건 구성
    const where: Record<string, unknown> = {}

    if (type) {
      where.type = type
    }

    if (branchId) {
      where.branches = {
        some: { branchId },
      }
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

    const factors = await prisma.externalFactor.findMany({
      where,
      include: {
        branches: {
          include: {
            branch: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { startDate: 'desc' },
    })

    const result: ExternalFactorListItem[] = factors.map((factor) => ({
      id: factor.id,
      type: factor.type as ExternalFactorType,
      name: factor.name,
      startDate: factor.startDate.toISOString().split('T')[0],
      endDate: factor.endDate.toISOString().split('T')[0],
      impactEstimate: factor.impactEstimate as ImpactEstimate | undefined,
      isRecurring: factor.isRecurring,
      branches: factor.branches.map((b) => ({
        id: b.branch.id,
        name: b.branch.name,
      })),
    }))

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Failed to fetch external factors:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch external factors' },
      { status: 500 }
    )
  }
}

// POST: 외부 요인 생성
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body: CreateExternalFactorInput = await request.json()

    // 유효성 검사
    if (!body.type || !body.name || !body.startDate || !body.endDate || !body.branchIds?.length) {
      return NextResponse.json(
        { success: false, error: '필수 필드를 입력해주세요.' },
        { status: 400 }
      )
    }

    const factor = await prisma.externalFactor.create({
      data: {
        type: body.type,
        name: body.name,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        impactEstimate: body.impactEstimate,
        description: body.description,
        isRecurring: body.isRecurring ?? false,
        recurringRule: body.recurringRule,
        createdBy: session.user.id,
        branches: {
          create: body.branchIds.map((branchId) => ({
            branchId,
          })),
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

    return NextResponse.json({ success: true, data: factor })
  } catch (error) {
    console.error('Failed to create external factor:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create external factor' },
      { status: 500 }
    )
  }
}

// DELETE: 외부 요인 삭제
export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 })
    }

    await prisma.externalFactor.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete external factor:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete external factor' },
      { status: 500 }
    )
  }
}
