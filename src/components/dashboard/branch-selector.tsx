'use client'

interface Branch {
  id: string
  name: string
}

interface BranchSelectorProps {
  branches: Branch[]
  selectedBranchId: string
  onBranchChange: (branchId: string) => void
}

export function BranchSelector({ branches, selectedBranchId, onBranchChange }: BranchSelectorProps) {
  return (
    <div className="flex items-center gap-3">
      <label htmlFor="branch-select" className="text-sm font-medium text-gray-700">
        지점 선택:
      </label>
      <select
        id="branch-select"
        value={selectedBranchId}
        onChange={(e) => onBranchChange(e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="all">전체 지점 (합산)</option>
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </select>
    </div>
  )
}
