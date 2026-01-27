# 봄날의서재 스터디카페 통합 데이터 플랫폼

## 프로젝트 개요

**봄날의서재 스터디카페**를 위한 통합 자동화 및 데이터 분석 웹앱입니다.
매출 대시보드, 고객 관리, 마케팅 분석 등 운영에 필요한 다양한 도구를 하나의 플랫폼에서 제공합니다.

### 관련 프로젝트

| 프로젝트 | 목적 | 배포 |
|---------|------|------|
| **크롤링 앱** (`studycube-crawler`) | 데이터 수집 및 DB 저장 | GitHub Actions |
| **통합 플랫폼** (현재 프로젝트) | 데이터 시각화, 분석, 운영 도구 | Vercel |

### 플랫폼 구조 (통합 툴 카드 시스템)

로그인 후 홈 화면(`/`)에 **카드 형태**로 각 툴이 표시됩니다.
사용자는 카드를 클릭해 원하는 툴에 진입하며, 각 툴은 **완전히 독립된 섹션**으로 동작합니다.
새로운 툴이 추가될 때마다 홈 화면에 카드가 추가되는 구조입니다.

- 각 툴은 자체 사이드바 메뉴를 가짐 (대시보드 메뉴 ≠ CRM 메뉴)
- 사이드바에 "홈으로" 링크로 홈 카드 화면으로 복귀
- 홈(`/`)과 로그인(`/login`) 페이지에서는 사이드바 숨김
- 권한에 따라 접근 가능한 카드/데이터가 다름 (지점 계정은 자기 지점만, 관리자는 전체)

### 현재 등록된 툴

| 툴 | 경로 | 설명 | 상태 |
|------|------|------|------|
| **매출 대시보드** | `/dashboard` | 실시간 매출 지표, 이용권 분석, 시간대별 이용자, 비교 분석 | 운영 중 |
| **CRM 데이터** | `/crm` | 고객 세그먼트, 이탈위험 관리, 고객 리스트, 상세 이력, 메모/클레임 | 운영 중 |
| *(추가 예정)* | - | 운영 자동화, 알림, 리포트 등 | 예정 |

---

## 기술 스택

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS + 컴포넌트별 CSS 파일
- **UI**: shadcn/ui, Lucide Icons
- **Charts**: Recharts
- **DB**: Neon PostgreSQL + Prisma ORM
- **Auth**: NextAuth.js
- **배포**: Vercel

---

## 코드 작성 규칙 (필수)

### 1. 라이브러리 우선 활용

기능 구현 시 **오픈소스/라이브러리로 해결 가능한지 가장 먼저 확인**한다.
직접 구현하기 전에 npm에서 검증된 라이브러리가 있는지 탐색하고, 있다면 활용한다.

```
기능이 필요할 때 순서:
1. npm 라이브러리 검색 → 있으면 사용
2. shadcn/ui 컴포넌트 확인 → 있으면 사용
3. 직접 구현 (위 두 가지로 해결 불가능할 때만)
```

### 2. 파일 분리 원칙

**한 파일에 모든 로직을 몰아넣지 않는다.** 로직별로 파일을 분리하고 import하여 사용한다.

- 한 파일은 **500줄을 초과하지 않는다**
- 복잡도가 높으면 **300줄 이하** 권장
- 컴포넌트별로 **폴더를 만들어** 관련 파일을 모은다

**분리 기준:**
- 독립적인 기능/책임 단위
- 재사용 가능성이 있는 로직
- 커스텀 훅, 유틸 함수, 타입 정의 등

**나쁜 예:**
```tsx
// Dashboard.tsx (800줄) - 모든 로직이 한 파일에
export default function Dashboard() {
  // 데이터 fetch 200줄
  // 통계 계산 200줄
  // UI 렌더링 400줄
}
```

**좋은 예:**
```tsx
// Dashboard.tsx (100줄)
import { useDashboardData } from './useDashboardData'
import { calculateStats } from './calculateStats'
import { StatCards } from './StatCards'

export default function Dashboard() {
  const data = useDashboardData()
  const stats = calculateStats(data)
  return <StatCards stats={stats} />
}
```

