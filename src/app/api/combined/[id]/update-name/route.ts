import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rename } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name: newName } = body

    if (!newName || !newName.trim()) {
      return NextResponse.json(
        { success: false, error: '새 이름을 입력해주세요' },
        { status: 400 }
      )
    }

    // 기존 통합 분석 조회
    const combined = await prisma.combinedAnalysis.findUnique({
      where: { id },
      include: { branch: true }
    })

    if (!combined) {
      return NextResponse.json(
        { success: false, error: 'Combined analysis not found' },
        { status: 404 }
      )
    }

    const oldName = combined.name
    const branchName = combined.branch?.name || '전체지점'

    // 데이터베이스 업데이트
    const updated = await prisma.combinedAnalysis.update({
      where: { id },
      data: { name: newName.trim() }
    })

    // 파일 시스템의 파일 이름 변경
    try {
      const combinedDir = join(process.cwd(), 'combined')
      const branchDir = join(combinedDir, branchName)

      if (existsSync(branchDir)) {
        const oldFileName = `${oldName.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_${combined.createdAt.getTime()}.json`
        const newFileName = `${newName.trim().replace(/[^a-zA-Z0-9가-힣]/g, '_')}_${combined.createdAt.getTime()}.json`

        const oldFilePath = join(branchDir, oldFileName)
        const newFilePath = join(branchDir, newFileName)

        if (existsSync(oldFilePath)) {
          await rename(oldFilePath, newFilePath)
        }
      }
    } catch (fsError) {
      console.error('Failed to rename file:', fsError)
    }

    return NextResponse.json({
      success: true,
      data: updated
    })
  } catch (error) {
    console.error('Failed to update combined name:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update combined name' },
      { status: 500 }
    )
  }
}
