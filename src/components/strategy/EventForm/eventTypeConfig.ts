import type { EventMainType, EventSubType } from '@/types/strategy'

interface TypeOption {
  value: EventMainType
  label: string
}

interface SubTypeOption {
  value: EventSubType
  label: string
}

// 이벤트용 유형 (기간 한정)
export const EVENT_TYPES: TypeOption[] = [
  { value: 'PRICING', label: '가격 정책' },
  { value: 'PROMOTION', label: '프로모션' },
  { value: 'MARKETING', label: '마케팅' },
  { value: 'ENGAGEMENT', label: '고객 참여' },
]

// 운영 변경용 유형 (영구적)
export const OPERATION_TYPES: SubTypeOption[] = [
  { value: 'NEW_SERVICE', label: '신규 서비스 도입' },
  { value: 'FACILITY_UPGRADE', label: '시설 개선' },
  { value: 'SEAT_CHANGE', label: '좌석 구성 변경' },
]

export const EVENT_SUB_TYPES: Record<EventMainType, SubTypeOption[]> = {
  PRICING: [
    { value: 'DISCOUNT_GENERAL', label: '전체 할인' },
    { value: 'DISCOUNT_TICKET', label: '특정 이용권 할인' },
    { value: 'DISCOUNT_SEGMENT', label: '특정 고객 할인' },
    { value: 'PRICE_CHANGE', label: '가격 인상/인하' },
    { value: 'BUNDLE', label: '묶음 상품' },
  ],
  PROMOTION: [
    { value: 'POINT_EVENT', label: '포인트 이벤트' },
    { value: 'REFERRAL', label: '친구 추천' },
    { value: 'REVIEW_EVENT', label: '리뷰 이벤트' },
    { value: 'FIRST_VISIT', label: '첫 방문 혜택' },
    { value: 'COMEBACK', label: '복귀 프로모션' },
  ],
  MARKETING: [
    { value: 'SMS_CAMPAIGN', label: '문자 캠페인' },
    { value: 'SOCIAL_MEDIA', label: 'SNS 광고' },
    { value: 'OFFLINE_AD', label: '오프라인 광고' },
    { value: 'PARTNERSHIP', label: '제휴 마케팅' },
  ],
  ENGAGEMENT: [
    { value: 'SEASONAL_EVENT', label: '시즌 이벤트' },
    { value: 'GIVEAWAY', label: '굿즈/경품 증정' },
    { value: 'PHOTO_EVENT', label: '포토존/인증샷' },
    { value: 'COMMUNITY', label: '커뮤니티 활동' },
  ],
  OPERATION: [
    { value: 'NEW_SERVICE', label: '신규 서비스' },
    { value: 'FACILITY_UPGRADE', label: '시설 개선' },
    { value: 'SEAT_CHANGE', label: '좌석 구성 변경' },
  ],
}

export function getMainTypeLabel(type: EventMainType): string {
  const found = EVENT_TYPES.find((t) => t.value === type)
  return found?.label || type
}

export function getSubTypeLabel(mainType: EventMainType, subType: EventSubType): string {
  const subTypes = EVENT_SUB_TYPES[mainType]
  const found = subTypes?.find((t) => t.value === subType)
  return found?.label || subType
}
