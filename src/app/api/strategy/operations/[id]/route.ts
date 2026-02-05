import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-helpers'
import type { OperationDetail, UpdateOperationInput, OperationSubType, OperationStatus } from '@/types/strategy'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const operation = await prisma.operation.findUnique({
      where: { id },
      include: {
        branches: {
          include: {
            branch: { select: { id: true, name: true } },
          },
        },
        author: {
          select: { id: true, name: true },
        },
      },
    })

    if (!operation) {
      return NextResponse.json({ error: '운영 변경을 찾을 수 없습니다' }, { status: 404 })
    }

    const result: OperationDetail = {
      id: operation.id,
      name: operation.name,
      subType: operation.subType as OperationSubType,
      implementedAt: operation.implementedAt.toISOString().split('T')[0],
      status: operation.status as OperationStatus,
      cost: operation.cost ? Number(operation.cost) : undefined,
      description: operation.description ?? undefined,
      expectedEffect: operation.expectedEffect ?? undefined,
      branches: operation.branches.map((b) => ({
        id: b.branch.id,
        name: b.branch.name,
      })),
      createdBy: {
        id: operation.author.id,
        name: operation.author.name,
      },
      createdAt: operation.createdAt.toISOString(),
    }

    return NextResponse.json({ operation: result })
  } catch (error) {
    console.error('Error fetching operation:', error)
    return NextResponse.json({ error: 'Failed to fetch operation' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body: UpdateOperationInput = await request.json()

    const existing = await prisma.operation.findUnique({ where: { id } })

    if (!existing) {
      return NextResponse.json({ error: '운영 변경을 찾을 수 없습니다' }, { status: 404 })
    }

    const operation = await prisma.$transaction(async (tx) => {
      // 적용일 또는 지점 변경 시 저장된 분석 결과 무효화
      if (body.implementedAt || body.branchIds) {
        await tx.operationPerformance.deleteMany({ where: { operationId: id } })
      }

      if (body.branchIds) {
        await tx.operationBranch.deleteMany({ where: { operationId: id } })
        await tx.operationBranch.createMany({
          data: body.branchIds.map((branchId) => ({
            operationId: id,
            branchId,
          })),
        })
      }

      return tx.operation.update({
        where: { id },
        data: {
          name: body.name,
          subType: body.subType,
          implementedAt: body.implementedAt ? new Date(body.implementedAt) : undefined,
          status: body.status,
          cost: body.cost,
          description: body.description,
          expectedEffect: body.expectedEffect,
        },
        include: {
          branches: {
            include: {
              branch: { select: { id: true, name: true } },
            },
          },
          author: {
            select: { id: true, name: true },
          },
        },
      })
    })

    const result: OperationDetail = {
      id: operation.id,
      name: operation.name,
      subType: operation.subType as OperationSubType,
      implementedAt: operation.implementedAt.toISOString().split('T')[0],
      status: operation.status as OperationStatus,
      cost: operation.cost ? Number(operation.cost) : undefined,
      description: operation.description ?? undefined,
      expectedEffect: operation.expectedEffect ?? undefined,
      branches: operation.branches.map((b) => ({
        id: b.branch.id,
        name: b.branch.name,
      })),
      createdBy: {
        id: operation.author.id,
        name: operation.author.name,
      },
      createdAt: operation.createdAt.toISOString(),
    }

    return NextResponse.json({ success: true, operation: result })
  } catch (error) {
    console.error('Error updating operation:', error)
    return NextResponse.json({ error: 'Failed to update operation' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const existing = await prisma.operation.findUnique({ where: { id } })

    if (!existing) {
      return NextResponse.json({ error: '운영 변경을 찾을 수 없습니다' }, { status: 404 })
    }

    await prisma.operation.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting operation:', error)
    return NextResponse.json({ error: 'Failed to delete operation' }, { status: 500 })
  }
}
