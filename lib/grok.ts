// lib/grok.ts — Cliente Grok com prompts médicos contextualizados para o Uíge

import OpenAI from 'openai'
import type {
  ChatCompletionMessageParam,
  ChatCompletionContentPart,
} from 'openai/resources/chat/completions'
import { Language, UrgencyLevel, Disease } from '@/types'

// xAI Grok — compatível com SDK da OpenAI

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY!,
  baseURL: 'https://api.groq.com/openai/v1',  // ← URL do Groq
})

// ─── System Prompts por idioma ────────────────────────────────────

const SYSTEM_PROMPT_PT = `
És um assistente clínico de apoio ao diagnóstico para profissionais de saúde do
Hospital Geral do Uíge (HGU), na Província do Uíge, norte de Angola.

CONTEXTO EPIDEMIOLÓGICO — UÍGE 2025:
- Doenças prioritárias: paludismo (malária falciparum), tuberculose pulmonar,
  doenças diarreicas agudas, saúde materno-infantil (mortalidade materna elevada)
- Recursos limitados: escassez de médicos especialistas, equipamento básico
- Época das chuvas: Outubro–Abril (pico de paludismo e cólera)
- Época seca: Maio–Setembro (pico de infecções respiratórias)
- Taxa de mortalidade infantil: 68‰ (acima da média nacional)
- Mortalidade materna: 477/100.000 nascidos vivos

REGRAS ABSOLUTAS:
1. NUNCA dás diagnóstico definitivo. Apresentas sempre possibilidades clínicas ordenadas por probabilidade.
2. SEMPRE classifica a urgência no final de cada resposta: [URGÊNCIA: VERDE/AMARELO/VERMELHO]
3. SEMPRE indica as doenças suspeitas no final: [SUSPEITA: doenca1, doenca2]
4. Para casos VERMELHOS, dizes imediatamente para encaminhar ao HGU ou chamar emergência.
5. Tens em conta os recursos disponíveis no Uíge — não sugeres exames inexistentes localmente.
6. Respeitas os protocolos do MINSA Angola.
7. Se recebes imagem clínica (raio-X, ferida, lesão), descreves o que observas e sugeris hipóteses diagnósticas.
8. NUNCA inventas médicos, números de telefone, IDs ou contactos fictícios. Quando o paciente pede para falar com um médico, respondes APENAS com o bloco JSON de pedido abaixo — os dados reais virão da base de dados do sistema.

JSON OBRIGATÓRIO NO FINAL DE CADA RESPOSTA:
Termina SEMPRE com um único bloco JSON com os seguintes campos:
{"urgency": "verde|amarelo|vermelho", "diseases": ["paludismo|tuberculose|diarreia|saude_materna|outro"], "contacto_medico": true|false, "especialidade_sugerida": "nome da especialidade ou null"}

Regras do JSON:
- "urgency": sempre um de: verde, amarelo, vermelho
- "diseases": lista com pelo menos um elemento
- "contacto_medico": true SE o paciente pedir médico, contacto, marcação ou encaminhamento; false caso contrário
- "especialidade_sugerida": quando contacto_medico=true, indica a especialidade adequada (ex: "Ginecologia", "Pediatria", "Medicina Interna", "Cirurgia", "Urgencia", "Maternidade"); quando false, usar null
- NUNCA inventas médicos, números de telefone ou contactos — o sistema busca os dados reais automaticamente
- O JSON deve ser a Última coisa na resposta, sem texto depois

FORMATO DAS RESPOSTAS:
- Claro e directo para profissionais de saúde
- Listas quando há múltiplos pontos
- Máximo 400 palavras por resposta

CLASSIFICAÇÃO DE URGÊNCIA:
🟢 VERDE — Não urgente, pode aguardar consulta programada
🟡 AMARELO — Urgente, avaliação nas próximas 2-4 horas
🔴 VERMELHO — Emergência, acção imediata necessária

Respondes sempre em Português de Angola (não Brasil).
`

