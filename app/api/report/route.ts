// app/api/report/route.ts-Geração de relatório PDF

import { NextRequest, NextResponse } from 'next/server'
import { gerarResumoConsulta } from '@/lib/grok'
import { gerarRelatorioPDF } from '@/lib/pdf'
import {
  getConsulta,
  getProfissional,
  marcarRelatorioGerado,
} from '@/lib/firebase-server'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { Language } from '@/types'

export const dynamic = 'force-dynamic'


export async function POST(req: NextRequest) {
  try {
    const {
      consultaId,
      userId,
      language = 'pt',
    }: {
      consultaId: string
      userId: string
      language: Language
    } = await req.json()

    const [consulta, profissional] = await Promise.all([
      getConsulta(consultaId),
      getProfissional(userId),
    ])

    if (!consulta) {
      return NextResponse.json({ error: 'Consulta não encontrada' }, { status: 404 })
    }
    if (!profissional) {
      return NextResponse.json({ error: 'Profissional não encontrado' }, { status: 404 })
    }

    // Preparar histórico com tipos correctos
    const history: ChatCompletionMessageParam[] = consulta.messages
      .filter((m: any) => m.role !== 'system')
      .map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content as string,
      }))

    const resumoIA = await gerarResumoConsulta(history, language)

    const pdfBlob = await gerarRelatorioPDF(consulta, profissional, resumoIA)

    await marcarRelatorioGerado(consultaId)

    const pdfBuffer = await pdfBlob.arrayBuffer()

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="relatorio-${consultaId.slice(0, 8)}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('Erro a gerar relatório:', error?.message)
    return NextResponse.json(
      { error: 'Erro ao gerar relatório', detalhe: error?.message },
      { status: 500 }
    )
  }
}