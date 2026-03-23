// hooks/useChat.ts — Hook para gestão do estado do chat

'use client'

import { useState, useCallback } from 'react'
import { Message, UrgencyLevel, Language, Disease } from '@/types'

interface ChatState {
  messages: Message[]
  loading: boolean
  urgency: UrgencyLevel
  suspectedDiseases: Disease[]
  consultaId: string | null
  language: Language
}

interface SendMessageOptions {
  message?: string
  imageUrl?: string
  imageContext?: string
}

export function useChat(userId: string) {
  const [state, setState] = useState<ChatState>({
    messages: [],
    loading: false,
    urgency: 'indefinido',
    suspectedDiseases: [],
    consultaId: null,
    language: 'pt',
  })

  const setConsulta = useCallback((id: string, lang: Language) => {
    setState(prev => ({ ...prev, consultaId: id, language: lang, messages: [] }))
  }, [])

  const sendMessage = useCallback(async (opts: SendMessageOptions) => {
    if (!state.consultaId) return
    if (!opts.message && !opts.imageUrl) return

    setState(prev => ({ ...prev, loading: true }))

    // Adicionar mensagem do utilizador ao estado local imediatamente
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: opts.imageUrl
        ? opts.imageContext || 'Imagem clínica enviada'
        : opts.message!,
      timestamp: new Date(),
      imageUrl: opts.imageUrl,
    }

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMsg],
    }))

    try {
      const history = state.messages.map(m => ({
        role: m.role,
        content: m.content,
      }))

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultaId: state.consultaId,
          message: opts.imageUrl ? undefined : opts.message,
          imageUrl: opts.imageUrl,
          imageContext: opts.imageContext,
          history,
          language: state.language,
        }),
      })

      const data = await res.json()

      if (data.content) {
        const aiMsg: Message = {
          id: data.message?.id || crypto.randomUUID(),
          role: 'assistant',
          content: data.content,
          timestamp: new Date(),
          urgency: data.urgency,
          diseases: data.diseases,
        }

        setState(prev => ({
          ...prev,
          messages: [...prev.messages, aiMsg],
          urgency: data.urgency || prev.urgency,
          suspectedDiseases: data.diseases || prev.suspectedDiseases,
          loading: false,
        }))
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      setState(prev => ({ ...prev, loading: false }))
    }
  }, [state.consultaId, state.messages, state.language])

  const generatePDF = useCallback(async () => {
    if (!state.consultaId) return null

    const res = await fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        consultaId: state.consultaId,
        userId,
        language: state.language,
      }),
    })

    if (!res.ok) return null

    const blob = await res.blob()
    return blob
  }, [state.consultaId, userId, state.language])

  const reset = useCallback(() => {
    setState({
      messages: [],
      loading: false,
      urgency: 'indefinido',
      suspectedDiseases: [],
      consultaId: null,
      language: 'pt',
    })
  }, [])

  return {
    ...state,
    setConsulta,
    sendMessage,
    generatePDF,
    reset,
  }
}
