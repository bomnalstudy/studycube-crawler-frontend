import { NextRequest, NextResponse } from 'next/server'
import { rename } from 'fs/promises'
import { join } from 'path'

// 폴더(지점) 이름 변경
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

    // 파일 시스템에서 폴더 이름 변경
    try {
      const campaignsDir = join(process.cwd(), 'campaigns')
      const oldPath = join(campaignsDir, oldBranchName)
      const newPath = join(campaignsDir, newBranchName)

      await rename(oldPath, newPath)

      return NextResponse.json({
        success: true,
        message: '폴더 이름이 변경되었습니다'
      })
    } catch (fsError) {
      console.error('Failed to rename folder:', fsError)
      return NextResponse.json(
        { success: false, error: '폴더 이름 변경에 실패했습니다' },
        { status: 500 }
      )
    }
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
