/**
 * 통계 분석 유틸리티
 * t-검정, Cohen's d 효과 크기 계산
 */

/**
 * 평균 계산
 */
export function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

/**
 * 표준편차 계산
 */
export function standardDeviation(values: number[]): number {
  if (values.length <= 1) return 0
  const avg = mean(values)
  const squaredDiffs = values.map((v) => Math.pow(v - avg, 2))
  return Math.sqrt(squaredDiffs.reduce((sum, v) => sum + v, 0) / (values.length - 1))
}

/**
 * 풀드 표준편차 (두 그룹의 combined standard deviation)
 */
export function pooledStandardDeviation(values1: number[], values2: number[]): number {
  const n1 = values1.length
  const n2 = values2.length
  if (n1 <= 1 || n2 <= 1) return 0

  const var1 = Math.pow(standardDeviation(values1), 2)
  const var2 = Math.pow(standardDeviation(values2), 2)

  return Math.sqrt(((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2))
}

/**
 * Cohen's d 효과 크기 계산
 * @returns d value와 해석
 */
export function cohensD(
  values1: number[],
  values2: number[]
): { d: number; interpretation: 'NONE' | 'SMALL' | 'MEDIUM' | 'LARGE' } {
  const mean1 = mean(values1)
  const mean2 = mean(values2)
  const pooledSD = pooledStandardDeviation(values1, values2)

  if (pooledSD === 0) {
    return { d: 0, interpretation: 'NONE' }
  }

  const d = Math.abs(mean2 - mean1) / pooledSD

  let interpretation: 'NONE' | 'SMALL' | 'MEDIUM' | 'LARGE'
  if (d < 0.2) {
    interpretation = 'NONE'
  } else if (d < 0.5) {
    interpretation = 'SMALL'
  } else if (d < 0.8) {
    interpretation = 'MEDIUM'
  } else {
    interpretation = 'LARGE'
  }

  return { d: Math.round(d * 1000) / 1000, interpretation }
}

/**
 * 독립 표본 t-검정 (Welch's t-test)
 * @returns t-value, p-value, 유의미 여부
 */
export function tTest(
  values1: number[],
  values2: number[]
): { tValue: number; pValue: number; isSignificant: boolean } {
  const n1 = values1.length
  const n2 = values2.length

  if (n1 < 2 || n2 < 2) {
    return { tValue: 0, pValue: 1, isSignificant: false }
  }

  const mean1 = mean(values1)
  const mean2 = mean(values2)
  const var1 = Math.pow(standardDeviation(values1), 2)
  const var2 = Math.pow(standardDeviation(values2), 2)

  // Welch's t-test
  const se = Math.sqrt(var1 / n1 + var2 / n2)
  if (se === 0) {
    return { tValue: 0, pValue: 1, isSignificant: false }
  }

  const tValue = (mean2 - mean1) / se

  // 자유도 (Welch-Satterthwaite approximation)
  const num = Math.pow(var1 / n1 + var2 / n2, 2)
  const denom = Math.pow(var1 / n1, 2) / (n1 - 1) + Math.pow(var2 / n2, 2) / (n2 - 1)
  const df = num / denom

  // p-value 근사 계산 (Student's t-distribution)
  const pValue = tDistributionPValue(Math.abs(tValue), df)

  return {
    tValue: Math.round(tValue * 1000) / 1000,
    pValue: Math.round(pValue * 10000) / 10000,
    isSignificant: pValue < 0.05,
  }
}

/**
 * t-분포 p-value 근사 계산 (양측 검정)
 * 간단한 근사법 사용
 */
function tDistributionPValue(t: number, df: number): number {
  // 정규분포 근사 (df가 충분히 크면)
  if (df > 30) {
    return 2 * (1 - normalCDF(t))
  }

  // 작은 자유도의 경우 간단한 근사
  const x = df / (df + t * t)
  const a = df / 2
  const b = 0.5

  // 베타 분포 근사
  const beta = incompleteBeta(x, a, b)
  return beta
}

/**
 * 표준 정규분포 CDF 근사
 */
function normalCDF(x: number): number {
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911

  const sign = x < 0 ? -1 : 1
  x = Math.abs(x) / Math.sqrt(2)

  const t = 1.0 / (1.0 + p * x)
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)

  return 0.5 * (1.0 + sign * y)
}

/**
 * 불완전 베타 함수 근사
 */
function incompleteBeta(x: number, a: number, b: number): number {
  // 간단한 급수 근사
  if (x === 0) return 0
  if (x === 1) return 1

  const bt =
    Math.exp(
      lnGamma(a + b) -
        lnGamma(a) -
        lnGamma(b) +
        a * Math.log(x) +
        b * Math.log(1 - x)
    )

  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betaCF(x, a, b)) / a
  } else {
    return 1 - (bt * betaCF(1 - x, b, a)) / b
  }
}

/**
 * 감마 함수의 로그
 */
function lnGamma(x: number): number {
  const cof = [
    76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155,
    0.1208650973866179e-2, -0.5395239384953e-5,
  ]

  let y = x
  let tmp = x + 5.5
  tmp -= (x + 0.5) * Math.log(tmp)
  let ser = 1.000000000190015

  for (let j = 0; j < 6; j++) {
    ser += cof[j] / ++y
  }

  return -tmp + Math.log((2.5066282746310005 * ser) / x)
}

/**
 * 연분수 전개
 */
function betaCF(x: number, a: number, b: number): number {
  const maxIterations = 100
  const epsilon = 3e-7

  const qab = a + b
  const qap = a + 1
  const qam = a - 1

  let c = 1
  let d = 1 - (qab * x) / qap
  if (Math.abs(d) < 1e-30) d = 1e-30
  d = 1 / d
  let h = d

  for (let m = 1; m <= maxIterations; m++) {
    const m2 = 2 * m
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2))
    d = 1 + aa * d
    if (Math.abs(d) < 1e-30) d = 1e-30
    c = 1 + aa / c
    if (Math.abs(c) < 1e-30) c = 1e-30
    d = 1 / d
    h *= d * c

    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2))
    d = 1 + aa * d
    if (Math.abs(d) < 1e-30) d = 1e-30
    c = 1 + aa / c
    if (Math.abs(c) < 1e-30) c = 1e-30
    d = 1 / d
    const del = d * c
    h *= del

    if (Math.abs(del - 1) < epsilon) break
  }

  return h
}

/**
 * 성장률 계산
 */
export function calculateGrowthRate(before: number, after: number): number {
  if (before === 0) return after > 0 ? 100 : 0
  return ((after - before) / before) * 100
}
