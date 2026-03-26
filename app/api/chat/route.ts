// app/api/chat/route.ts — API Route para chat com Grok

import { NextRequest, NextResponse } from 'next/server'
import { chatComGrok, analisarImagemClinica, GrokMessage } from '@/lib/grok'
// Substitui no TOPO do ficheiro as importações do Firebase:
import {
  adicionarMensagem,
  actualizarUrgencia,
  getConsulta,
} from '@/lib/firebase-server'
import { Language } from '@/types'

export const dynamic = 'force-dynamic'


export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      consultaId,
      message,
      imageUrl,
      imageContext,
      history,
      language = 'pt',
    }: {
      consultaId: string
      message?: string
      imageUrl?: string
      imageContext?: string
      history: GrokMessage[]
      language: Language
    } = body

    if (!consultaId) {
      return NextResponse.json({ error: 'consultaId obrigatório' }, { status: 400 })
    }

    // Verificar se a consulta existe
    const consulta = await getConsulta(consultaId)
    if (!consulta) {
      return NextResponse.json({ error: 'Consulta não encontrada' }, { status: 404 })
    }

    let aiResponse: { content: string; urgency: any; diseases: any[]; contactoMedico?: boolean; especialidadeSugerida?: string }

    if (imageUrl && imageContext) {
      // Análise de imagem clínica
      await adicionarMensagem(consultaId, {
        role: 'user',
        content: `[Imagem clínica enviada] ${imageContext}`,
        timestamp: new Date(),
        imageUrl,
      })

      aiResponse = await analisarImagemClinica(imageUrl, imageContext, language)
    } else if (message) {
      // Chat de texto normal
      const userMsg = {
        role: 'user' as const,
        content: message,
      }

      await adicionarMensagem(consultaId, {
        role: 'user',
        content: message,
        timestamp: new Date(),
      })

      const messagesParaGrok: GrokMessage[] = [...history, userMsg]
      aiResponse = await chatComGrok(messagesParaGrok, language)
    } else {
      return NextResponse.json({ error: 'Mensagem ou imagem obrigatória' }, { status: 400 })
    }

    // Guardar resposta da IA no Firestore
    const aiMsg = await adicionarMensagem(consultaId, {
      role: 'assistant',
      content: aiResponse.content,
      timestamp: new Date(),
      urgency: aiResponse.urgency,
      diseases: aiResponse.diseases,
    })

    // Actualizar urgência e doenças suspeitas na consulta
    await actualizarUrgencia(consultaId, aiResponse.urgency, aiResponse.diseases)

    return NextResponse.json({
      message: aiMsg,
      urgency: aiResponse.urgency,
      diseases: aiResponse.diseases,
      content: aiResponse.content,
      contactoMedico: aiResponse.contactoMedico || false,
      especialidadeSugerida: aiResponse.especialidadeSugerida || null,
    })
  } catch (error) {
    console.error('Erro na API de chat:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}