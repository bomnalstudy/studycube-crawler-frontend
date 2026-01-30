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

async function waitForXPath(page: Page, xpath: string, timeout = 3000, interval = 100): Promise<boolean> {
  const startTime = Date.now()
  while (Date.now() - startTime < timeout) {
    const elements = await page.$$(`xpath/${xpath}`)
    if (elements.length > 0) return true
    await new Promise(resolve => setTimeout(resolve, interval))
  }
  return false
}

async function clickByXPath(page: Page, xpath: string, timeout = 4000) {
  const startTime = Date.now()
  while (Date.now() - startTime < timeout) {
    const elements = await page.$$(`xpath/${xpath}`)
    if (elements.length > 0) {
      try {
        // JavaScript로 직접 클릭 (더 안정적)
        await elements[0].evaluate((el) => {
          (el as HTMLElement).click()
        })
        await new Promise(resolve => setTimeout(resolve, 200))
        return
      } catch {
        // 클릭 실패시 잠시 대기 후 재시도
        await new Promise(resolve => setTimeout(resolve, 150))
      }
    } else {
      await new Promise(resolve => setTimeout(resolve, 150))
    }
  }
  throw new Error(`요소를 찾을 수 없거나 클릭 불가: ${xpath}`)
}

async function typeByXPath(page: Page, xpath: string, text: string, timeout = 4000) {
  const found = await waitForXPath(page, xpath, timeout)
  if (!found) throw new Error(`요소를 찾을 수 없음: ${xpath}`)
  const elements = await page.$$(`xpath/${xpath}`)
  // 한 번에 값 설정 (타이핑 대신)
  await elements[0].evaluate((el, value) => {
    (el as HTMLInputElement).value = value
  }, text)
}

async function clearInput(page: Page, xpath: string) {
  const found = await waitForXPath(page, xpath, 3000)
  if (found) {
    const elements = await page.$$(`xpath/${xpath}`)
    // evaluate로 직접 값 비우기 (클릭 없이)
    await elements[0].evaluate((el) => {
      (el as HTMLInputElement).value = ''
    })
  }
}

// ===== 스터디큐브 자동화 =====

async function loginToStudycube(page: Page, username: string, password: string): Promise<boolean> {
  console.log(`로그인 시도: ${username}`)

  try {
    await page.goto('https://sensibility.studycube.kr/user/userLogin.jspx', { waitUntil: 'networkidle2' })
    await page.waitForSelector('#userid', { timeout: 10000 })

    // 한 번에 값 설정 (타이핑 대신)
    await page.evaluate((user, pass) => {
      (document.getElementById('userid') as HTMLInputElement).value = user;
      (document.getElementById('password') as HTMLInputElement).value = pass;
    }, username, password)
    await page.click('#btn_submit')

    // URL 변경 폴링 (최대 10초)
    const startTime = Date.now()
    while (Date.now() - startTime < 10000) {
      await new Promise(resolve => setTimeout(resolve, 300))
      const currentUrl = page.url()
      if (!currentUrl.includes('userLogin')) {
        console.log('로그인 성공')
        return true
      }
    }

    console.log('로그인 실패')
    return false
  } catch (error) {
    console.error('로그인 오류:', error)
    throw error
  }
}

async function navigateToUserManagement(page: Page) {
  console.log('사용자 관리 페이지로 이동')

  // 페이지 로드 완료 후 메뉴가 준비될 때까지 대기 (headless에서 더 오래 필요)
  await new Promise(resolve => setTimeout(resolve, 1000))

  // 메인 메뉴 클릭
  await clickByXPath(page, '//*[@id="ui-id-14"]')

  // 서브메뉴가 펼쳐질 때까지 대기
  await new Promise(resolve => setTimeout(resolve, 500))

  // 서브메뉴 아이템 클릭
  await clickByXPath(page, '//*[@id="ui-id-15"]/li[1]/a')

  // 페이지 전환 완료 대기
  await new Promise(resolve => setTimeout(resolve, 1000))

  // 검색 버튼이 나타날 때까지 대기 (최대 5초, 나타나면 바로 진행)
  await waitForXPath(page, '//*[@id="btn_search"]', 5000)
}

