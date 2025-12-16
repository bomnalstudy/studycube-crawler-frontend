interface MetricsCardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: {
    value: number
    isPositive: boolean
  }
}

export function MetricsCard({ title, value, subtitle, trend }: MetricsCardProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
      <div className="flex items-baseline justify-between">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {trend && (
          <span
            className={`text-sm font-medium ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value).toFixed(1)}%
          </span>
        )}
      </div>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  )
}
