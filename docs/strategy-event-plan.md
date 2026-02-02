# 매장 전략 & 이벤트 측정 시스템 기획

> 작성일: 2026-01-30
> 상태: 승인됨 (MVP 구현 시작)

## 1. 개요

### 문제 상황
- AI가 이벤트/프로모션을 추천하지만, **행동이 불명확하고 인과관계 설명이 부족**
- 비수기/성수기에 따라 성과가 왔다갔다해서 **단순 before/after 비교는 의미 없음**
- 매출만이 성과가 아님 - **고객 행동 변화, 신규 유입 등도 중요**
- **1달 단위 추적으로는 장기 효과 판단 불가** - 3~6개월 추적 필요

### 해결 방향
새로운 통합 툴 **'매장 전략 & 이벤트 측정'** 추가
- 이벤트/전략을 체계적으로 기록 (다중 유형 허용)
- 계절성을 보정한 성과 측정
- **장기 고객 추적** (코호트 분석)
- **유사 조건 지점 간 비교** (지역/규모/타겟층)
- **ADMIN 전용** (지점 계정 접근 불가)

### 기존 시스템 정리
- 기존 strategies/campaigns 테이블: **당분간 유지**, 추후 처리

---

## 2. 이벤트 유형 체계

### 다중 유형 선택 허용
하나의 이벤트에 **여러 유형 태그 가능** (예: 광고+할인 동시 진행)

```
PRICING (가격 정책)
├── DISCOUNT_GENERAL     전체 할인
├── DISCOUNT_TICKET      특정 이용권 할인
├── DISCOUNT_SEGMENT     특정 고객 대상 할인 (신규, 복귀 등)
├── PRICE_CHANGE         가격 인상/인하
└── BUNDLE               묶음 상품

PROMOTION (프로모션)
├── POINT_EVENT          포인트 적립 이벤트
├── REFERRAL             친구 추천
├── REVIEW_EVENT         리뷰 이벤트
├── FIRST_VISIT          첫 방문 혜택
└── COMEBACK             복귀 고객 프로모션

MARKETING (마케팅)
├── SMS_CAMPAIGN         문자 캠페인
├── SOCIAL_MEDIA         SNS 광고
├── OFFLINE_AD           오프라인 광고 (전단지 등)
└── PARTNERSHIP          제휴 마케팅

ENGAGEMENT (고객 참여)
├── SEASONAL_EVENT       시즌 이벤트 (크리스마스 소원트리 등)
├── GIVEAWAY             굿즈/경품 증정
├── PHOTO_EVENT          포토존/인증샷 이벤트
└── COMMUNITY            커뮤니티 활동 (스터디그룹 등)

OPERATION (운영)
├── NEW_SERVICE          신규 서비스 도입
├── FACILITY_UPGRADE     시설 개선
└── SEAT_CHANGE          좌석 구성 변경

EXTERNAL (외부 요인 - 기록용, 이벤트와 별도 관리)
├── EXAM_PERIOD          시험 기간
├── VACATION             방학
├── HOLIDAY              공휴일
├── WEATHER              날씨/재해 ← 기상청 API 자동 수집
└── COMPETITOR           경쟁업체 동향 ← 수동 (정보공개서)
```

---

## 3. 성과 측정 방식

### 3.1 계절 보정 방법

| 방식 | 설명 | 장점 | 단점 |
|------|------|------|------|
| **전년 동기 대비** | 작년 같은 기간과 비교 | 계절성 자동 보정 | 1년 이상 데이터 필요 |
| **전월 동일 요일** | 저번 달 같은 요일과 비교 | 빠른 적용 가능 | 월간 변동 반영 안됨 |
| **대조군 비교** | 유사 조건 미적용 지점과 비교 | 인과관계 명확 | 조건 통제 필요 |

### 3.2 동적 보정 방식 선택 (지점별 자동)

지점마다 오픈일이 달라 데이터 축적 기간이 다르므로, **분석 시점에 자동으로 보정 방식 선택**:

