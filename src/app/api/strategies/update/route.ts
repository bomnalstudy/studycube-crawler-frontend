import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rename, readdir } from 'fs/promises'
import { join } from 'path'

// 전략 이름 수정
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { strategyId, newName } = body

    if (!strategyId || !newName) {
      return NextResponse.json(
        { success: false, error: 'strategyId와 newName이 필요합니다' },
        { status: 400 }
      )
    }

    // 데이터베이스에서 전략 업데이트
    const strategy = await prisma.strategy.update({
      where: { id: strategyId },
      data: { name: newName },
      include: {
        branches: {
          include: {
            branch: true
          }
        }
      }
    })

    // 파일 시스템에서 파일 이름 변경 (모든 지점 폴더에서)
    try {
      const strategiesDir = join(process.cwd(), 'strategies')

      // 각 지점 폴더에서 파일 이름 변경
      for (const sb of strategy.branches) {
        const branchName = sb.branch.name
        const branchDir = join(strategiesDir, branchName)

        try {
          // 해당 지점 폴더에서 전략 ID를 포함한 파일 찾기
          const files = await readdir(branchDir)
          const oldFile = files.find(f => f.includes(strategyId) || f.endsWith('.json'))

          if (oldFile) {
            const timestamp = Date.now()
            const newFileName = `${newName.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_${timestamp}.json`
            const oldPath = join(branchDir, oldFile)
            const newPath = join(branchDir, newFileName)

            await rename(oldPath, newPath)
          }
        } catch (branchError) {
          console.error(`Failed to rename file in ${branchName}:`, branchError)
        }
      }
    } catch (fsError) {
      console.error('Failed to rename strategy files:', fsError)
      // 파일 이름 변경 실패해도 DB 업데이트는 성공
    }

    return NextResponse.json({
      success: true,
      data: strategy
    })
  } catch (error) {
    console.error('Failed to update strategy:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update strategy'
      },
      { status: 500 }
    )
  }
}
