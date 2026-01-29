'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ChatContext } from '@/types/ai-chat'
import { useRole } from '@/hooks/useRole'
import './ai-insights.css'

interface Branch {
  id: string
  name: string
}

interface ConversationSummary {
  id: string
  title: string
  branchId: string | null
  createdAt: string
  updatedAt: string
  preview: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface SavedMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export default function AIInsightsPage() {
  const { isAdmin, branchId: userBranchId } = useRole()
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all')
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)
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

  // 대화 목록 조회 (지점별 필터링)
  const fetchConversations = useCallback(async () => {
    try {
      setListLoading(true)
      const params = new URLSearchParams()
      if (selectedBranchId && selectedBranchId !== 'all') {
        params.set('branchId', selectedBranchId)
      }
      const res = await fetch(`/api/ai/conversations?${params}`)
      const json = await res.json()
      if (json.success) {
        setConversations(json.data)
      }
    } catch {
      console.error('Failed to fetch conversations')
    } finally {
      setListLoading(false)
    }
  }, [selectedBranchId])

  // 지점 변경 시 대화 목록 새로고침 + 새 채팅으로 리셋
  useEffect(() => {
    fetchConversations()
    // 지점 변경 시 현재 대화 초기화
    setSelectedConversationId(null)
    setMessages([])
  }, [fetchConversations])

  // 저장된 대화 선택
  const handleSelectConversation = async (id: string) => {
    try {
      setIsLoading(true)
      const res = await fetch(`/api/ai/conversations/${id}`)
      const json = await res.json()
      if (json.success) {
        setSelectedConversationId(id)
        setMessages(json.data.messages.map((m: SavedMessage) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.createdAt),
        })))
      }
    } catch {
      console.error('Failed to fetch conversation')
    } finally {
      setIsLoading(false)
    }
  }

  // 새 채팅 시작
  const handleNewChat = () => {
    setSelectedConversationId(null)
    setMessages([])
    setInput('')
  }

  // 대화 삭제
  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('이 대화를 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/ai/conversations/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        setConversations(prev => prev.filter(c => c.id !== id))
        if (selectedConversationId === id) {
          handleNewChat()
        }
      }
    } catch {
      console.error('Failed to delete conversation')
    }
  }

  // 선택된 지점 정보
  const selectedBranch = branches.find(b => b.id === selectedBranchId)
  const branchContext: ChatContext = {
    branchId: selectedBranchId === 'all' ? undefined : selectedBranchId,
    branchName: selectedBranchId === 'all' ? '전체 지점' : selectedBranch?.name,
  }

  // 메시지 전송 + 자동 저장
  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMessage: Message = {
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
        const assistantMessage: Message = {
          id: `msg-${Date.now()}-ai`,
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, assistantMessage])

        // 자동 저장
        await saveConversation(userMessage, assistantMessage)
      } else {
        const errorMessage: Message = {
          id: `msg-${Date.now()}-error`,
          role: 'assistant',
          content: data.error || '응답을 받지 못했습니다.',
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } catch {
      const errorMessage: Message = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: '네트워크 오류가 발생했습니다.',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // 대화 자동 저장
  const saveConversation = async (userMsg: Message, assistantMsg: Message) => {
    try {
      if (selectedConversationId) {
        // 기존 대화에 메시지 추가
        await fetch(`/api/ai/conversations/${selectedConversationId}`, {
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
            messages: [
              { role: userMsg.role, content: userMsg.content },
              { role: assistantMsg.role, content: assistantMsg.content },
            ],
          }),
        })
        const json = await res.json()
        if (json.success) {
          setSelectedConversationId(json.data.id)
        }
      }
      // 목록 갱신
      fetchConversations()
    } catch {
      console.error('Failed to save conversation')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return format(date, 'a h:mm', { locale: ko })
    if (diffDays === 1) return '어제'
    if (diffDays < 7) return format(date, 'EEEE', { locale: ko })
    return format(date, 'M월 d일', { locale: ko })
  }

  const formatTime = (date: Date) => format(date, 'a h:mm', { locale: ko })

  const QUICK_PROMPTS = [
    '이번 달 매출 분석해줘',
    '이탈 위험 고객 분석',
    '신규 고객 유치 방안',
    '매출 개선 포인트',
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="ai-insights-container">
        {/* 왼쪽: 대화 목록 */}
        <div className="ai-insights-sidebar">
          <div className="ai-insights-sidebar-header">
            <h1 className="ai-insights-title">AI 인사이트</h1>
            <button onClick={handleNewChat} className="ai-insights-new-btn">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              새 대화
            </button>
          </div>

          <div className="ai-insights-list">
            {listLoading ? (
              <div className="ai-insights-loading">
                <div className="animate-spin w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="ai-insights-empty">
                <p className="text-sm text-gray-400">저장된 대화가 없습니다</p>
              </div>
            ) : (
              conversations.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className={`ai-insights-item ${selectedConversationId === conv.id ? 'ai-insights-item-active' : ''}`}
                >
                  <div className="ai-insights-item-content">
                    <div className="ai-insights-item-title">{conv.title}</div>
                    <div className="ai-insights-item-preview">{conv.preview || '대화 내용 없음'}</div>
                  </div>
                  <div className="ai-insights-item-meta">
                    <span className="ai-insights-item-date">{formatDate(conv.updatedAt)}</span>
                    <button
                      onClick={(e) => handleDeleteConversation(conv.id, e)}
                      className="ai-insights-item-delete"
                      title="삭제"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 오른쪽: 채팅 영역 */}
        <div className="ai-insights-main">
          {/* 헤더 */}
          <div className="ai-chat-header">
            <div className="ai-chat-header-left">
              <h3 className="ai-chat-header-title">AI 슈퍼바이저</h3>
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
                <option value="all">전체 지점</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 메시지 영역 */}
          <div className="ai-chat-messages">
            {messages.length === 0 ? (
              <div className="ai-chat-empty">
                <svg className="ai-chat-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <p className="ai-chat-empty-text">
                  안녕하세요! 실제 매출과 고객 데이터를<br />
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
                    {msg.role === 'assistant' ? (
                      <MarkdownContent content={msg.content} />
                    ) : (
                      <div>{msg.content}</div>
                    )}
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

          {/* 빠른 프롬프트 */}
          {messages.length === 0 && (
            <div className="ai-chat-quick-actions">
              {QUICK_PROMPTS.map(prompt => (
                <button
                  key={prompt}
                  type="button"
                  className="ai-chat-quick-btn"
                  onClick={() => sendMessage(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* 입력 영역 */}
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
      </div>
    </div>
  )
}

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split('\n')
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

    if (!trimmed) {
      flushList()
      return
    }

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

    flushList()
    elements.push(<p key={getKey()} className="ai-md-p">{formatInline(trimmed)}</p>)
  })

  flushList()
  return <div className="ai-md-content">{elements}</div>
}