### 3. CSS 작성 규칙

**인라인 CSS 절대 금지.**

CSS는 반드시 컴포넌트와 같은 폴더에 별도 파일로 분리한다.

```
금지:
<div style={{ color: 'red', padding: '10px' }}>

허용:
<div className="container">          ← Tailwind 클래스
<div className="my-component">       ← CSS 파일에서 정의
```

**CSS 파일 위치:**
```
components/
├── MetricsCard/
│   ├── MetricsCard.tsx
│   ├── MetricsCard.css         ← 같은 폴더에 위치
│   └── index.ts
```

**예외:**
- Tailwind CSS 클래스명은 인라인 사용 가능
- 동적 스타일은 CSS 변수 활용: `style={{ '--color': value } as React.CSSProperties}`
- 라이브러리가 요구하는 경우

### 4. TypeScript 엄격 사용

- 모든 함수와 컴포넌트에 명시적 타입 정의
- `any` 타입 최소화 (불가피한 경우 주석으로 사유 기재)
- API 응답 타입은 `src/types/`에 정의

### 5. 컴포넌트 설계

- **단일 책임 원칙**: 하나의 컴포넌트는 하나의 역할
- **공통 컴포넌트**는 `src/components/common/`에 배치
- **모듈 전용 컴포넌트**는 해당 모듈 폴더 안에 배치

### 6. 중복 코드 금지 (Utils 분리)

여러 컴포넌트에서 **중복 사용되는 로직은 `utils` 폴더에 별도 파일로 분리**하여 관리한다.
같은 코드를 여러 곳에 복사하지 않는다.

**분리 위치:**
- **여러 모듈에서 공통 사용** → `src/lib/utils/`
- **특정 모듈 내에서만 공통 사용** → 해당 모듈의 `utils/` 폴더

```
src/
├── lib/
│   └── utils/                    # 전역 공통 유틸
│       ├── formatters.ts         # 금액, 날짜 포맷 등
│       ├── dateUtils.ts          # 날짜 계산 로직
│       └── chartHelpers.ts       # 차트 공통 로직
├── components/
│   └── dashboard/
│       └── utils/                # 대시보드 모듈 전용 유틸
│           └── statsCalculator.ts
```

**나쁜 예:**
```tsx
// ComponentA.tsx
const formatRevenue = (value: number) => {
  if (value >= 10000) return `${(value / 10000).toFixed(0)}만원`
  return `${value.toLocaleString('ko-KR')}원`
}

// ComponentB.tsx (같은 함수를 또 작성)
const formatRevenue = (value: number) => {
  if (value >= 10000) return `${(value / 10000).toFixed(0)}만원`
  return `${value.toLocaleString('ko-KR')}원`
}
```

**좋은 예:**
```tsx
// lib/utils/formatters.ts
export const formatRevenue = (value: number) => {
  if (value >= 10000) return `${(value / 10000).toFixed(0)}만원`
  return `${value.toLocaleString('ko-KR')}원`
}

// ComponentA.tsx
import { formatRevenue } from '@/lib/utils/formatters'

// ComponentB.tsx
import { formatRevenue } from '@/lib/utils/formatters'
```

---

## 프로젝트 구조

