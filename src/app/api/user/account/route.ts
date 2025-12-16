import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

// 아이디/비밀번호 변경 스키마
const updateAccountSchema = z.object({
  newUsername: z.string().min(3, '아이디는 최소 3자 이상이어야 합니다').optional(),
  currentPassword: z.string().min(1, '현재 비밀번호를 입력해주세요'),
  newPassword: z.string().min(4, '새 비밀번호는 최소 4자 이상이어야 합니다').optional()
}).refine(
  (data) => data.newUsername || data.newPassword,
  { message: '변경할 아이디 또는 비밀번호를 입력해주세요' }
)

// 계정 정보 변경 (아이디/비밀번호)
export async function PATCH(request: NextRequest) {
  try {
    // 인증 확인
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // 입력 검증
    const parsed = updateAccountSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const { newUsername, currentPassword, newPassword } = parsed.data

    // 현재 사용자 조회
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 현재 비밀번호 확인
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password)
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: '현재 비밀번호가 일치하지 않습니다' },
        { status: 400 }
      )
    }

    // 아이디 변경 시 중복 체크
    if (newUsername && newUsername !== user.username) {
      const existingUser = await prisma.user.findUnique({
        where: { username: newUsername }
      })

      if (existingUser) {
        return NextResponse.json(
          { success: false, error: '이미 사용 중인 아이디입니다' },
          { status: 400 }
        )
      }
    }

    // 업데이트할 데이터 구성
    const updateData: { username?: string; password?: string } = {}

    if (newUsername && newUsername !== user.username) {
      updateData.username = newUsername
    }

    if (newPassword) {
      updateData.password = await bcrypt.hash(newPassword, 12)
    }

    // 변경사항이 없으면 에러
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: '변경할 내용이 없습니다' },
        { status: 400 }
      )
    }

    // 계정 정보 업데이트
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        role: true
      }
    })

    return NextResponse.json({
      success: true,
      message: '계정 정보가 변경되었습니다. 다시 로그인해주세요.',
      user: updatedUser
    })

  } catch (error) {
    console.error('Failed to update account:', error)
    return NextResponse.json(
      { success: false, error: '계정 정보 변경에 실패했습니다' },
      { status: 500 }
    )
  }
}

// 현재 계정 정보 조회
export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        branch: {
          select: {
            id: true,
            name: true
          }
        },
        createdAt: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      user
    })

  } catch (error) {
    console.error('Failed to get account info:', error)
    return NextResponse.json(
      { success: false, error: '계정 정보 조회에 실패했습니다' },
      { status: 500 }
    )
  }
}
