// app/api/transcribe/route.ts — STT via Groq Whisper (suporta línguas africanas)
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY!,
  baseURL: 'https://api.groq.com/openai/v1',
})

export const dynamic = 'force-dynamic'

// Línguas com suporte nativo no Whisper — passamos language explicitamente
const WHISPER_NATIVE: Record<string, string> = {
  pt: 'pt', en: 'en', fr: 'fr', es: 'es', sw: 'sw',
}

// Para línguas africanas sem suporte nativo, usamos auto-detect + prompt contextual
// O prompt NÃO deve traduzir — apenas orienta o Whisper sobre o vocabulário esperado
const WHISPER_PROMPT: Record<string, string> = {
  kg: 'Transcribe spoken Kikongo from Angola/DRC. Common words: nitu, ntima, mbevo, luvunu, kinsukusuku, nzunga, moyo, makalu, ntu, vumu.',
  ln: 'Transcribe spoken Lingala from DRC/Congo. Common words: koleka, mosala, mabele, mai, mboka, eloko, biso, yo, ye, na, te.',
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const audio    = formData.get('audio') as File | null
    const lang     = formData.get('lang') as string || 'pt'

    if (!audio) return NextResponse.json({ error: 'áudio obrigatório' }, { status: 400 })

    const nativeLang = WHISPER_NATIVE[lang]
    const prompt     = WHISPER_PROMPT[lang]

    // Constrói o pedido — language só para línguas suportadas nativamente
    const requestParams: any = {
      file:            audio,
      model:           'whisper-large-v3',
      response_format: 'verbose_json', // devolve também detected_language
      temperature:     0.0,
    }

    if (nativeLang) {
      // Língua suportada: força o idioma correto
      requestParams.language = nativeLang
    } else if (prompt) {
      // Língua africana: auto-detect com prompt contextual para guiar vocabulário
      requestParams.prompt = prompt
    }

    const transcription = await groq.audio.transcriptions.create(requestParams) as any

    const text     = transcription.text?.trim() || ''
    const detected = transcription.language || lang

    return NextResponse.json({ text, detected_language: detected })
  } catch (err: any) {
    console.error('Erro Whisper:', err)
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}