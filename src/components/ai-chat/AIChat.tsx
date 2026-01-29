'use client'

import { useState, memo } from 'react'
import { AIChatButton } from './AIChatButton'
import { AIChatPanel } from './AIChatPanel'
import { ChatContext } from '@/types/ai-chat'

interface AIChatProps {
  context?: ChatContext
}

function AIChatInner({ context }: AIChatProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {isOpen && <AIChatPanel context={context} />}
      <AIChatButton onClick={() => setIsOpen(!isOpen)} isOpen={isOpen} />
    </>
  )
}

export const AIChat = memo(AIChatInner)
