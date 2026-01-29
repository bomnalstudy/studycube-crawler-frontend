/**
 * 스터디큐브 포인트 지급 자동화 스크립트
 * 실행: npx tsx scripts/test-studycube-login.ts
 */

import puppeteer, { Browser, Page } from 'puppeteer'

const STUDYCUBE_URL = 'https://sensibility.studycube.kr/user/userLogin.jspx'

// 포인트 지급 대상 타입
interface PointTarget {
  phone: string
  amount: number
  memo?: string
}

// 로그인 정보 타입
interface LoginCredentials {
  username: string
  password: string
}

// 포인트 지급 결과 타입
interface PointGrantResult {
  phone: string
  success: boolean
  message: string
}

// ===== 헬퍼 함수들 =====

// 요소가 나타날 때까지 폴링 대기 (최대 timeout ms)
async function waitForXPath(page: Page, xpath: string, timeout = 4000, interval = 200): Promise<boolean> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    const elements = await page.$$(`xpath/${xpath}`)
    if (elements.length > 0) {
      return true
    }
    await new Promise(resolve => setTimeout(resolve, interval))
  }

  return false
}

// XPath로 요소 클릭 (요소 나타날 때까지 대기 후 클릭)
async function clickByXPath(page: Page, xpath: string, description: string, timeout = 4000) {
  console.log(`  ${description} 대기 중...`)

  const found = await waitForXPath(page, xpath, timeout)
  if (!found) {
    throw new Error(`요소를 찾을 수 없음 (${timeout}ms 초과): ${xpath}`)
  }

  console.log(`  ${description} 클릭`)
  const elements = await page.$$(`xpath/${xpath}`)
  await elements[0].click()
  await new Promise(resolve => setTimeout(resolve, 500))
}

// XPath로 요소에 텍스트 입력 (요소 나타날 때까지 대기 후 입력)
async function typeByXPath(page: Page, xpath: string, text: string, description: string, timeout = 4000) {
  console.log(`  ${description} 대기 중...`)

  const found = await waitForXPath(page, xpath, timeout)
  if (!found) {
    throw new Error(`요소를 찾을 수 없음 (${timeout}ms 초과): ${xpath}`)
  }

  console.log(`  ${description} 입력: ${text}`)
  const elements = await page.$$(`xpath/${xpath}`)
  await elements[0].click()
  await elements[0].type(text)
}

// 입력창 초기화
async function clearInput(page: Page, xpath: string) {
  const elements = await page.$$(`xpath/${xpath}`)
  if (elements.length > 0) {
    await elements[0].click()
    await elements[0].evaluate((el) => {
      (el as HTMLInputElement).value = ''
    })
  }
}

// ===== 메인 로직 =====

// 로그인
async function login(page: Page, credentials: LoginCredentials): Promise<boolean> {
  console.log('\n=== 로그인 ===')
  console.log(`  URL: ${STUDYCUBE_URL}`)
  console.log(`  Username: ${credentials.username}`)

  await page.goto(STUDYCUBE_URL, { waitUntil: 'networkidle2' })

  // 아이디 입력
  await page.waitForSelector('#userid', { timeout: 10000 })
  await page.type('#userid', credentials.username)

  // 비밀번호 입력
  await page.type('#password', credentials.password)

  // 로그인 버튼 클릭
  await page.click('#btn_submit')

  // 페이지 이동 대기
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 })

  // 로그인 성공 여부 확인
  const currentUrl = page.url()
  const success = !currentUrl.includes('userLogin')

  if (success) {
    console.log('  로그인 성공')
  } else {
    console.log('  로그인 실패')
  }

  return success
}

// 사용자 관리 페이지로 이동
async function navigateToUserManagement(page: Page) {
  console.log('\n=== 사용자 관리 페이지로 이동 ===')

  // 1. 사용자관리 탭 클릭
  await clickByXPath(page, '//*[@id="ui-id-14"]', '사용자관리 탭')

  // 2. 숨겨진 메뉴에서 "사용자 관리" 클릭
  await clickByXPath(page, '//*[@id="ui-id-15"]/li[1]/a', '사용자 관리 메뉴')

  // 페이지 로드 대기
  await new Promise(resolve => setTimeout(resolve, 2000))
  console.log('  사용자 관리 페이지 이동 완료')
}

// 사용자 검색
async function searchUser(page: Page, phone: string): Promise<boolean> {
  console.log(`\n=== 사용자 검색: ${phone} ===`)

  // 입력창 초기화 (이전 검색어 지우기)
  const inputXPath = '//*[@id="frm"]/section/div[1]/div/article/div[3]/p/input'
  await clearInput(page, inputXPath)

  // 전화번호 입력
  await typeByXPath(page, inputXPath, phone, '전화번호 입력창')

  // 조회 버튼 클릭
  await clickByXPath(page, '//*[@id="btn_search"]', '조회 버튼')

  // 검색 결과 대기
  await new Promise(resolve => setTimeout(resolve, 2000))

  // 검색 결과 확인 (고객 아이디 링크가 있는지)
  const resultXPath = '//*[@id="simple-table"]/tbody/tr[1]/td[2]/a'
  const hasResult = await waitForXPath(page, resultXPath, 3000)

  if (hasResult) {
    console.log('  검색 결과 있음')
    return true
  } else {
    console.log('  검색 결과 없음')
    return false
  }
}

