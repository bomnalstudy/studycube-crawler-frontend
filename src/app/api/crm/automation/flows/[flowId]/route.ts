export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession } from '@/lib/auth-helpers'

interface RouteParams {
  params: Promise<{ flowId: string }>
}

// GET: 플로우 상세 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getAuthSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { flowId } = await params

    const flow = await prisma.automationFlow.findUnique({
      where: { id: flowId },
      include: {
        branch: { select: { id: true, name: true } },
        author: { select: { id: true, name: true } },
        _count: { select: { sendLogs: true, pointLogs: true } },
      },
    })

    if (!flow) {
      return NextResponse.json({ success: false, error: '플로우를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 지점 계정은 자기 지점만
    if (session.user.role !== 'ADMIN' && session.user.branchId !== flow.branchId) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 })
    }

    return NextResponse.json({ success: true, data: flow })
  } catch (error) {
    console.error('GET /api/automation/flows/[flowId] error:', error)
    return NextResponse.json({ success: false, error: '플로우 조회 실패' }, { status: 500 })
  }
}

// PATCH: 플로우 수정
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getAuthSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { flowId } = await params
    const body = await request.json()

    const existing = await prisma.automationFlow.findUnique({
      where: { id: flowId },
    })

    if (!existing) {
      return NextResponse.json({ success: false, error: '플로우를 찾을 수 없습니다.' }, { status: 404 })
    }

    if (session.user.role !== 'ADMIN' && session.user.branchId !== existing.branchId) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 })
    }

    const { name, flowType, isActive, triggerConfig, filterConfig, messageTemplate, messageType, pointConfig } = body

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (flowType !== undefined) updateData.flowType = flowType
    if (isActive !== undefined) updateData.isActive = isActive
    if (triggerConfig !== undefined) updateData.triggerConfig = triggerConfig
    if (filterConfig !== undefined) updateData.filterConfig = filterConfig
    if (messageTemplate !== undefined) updateData.messageTemplate = messageTemplate
    if (messageType !== undefined) updateData.messageType = messageType
    if (pointConfig !== undefined) updateData.pointConfig = pointConfig

    const flow = await prisma.automationFlow.update({
      where: { id: flowId },
      data: updateData,
      include: {
        branch: { select: { id: true, name: true } },
        author: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ success: true, data: flow })
  } catch (error) {
    console.error('PATCH /api/automation/flows/[flowId] error:', error)
    return NextResponse.json({ success: false, error: '플로우 수정 실패' }, { status: 500 })
  }
}

// DELETE: 플로우 삭제
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getAuthSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { flowId } = await params

    const existing = await prisma.automationFlow.findUnique({
      where: { id: flowId },
    })

    if (!existing) {
      return NextResponse.json({ success: false, error: '플로우를 찾을 수 없습니다.' }, { status: 404 })
    }

    if (session.user.role !== 'ADMIN' && session.user.branchId !== existing.branchId) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 })
    }

    await prisma.automationFlow.delete({ where: { id: flowId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/automation/flows/[flowId] error:', error)
    return NextResponse.json({ success: false, error: '플로우 삭제 실패' }, { status: 500 })
  }
}
