# Studycube 매출 분석 대시보드 (Frontend)

## 프로젝트 개요

### 목표
Studycube 매장의 매출 데이터를 시각화하고 분석하는 대시보드 구축

### 프로젝트 구조
이 프로젝트는 **대시보드 프론트엔드**이며, 백엔드 크롤링 앱과 분리되어 있습니다.

- **크롤링 앱**: `https://github.com/bomnalstudy/studycube-crawler`
  - 목적: Studycube 데이터 크롤링 및 DB 저장
  - 배포: GitHub Actions 자동 실행

- **대시보드 앱** (현재 프로젝트)
  - 저장소: `https://github.com/bomnalstudy/studycube-crawler-frontend.git`
  - 목적: 데이터 시각화 및 분석
  - 배포: Vercel

---

## 핵심 기능

### 1. 실시간 지표 대시보드

**기준: 한달 단위로 차트 표시**

- **이번달 신규 이용자** - 막대 그래프
- **이번달 평균 하루 이용권 사용 내역** - 막대 그래프
- **이번달 총 매출 중 당일권/시간권/기간권의 매출 비율** - 도넛 차트
- **이전 달 대비 매출 상승률 (%)** - 막대 그래프
- **월별 매장 매출 합계 데이터** - 막대 그래프
- **일 평균 매출** - 막대 그래프
- **일주일 고객 재방문자 수 (1회, 2회, 3회, 4회 이상)** - 막대 그래프
- **고객 나이대 (10대, 20대, 30대, 40대, 50대, 60대 이상) 및 성별 (남, 여)** - 도넛 차트

### 2. 비교 분석 기능
#### 기간별 데이터 비교
- 날짜 범위 선택기
- 기간별 매출/고객 데이터 비교 차트
- 전년 동기 대비 분석

#### 광고 캠페인 분석
- 광고 캠페인 데이터 입력 및 관리
  - 광고 노출수, 클릭 수, 비용
- 광고 전후 매장 데이터 변화 비교
- ROAS, ROI 계산 및 시각화
- 캠페인별 성과 비교

#### 지점간 전략 비교
- 전략 유형 관리
  - 가격 할인
  - 리뷰 이벤트
  - 신규 콘텐츠 적용 등
- 전략별 데이터 변화 추적
- 지점별 성과 비교

#### 다중 비교 분석
- 광고 + 전략 동시 비교
- 복합적인 마케팅 효과 분석

### 3. 데이터 내보내기
- Excel 형식 데이터 추출
- 기간별 리포트 생성
- 지점별/캠페인별/전략별 데이터 다운로드

---

## 기술 스택

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **UI Components**: shadcn/ui
- **Charts**: Recharts / Chart.js
- **State Management**: React Context API / Zustand
- **Form Handling**: React Hook Form + Zod

### Backend (API Routes)
- **API**: Next.js API Routes
- **Database**: Neon PostgreSQL
- **ORM**: Prisma
- **Authentication**: NextAuth.js (선택적)

### 데이터 처리
- **Excel Export**: ExcelJS
- **Date Handling**: date-fns
- **Data Validation**: Zod

### 배포
- **Hosting**: Vercel
- **Database**: Neon PostgreSQL (무료 플랜)

---

## 프로젝트 구조

