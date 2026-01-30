export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession } from '@/lib/auth-helpers'
import { spawn } from 'child_process'
import path from 'path'

interface RouteParams {
  params: Promise<{ flowId: string }>
}

const isLocal = process.env.NODE_ENV === 'development'

// 로컬에서 직접 크롤링 스크립트 실행
function runLocalAutomation(flowId: string): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve) => {
    console.log('[Local] 크롤링 스크립트 실행:', flowId)

    const scriptPath = path.join(process.cwd(), 'scripts', 'run-automation.ts')
    const child = spawn('npx', ['tsx', scriptPath], {
      env: {
        ...process.env,
        FLOW_ID: flowId,
        HEADLESS: 'false', // 로컬에서는 브라우저 보이게
      },
      shell: true,
      stdio: 'inherit', // 로그 출력 보이게
    })

    child.on('error', (err) => {
      console.error('[Local] 스크립트 실행 에러:', err)
    })

    child.on('exit', (code) => {
      console.log('[Local] 스크립트 종료, exit code:', code)
    })

    // 바로 응답 (백그라운드에서 실행됨)
    resolve({
      success: true,
      message: '로컬에서 크롤링이 시작되었습니다. 브라우저 창을 확인하세요.',
    })
  })
}

// GitHub API로 워크플로우 트리거
async function triggerGitHubWorkflow(flowId: string): Promise<{ success: boolean; message: string }> {
  const token = process.env.GITHUB_TOKEN
  const owner = process.env.GITHUB_OWNER
  const repo = process.env.GITHUB_REPO

  console.log('[GitHub Workflow] 환경 변수 확인:', {
    hasToken: !!token,
    tokenPrefix: token?.substring(0, 10) + '...',
    owner,
    repo,
  })

  if (!token || !owner || !repo) {
    return {
      success: false,
      message: `GitHub 설정이 없습니다. token: ${!!token}, owner: ${owner}, repo: ${repo}`,
    }
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/automation.yml/dispatches`
  console.log('[GitHub Workflow] 요청 URL:', url)

  try {
    const response = await fetch(
      url,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          ref: 'main',
          inputs: {
            flowId: flowId,
          },
        }),
      }
    )

    console.log('[GitHub Workflow] 응답 상태:', response.status)

    if (response.status === 204) {
      return { success: true, message: '워크플로우가 트리거되었습니다.' }
    } else {
      const error = await response.text()
      console.error('[GitHub Workflow] 오류 응답:', error)
      return { success: false, message: `GitHub API 오류 (${response.status}): ${error}` }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, message: `요청 실패: ${message}` }
  }
}

// POST: 플로우 수동 실행 (GitHub Actions 트리거)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getAuthSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { flowId } = await params

    // 플로우 조회
    const flow = await prisma.automationFlow.findUnique({
      where: { id: flowId },
    })

    if (!flow) {
      return NextResponse.json({ success: false, error: '플로우를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 권한 확인
    if (session.user.role !== 'ADMIN' && session.user.branchId !== flow.branchId) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 })
    }

    // 스터디큐브 로그인 정보 확인
    if (!flow.studycubeUsername || !flow.studycubePassword) {
      return NextResponse.json({
        success: false,
        error: '스터디큐브 로그인 정보가 설정되지 않았습니다.',
      }, { status: 400 })
    }

    // 로컬에서는 직접 실행, 프로덕션에서는 GitHub Actions
    const result = isLocal
      ? await runLocalAutomation(flowId)
      : await triggerGitHubWorkflow(flowId)

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          message: result.message,
          note: isLocal
            ? '브라우저 창에서 크롤링 과정을 확인하세요.'
            : 'GitHub Actions에서 실행 중입니다. 결과는 잠시 후 확인하세요.',
        },
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.message,
      }, { status: 500 })
    }

  } catch (error) {
    console.error('POST /api/automation/flows/[flowId]/execute error:', error)
    const errorMessage = error instanceof Error ? error.message : '플로우 실행 실패'
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}
