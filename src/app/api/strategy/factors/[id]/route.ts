import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-helpers'
import type {
  ExternalFactorType,
  ImpactEstimate,
  ExternalFactorListItem,
  CreateExternalFactorInput,
} from '@/types/strategy'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET: 외부요인 상세 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const factor = await prisma.externalFactor.findUnique({
      where: { id },
      include: {
        branches: {
          include: {
            branch: { select: { id: true, name: true } },
          },
        },
      },
    })

    if (!factor) {
      return NextResponse.json({ success: false, error: 'External factor not found' }, { status: 404 })
    }

    const result: ExternalFactorListItem & { description?: string; recurringRule?: unknown } = {
      id: factor.id,
      type: factor.type as ExternalFactorType,
      name: factor.name,
      startDate: factor.startDate.toISOString().split('T')[0],
      endDate: factor.endDate.toISOString().split('T')[0],
      impactEstimate: factor.impactEstimate as ImpactEstimate | undefined,
      isRecurring: factor.isRecurring,
      description: factor.description ?? undefined,
      recurringRule: factor.recurringRule ?? undefined,
      branches: factor.branches.map((b) => ({
        id: b.branch.id,
        name: b.branch.name,
      })),
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Failed to fetch external factor:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch external factor' }, { status: 500 })
  }
}

// PATCH: 외부요인 수정
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body: Partial<CreateExternalFactorInput> = await request.json()

    // 기존 외부요인 확인
    const existingFactor = await prisma.externalFactor.findUnique({
      where: { id },
    })

    if (!existingFactor) {
      return NextResponse.json({ success: false, error: 'External factor not found' }, { status: 404 })
    }

    // 트랜잭션으로 업데이트
    const factor = await prisma.$transaction(async (tx) => {
      // branches 업데이트 (있는 경우)
      if (body.branchIds) {
        await tx.externalFactorBranch.deleteMany({ where: { factorId: id } })
        await tx.externalFactorBranch.createMany({
          data: body.branchIds.map((branchId) => ({
            factorId: id,
            branchId,
          })),
        })
      }

      // 기본 필드 업데이트
      return tx.externalFactor.update({
        where: { id },
        data: {
          type: body.type,
          name: body.name,
          startDate: body.startDate ? new Date(body.startDate) : undefined,
          endDate: body.endDate ? new Date(body.endDate) : undefined,
          impactEstimate: body.impactEstimate,
          description: body.description,
          isRecurring: body.isRecurring,
          recurringRule: body.recurringRule ? JSON.parse(JSON.stringify(body.recurringRule)) : undefined,
        },
        include: {
          branches: {
            include: {
              branch: { select: { id: true, name: true } },
            },
          },
        },
      })
    })

    const result: ExternalFactorListItem = {
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
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Failed to update external factor:', error)
    return NextResponse.json({ success: false, error: 'Failed to update external factor' }, { status: 500 })
  }
}

// DELETE: 외부요인 삭제
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    await prisma.externalFactor.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete external factor:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete external factor' }, { status: 500 })
  }
}
