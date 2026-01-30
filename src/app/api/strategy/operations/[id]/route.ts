import { NextRequest, NextResponse } from 'next/server'
import type { OperationDetail, UpdateOperationInput } from '@/types/strategy'

// 임시 더미 데이터
const DUMMY_OPERATIONS: Record<string, OperationDetail> = {
  '1': {
    id: '1',
    name: '프리미엄 좌석 도입',
    subType: 'NEW_SERVICE',
    implementedAt: '2025-01-15',
    status: 'IMPLEMENTED',
    branches: [{ id: '1', name: '강남점' }],
    createdAt: '2025-01-10',
    cost: 5000000,
    description: '고급 의자와 개인 조명을 갖춘 프리미엄 좌석 10석 도입',
    expectedEffect: '객단가 10% 상승, 프리미엄 고객 유치',
    createdBy: { id: '1', name: '관리자' },
  },
  '2': {
    id: '2',
    name: '조명 시스템 개선',
    subType: 'FACILITY_UPGRADE',
    implementedAt: '2025-02-01',
    status: 'PLANNED',
    branches: [
      { id: '1', name: '강남점' },
      { id: '2', name: '홍대점' },
    ],
    createdAt: '2025-01-20',
    cost: 3000000,
    description: 'LED 조명으로 교체 및 개인 조명 조절 기능 추가',
    expectedEffect: '전력 비용 절감, 고객 만족도 향상',
    createdBy: { id: '1', name: '관리자' },
  },
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const operation = DUMMY_OPERATIONS[id]

    if (!operation) {
      return NextResponse.json({ error: '운영 변경을 찾을 수 없습니다' }, { status: 404 })
    }

    return NextResponse.json({ operation })
  } catch (error) {
    console.error('Error fetching operation:', error)
    return NextResponse.json({ error: 'Failed to fetch operation' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body: UpdateOperationInput = await request.json()

    const operation = DUMMY_OPERATIONS[id]

    if (!operation) {
      return NextResponse.json({ error: '운영 변경을 찾을 수 없습니다' }, { status: 404 })
    }

    // TODO: 실제 DB 업데이트 로직 구현
    // const updated = await prisma.operation.update({
    //   where: { id },
    //   data: body,
    // })

    const updatedOperation: OperationDetail = {
      ...operation,
      ...body,
      subType: body.subType || operation.subType,
    }

    return NextResponse.json({ operation: updatedOperation })
  } catch (error) {
    console.error('Error updating operation:', error)
    return NextResponse.json({ error: 'Failed to update operation' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const operation = DUMMY_OPERATIONS[id]

    if (!operation) {
      return NextResponse.json({ error: '운영 변경을 찾을 수 없습니다' }, { status: 404 })
    }

    // TODO: 실제 DB 삭제 로직 구현
    // await prisma.operation.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting operation:', error)
    return NextResponse.json({ error: 'Failed to delete operation' }, { status: 500 })
  }
}
