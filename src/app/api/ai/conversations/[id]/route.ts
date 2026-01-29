import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'

// 대화 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const conversation = await prisma.aiConversation.findFirst({
      where: { id, userId: session.user.id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!conversation) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: conversation })
  } catch (error) {
    console.error('Failed to fetch conversation:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch conversation' }, { status: 500 })
  }
}

// 대화에 메시지 추가
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { messages, title } = await request.json()

    // 권한 확인
    const existing = await prisma.aiConversation.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }

    // 메시지 추가 및 제목 업데이트
    const updates: Parameters<typeof prisma.aiConversation.update>[0]['data'] = {
      updatedAt: new Date(),
    }

    if (title) {
      updates.title = title
    }

    if (messages && messages.length > 0) {
      updates.messages = {
        create: messages.map((m: { role: string; content: string }) => ({
          role: m.role,
          content: m.content,
        })),
      }
    }

    const conversation = await prisma.aiConversation.update({
      where: { id },
      data: updates,
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    })

    return NextResponse.json({ success: true, data: conversation })
  } catch (error) {
    console.error('Failed to update conversation:', error)
    return NextResponse.json({ success: false, error: 'Failed to update conversation' }, { status: 500 })
  }
}

// 대화 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // 권한 확인
    const existing = await prisma.aiConversation.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }

    await prisma.aiConversation.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete conversation:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete conversation' }, { status: 500 })
  }
}
