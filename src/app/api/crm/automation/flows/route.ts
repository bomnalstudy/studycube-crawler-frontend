export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, getBranchFilter } from '@/lib/auth-helpers'

// GET: 플로우 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get('branchId')
    const flowType = searchParams.get('flowType')
    const isActive = searchParams.get('isActive')

    const branchFilter = getBranchFilter(session, branchId)

    const where: Record<string, unknown> = { ...branchFilter }
    if (flowType) where.flowType = flowType
    if (isActive !== null && isActive !== undefined && isActive !== '') {
      where.isActive = isActive === 'true'
    }

    const flows = await prisma.automationFlow.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true } },
        author: { select: { id: true, name: true } },
        _count: { select: { sendLogs: true, pointLogs: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: flows })
  } catch (error) {
    console.error('GET /api/automation/flows error:', error)
    return NextResponse.json({ success: false, error: '플로우 목록 조회 실패' }, { status: 500 })
  }
}

// POST: 플로우 생성
export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, flowType, branchId, triggerConfig, filterConfig, messageTemplate, messageType, pointConfig } = body

    if (!name || !flowType || !branchId || !triggerConfig || !filterConfig) {
      return NextResponse.json({ success: false, error: '필수 항목이 누락되었습니다.' }, { status: 400 })
    }

    // 지점 계정은 자기 지점만 생성 가능
    if (session.user.role !== 'ADMIN' && session.user.branchId !== branchId) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 })
    }

    const flow = await prisma.automationFlow.create({
      data: {
        name,
        flowType,
        branchId,
        isActive: false,
        triggerConfig,
        filterConfig,
        messageTemplate: messageTemplate || null,
        messageType: messageType || null,
        pointConfig: pointConfig || null,
        createdBy: session.user.id,
      },
      include: {
        branch: { select: { id: true, name: true } },
        author: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ success: true, data: flow }, { status: 201 })
  } catch (error) {
    console.error('POST /api/automation/flows error:', error)
    return NextResponse.json({ success: false, error: '플로우 생성 실패' }, { status: 500 })
  }
}
