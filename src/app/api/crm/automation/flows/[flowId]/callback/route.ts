export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ flowId: string }>
}

// POST: GitHub Actions에서 실행 결과 콜백
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // 간단한 인증 (환경 변수로 설정된 시크릿 확인)
    const authHeader = request.headers.get('Authorization')
    const expectedToken = `Bearer ${process.env.AUTOMATION_CALLBACK_SECRET}`

    if (!authHeader || authHeader !== expectedToken) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { flowId } = await params
    const body = await request.json()

    const {
      success,
      successCount,
      failCount,
      totalCount,
      errorMessage,
      executedAt,
    } = body

    // 플로우 존재 확인
    const flow = await prisma.automationFlow.findUnique({
      where: { id: flowId },
    })

    if (!flow) {
      return NextResponse.json({ success: false, error: '플로우를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 실행 결과 저장 (JSON 형태로 triggerConfig에 lastExecuteResult 추가)
    const currentTrigger = flow.triggerConfig as Record<string, unknown>
    const updatedTrigger = {
      ...currentTrigger,
      lastExecuteResult: {
        success,
        successCount: successCount || 0,
        failCount: failCount || 0,
        totalCount: totalCount || 0,
        errorMessage: errorMessage || null,
        executedAt: executedAt || new Date().toISOString(),
      },
    }

    await prisma.automationFlow.update({
      where: { id: flowId },
      data: {
        lastExecutedAt: new Date(executedAt || Date.now()),
        triggerConfig: updatedTrigger,
      },
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('POST /api/automation/flows/[flowId]/callback error:', error)
    return NextResponse.json({ success: false, error: '콜백 처리 실패' }, { status: 500 })
  }
}