```
bomnal-customer-data-studycube-frontend/
├── app/                          # Next.js 14 App Router
│   ├── (dashboard)/              # 대시보드 레이아웃 그룹
│   │   ├── layout.tsx            # 대시보드 공통 레이아웃
│   │   ├── page.tsx              # 메인 대시보드
│   │   ├── analytics/            # 분석 페이지
│   │   │   ├── campaigns/        # 광고 캠페인 분석
│   │   │   ├── strategies/       # 지점 전략 분석
│   │   │   └── compare/          # 다중 비교 분석
│   │   └── reports/              # 리포트 생성
│   ├── api/                      # API Routes
│   │   ├── metrics/              # 지표 데이터 API
│   │   ├── campaigns/            # 캠페인 데이터 API
│   │   ├── strategies/           # 전략 데이터 API
│   │   └── export/               # Excel 내보내기 API
│   ├── globals.css               # 전역 스타일
│   └── layout.tsx                # 루트 레이아웃
├── components/                   # React 컴포넌트
│   ├── ui/                       # shadcn/ui 컴포넌트
│   ├── charts/                   # 차트 컴포넌트
│   │   ├── revenue-chart.tsx     # 매출 차트
│   │   ├── usage-chart.tsx       # 이용권 사용 차트
│   │   └── comparison-chart.tsx  # 비교 차트
│   ├── dashboard/                # 대시보드 컴포넌트
│   │   ├── metrics-card.tsx      # 지표 카드
│   │   ├── date-range-picker.tsx # 날짜 선택기
│   │   └── branch-selector.tsx   # 지점 선택기
│   └── forms/                    # 폼 컴포넌트
│       ├── campaign-form.tsx     # 캠페인 입력 폼
│       └── strategy-form.tsx     # 전략 입력 폼
├── lib/                          # 유틸리티 및 설정
│   ├── prisma.ts                 # Prisma 클라이언트
│   ├── db/                       # 데이터베이스 쿼리
│   │   ├── metrics.ts            # 지표 쿼리
│   │   ├── campaigns.ts          # 캠페인 쿼리
│   │   └── strategies.ts         # 전략 쿼리
│   ├── analytics/                # 분석 로직
│   │   ├── roi-calculator.ts     # ROI/ROAS 계산
│   │   └── metrics-calculator.ts # 지표 계산
│   ├── utils/                    # 유틸리티 함수
│   │   ├── date-helpers.ts       # 날짜 헬퍼
│   │   ├── formatters.ts         # 데이터 포맷터
│   │   └── validators.ts         # 검증 함수
│   └── excel/                    # Excel 처리
│       └── exporter.ts           # Excel 내보내기
├── types/                        # TypeScript 타입 정의
│   ├── database.ts               # DB 타입
│   ├── metrics.ts                # 지표 타입
│   └── api.ts                    # API 타입
├── prisma/
│   └── schema.prisma             # Prisma 스키마
├── public/                       # 정적 파일
└── .env.local                    # 환경 변수
```

---

## 데이터베이스 스키마

### 주요 테이블

#### daily_metrics
일일 지표 데이터
```prisma
model DailyMetric {
  id              Int      @id @default(autoincrement())
  branch_id       String
  date            DateTime
  new_users       Int
  ticket_usage    Int
  revenue         Decimal
  revenue_day     Decimal
  revenue_hour    Decimal
  revenue_period  Decimal
  revisit_rate    Decimal
  revenue_per_sqm Decimal
  revenue_per_seat Decimal
  created_at      DateTime @default(now())
}
```

#### campaigns
광고 캠페인 데이터
```prisma
model Campaign {
  id          Int      @id @default(autoincrement())
  branch_id   String
  name        String
  start_date  DateTime
  end_date    DateTime
  impressions Int
  clicks      Int
  cost        Decimal
  created_at  DateTime @default(now())
}
```

#### strategies
지점 전략 데이터
```prisma
model Strategy {
  id          Int      @id @default(autoincrement())
  branch_id   String
  name        String
  type        String   // 'discount', 'review_event', 'new_content'
  start_date  DateTime
  end_date    DateTime
  description String?
  created_at  DateTime @default(now())
}
```

#### branches
지점 정보
```prisma
model Branch {
  id          String   @id
  name        String
  area        Decimal  // 평수
  seats       Int      // 좌석 수
  created_at  DateTime @default(now())
}
```

---

## API 설계

### Metrics API

#### GET /api/metrics/daily
일일 지표 조회
```typescript
Query Parameters:
- branch_id: string
- start_date: string (ISO 8601)
- end_date: string (ISO 8601)

Response:
{
  metrics: DailyMetric[]
}
```

#### GET /api/metrics/summary
요약 지표 조회
```typescript
Query Parameters:
- branch_id: string
- period: 'day' | 'week' | 'month'

Response:
{
  total_revenue: number
  new_users: number
  growth_rate: number
  revisit_rate: number
  revenue_per_sqm: number
  revenue_per_seat: number
}
```

### Campaigns API

#### POST /api/campaigns
캠페인 생성
```typescript
Request Body:
{
  branch_id: string
  name: string
  start_date: string
  end_date: string
  impressions: number
  clicks: number
  cost: number
}

Response:
{
  campaign: Campaign
  roi: number
  roas: number
}
```

#### GET /api/campaigns/analysis
캠페인 분석
```typescript
Query Parameters:
- campaign_id: number

Response:
{
  campaign: Campaign
  before_metrics: DailyMetric[]
  after_metrics: DailyMetric[]
  roi: number
  roas: number
  revenue_change: number
}
```

### Export API

#### POST /api/export/excel
Excel 내보내기
```typescript
Request Body:
{
  type: 'metrics' | 'campaigns' | 'strategies'
  filters: {
    branch_id?: string
    start_date?: string
    end_date?: string
  }
}

Response:
Binary Excel file
```

---

## 주요 기능 구현 가이드

### 1. 차트 컴포넌트

#### 매출 차트 (RevenueChart)
```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

export function RevenueChart({ data }: { data: DailyMetric[] }) {
  // 날짜별 매출 데이터 시각화
  // 당일권/시간권/기간권 비율 표시
}
```