```
src/
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # 루트 레이아웃
│   ├── page.tsx                      # 메인 대시보드
│   ├── login/                        # 로그인 페이지
│   ├── analytics/                    # 비교 분석 모듈
│   │   ├── campaigns/                # 광고 캠페인
│   │   ├── strategies/               # 지점 전략
│   │   ├── combined/                 # 통합 분석
│   │   └── customers/                # 고객 분석
│   └── api/                          # API Routes
│       ├── metrics/                  # 대시보드 지표 API
│       ├── campaigns/                # 캠페인 API
│       ├── strategies/               # 전략 API
│       ├── combined/                 # 통합 분석 API
│       ├── customer-analytics/       # 고객 분석 API
│       ├── branches/                 # 지점 API
│       ├── export/                   # 데이터 내보내기 API
│       └── auth/                     # 인증 API
│
├── components/                       # React 컴포넌트
│   ├── ui/                           # shadcn/ui 기본 컴포넌트
│   ├── common/                       # 공통 컴포넌트 (여러 모듈에서 사용)
│   ├── charts/                       # 차트 컴포넌트
│   │   ├── TicketRevenueChart/
│   │   │   ├── TicketRevenueChart.tsx
│   │   │   └── TicketRevenueChart.css
│   │   └── ...
│   ├── dashboard/                    # 대시보드 전용 컴포넌트
│   └── forms/                        # 폼 컴포넌트
│
├── lib/                              # 유틸리티 및 설정
│   ├── prisma.ts                     # Prisma 클라이언트
│   ├── auth.ts                       # NextAuth 설정
│   ├── auth-helpers.ts               # 인증 헬퍼 함수
│   └── utils/                        # 공통 유틸리티
│       ├── formatters.ts             # 데이터 포맷터
│       └── ...
│
├── types/                            # TypeScript 타입 정의
│   ├── dashboard.ts                  # 대시보드 타입
│   └── next-auth.d.ts                # NextAuth 타입 확장
│
└── prisma/
    └── schema.prisma                 # DB 스키마
```

### 새 모듈 추가 시 구조

새로운 기능 모듈을 추가할 때는 아래 패턴을 따른다:

```
src/
├── app/
│   ├── [모듈명]/                     # 페이지 라우트
│   │   ├── page.tsx
│   │   └── layout.tsx
│   └── api/
│       └── [모듈명]/                 # API 라우트
│           └── route.ts
├── components/
│   └── [모듈명]/                     # 모듈 전용 컴포넌트
│       ├── SomeComponent/
│       │   ├── SomeComponent.tsx
│       │   ├── SomeComponent.css
│       │   └── useSomeLogic.ts
│       └── ...
└── types/
    └── [모듈명].ts                   # 모듈 전용 타입
```

---

## 데이터베이스

### 주요 테이블

| 테이블 | 설명 |
|--------|------|
| `branches` | 지점 정보 |
| `daily_metrics` | 일별 매출/이용자 지표 |
| `daily_visitors` | 일별 방문자 상세 |
| `hourly_usage` | 시간대별 이용자 수 |
| `ticket_revenue` | 이용권별 매출 |
| `ticket_buyers` | 이용권 구매자 상세 |
| `customers` | 고객 마스터 (성별, 연령대, 방문/소비 통계) |
| `customer_purchases` | 고객별 구매 이력 |
| `campaigns` / `campaign_branches` | 광고 캠페인 |
| `strategies` / `strategy_branches` | 지점 전략 |
| `combined_analyses` / `combined_branches` | 통합 분석 |
| `users` | 관리자/지점 계정 |

### DB 스키마 관리

- Prisma 스키마: `prisma/schema.prisma`
- DB 변경 시: `npx prisma db pull` → 스키마 확인 → `npx prisma generate`
- 모델명은 PascalCase + `@@map("테이블명")` 패턴 사용

---

## 인증/권한

- **ADMIN**: 모든 지점 데이터 접근 가능
- **BRANCH**: 자신의 지점 데이터만 접근 가능
- API에서 `getAuthSession()`, `getBranchFilter()` 로 권한 처리

---

## 환경 변수

```env
POSTGRES_URL="postgresql://..."
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."
```

---

## 개발 시작

```bash
npm install
npx prisma generate
npm run dev
```

---

## 코드 작성 체크리스트

코드 작성 및 리뷰 시 반드시 확인:

- [ ] 라이브러리로 해결 가능한 기능을 직접 구현하지 않았는가?
- [ ] 인라인 CSS를 사용하지 않았는가?
- [ ] CSS 파일이 컴포넌트와 같은 폴더에 있는가?
- [ ] 한 파일이 500줄을 넘지 않는가?
- [ ] 로직이 적절히 분리되어 있는가?
- [ ] TypeScript 타입이 명시되어 있는가?
- [ ] 중복 코드가 utils로 분리되어 있는가?
- [ ] 새 모듈은 정해진 폴더 구조를 따르는가?