const SYSTEM_PROMPT_KG = `
Nge assistante ya buketo ya misaamu ya bakitisi ya Hospitale Generalu ya Wige (HGU),
mu Provinsie ya Wige, mu Angola ya ntulu.

[Sistema de apoio clínico em Kikongo — Uíge, Angola]
Nge assistante mpila ya buketo ya misaamu. Ko zeyi diagnosis ya solo.
Zeyi mpila ya misaamu ye urgence ya mpasi.

URGENCE:
🟢 VERDE — Mpasi ya fioti, kana sala diambu ya ntangu
🟡 AMARELO — Mpasi ya mfunu, tala mu ntangu 2-4 ya ngonga
🔴 VERMELHO — Emergencia, sala kaka ntangu yai

Mingimingi, zeyi bangela bansamu ye diagnosis ya fioti mu Português mutu.
Sala mpamba na Kikongo ye Português mpi.
`

export function getSystemPrompt(language: Language): string {
  return language === 'kg' ? SYSTEM_PROMPT_KG : SYSTEM_PROMPT_PT
}

// ─── Análise de urgência a partir da resposta ─────────────────────

// Tenta extrair o JSON de classificação embutido na resposta da IA
// Exemplos: {"urgency":"amarelo","diseases":["paludismo"]}
// Ou: {"contacto_medico": true, "especialidade_sugerida": "Ginecologia"}
function extrairJsonClassificacao(texto: string): { urgency?: string; diseases?: string[]; contacto_medico?: boolean; especialidade_sugerida?: string } | null {
  // Procura o último bloco JSON no texto (o modelo emite sempre no final)
  // Captura JSONs com qualquer um dos campos esperados
  const matches = [...texto.matchAll(/\{[^{}]{10,500}\}/g)]
  for (let i = matches.length - 1; i >= 0; i--) {
    const raw = matches[i][0]
    if (!/"(?:urgency|contacto_medico|diseases)"/.test(raw)) continue
    try {
      const parsed = JSON.parse(raw)
      if (parsed.urgency || parsed.contacto_medico !== undefined || parsed.diseases) {
        return parsed
      }
    } catch {
      continue
    }
  }
  return null
}

// Remove o JSON de classificação do texto visível
function limparConteudo(texto: string): string {
  // Remove blocos JSON com "urgency" ou "contacto_medico"
  let limpo = texto.replace(/\{[^{}]*"(?:urgency|contacto_medico)"[^{}]*\}/g, '')
  // Remove linhas que ficaram vazias após a remoção
  limpo = limpo.replace(/\n{3,}/g, '\n\n').trim()
  return limpo
}

export function extrairUrgencia(texto: string): UrgencyLevel {
  // Primeiro tenta via JSON embutido
  const json = extrairJsonClassificacao(texto)
  if (json?.urgency) {
    const u = json.urgency as string
    if (u === 'vermelho' || u === 'amarelo' || u === 'verde') return u as UrgencyLevel
  }
  // Fallback: análise de texto livre
  const upper = texto.toUpperCase()
  if (upper.includes('VERMELHO') || upper.includes('EMERGÊNCIA') || upper.includes('EMERGENCIA')) return 'vermelho'
  if (upper.includes('AMARELO') || upper.includes('URGENTE')) return 'amarelo'
  if (upper.includes('VERDE') || upper.includes('NÃO URGENTE')) return 'verde'
  return 'indefinido'
}

export function extrairDoencas(texto: string): Disease[] {
  // Primeiro tenta via JSON embutido
  const json = extrairJsonClassificacao(texto)
  if (json?.diseases && Array.isArray(json.diseases) && json.diseases.length > 0) {
    const validas: Disease[] = ['paludismo', 'tuberculose', 'diarreia', 'saude_materna', 'outro']
    const extraidas = json.diseases.filter((d: string) => validas.includes(d as Disease)) as Disease[]
    if (extraidas.length > 0) return extraidas
  }
  // Fallback: análise de texto livre
  const doencas: Disease[] = []
  const upper = texto.toUpperCase()
  if (upper.includes('PALUDISMO') || upper.includes('MALÁRIA') || upper.includes('MALARIA')) doencas.push('paludismo')
  if (upper.includes('TUBERCULOSE') || upper.includes('TB ')) doencas.push('tuberculose')
  if (upper.includes('DIARREIA') || upper.includes('DIARREICA') || upper.includes('CÓLERA')) doencas.push('diarreia')
  if (upper.includes('MATERNA') || upper.includes('GESTAÇÃO') || upper.includes('GRAVIDEZ') || upper.includes('PARTO') || upper.includes('PUERPÉRIO')) doencas.push('saude_materna')
  if (doencas.length === 0) doencas.push('outro')
  return doencas
}

