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
    const { content } = body

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ success: false, error: '메모 내용을 입력해주세요' }, { status: 400 })
    }

    const memo = await prisma.customerMemo.create({
      data: {
        customerId: id,
        content: content.trim(),
        createdBy: session.user.id,
      },
      include: {
        author: { select: { name: true } },
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: memo.id,
        content: memo.content,
        createdBy: memo.createdBy,
        authorName: memo.author.name,
        createdAt: memo.createdAt.toISOString(),
        updatedAt: memo.updatedAt.toISOString(),
      }
    })
  } catch (error) {
    console.error('Failed to create memo:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create memo' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const memoId = searchParams.get('memoId')

    if (!memoId) {
      return NextResponse.json({ success: false, error: 'memoId가 필요합니다' }, { status: 400 })
    }

    // 본인이 작성한 메모만 삭제 가능 (관리자는 모두 삭제 가능)
    const memo = await prisma.customerMemo.findUnique({ where: { id: memoId } })
    if (!memo) {
      return NextResponse.json({ success: false, error: '메모를 찾을 수 없습니다' }, { status: 404 })
    }

    if (session.user.role !== 'ADMIN' && memo.createdBy !== session.user.id) {
      return NextResponse.json({ success: false, error: '삭제 권한이 없습니다' }, { status: 403 })
    }

    await prisma.customerMemo.delete({ where: { id: memoId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete memo:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete memo' },
      { status: 500 }
    )
  }
}