async function searchUser(page: Page, phone: string): Promise<boolean> {
  const inputXPath = '//*[@id="frm"]/section/div[1]/div/article/div[3]/p/input'
  await clearInput(page, inputXPath)
  await typeByXPath(page, inputXPath, phone)
  await clickByXPath(page, '//*[@id="btn_search"]')

  // 검색 결과 로딩 대기 (테이블 갱신 시간 확보)
  await new Promise(resolve => setTimeout(resolve, 1500))

  // 검색 결과가 나타날 때까지 대기 (최대 4초)
  const resultXPath = '//*[@id="simple-table"]/tbody/tr[1]/td[2]/a'
  return await waitForXPath(page, resultXPath, 4000)
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
    // 포인트 버튼이 나타날 때까지 대기
    await waitForXPath(detailPage, '//*[@id="btn_point"]', 4000)

    await clickByXPath(detailPage, '//*[@id="btn_point"]')
    // 포인트 입력창이 나타날 때까지 대기
    await waitForXPath(detailPage, '//*[@id="point"]', 3000)

    await typeByXPath(detailPage, '//*[@id="point"]', String(amount))
    if (reason) {
      await typeByXPath(detailPage, '//*[@id="memo"]', reason)
    }

    await clickByXPath(detailPage, '//*[@id="btn_reg_hidden"]')
    await new Promise(resolve => setTimeout(resolve, 300))

    await detailPage.close()
    await mainPage.bringToFront()

    return { success: true, message: `${amount}P 지급 완료` }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`  [에러] ${phone}: ${message}`)
    return { success: false, message }
  }
}

// ===== 플로우 실행 =====

// 대상 고객 전화번호 리스트 가져오기
async function getTargetPhones(branchId: string, filterConfig: FilterConfig): Promise<string[]> {
  // 수동 모드: DB 조회 없이 입력된 전화번호 바로 사용
  if (filterConfig.targetMode === 'manual' && filterConfig.manualPhones?.length) {
    console.log('수동 모드: 입력된 전화번호 사용')
    return filterConfig.manualPhones
  }

  // 조건 모드: 우리 DB에서 조건에 맞는 고객 필터링
  console.log('조건 모드: DB에서 고객 필터링')

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

  const customers = await prisma.customer.findMany({
    where,
    select: { phone: true },
  })

  return customers.map(c => c.phone)
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

  const targetPhones = await getTargetPhones(flow.branchId, filterConfig)
  console.log(`대상 고객: ${targetPhones.length}명`)
  console.log(`전화번호 목록: ${targetPhones.join(', ')}`)

  if (targetPhones.length === 0) {
    console.log('대상 고객 없음')
    await sendCallback(flowId, { success: true, successCount: 0, failCount: 0, totalCount: 0 })
    return
  }

  // 로컬 테스트: HEADLESS=false npx tsx scripts/run-automation.ts
  const isHeadless = process.env.HEADLESS !== 'false'
  console.log(`브라우저 모드: ${isHeadless ? 'headless' : 'visible'}`)

  const browser = await puppeteer.launch({
    headless: isHeadless,
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

    for (const phone of targetPhones) {
      if (pointConfig) {
        const result = await grantPointToUser(
          browser,
          page,
          phone,
          pointConfig.amount,
          pointConfig.reason
        )

        // 로그 저장
        await prisma.pointActionLog.create({
          data: {
            flowId: flow.id,
            customerId: 'manual', // 수동 입력 모드
            phone: phone,
            action: pointConfig.action,
            amount: pointConfig.amount,
            reason: pointConfig.reason,
            status: result.success ? 'SUCCESS' : 'FAILED',
          },
        })

        if (result.success) {
          successCount++
          console.log(`  [성공] ${phone}: ${result.message}`)
        } else {
          failCount++
          console.log(`  [실패] ${phone}: ${result.message}`)
        }

        await new Promise(resolve => setTimeout(resolve, 300))
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
      totalCount: targetPhones.length,
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
