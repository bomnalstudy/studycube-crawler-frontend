export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface ChatContext {
  branchId?: string
  branchName?: string
  dateRange?: {
    start: string
    end: string
  }
}

export interface ChatRequest {
  message: string
  context?: ChatContext
  history?: { role: 'user' | 'assistant'; content: string }[]
}

export interface ChatResponse {
  success: boolean
  message?: string
  error?: string
}
