/**
 * 전화번호 마스킹
 * 010-1234-5678 -> 010-****-5678
 * 01012345678 -> 010****5678
 */
export function maskPhone(phone: string): string {
  // 하이픈 포함 형태
  if (phone.includes('-')) {
    const parts = phone.split('-')
    if (parts.length === 3) {
      return `${parts[0]}-****-${parts[2]}`
    }
  }

  // 11자리 연속 형태
  if (phone.length === 11) {
    return `${phone.slice(0, 3)}****${phone.slice(7)}`
  }

  // 기타: 중간 4자리 마스킹
  if (phone.length >= 8) {
    const start = Math.floor((phone.length - 4) / 2)
    return phone.slice(0, start) + '****' + phone.slice(start + 4)
  }

  return phone
}

/**
 * 전화번호를 표시 형식으로 변환
 * 01012345678 -> 010-1234-5678
 */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return phone
}
