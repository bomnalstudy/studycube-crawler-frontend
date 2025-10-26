import { NextRequest, NextResponse } from 'next/server'
import { rename } from 'fs/promises'
import { join } from 'path'

// 전략 폴더 이름 변경
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { oldBranchName, newBranchName } = body

    if (!oldBranchName || !newBranchName) {
      return NextResponse.json(
        { success: false, error: 'oldBranchName과 newBranchName이 필요합니다' },
        { status: 400 }
      )
    }

    const strategiesDir = join(process.cwd(), 'strategies')
    const oldPath = join(strategiesDir, oldBranchName)
    const newPath = join(strategiesDir, newBranchName)

    await rename(oldPath, newPath)

    return NextResponse.json({
      success: true,
      message: '폴더 이름이 변경되었습니다'
    })
  } catch (error) {
    console.error('Failed to rename folder:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to rename folder'
      },
      { status: 500 }
    )
  }
}
