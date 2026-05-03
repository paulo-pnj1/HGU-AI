// app/api/translate/route.ts — Tradução bidirecional médica
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY!,
  baseURL: 'https://api.groq.com/openai/v1',
})

export const dynamic = 'force-dynamic'

const LANG_NAME: Record<string, string> = {
  pt: 'Português de Angola (pt-AO)',
  en: 'Inglês',
  fr: 'Francês',
  es: 'Espanhol',
  kg: 'Kikongo (língua Bantu de Angola/RDC)',
  ln: 'Lingala (língua Bantu da RDC/Congo)',
  sw: 'Swahili',
}

export async function POST(req: NextRequest) {
  try {
    const { text, sourceLang, targetLang } = await req.json()
    if (!text?.trim()) return NextResponse.json({ error: 'texto obrigatório' }, { status: 400 })

    const from = LANG_NAME[sourceLang] || sourceLang || 'língua desconhecida'
    const to   = LANG_NAME[targetLang] || targetLang || 'Português de Angola'

    // Para línguas africanas, o texto pode chegar parcialmente em Francês (fallback do Whisper)
    // Instruímos o modelo a lidar com isso
    const africanLangs = new Set(['kg', 'ln'])
    const sourceIsAfrican = africanLangs.has(sourceLang)

    const systemPrompt = sourceIsAfrican
      ? `És um tradutor médico especializado em línguas Bantu de Angola e da RDC.
O texto de entrada é em ${from}. PODE conter mistura com Francês ou Português — trata todo o texto como sendo da mesma língua de origem e traduz o SIGNIFICADO completo para ${to}.
Mantém rigor clínico. Responde APENAS com o texto traduzido, sem explicações, sem aspas, sem prefixos.`
      : `És um tradutor médico preciso. Traduz de ${from} para ${to}.
Mantém o significado clínico rigoroso. Responde APENAS com o texto traduzido, sem explicações, sem notas, sem aspas.`

    const completion = await groq.chat.completions.create({
      model:      'llama-3.3-70b-versatile',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: text },
      ],
    })

    const translated = completion.choices[0]?.message?.content?.trim() || text
    return NextResponse.json({ translated })
  } catch (err: any) {
    console.error('Erro na tradução:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}