#### 비교 차트 (ComparisonChart)
```typescript
export function ComparisonChart({
  beforeData,
  afterData
}: {
  beforeData: DailyMetric[]
  afterData: DailyMetric[]
}) {
  // 광고/전략 전후 데이터 비교
  // 차이값 하이라이트
}
```

### 2. ROI/ROAS 계산

```typescript
// lib/analytics/roi-calculator.ts

export function calculateROI(
  cost: number,
  revenueIncrease: number
): number {
  return ((revenueIncrease - cost) / cost) * 100
}

export function calculateROAS(
  cost: number,
  revenue: number
): number {
  return (revenue / cost) * 100
}
```

### 3. Excel 내보내기

```typescript
// lib/excel/exporter.ts
import ExcelJS from 'exceljs'

export async function exportMetricsToExcel(
  metrics: DailyMetric[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Metrics')

  // 헤더 추가
  worksheet.columns = [
    { header: '날짜', key: 'date', width: 15 },
    { header: '신규 이용자', key: 'new_users', width: 15 },
    { header: '매출', key: 'revenue', width: 15 },
    // ...
  ]

  // 데이터 추가
  metrics.forEach(metric => {
    worksheet.addRow(metric)
  })

  return await workbook.xlsx.writeBuffer()
}
```

---

## 환경 변수 설정

```env
# .env.local

# Database
DATABASE_URL="postgresql://user:password@host/db?sslmode=require"

# Next.js
NEXT_PUBLIC_API_URL="http://localhost:3000"

# Optional: Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
```

---

## 개발 가이드라인

### TypeScript 사용 원칙
- 모든 컴포넌트와 함수에 명시적 타입 정의
- `any` 타입 사용 금지
- API 응답은 Zod로 검증

### 컴포넌트 설계 원칙
- 단일 책임 원칙 (SRP) 준수
- props는 최대한 명확하게 정의
- 재사용 가능한 컴포넌트는 `components/ui`에 배치

### 성능 최적화
- 불필요한 리렌더링 방지 (React.memo, useMemo, useCallback)
- 차트 데이터는 서버 사이드에서 가공
- 이미지 최적화 (Next.js Image 컴포넌트 사용)

### 에러 처리
- API 호출 실패 시 사용자 친화적인 에러 메시지 표시
- 로딩 상태 명확히 표시
- try-catch로 예외 처리

---

## 배포 가이드

### Vercel 배포
1. GitHub 저장소 연결
2. 환경 변수 설정
   - `DATABASE_URL` 추가
3. 자동 배포 설정
   - main 브랜치 push 시 자동 배포

### Prisma 마이그레이션
```bash
# 개발 환경
npx prisma migrate dev

# 프로덕션 환경
npx prisma migrate deploy
```

---

## 주요 라이브러리

### UI/UX
- `shadcn/ui`: 재사용 가능한 UI 컴포넌트
- `lucide-react`: 아이콘
- `tailwindcss`: 스타일링

### 차트
- `recharts`: 반응형 차트 라이브러리
- `chart.js` + `react-chartjs-2`: 고급 차트 (선택적)

### 폼
- `react-hook-form`: 폼 상태 관리
- `zod`: 스키마 검증

### 데이터 처리
- `date-fns`: 날짜 처리
- `exceljs`: Excel 파일 생성
- `@prisma/client`: DB ORM

---

## 개발 시작하기

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env.local` 파일 생성 및 DATABASE_URL 설정

### 3. Prisma 설정
```bash
npx prisma generate
npx prisma db push
```

### 4. 개발 서버 실행
```bash
npm run dev
```

### 5. 브라우저에서 확인
`http://localhost:3000`

---

## 체크리스트

### 개발 전
- [ ] Neon PostgreSQL 계정 생성
- [ ] DATABASE_URL 환경 변수 설정
- [ ] Prisma 스키마 확인
- [ ] shadcn/ui 설치 및 설정

### 개발 중
- [ ] TypeScript strict mode 활성화
- [ ] ESLint/Prettier 설정
- [ ] 컴포넌트 재사용성 고려
- [ ] API 응답 타입 정의
- [ ] 에러 처리 구현

### 배포 전
- [ ] 환경 변수 Vercel에 설정
- [ ] 프로덕션 빌드 테스트
- [ ] Prisma 마이그레이션 적용
- [ ] 성능 최적화 확인

---

## 참고 사항

- 크롤링 앱은 매일 자동으로 데이터를 수집하여 DB에 저장
- 대시보드는 DB에서 데이터를 읽기만 함 (수집 기능 없음)
- 모든 비용은 무료 플랜으로 운영 가능
- 지점별 데이터는 반드시 분리하여 관리