```
분석 요청 시:
1. 해당 지점의 가장 오래된 daily_metrics 조회
2. 데이터 축적 기간 계산
3. 보정 방식 자동 선택:
   - 1년 이상 → 전년 동기 대비 (PRIMARY)
   - 1년 미만 → 전월 동일 요일 대비 (FALLBACK)
4. 사용된 보정 방식을 UI에 명시
```

**UI 표시 예시:**
- "전년 동기 대비 +15% 성장 (2024년 1월 vs 2025년 1월)"
- "전월 동일 요일 대비 +8% 성장 ⚠️ 데이터 1년 미만"

### 3.3 외부 요인 관리

#### 자동 수집
- **날씨/재해**: 기상청 공공데이터 API (무료)
  - 일별 기온, 강수량, 특보 자동 저장
  - 이상 기후 자동 태깅 (폭염, 한파, 장마 등)

#### 수동 입력 + 반복 설정
- **시험 기간, 방학**: 반복 설정으로 매년 자동 생성
- **경쟁업체 동향**: 정보공개서 기반 수동 입력 (연 1회)

```
반복 설정 예시:
- 수능: 매년 11월 셋째주 목요일
- 1학기 중간고사: 매년 4월 3~4주
- 여름 방학: 매년 7월 중순 ~ 8월 말
```

---

## 4. 추적할 지표

### 4.1 매출 지표
- 총 매출 및 보정된 성장률
- 이용권별 매출 (당일권/시간권/기간권/고정석)
- 객단가 (고객당, 방문당)
- ROI (비용 투입 이벤트)

### 4.2 고객 지표 + 장기 추적 (핵심!)

#### 즉시 측정 (이벤트 종료 시점)
- 신규/복귀/이탈 고객 수
- 세그먼트 이동 (신규→단골, 이탈위험→복귀)
- 이용권 업그레이드율 (당일권→시간권→기간권)

#### 코호트 장기 추적 (3~6개월)
```
이벤트 기간 중 유입/참여 고객을 코호트로 묶어 장기 추적:

코호트 정의:
- 이벤트 기간 내 신규 가입 고객
- 이벤트 기간 내 복귀한 고객
- 이벤트 참여 고객 (할인 사용, 포인트 적립 등)

추적 지표 (1개월/3개월/6개월 후):
├── 재방문율: 코호트 중 몇 %가 다시 방문했는가
├── 잔존율: 코호트 중 몇 %가 여전히 활성 고객인가
├── LTV 변화: 코호트의 평균 누적 소비액
├── 이용권 업그레이드: 당일권→정기권 전환율
└── 이탈율: 코호트 중 몇 %가 이탈했는가

비교 대상:
- 같은 기간 이벤트 미참여 고객 (대조군)
- 이전 유사 이벤트의 코호트
```

**UI 예시:**
```
[크리스마스 이벤트 2024] 코호트 추적
┌─────────────────────────────────────────────────┐
│ 이벤트 참여 고객: 127명                          │
│                                                 │
│ 재방문율      1개월 후    3개월 후    6개월 후    │
│ 이벤트 참여      78%        52%        41%       │
│ 대조군           45%        28%        19%       │
│ 차이            +33%p      +24%p      +22%p ✅   │
│                                                 │
│ → 이벤트 참여 고객의 장기 잔존율이 2배 이상 높음   │
└─────────────────────────────────────────────────┘
```

### 4.3 이용 패턴 지표
- 방문 수 및 성장률
- 평균 이용 시간
- 좌석 이용률

### 4.4 종합 성과 점수
- 0-100점 종합 점수
- 매출/고객/장기효과 세부 점수
- 평가: EXCELLENT / GOOD / NEUTRAL / POOR / FAILED

---

## 5. 인과관계 파악

### 5.1 통계적 검증 (상세 설명)

**목적**: "이 변화가 우연인지, 진짜 이벤트 효과인지" 판단

**t-검정이란?**
```
이벤트 전 7일 매출: [100, 105, 98, 110, 95, 102, 108] → 평균 102.6만원
이벤트 후 7일 매출: [120, 115, 125, 118, 122, 130, 119] → 평균 121.3만원

질문: 이 18% 차이가 "진짜 효과"인가, "자연 변동 범위"인가?

t-검정 수행 → p-value 계산
- p = 0.02 (2%) → "우연히 이런 차이가 날 확률이 2%뿐"
- p < 0.05 이면 → "통계적으로 유의미함" (95% 신뢰도)
```

