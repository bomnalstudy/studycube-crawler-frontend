'use client'

import { memo, useState, useRef, useEffect } from 'react'
import { ChatMessage, ChatContext } from '@/types/ai-chat'
import { useRole } from '@/hooks/useRole'
import './AIChat.css'

interface Branch {
  id: string
  name: string
}

// 간단한 마크다운 렌더링
function renderMarkdown(text: string) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let listItems: string[] = []
  let listType: 'ul' | 'ol' | null = null
  let keyCounter = 0

  const getKey = () => `md-${keyCounter++}`

  const flushList = () => {
    if (listItems.length > 0 && listType) {
      const items = listItems.map((item, i) => <li key={`li-${i}`}>{formatInline(item)}</li>)
      elements.push(listType === 'ul'
        ? <ul key={getKey()} className="ai-md-list">{items}</ul>
        : <ol key={getKey()} className="ai-md-list">{items}</ol>
      )
      listItems = []
      listType = null
    }
  }

  const formatInline = (text: string): React.ReactNode => {
    // **bold**
    const parts = text.split(/(\*\*[^*]+\*\*)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={`b-${i}`}>{part.slice(2, -2)}</strong>
      }
      return part
    })
  }

  lines.forEach((line) => {
    const trimmed = line.trim()

    // 빈 줄
    if (!trimmed) {
      flushList()
      return
    }

    // 헤딩
    if (trimmed.startsWith('### ')) {
      flushList()
      elements.push(<h4 key={getKey()} className="ai-md-h4">{formatInline(trimmed.slice(4))}</h4>)
      return
    }
    if (trimmed.startsWith('## ')) {
      flushList()
      elements.push(<h3 key={getKey()} className="ai-md-h3">{formatInline(trimmed.slice(3))}</h3>)
      return
    }
    if (trimmed.startsWith('# ')) {
      flushList()
      elements.push(<h2 key={getKey()} className="ai-md-h2">{formatInline(trimmed.slice(2))}</h2>)
      return
    }

    // 리스트
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (listType !== 'ul') {
        flushList()
        listType = 'ul'
      }
      listItems.push(trimmed.slice(2))
      return
    }
    if (/^\d+\.\s/.test(trimmed)) {
      if (listType !== 'ol') {
        flushList()
        listType = 'ol'
      }
      listItems.push(trimmed.replace(/^\d+\.\s/, ''))
      return
    }

    // 일반 텍스트
    flushList()
    elements.push(<p key={getKey()} className="ai-md-p">{formatInline(trimmed)}</p>)
  })

  flushList()
  return <div className="ai-md-content">{elements}</div>
}

interface AIChatPanelProps {
  context?: ChatContext
}

const QUICK_PROMPTS = [
  '이번 달 매출 분석해줘',
  '이탈 고객이 늘어난 이유는?',
  '신규 고객 유치 방안 알려줘',
  '매출 개선 포인트는?',
]

function AIChatPanelInner({ context }: AIChatPanelProps) {
  const { isAdmin, branchId: userBranchId } = useRole()
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 지점 목록 조회
  useEffect(() => {
    async function fetchBranches() {
      try {
        const res = await fetch('/api/branches')
        const json = await res.json()
        if (json.success) {
          setBranches(json.data)
          if (!isAdmin && userBranchId) {
            setSelectedBranchId(userBranchId)
          }
        }
      } catch {
        // 무시
      }
    }
    fetchBranches()
  }, [isAdmin, userBranchId])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 선택된 지점 정보
  const selectedBranch = branches.find(b => b.id === selectedBranchId)
  const branchContext: ChatContext = {
    branchId: selectedBranchId === 'all' ? undefined : selectedBranchId,
    branchName: selectedBranchId === 'all' ? '전체 지점' : selectedBranch?.name,
    ...context,
  }

  // 대화 자동 저장
  const saveConversation = async (userMsg: ChatMessage, assistantMsg: ChatMessage) => {
    try {
      if (conversationId) {
        // 기존 대화에 메시지 추가
        await fetch(`/api/ai/conversations/${conversationId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              { role: userMsg.role, content: userMsg.content },
              { role: assistantMsg.role, content: assistantMsg.content },
            ],
          }),
        })
      } else {
        // 새 대화 생성
        const title = userMsg.content.slice(0, 30) + (userMsg.content.length > 30 ? '...' : '')
        const res = await fetch('/api/ai/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            branchId: branchContext?.branchId || null,
            messages: [
              { role: userMsg.role, content: userMsg.content },
              { role: assistantMsg.role, content: assistantMsg.content },
            ],
          }),
        })
        const json = await res.json()
        if (json.success) {
          setConversationId(json.data.id)
        }
      }
    } catch {
      console.error('Failed to save conversation')
    }
  }

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content.trim(),
          context: branchContext,
          history: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      const data = await res.json()

      if (data.success && data.message) {
        const assistantMessage: ChatMessage = {
          id: `msg-${Date.now()}-ai`,
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, assistantMessage])

        // 자동 저장
        await saveConversation(userMessage, assistantMessage)
      } else {
        const errorMessage: ChatMessage = {
          id: `msg-${Date.now()}-error`,
          role: 'assistant',
          content: data.error || '응답을 받지 못했습니다. 다시 시도해주세요.',
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } catch {
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: '네트워크 오류가 발생했습니다. 다시 시도해주세요.',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleQuickPrompt = (prompt: string) => {
    sendMessage(prompt)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="ai-chat-panel">
      {/* Header */}
      <div className="ai-chat-header">
        <div className="ai-chat-header-left">
          <h3 className="ai-chat-header-title">AI 인사이트</h3>
          <p className="ai-chat-header-subtitle">
            {branchContext.branchName} 데이터 분석
          </p>
        </div>
        {isAdmin && (
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="ai-branch-select"
          >
            <option value="all">전체</option>
            {branches.map(branch => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Messages */}
      <div className="ai-chat-messages">
        {messages.length === 0 ? (
          <div className="ai-chat-empty">
            <svg className="ai-chat-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <p className="ai-chat-empty-text">
              안녕하세요! 매출과 고객 데이터를<br />
              분석해드릴게요. 궁금한 점을 물어보세요.
            </p>
          </div>
        ) : (
          <>
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`ai-chat-message ai-chat-message-${msg.role}`}
              >
                {msg.role === 'assistant' ? renderMarkdown(msg.content) : <div>{msg.content}</div>}
                <div className="ai-chat-message-time">{formatTime(msg.timestamp)}</div>
              </div>
            ))}
            {isLoading && (
              <div className="ai-chat-typing">
                <div className="ai-chat-typing-dot" />
                <div className="ai-chat-typing-dot" />
                <div className="ai-chat-typing-dot" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Quick Prompts */}
      {messages.length === 0 && (
        <div className="ai-chat-quick-actions">
          {QUICK_PROMPTS.map(prompt => (
            <button
              key={prompt}
              type="button"
              className="ai-chat-quick-btn"
              onClick={() => handleQuickPrompt(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form className="ai-chat-input-area" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="질문을 입력하세요..."
          className="ai-chat-input"
          disabled={isLoading}
        />
        <button
          type="submit"
          className="ai-chat-send-btn"
          disabled={!input.trim() || isLoading}
        >
          전송
        </button>
      </form>
    </div>
  )
}

export const AIChatPanel = memo(AIChatPanelInner)
