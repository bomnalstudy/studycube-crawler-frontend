/**
 * GitHub Actions에서 실행되는 자동화 스크립트
 *
 * 환경변수:
 * - FLOW_ID: 특정 플로우 ID (수동 실행 시)
 * - DATABASE_URL: DB 연결 문자열
 */

import { PrismaClient } from '@prisma/client'
import puppeteer, { Browser, Page } from 'puppeteer'

const prisma = new PrismaClient()

const VERCEL_URL = process.env.VERCEL_URL || process.env.NEXTAUTH_URL || ''
const CALLBACK_SECRET = process.env.AUTOMATION_CALLBACK_SECRET || ''

// ===== 콜백 함수 =====

async function sendCallback(
  flowId: string,
  result: {
    success: boolean
    successCount?: number
    failCount?: number
    totalCount?: number
    errorMessage?: string
  }
) {
  if (!VERCEL_URL || !CALLBACK_SECRET) {
    console.log('콜백 설정 없음, 스킵')
    return
  }

  try {
    const url = `${VERCEL_URL}/api/crm/automation/flows/${flowId}/callback`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CALLBACK_SECRET}`,
      },
      body: JSON.stringify({
        ...result,
        executedAt: new Date().toISOString(),
      }),
    })

    if (response.ok) {
      console.log('콜백 전송 성공')
    } else {
      console.error('콜백 전송 실패:', await response.text())
    }
  } catch (error) {
    console.error('콜백 전송 오류:', error)
  }
}

// ===== 타입 정의 =====

interface FilterConfig {
  targetMode?: 'condition' | 'manual'
  manualPhones?: string[]
  visitSegments?: string[]
  ticketSegments?: string[]
  ageGroups?: string[]
  genders?: string[]
  minVisits?: number
  maxVisits?: number
  inactiveDays?: number
}

interface PointConfig {
  action: 'GRANT' | 'DEDUCT'
  amount: number
  reason: string
  expiryDays: number
}

interface TriggerConfig {
  type: 'scheduled' | 'recurring' | 'manual'
  time?: string
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'custom'
    endDate?: string
  }
}

// ===== Puppeteer 헬퍼 함수 =====

async function waitForXPath(page: Page, xpath: string, timeout = 4000, interval = 200): Promise<boolean> {
  const startTime = Date.now()
  while (Date.now() - startTime < timeout) {
    const elements = await page.$$(`xpath/${xpath}`)
    if (elements.length > 0) return true
    await new Promise(resolve => setTimeout(resolve, interval))
  }
  return false
}

async function clickByXPath(page: Page, xpath: string, timeout = 4000) {
  const found = await waitForXPath(page, xpath, timeout)
  if (!found) throw new Error(`요소를 찾을 수 없음: ${xpath}`)
  const elements = await page.$$(`xpath/${xpath}`)
  await elements[0].click()
  await new Promise(resolve => setTimeout(resolve, 500))
}

async function typeByXPath(page: Page, xpath: string, text: string, timeout = 4000) {
  const found = await waitForXPath(page, xpath, timeout)
  if (!found) throw new Error(`요소를 찾을 수 없음: ${xpath}`)
  const elements = await page.$$(`xpath/${xpath}`)
  await elements[0].click()
  await elements[0].type(text)
}

async function clearInput(page: Page, xpath: string) {
  const elements = await page.$$(`xpath/${xpath}`)
  if (elements.length > 0) {
    await elements[0].click()
    await elements[0].evaluate((el) => {
      (el as HTMLInputElement).value = ''
    })
  }
}

// ===== 스터디큐브 자동화 =====

async function loginToStudycube(page: Page, username: string, password: string): Promise<boolean> {
  console.log(`로그인 시도: ${username}`)

  await page.goto('https://sensibility.studycube.kr/user/userLogin.jspx', { waitUntil: 'networkidle2' })
  await page.waitForSelector('#userid', { timeout: 10000 })
  await page.type('#userid', username)
  await page.type('#password', password)
  await page.click('#btn_submit')
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 })

  const currentUrl = page.url()
  const success = !currentUrl.includes('userLogin')
  console.log(success ? '로그인 성공' : '로그인 실패')
  return success
}

async function navigateToUserManagement(page: Page) {
  console.log('사용자 관리 페이지로 이동')
  await clickByXPath(page, '//*[@id="ui-id-14"]')
  await clickByXPath(page, '//*[@id="ui-id-15"]/li[1]/a')
  await new Promise(resolve => setTimeout(resolve, 2000))
}

async function searchUser(page: Page, phone: string): Promise<boolean> {
  const inputXPath = '//*[@id="frm"]/section/div[1]/div/article/div[3]/p/input'
  await clearInput(page, inputXPath)
  await typeByXPath(page, inputXPath, phone)
  await clickByXPath(page, '//*[@id="btn_search"]')
  await new Promise(resolve => setTimeout(resolve, 2000))

  const resultXPath = '//*[@id="simple-table"]/tbody/tr[1]/td[2]/a'
  return await waitForXPath(page, resultXPath, 3000)
}

async function grantPointToUser(
  browser: Browser,
  mainPage: Page,
  phone: string,
  amount: number,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  console.log(`포인트 지급: ${phone} → ${amount}P`)

  try {
    const found = await searchUser(mainPage, phone)
    if (!found) {
      return { success: false, message: '사용자를 찾을 수 없음' }
    }

    const customerLinkXPath = '//*[@id="simple-table"]/tbody/tr[1]/td[2]/a'
    const newPagePromise = new Promise<Page>((resolve) => {
      browser.once('targetcreated', async (target) => {
        const newPage = await target.page()
        if (newPage) resolve(newPage)
      })
    })

    await clickByXPath(mainPage, customerLinkXPath)
    const detailPage = await newPagePromise
    await detailPage.setViewport({ width: 1280, height: 800 })
    await new Promise(resolve => setTimeout(resolve, 2000))

    await clickByXPath(detailPage, '//*[@id="btn_point"]')
    await new Promise(resolve => setTimeout(resolve, 1000))

    await typeByXPath(detailPage, '//*[@id="point"]', String(amount))
    if (reason) {
      await typeByXPath(detailPage, '//*[@id="memo"]', reason)
    }

    await clickByXPath(detailPage, '//*[@id="btn_reg_hidden"]')
    await new Promise(resolve => setTimeout(resolve, 1500))

    await detailPage.close()
    await mainPage.bringToFront()

    return { success: true, message: `${amount}P 지급 완료` }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, message }
  }
}

// ===== 플로우 실행 =====

async function getTargetCustomers(branchId: string, filterConfig: FilterConfig) {
  if (filterConfig.targetMode === 'manual' && filterConfig.manualPhones?.length) {
    return await prisma.customer.findMany({
      where: { mainBranchId: branchId, phone: { in: filterConfig.manualPhones } },
      select: { id: true, phone: true },
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { mainBranchId: branchId }

  if (filterConfig.ageGroups?.length) where.ageGroup = { in: filterConfig.ageGroups }
  if (filterConfig.genders?.length) where.gender = { in: filterConfig.genders }
  if (filterConfig.minVisits !== undefined) where.totalVisits = { ...where.totalVisits, gte: filterConfig.minVisits }
  if (filterConfig.maxVisits !== undefined) where.totalVisits = { ...where.totalVisits, lte: filterConfig.maxVisits }
  if (filterConfig.inactiveDays !== undefined) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - filterConfig.inactiveDays)
    where.lastVisitDate = { lt: cutoffDate }
  }

  return await prisma.customer.findMany({
    where,
    select: { id: true, phone: true },
  })
}

async function executeFlow(flowId: string) {
  console.log(`\n========== 플로우 실행: ${flowId} ==========`)

  const flow = await prisma.automationFlow.findUnique({
    where: { id: flowId },
    include: { branch: true },
  })

  if (!flow) {
    console.error('플로우를 찾을 수 없음')
    await sendCallback(flowId, { success: false, errorMessage: '플로우를 찾을 수 없음' })
    return
  }

  if (!flow.studycubeUsername || !flow.studycubePassword) {
    console.error('스터디큐브 로그인 정보 없음')
    await sendCallback(flowId, { success: false, errorMessage: '스터디큐브 로그인 정보 없음' })
    return
  }

  const filterConfig = flow.filterConfig as unknown as FilterConfig
  const pointConfig = flow.pointConfig as unknown as PointConfig | null

  if (!pointConfig && (flow.flowType === 'POINT' || flow.flowType === 'SMS_POINT')) {
    console.error('포인트 설정 없음')
    await sendCallback(flowId, { success: false, errorMessage: '포인트 설정 없음' })
    return
  }

  const targets = await getTargetCustomers(flow.branchId, filterConfig)
  console.log(`대상 고객: ${targets.length}명`)

  if (targets.length === 0) {
    console.log('대상 고객 없음')
    await sendCallback(flowId, { success: true, successCount: 0, failCount: 0, totalCount: 0 })
    return
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 800 })

    const loggedIn = await loginToStudycube(page, flow.studycubeUsername, flow.studycubePassword)
    if (!loggedIn) {
      console.error('로그인 실패')
      await sendCallback(flowId, { success: false, errorMessage: '스터디큐브 로그인 실패' })
      return
    }

    await navigateToUserManagement(page)

    let successCount = 0
    let failCount = 0

    for (const target of targets) {
      if (pointConfig) {
        const result = await grantPointToUser(
          browser,
          page,
          target.phone,
          pointConfig.amount,
          pointConfig.reason
        )

        await prisma.pointActionLog.create({
          data: {
            flowId: flow.id,
            customerId: target.id,
            phone: target.phone,
            action: pointConfig.action,
            amount: pointConfig.amount,
            reason: pointConfig.reason,
            status: result.success ? 'SUCCESS' : 'FAILED',
          },
        })

        if (result.success) {
          successCount++
          console.log(`  [성공] ${target.phone}: ${result.message}`)
        } else {
          failCount++
          console.log(`  [실패] ${target.phone}: ${result.message}`)
        }

        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    await prisma.automationFlow.update({
      where: { id: flowId },
      data: { lastExecutedAt: new Date() },
    })

    console.log(`\n결과: 성공 ${successCount}건, 실패 ${failCount}건`)

    // 성공 콜백
    await sendCallback(flowId, {
      success: true,
      successCount,
      failCount,
      totalCount: targets.length,
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('실행 중 오류:', errorMessage)

    // 실패 콜백
    await sendCallback(flowId, {
      success: false,
      errorMessage,
    })
  } finally {
    await browser.close()
  }
}

function shouldRunNow(triggerConfig: TriggerConfig): boolean {
  if (triggerConfig.type === 'manual') return false

  const now = new Date()
  const kstHour = (now.getUTCHours() + 9) % 24

  // 설정된 시간과 현재 시간 비교 (정시 기준)
  if (triggerConfig.time) {
    const [hour] = triggerConfig.time.split(':').map(Number)
    if (hour !== kstHour) return false
  }

  // 반복 종료일 체크
  if (triggerConfig.recurring?.endDate) {
    const endDate = new Date(triggerConfig.recurring.endDate)
    if (now > endDate) return false
  }

  return true
}

async function runScheduledFlows() {
  console.log('스케줄된 플로우 실행 시작')
  console.log(`현재 시간 (KST): ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`)

  const activeFlows = await prisma.automationFlow.findMany({
    where: { isActive: true },
  })

  console.log(`활성화된 플로우: ${activeFlows.length}개`)

  for (const flow of activeFlows) {
    const triggerConfig = flow.triggerConfig as unknown as TriggerConfig

    if (shouldRunNow(triggerConfig)) {
      await executeFlow(flow.id)
    } else {
      console.log(`[스킵] ${flow.name} - 실행 시간 아님`)
    }
  }
}

// ===== 메인 =====

async function main() {
  try {
    const flowId = process.env.FLOW_ID

    if (flowId) {
      // 수동 실행: 특정 플로우만
      console.log('수동 실행 모드')
      await executeFlow(flowId)
    } else {
      // 크론 실행: 스케줄된 플로우들
      console.log('크론 실행 모드')
      await runScheduledFlows()
    }
  } catch (error) {
    console.error('자동화 실행 오류:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
