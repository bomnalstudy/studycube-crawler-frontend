# Studycube 매출 분석 대시보드

Studycube 매장의 매출 데이터를 시각화하고 분석하는 Next.js 기반 대시보드입니다.

## 기술 스택

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Charts**: Recharts
- **Database**: PostgreSQL (Neon)
- **ORM**: Prisma
- **Deployment**: Vercel

## 주요 기능

### 실시간 지표 대시보드 (한 달 기준)

1. **이번달 신규 이용자** - 막대 그래프
2. **이번달 평균 하루 이용권 사용 내역** - 막대 그래프
3. **이번달 총 매출 중 당일권/시간권/기간권의 매출 비율** - 도넛 차트
4. **이전 달 대비 매출 상승률 (%)** - 막대 그래프
5. **월별 매장 매출 합계 데이터** - 막대 그래프
6. **일 평균 매출** - 막대 그래프
7. **일주일 고객 재방문자 수 (1회, 2회, 3회, 4회 이상)** - 막대 그래프
8. **고객 나이대 (10대~60대 이상) 및 성별 (남, 여)** - 도넛 차트

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env` 파일을 생성하고 데이터베이스 연결 정보를 입력합니다:

```env
# Neon PostgreSQL 연결 정보
DATABASE_URL="postgresql://neondb_owner:npg_HROChpt26JTN@ep-broad-forest-ae5r9rdj-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Next.js API URL
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

또는 `.env.example` 파일을 복사하여 사용할 수 있습니다:

```bash
cp .env.example .env
```

### 3. Prisma 설정

데이터베이스 스키마를 동기화합니다:

```bash
# Prisma Client 생성
npx prisma generate

# 데이터베이스에 스키마 적용
npx prisma db push

# 또는 마이그레이션 사용
npx prisma migrate dev
```

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인합니다.

## 프로젝트 구조

```
src/
├── app/                      # Next.js App Router
│   ├── api/                  # API Routes
│   │   └── metrics/          # 메트릭 데이터 API
│   ├── globals.css           # 전역 스타일
│   ├── layout.tsx            # 루트 레이아웃
│   └── page.tsx              # 메인 대시보드 페이지
├── components/               # React 컴포넌트
│   ├── charts/               # 차트 컴포넌트
│   │   ├── bar-chart.tsx     # 막대 그래프
│   │   └── donut-chart.tsx   # 도넛 차트
│   └── dashboard/            # 대시보드 컴포넌트
│       ├── metrics-card.tsx  # 지표 카드
│       └── loading-skeleton.tsx # 로딩 스켈레톤
├── lib/                      # 유틸리티 및 설정
│   ├── prisma.ts             # Prisma 클라이언트
│   └── utils/                # 유틸리티 함수
│       ├── cn.ts             # className 유틸리티
│       ├── date-helpers.ts   # 날짜 헬퍼
│       └── formatters.ts     # 데이터 포맷터
└── types/                    # TypeScript 타입 정의
    └── dashboard.ts          # 대시보드 타입
```

## 데이터베이스 스키마

### 주요 테이블

- `daily_metrics`: 일일 메트릭 데이터 (매출, 신규 이용자, 이용권 사용 등)
- `revisit_customers`: 재방문 고객 데이터
- `customer_demographics`: 고객 인구통계 데이터 (나이대, 성별)
- `branches`: 지점 정보
- `campaigns`: 광고 캠페인 데이터
- `strategies`: 지점 전략 데이터

자세한 스키마는 [prisma/schema.prisma](prisma/schema.prisma)를 참고하세요.

## API 엔드포인트

### GET /api/metrics

이번 달 대시보드 메트릭 데이터를 조회합니다.

**Query Parameters:**
- `branchId` (optional): 지점 ID (기본값: 'default')

**Response:**
```json
{
  "success": true,
  "data": {
    "newUsersThisMonth": 150,
    "avgDailyTicketUsage": 45,
    "revenueByTicketType": {
      "day": 40.5,
      "hour": 35.2,
      "period": 24.3
    },
    "revenueGrowthRate": 12.5,
    "monthlyRevenue": 5000000,
    "avgDailyRevenue": 166666,
    "weeklyRevisitData": [...],
    "customerDemographics": [...]
  }
}
```

## 배포

### Vercel 배포

1. GitHub 저장소를 Vercel에 연결합니다.
2. 환경 변수를 설정합니다:
   - `DATABASE_URL`: PostgreSQL 연결 문자열
3. 자동 배포가 시작됩니다.

### 환경 변수 설정

Vercel 대시보드에서 다음 환경 변수를 설정합니다:

**Settings → Environment Variables**

- `DATABASE_URL`:
  ```
  postgresql://neondb_owner:npg_HROChpt26JTN@ep-broad-forest-ae5r9rdj-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require
  ```

설정 후 **Redeploy**를 클릭하여 새로운 환경 변수를 적용합니다.

## 개발 가이드

### 새로운 차트 추가

1. `src/components/charts/` 에 차트 컴포넌트 생성
2. `src/types/dashboard.ts` 에 타입 정의 추가
3. API에서 필요한 데이터 조회 및 가공
4. 메인 페이지에서 차트 컴포넌트 사용

### 새로운 메트릭 추가

1. `src/types/dashboard.ts` 에 타입 추가
2. `src/app/api/metrics/route.ts` 에서 데이터 계산 로직 추가
3. 메인 페이지에서 메트릭 표시

## 자동화 및 크론 작업

### 진행 중인 캠페인/전략 자동 업데이트

캠페인이나 전략의 종료일이 미래인 경우, 매일 자동으로 최신 데이터로 성과 분석이 업데이트됩니다:

- **크론 작업**: 매일 자정 (00:00 KST)에 `/api/cron/update-ongoing` 엔드포인트가 실행됩니다.
- **자동 완료**: 종료일이 지난 캠페인/전략은 자동으로 `COMPLETED` 상태로 변경됩니다.
- **실시간 분석**: 캠페인/전략 상세 페이지를 열 때마다 최신 데이터로 성과가 계산됩니다.

Vercel에 배포하면 `vercel.json` 설정을 통해 크론 작업이 자동으로 실행됩니다.

### 로컬 테스트

크론 작업을 수동으로 테스트하려면:

```bash
curl http://localhost:3000/api/cron/update-ongoing
```

## 참고 사항

- 크롤링 앱 저장소: [studycube-crawler](https://github.com/bomnalstudy/studycube-crawler)
- 크롤링 앱은 매일 자동으로 데이터를 수집하여 DB에 저장합니다.
- 대시보드는 DB에서 데이터를 읽기만 하며, 수집 기능은 없습니다.
- 모든 차트는 한 달 단위로 데이터를 표시합니다.
- 진행 중인 캠페인/전략은 매일 자동으로 업데이트됩니다.

## 라이선스

MIT