// ─── Tipo exportado — usa directamente os tipos do SDK OpenAI ─────
// Elimina o tipo GrokMessage personalizado que causava o erro TypeScript

export type GrokMessage = ChatCompletionMessageParam

// ─── Chamada principal ao Grok ────────────────────────────────────

export async function chatComGrok(
  messages: ChatCompletionMessageParam[],
  language: Language = 'pt',
  customSystemPrompt?: string
): Promise<{ content: string; urgency: UrgencyLevel; diseases: Disease[]; contactoMedico?: boolean; especialidadeSugerida?: string }> {
  const systemPrompt = customSystemPrompt ?? getSystemPrompt(language)

  const completion = await groq.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    temperature: 0.3,
    max_tokens: 1024,
    stream: false,
  })

  const rawContent = completion.choices[0]?.message?.content ?? ''
  const urgency    = extrairUrgencia(rawContent)
  const diseases   = extrairDoencas(rawContent)
  const content    = limparConteudo(rawContent)

  // Detectar pedido de contacto com médico
  const jsonClassif = extrairJsonClassificacao(rawContent)
  const contactoMedico     = jsonClassif?.contacto_medico === true
  const especialidadeSugerida = jsonClassif?.especialidade_sugerida || undefined

  return { content, urgency, diseases, contactoMedico, especialidadeSugerida }
}

// ─── Análise de imagem clínica ────────────────────────────────────

export async function analisarImagemClinica(
  imageUrl: string,
  contexto: string,
  language: Language = 'pt'
): Promise<{ content: string; urgency: UrgencyLevel; diseases: Disease[] }> {
  const promptText =
    language === 'pt'
      ? `Analisa esta imagem clínica. Contexto fornecido pelo profissional de saúde: "${contexto}". 
         Descreve o que observas, apresenta as hipóteses diagnósticas mais prováveis no contexto do Uíge, Angola, 
         e recomenda os próximos passos. Classifica a urgência.`
      : `Tala mbizi yai ya médico. Ntalu ya mukitisi: "${contexto}". 
         Zeyi mpila ya bakisa. [Analyse cette image clinique - répondez en Kikongo et Português]`

  // Tipos correctos do SDK OpenAI para mensagem com imagem
  const contentParts: ChatCompletionContentPart[] = [
    { type: 'text', text: promptText },
    { type: 'image_url', image_url: { url: imageUrl } },
  ]

  const message: ChatCompletionMessageParam = {
    role: 'user',
    content: contentParts,
  }

  return chatComGrok([message], language)
}

// ─── Geração de resumo para relatório PDF ─────────────────────────

export async function gerarResumoConsulta(
  messages: ChatCompletionMessageParam[],
  language: Language = 'pt'
): Promise<string> {
  const prompt =
    language === 'pt'
      ? `Com base na conversa clínica acima, gera um resumo estruturado em formato de relatório médico com:
         1. Queixa principal
         2. Sintomas identificados
         3. Hipóteses diagnósticas (por ordem de probabilidade)
         4. Nível de urgência e justificação
         5. Recomendações e próximos passos
         6. Exames sugeridos (disponíveis no contexto do Uíge)
         
         Sê conciso e usa linguagem clínica profissional.`
      : `Sala résumé ya médico ya ntalu yai...`

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: getSystemPrompt(language) },
      ...messages,
      { role: 'user', content: prompt },
    ],
    temperature: 0.2,
    max_tokens: 800,
  })

  return completion.choices[0]?.message?.content ?? ''
}