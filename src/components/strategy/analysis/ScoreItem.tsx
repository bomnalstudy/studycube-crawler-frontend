interface ScoreItemProps {
  label: string
  score: number
  reason: string
  positive?: boolean
}

export function ScoreItem({ label, score, reason, positive }: ScoreItemProps) {
  const isZero = score === 0
  return (
    <div className={`p-3 rounded-lg border ${isZero ? 'bg-slate-50 border-slate-200' : positive ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-600">{label}</span>
        <span className={`text-sm font-semibold ${isZero ? 'text-slate-600' : positive ? 'text-green-600' : 'text-red-600'}`}>
          {score > 0 ? '+' : ''}{score}점
        </span>
      </div>
      <p className="text-xs text-slate-500 mt-1 truncate" title={reason}>{reason}</p>
    </div>
  )
}
