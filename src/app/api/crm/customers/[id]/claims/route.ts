import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession } from '@/lib/auth-helpers'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { title, description, branchId } = body

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ success: false, error: '클레임 제목을 입력해주세요' }, { status: 400 })
    }

    const effectiveBranchId = branchId || session.user.branchId
    if (!effectiveBranchId) {
      return NextResponse.json({ success: false, error: '지점 정보가 필요합니다' }, { status: 400 })
    }

    const claim = await prisma.customerClaim.create({
      data: {
        customerId: id,
        title: title.trim(),
        description: description?.trim() || null,
        branchId: effectiveBranchId,
        createdBy: session.user.id,
      },
      include: {
        branch: { select: { name: true } },
        author: { select: { name: true } },
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: claim.id,
        title: claim.title,
        description: claim.description,
        status: claim.status,
        branchName: claim.branch.name,
        createdBy: claim.createdBy,
        authorName: claim.author.name,
        resolvedAt: claim.resolvedAt?.toISOString() || null,
        createdAt: claim.createdAt.toISOString(),
      }
    })
  } catch (error) {
    console.error('Failed to create claim:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create claim' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { claimId, status } = body

    if (!claimId || !status) {
      return NextResponse.json({ success: false, error: 'claimId와 status가 필요합니다' }, { status: 400 })
    }

    const validStatuses = ['OPEN', 'RESOLVED', 'CLOSED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ success: false, error: '유효하지 않은 상태입니다' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = { status }
    if (status === 'RESOLVED') {
      updateData.resolvedAt = new Date()
    }

    const claim = await prisma.customerClaim.update({
      where: { id: claimId },
      data: updateData,
      include: {
        branch: { select: { name: true } },
        author: { select: { name: true } },
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: claim.id,
        title: claim.title,
        description: claim.description,
        status: claim.status,
        branchName: claim.branch.name,
        createdBy: claim.createdBy,
        authorName: claim.author.name,
        resolvedAt: claim.resolvedAt?.toISOString() || null,
        createdAt: claim.createdAt.toISOString(),
      }
    })
  } catch (error) {
    console.error('Failed to update claim:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update claim' },
      { status: 500 }
    )
  }
}
