import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'

// 대화 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // 지점 필터 (쿼리 파라미터)
    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get('branchId')

    // 지점별 필터링: 'all'이면 branchId가 null인 것도 포함
    const branchFilter = branchId && branchId !== 'all'
      ? { branchId }
      : {} // 전체 조회

    const conversations = await prisma.aiConversation.findMany({
      where: { userId: session.user.id, ...branchFilter },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        branchId: true,
        createdAt: true,
        updatedAt: true,
        messages: {
          take: 1,
          orderBy: { createdAt: 'asc' },
          select: { content: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: conversations.map(c => ({
        ...c,
        preview: c.messages[0]?.content?.slice(0, 50) || '',
      })),
    })
  } catch (error) {
    console.error('Failed to fetch conversations:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch conversations' }, { status: 500 })
  }
}

// 새 대화 생성
export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { branchId, title, messages } = await request.json()

    const conversation = await prisma.aiConversation.create({
      data: {
        userId: session.user.id,
        branchId: branchId || null,
        title: title || '새 대화',
        messages: {
          create: messages?.map((m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content,
          })) || [],
        },
      },
      include: { messages: true },
    })

    return NextResponse.json({ success: true, data: conversation })
  } catch (error) {
    console.error('Failed to create conversation:', error)
    return NextResponse.json({ success: false, error: 'Failed to create conversation' }, { status: 500 })
  }
}