**효과 크기 (Cohen's d)**
```
d = (이벤트후 평균 - 이벤트전 평균) / 표준편차

해석:
- d < 0.2: 효과 없음
- 0.2 ≤ d < 0.5: 작은 효과
- 0.5 ≤ d < 0.8: 중간 효과
- d ≥ 0.8: 큰 효과
```

**UI 표시 예시:**
```
매출 변화: +18.2% (102.6만원 → 121.3만원)
├── 통계적 유의성: ✅ 유의미함 (p=0.02)
├── 효과 크기: 중간 (d=0.62)
└── 결론: 이벤트로 인한 실제 효과일 가능성 높음
```

```
매출 변화: +3.1% (102.6만원 → 105.8만원)
├── 통계적 유의성: ⚠️ 유의미하지 않음 (p=0.42)
├── 효과 크기: 없음 (d=0.11)
└── 결론: 자연 변동 범위 내, 이벤트 효과 불확실
```

### 5.2 대조군 비교 (지점 특성 기반)

#### 지점 특성 분류 (branches 테이블에 추가)
```
지점 특성:
├── region: 수도권 / 경기 / 지방
├── size: 소형(<50석) / 중형(50-100석) / 대형(100+석)
├── targetAudience: 학생가 / 주거지 / 오피스
└── maturity: 신규(<1년) / 안정(1-3년) / 성숙(3년+)
```

#### 유사 지점 비교 로직
```
이벤트 적용 지점: A지점 (경기, 중형, 학생가, 안정)

대조군 선정:
1. 같은 특성 조합의 미적용 지점 찾기
2. 특성 점수 계산 (일치하는 항목 수)
3. 가장 유사한 지점들과 비교

비교 결과:
┌──────────────────────────────────────────┐
│ 이벤트 효과 비교 (유사 지점 대비)          │
├──────────────────────────────────────────┤
│ A지점 (이벤트 적용): +15% 성장             │
│ B지점 (경기/중형/학생가): +3% 성장         │
│ C지점 (경기/중형/주거지): +5% 성장         │
├──────────────────────────────────────────┤
│ 순수 이벤트 효과: +11%p (대조군 평균 대비) │
└──────────────────────────────────────────┘
```

### 5.3 외부 요인 보정
- 겹치는 외부 요인 자동 감지 (시험, 날씨 등)
- 외부 요인이 너무 클 경우 경고
- 보정 후 순수 이벤트 효과 추정

---

## 6. DB 스키마

### 새로운 테이블

```
events                    이벤트/전략 마스터
├── id, name
├── startDate, endDate
├── cost, description, hypothesis
├── primaryKpi, secondaryKpis (JSON)
├── status (PLANNED/ONGOING/COMPLETED/CANCELLED)
└── createdBy, createdAt

event_types               이벤트-유형 연결 (다중 선택)
├── eventId
├── type (PRICING/PROMOTION/MARKETING/ENGAGEMENT/OPERATION)
└── subType (DISCOUNT_GENERAL, POINT_EVENT, ...)

event_branches            이벤트-지점 연결
├── eventId, branchId

event_targets             타겟 세그먼트
├── eventId
├── segmentType (VISIT/TICKET/AGE/GENDER)
└── segmentValue

event_cohorts             코호트 정의 (장기 추적용)
├── eventId, cohortType (NEW/RETURNED/PARTICIPATED)
├── customerIds (JSON Array)
└── createdAt

event_cohort_snapshots    코호트 스냅샷 (1개월/3개월/6개월)
├── cohortId, snapshotMonth (1/3/6)
├── activeCount, revisitRate, avgLtv
├── upgradedCount, churnedCount
└── calculatedAt

external_factors          외부 요인
├── type (EXAM/VACATION/WEATHER/HOLIDAY/COMPETITOR)
├── name, startDate, endDate
├── impactEstimate, description
├── isRecurring, recurringRule (JSON)
└── source (MANUAL/API)

external_factor_branches  외부 요인-지점 연결

weather_data              날씨 데이터 (자동 수집)
├── date, branchId (또는 regionCode)
├── avgTemp, maxTemp, minTemp
├── precipitation, weatherCode
└── isExtreme (폭염/한파/장마 등)

event_performance         성과 스냅샷
├── eventId, branchId
├── comparisonType
├── 매출 지표, 고객 지표, 방문 지표
├── 통계 분석 (pValue, effectSize, isSignificant)
├── 종합 점수 (score/verdict)
└── insights (JSON)

branches 테이블 수정     지점 특성 추가
├── (기존 필드들)
├── region (수도권/경기/지방)
├── size (소형/중형/대형)
├── targetAudience (학생가/주거지/오피스)
└── openedAt (오픈일 - maturity 계산용)
```

---

## 7. UI/UX 흐름

### 7.1 홈 화면
- 새 카드 추가: "매장 전략 & 이벤트 측정"
- ADMIN 계정에만 표시

### 7.2 메인 대시보드 (`/strategy`)
- 진행 중인 이벤트 현황
- 최근 완료된 이벤트 성과 요약
- 코호트 장기 추적 알림 (1개월/3개월/6개월 도래)
- 외부 요인 캘린더

### 7.3 이벤트 관리 (`/strategy/events`)
- 이벤트 목록 (필터: 상태/유형/지점/기간)
- 이벤트 등록/수정 폼
  - **다중 유형 선택** (체크박스)
  - 지점 선택 (복수)
  - 타겟 세그먼트 설정
- 이벤트별 상세 성과 보기

### 7.4 성과 분석 (`/strategy/analysis`)
- 이벤트 선택 → 성과 대시보드
- 보정 방식 표시 (자동 선택됨)
- 통계적 유의성 표시
- **유사 지점 비교** (대조군)
- **코호트 장기 추적** 탭

### 7.5 외부 요인 관리 (`/strategy/factors`)
- 외부 요인 목록/등록
- 반복 설정
- 날씨 데이터 자동 수집 현황
- 캘린더 뷰

### 7.6 지점 설정 (`/strategy/branches`)
- 지점별 특성 설정 (지역/규모/타겟층)
- 유사 지점 그룹 확인

---

## 8. 구현 로드맵

### MVP (한 번에 구현)
- [ ] **docs/strategy-event-plan.md 생성** (이 기획 문서 저장)
- [ ] DB 마이그레이션
  - events, event_types, event_branches, event_targets
  - external_factors (반복 설정 포함)
  - branches 특성 필드 추가
- [ ] 이벤트 CRUD API (다중 유형 지원)
- [ ] 이벤트 등록/관리 UI
- [ ] 외부 요인 등록 + 반복 설정
- [ ] 기본 Before/After 분석
- [ ] 세그먼트 이동 추적
- [ ] 동적 계절 보정 (지점별 자동)
- [ ] 유사 지점 대조군 비교

### Phase 2: 장기 추적 + 고급 분석
- [ ] 코호트 정의 및 저장
- [ ] 1개월/3개월/6개월 스냅샷 배치
- [ ] 통계적 유의성 검정 (t-검정)
- [ ] 기상청 API 연동 (날씨 자동 수집)
- [ ] 종합 성과 점수
- [ ] AI 인사이트 연동

### 기존 시스템
- 기존 strategies/campaigns 테이블: **당분간 유지**
- 새 시스템 안정화 후 마이그레이션 또는 삭제 결정

---

## 9. 폴더 구조 및 파일 목록

### 폴더 구조 (대시보드/CRM과 동일 패턴)
```
src/
├── app/
│   ├── dashboard/          # 기존 - 매출 대시보드
│   ├── crm/                # 기존 - CRM
│   ├── strategy/           # 신규 - 매장 전략 & 이벤트 측정
│   │   ├── page.tsx              # 메인 대시보드
│   │   ├── layout.tsx            # 레이아웃
│   │   ├── events/
│   │   │   ├── page.tsx          # 이벤트 목록
│   │   │   ├── new/page.tsx      # 이벤트 등록
│   │   │   └── [id]/page.tsx     # 이벤트 상세/수정
│   │   ├── analysis/
│   │   │   └── page.tsx          # 성과 분석
│   │   ├── factors/
│   │   │   └── page.tsx          # 외부 요인 관리
│   │   └── branches/
│   │       └── page.tsx          # 지점 특성 설정
│   └── api/
│       └── strategy/
│           ├── events/route.ts           # 이벤트 CRUD
│           ├── events/[id]/route.ts      # 이벤트 상세
│           ├── analysis/route.ts         # 성과 분석
│           ├── factors/route.ts          # 외부 요인
│           ├── cohorts/route.ts          # 코호트 관리
│           └── branches/route.ts         # 지점 특성
│
├── components/
│   ├── dashboard/          # 기존 - 대시보드 전용
│   ├── crm/                # 기존 - CRM 전용
│   └── strategy/           # 신규 - Strategy 전용
│       ├── EventForm/
│       │   ├── EventForm.tsx
│       │   ├── EventForm.css
│       │   └── index.ts
│       ├── EventList/
│       ├── PerformanceChart/
│       ├── CohortTracker/
│       ├── ExternalFactorCalendar/
│       ├── BranchSelector/
│       └── StatisticalSummary/
│
├── lib/
│   └── strategy/           # Strategy 전용 유틸
│       ├── analysis.ts           # 성과 분석 로직
│       ├── statistics.ts         # t-검정, Cohen's d 계산
│       ├── cohort.ts             # 코호트 추적 로직
│       └── comparison.ts         # 대조군 비교 로직
│
└── types/
    └── strategy.ts         # Strategy 타입 정의

docs/
├── sms-automation-plan.md  # 기존
└── strategy-event-plan.md  # 신규 - 이 기획 문서 저장
```

### 새로 생성할 파일
- `src/app/strategy/**` - 새 툴 페이지들
- `src/app/api/strategy/**` - 새 API 라우트
- `src/components/strategy/**` - 전용 컴포넌트
- `src/lib/strategy/**` - 전용 유틸리티
- `src/types/strategy.ts` - 타입 정의
- `docs/strategy-event-plan.md` - 기획 문서

### 수정할 파일
- `prisma/schema.prisma` - 새 모델 + branches 특성 필드
- `src/app/page.tsx` - 홈 카드 추가 (ADMIN 전용)
- `src/components/dashboard/sidebar.tsx` - 새 메뉴 그룹 추가

---

## 10. 검증 방법

1. **이벤트 등록 테스트**
   - 다중 유형 선택 (MARKETING + PRICING)
   - 지점 선택 (단일/복수)
   - 타겟 세그먼트 설정

2. **외부 요인 테스트**
   - 일회성 외부 요인 등록
   - 반복 외부 요인 등록 (매년 자동 생성 확인)
   - 날씨 API 연동 (Phase 2)

3. **성과 분석 테스트**
   - 1년 이상 데이터 지점: 전년 동기 비교
   - 1년 미만 데이터 지점: 전월 비교 폴백
   - 유사 지점 대조군 비교
   - 통계적 유의성 표시

4. **코호트 추적 테스트 (Phase 2)**
   - 이벤트 종료 후 코호트 생성
   - 1개월 후 스냅샷 자동 생성
   - 대조군과 비교 표시

5. **권한 테스트**
   - ADMIN: 접근 가능, 모든 지점 선택 가능
   - BRANCH: /strategy 접근 시 홈으로 리다이렉트

---

## 11. 핵심 결정 사항 (확정)

| 항목 | 결정 |
|------|------|
| 기존 strategies/campaigns | 당분간 유지, 추후 처리 |
| 이벤트 유형 | **다중 선택 허용** |
| 비정형 이벤트 | ENGAGEMENT 대분류 추가 |
| 계절 보정 | 지점별 데이터 기간에 따라 동적 선택 |
| 외부 요인 | 날씨는 API 자동, 경쟁업체는 수동 |
| 장기 추적 | **코호트 기반 3~6개월 추적** |
| 대조군 비교 | **지점 특성(지역/규모/타겟층/오픈기간) 기반** |
| 통계 검증 | t-검정 + Cohen's d 효과 크기 |
