import { NextRequest, NextResponse } from 'next/server'
import type {
  CreateOperationInput,
  OperationListItem,
  OperationStatus,
} from '@/types/strategy'

// 임시 더미 데이터 (실제로는 DB에서 가져와야 함)
const DUMMY_OPERATIONS: OperationListItem[] = [
  {
    id: '1',
    name: '프리미엄 좌석 도입',
    subType: 'NEW_SERVICE',
    implementedAt: '2025-01-15',
    status: 'IMPLEMENTED',
    branches: [{ id: '1', name: '강남점' }],
    createdAt: '2025-01-10',
  },
  {
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
  },
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as OperationStatus | null
    const subType = searchParams.get('subType')
    const branchId = searchParams.get('branchId')

    let filteredOperations = [...DUMMY_OPERATIONS]

    // 필터 적용
    if (status) {
      filteredOperations = filteredOperations.filter((op) => op.status === status)
    }

    if (subType) {
      filteredOperations = filteredOperations.filter((op) => op.subType === subType)
    }

    if (branchId) {
      filteredOperations = filteredOperations.filter((op) =>
        op.branches.some((b) => b.id === branchId)
      )
    }

    // 적용일 기준 정렬 (최신순)
    filteredOperations.sort(
      (a, b) => new Date(b.implementedAt).getTime() - new Date(a.implementedAt).getTime()
    )

    return NextResponse.json({
      operations: filteredOperations,
      total: filteredOperations.length,
    })
  } catch (error) {
    console.error('Error fetching operations:', error)
    return NextResponse.json({ error: 'Failed to fetch operations' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateOperationInput = await request.json()

    // 유효성 검사
    if (!body.name || !body.subType || !body.implementedAt || !body.branchIds?.length) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다 (name, subType, implementedAt, branchIds)' },
        { status: 400 }
      )
    }

    // TODO: 실제 DB 저장 로직 구현
    // const operation = await prisma.operation.create({
    //   data: {
    //     ...body,
    //     status: 'PLANNED',
    //     createdById: session.user.id,
    //   },
    // })

    const newOperation: OperationListItem = {
      id: `${Date.now()}`,
      name: body.name,
      subType: body.subType,
      implementedAt: body.implementedAt,
      status: new Date(body.implementedAt) <= new Date() ? 'IMPLEMENTED' : 'PLANNED',
      branches: body.branchIds.map((id) => ({ id, name: `지점 ${id}` })),
      createdAt: new Date().toISOString(),
    }

    return NextResponse.json({ operation: newOperation }, { status: 201 })
  } catch (error) {
    console.error('Error creating operation:', error)
    return NextResponse.json({ error: 'Failed to create operation' }, { status: 500 })
  }
}