// 단일 고객에게 포인트 지급
async function grantPointToUser(
  browser: Browser,
  mainPage: Page,
  target: PointTarget
): Promise<PointGrantResult> {
  console.log(`\n=== 포인트 지급: ${target.phone} (${target.amount}P) ===`)

  try {
    // 1. 사용자 검색
    const found = await searchUser(mainPage, target.phone)
    if (!found) {
      return { phone: target.phone, success: false, message: '사용자를 찾을 수 없음' }
    }

    // 2. 고객 아이디 클릭 (새 탭 열림)
    const customerLinkXPath = '//*[@id="simple-table"]/tbody/tr[1]/td[2]/a'

    // 새 탭 열림 대기를 위한 설정
    const newPagePromise = new Promise<Page>((resolve) => {
      browser.once('targetcreated', async (target) => {
        const newPage = await target.page()
        if (newPage) resolve(newPage)
      })
    })

    await clickByXPath(mainPage, customerLinkXPath, '고객 아이디 클릭')

    // 새 탭 대기
    console.log('  새 탭 대기 중...')
    const detailPage = await newPagePromise
    await detailPage.setViewport({ width: 1280, height: 800 })
    await new Promise(resolve => setTimeout(resolve, 2000))
    console.log('  고객 상세 페이지 열림')

    // 3. 포인트 적립 버튼 클릭
    await clickByXPath(detailPage, '//*[@id="btn_point"]', '포인트 적립 버튼')
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 4. 포인트 입력
    await typeByXPath(detailPage, '//*[@id="point"]', String(target.amount), '포인트 금액')

    // 5. 메모 입력 (선택)
    if (target.memo) {
      await typeByXPath(detailPage, '//*[@id="memo"]', target.memo, '포인트 설명')
    }

    // 6. 등록 버튼 클릭
    await clickByXPath(detailPage, '//*[@id="btn_reg_hidden"]', '등록 버튼')
    await new Promise(resolve => setTimeout(resolve, 1500))

    // 7. 새 탭 닫기
    await detailPage.close()
    console.log('  상세 페이지 닫음')

    // 원래 탭으로 포커스 (mainPage는 이미 참조 유지됨)
    await mainPage.bringToFront()

    return { phone: target.phone, success: true, message: `${target.amount}P 지급 완료` }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`  포인트 지급 실패: ${errorMessage}`)
    return { phone: target.phone, success: false, message: errorMessage }
  }
}

// 여러 고객에게 포인트 일괄 지급
async function grantPointsToMultipleUsers(
  credentials: LoginCredentials,
  targets: PointTarget[]
): Promise<PointGrantResult[]> {
  console.log('====================================')
  console.log('스터디큐브 포인트 지급 자동화 시작')
  console.log(`대상 인원: ${targets.length}명`)
  console.log('====================================')

  const results: PointGrantResult[] = []

  const browser = await puppeteer.launch({
    headless: false, // 테스트용으로 브라우저 표시
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const mainPage = await browser.newPage()
    await mainPage.setViewport({ width: 1280, height: 800 })

    // 로그인
    const loggedIn = await login(mainPage, credentials)
    if (!loggedIn) {
      throw new Error('로그인 실패')
    }

    // 사용자 관리 페이지로 이동 (최초 1회)
    await navigateToUserManagement(mainPage)

    // 각 대상에게 포인트 지급
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i]
      console.log(`\n[${i + 1}/${targets.length}] 처리 중...`)

      const result = await grantPointToUser(browser, mainPage, target)
      results.push(result)

      // 다음 검색을 위한 짧은 대기
      if (i < targets.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

  } catch (error) {
    console.error('자동화 실행 중 오류:', error)
  } finally {
    await browser.close()
    console.log('\n브라우저 종료')
  }

  // 결과 요약
  console.log('\n====================================')
  console.log('포인트 지급 결과 요약')
  console.log('====================================')
  const successCount = results.filter(r => r.success).length
  const failCount = results.filter(r => !r.success).length
  console.log(`성공: ${successCount}건, 실패: ${failCount}건`)

  results.forEach(r => {
    const status = r.success ? '성공' : '실패'
    console.log(`  [${status}] ${r.phone}: ${r.message}`)
  })

  return results
}

// ===== 테스트 실행 =====

// 테스트용 설정
const TEST_CREDENTIALS: LoginCredentials = {
  username: 'sensibility_admin',
  password: '1234',
}

const TEST_TARGETS: PointTarget[] = [
  { phone: '01012345678', amount: 1000, memo: '테스트 포인트 지급' },
  // 추가 대상은 여기에...
]

// 실행
grantPointsToMultipleUsers(TEST_CREDENTIALS, TEST_TARGETS)
