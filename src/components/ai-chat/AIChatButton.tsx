'use client'

import { memo } from 'react'
import './AIChat.css'

interface AIChatButtonProps {
  onClick: () => void
  isOpen: boolean
}

function AIChatButtonInner({ onClick, isOpen }: AIChatButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`ai-chat-fab ${isOpen ? 'ai-chat-fab-open' : ''}`}
      title="AI 인사이트"
    >
      {isOpen ? (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      ) : (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <path d="M12 7v2" />
          <path d="M12 13h.01" />
        </svg>
      )}
    </button>
  )
}

export const AIChatButton = memo(AIChatButtonInner)
