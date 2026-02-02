'use client'

import { Suspense } from 'react'
import { AnalysisContent } from '@/components/strategy/analysis'

export default function AnalysisPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-blue-200 border-t-blue-600" />
          <p className="text-sm text-slate-500">불러오는 중...</p>
        </div>
      </div>
    }>
      <AnalysisContent />
    </Suspense>
  )
}
