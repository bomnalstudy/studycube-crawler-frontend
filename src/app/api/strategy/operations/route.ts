import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-helpers'
import type {
  CreateOperationInput,
  OperationListItem,
  OperationStatus,
  OperationSubType,
} from '@/types/strategy'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as OperationStatus | null
    const subType = searchParams.get('subType') as OperationSubType | null
    const branchId = searchParams.get('branchId')

    // 적용일이 지난 PLANNED 운영 변경을 자동으로 IMPLEMENTED로 변경
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    await prisma.operation.updateMany({
      where: {
        implementedAt: { lte: today },
        status: 'PLANNED',
      },
      data: {
        status: 'IMPLEMENTED',
      },
    })

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    }

    if (subType) {
      where.subType = subType
    }

    if (branchId) {
      where.branches = {
        some: { branchId },
      }
    }

    const operations = await prisma.operation.findMany({
      where,
      include: {
        branches: {
          include: {
            branch: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { implementedAt: 'desc' },
    })

    const result: OperationListItem[] = operations.map((op) => ({
      id: op.id,
      name: op.name,
      subType: op.subType as OperationSubType,
      implementedAt: op.implementedAt.toISOString().split('T')[0],
      status: op.status as OperationStatus,
      branches: op.branches.map((b) => ({
        id: b.branch.id,
        name: b.branch.name,
      })),
      createdAt: op.createdAt.toISOString(),
    }))

    return NextResponse.json({
      operations: result,
      total: result.length,
    })
  } catch (error) {
    console.error('Error fetching operations:', error)
    return NextResponse.json({ error: 'Failed to fetch operations' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body: CreateOperationInput = await request.json()

    if (!body.name || !body.subType || !body.implementedAt || !body.branchIds?.length) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다 (name, subType, implementedAt, branchIds)' },
        { status: 400 }
      )
    }

    const implementedDate = new Date(body.implementedAt)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const operation = await prisma.operation.create({
      data: {
        name: body.name,
        subType: body.subType,
        implementedAt: implementedDate,
        status: implementedDate <= today ? 'IMPLEMENTED' : 'PLANNED',
        cost: body.cost,
        description: body.description,
        expectedEffect: body.expectedEffect,
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

    return NextResponse.json({
      success: true,
      operation: {
        id: operation.id,
        name: operation.name,
        subType: operation.subType,
        implementedAt: operation.implementedAt.toISOString().split('T')[0],
        status: operation.status,
        branches: operation.branches.map((b) => ({
          id: b.branch.id,
          name: b.branch.name,
        })),
        createdAt: operation.createdAt.toISOString(),
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating operation:', error)
    return NextResponse.json({ error: 'Failed to create operation' }, { status: 500 })
  }
}
