// app/api/teleconsulta/route.ts — API para teleconsulta pública de pacientes

import { NextRequest, NextResponse } from 'next/server'
import { chatComGrok, GrokMessage } from '@/lib/grok'
import {
  adicionarMensagem,
  actualizarUrgencia,
  db as getDb,
} from '@/lib/firebase-server'
import { Language } from '@/types'

// Gera código único de paciente remoto
function gerarCodigoPaciente(): string {
  const ano = new Date().getFullYear()
  const n   = Math.floor(1000 + Math.random() * 9000)
  return `TC-${ano}-${n}`
}

// Mensagem de boas-vindas personalizada
function welcomeMsg(nome: string, lang: Language, dados: any): string {
  const contexto = [
    dados.idade  ? (lang === 'pt' ? `${dados.idade} anos` : `bambula ${dados.idade}`) : null,
    dados.sexo === 'M' ? (lang === 'pt' ? 'sexo masculino' : 'bakala') : null,
    dados.sexo === 'F' ? (lang === 'pt' ? 'sexo feminino' : 'nkento') : null,
    dados.gravidez ? (lang === 'pt'
      ? `grávida${dados.semanasGestacao ? ` (${dados.semanasGestacao} semanas)` : ''}`
      : `wayala nkento${dados.semanasGestacao ? ` (${dados.semanasGestacao} lumbu)` : ''}`) : null,
    dados.municipio ? (lang === 'pt' ? `de ${dados.municipio}` : `ku ${dados.municipio}`) : null,
  ].filter(Boolean).join(', ')

  if (lang === 'pt') {
    return `Olá, **${nome}**! 👋\n\nBem-vindo(a) à teleconsulta do Hospital Geral do Uíge${contexto ? ` *(${contexto})*` : ''}.\n\nSou um assistente de saúde com IA. Vou ajudá-lo(a) a descrever os seus sintomas e orientá-lo(a) sobre o que fazer. **Esta consulta ficará registada e será revisada por um profissional de saúde.**\n\n🩺 **Como posso ajudá-lo(a) hoje? Descreva o que está a sentir.**`
  }
  return `Mbote, **${nome}**! 👋\n\nSantu ku teleconsulta ya Hospitalu ya Uíge${contexto ? ` *(${contexto})*` : ''}.\n\nNgai mfundisi ya nkanda ya luzailu ya moyo. Nakusadilila ku longumuka masumu maku.\n\n🩺 **Nki nki zolaka lelo? Longumuka masumu maku.**`
}

// System prompt para pacientes (mais simples, sem jargão médico)
function systemPromptPaciente(lang: Language, patient: any): string {
  const nome     = patient?.nome    || 'Paciente'
  const idade    = patient?.idade   ? `${patient.idade} anos` : 'idade não informada'
  const sexo     = patient?.sexo    === 'M' ? 'masculino' : patient?.sexo === 'F' ? 'feminino' : 'não informado'
  const gravidez = patient?.gravidez ? `grávida (${patient.semanasGestacao || '?'} semanas)` : 'não'
  const mun      = patient?.municipio || 'Uíge'

  if (lang === 'pt') {
    return `Você é um assistente de saúde do Hospital Geral do Uíge (HGU), em Angola.
Está a atender uma teleconsulta de um PACIENTE (não profissional de saúde) que está em casa.

Dados do paciente:
- Nome: ${nome}
- Idade: ${idade}
- Sexo: ${sexo}
- Grávida: ${gravidez}
- Município: ${mun}

REGRAS IMPORTANTES:
1. Use linguagem SIMPLES e CLARA — o paciente não é médico.
2. Seja empático, calmo e tranquilizador.
3. Faça UMA pergunta de cada vez sobre sintomas.
4. Avalie os sintomas considerando doenças prevalentes em Angola: paludismo, tuberculose, diarreia aguda, infeções respiratórias, saúde materna.
5. No final de cada resposta, classifique a urgência com um destes marcadores EXATOS no JSON:
   {"urgency":"verde","diseases":[]} — não urgente
   {"urgency":"amarelo","diseases":["paludismo"]} — urgente
   {"urgency":"vermelho","diseases":["tuberculose"]} — emergência
6. Se houver risco de vida (sinais de malária grave, hemorragia, dificuldade respiratória grave), diga CLARAMENTE para ir ao hospital/ligar 112.
7. Nunca prescreva medicamentos específicos com dosagens. Pode mencionar o nome genérico.
8. Termine sempre com uma instrução clara sobre o que fazer.`
  }

  return `Ngeye mfundisi ya moyo ya Hospitalu ya Uíge (HGU), na Angola.
Yobe na teleconsulta ya muntu (ko ya ngangu ya moyo) wowo wena na ndumba.

Bilumbu bya muntu:
- Nkombo: ${nome}
- Bambula: ${idade}
- Nsiku: ${sexo}
- Wayala nkento: ${gravidez}
- Ndako: ${mun}

MAMBU MAKULU:
1. Sadila maloba MAMPASI — muntu ko ya ngangu ya moyo.
2. Keba na lusungi, kisusu.
3. Banza MOSI ya luzailu ya masumu.
4. Keba masumu ya mbandu ya Angola: paludismo, tuberculose, masana, mpasi ya kuvemuka, moyo ya nkento.
5. Na nsuka ya diaka, bimba urgência mu JSON:
   {"urgency":"verde","diseases":[]} — ko ya nsiku
   {"urgency":"amarelo","diseases":["paludismo"]} — ya nsiku
   {"urgency":"vermelho","diseases":["tuberculose"]} — nsusu
6. Soki moyo mu nsusu, yeba kwa nenda ku hospitalu/benga 112.
7. Ko sala ndele ya ndelo ya nzambi. Wenda longuka nkombo ya kilabo.`
}

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json()
    const action: 'criar' | 'chat' = body.action

    // ── Criar nova teleconsulta ────────────────────────────────
    if (action === 'criar') {
      const {
        nome, idade, sexo, municipio, telefone,
        gravidez, semanasGestacao, language = 'pt',
      } = body

      const patientCode = gerarCodigoPaciente()

      // Guardar no Firestore na colecção 'teleconsultas' via Admin SDK
      const adminDb = getDb()
      const ref = await adminDb.collection('teleconsultas').add({
        patientCode,
        patientName: nome,
        patientAge:  idade || null,
        patientSex:  sexo  || null,
        municipio:   municipio,
        telefone:    telefone || null,
        gravidez:    gravidez || false,
        semanasGestacao: semanasGestacao || null,
        language,
        messages:    [],
        urgency:     'indefinido',
        suspectedDiseases: [],
        tipo:        'remota',
        status:      'activa',
        createdAt:   new Date(),
        updatedAt:   new Date(),
        reportGenerated: false,
        revisadoPor: null,
      })

      const welcome = welcomeMsg(nome, language, { idade, sexo, gravidez, semanasGestacao, municipio })

      // Guardar mensagem de boas-vindas
      await adicionarMensagem(ref.id, {
        role: 'assistant',
        content: welcome,
        timestamp: new Date(),
      }, 'teleconsultas')

      return NextResponse.json({ consultaId: ref.id, patientCode, welcome })
    }

    // ── Chat da teleconsulta ───────────────────────────────────
    if (action === 'chat') {
      const {
        consultaId,
        message,
        history,
        language = 'pt',
        patientContext,
      } = body

      if (!consultaId || !message) {
        return NextResponse.json({ error: 'consultaId e message obrigatórios' }, { status: 400 })
      }

      // Guardar mensagem do paciente
      await adicionarMensagem(consultaId, {
        role: 'user',
        content: message,
        timestamp: new Date(),
      }, 'teleconsultas')

      // Construir histórico com system prompt adequado para pacientes
      const sysPrompt = systemPromptPaciente(language, patientContext)
      const msgs: GrokMessage[] = [
        ...history,
        { role: 'user', content: message },
      ]

      const aiResponse = await chatComGrok(msgs, language, sysPrompt)

      // Guardar resposta da IA
      await adicionarMensagem(consultaId, {
        role: 'assistant',
        content: aiResponse.content,
        timestamp: new Date(),
        urgency: aiResponse.urgency,
        diseases: aiResponse.diseases,
      }, 'teleconsultas')

      // Actualizar urgência
      await actualizarUrgencia(consultaId, aiResponse.urgency, aiResponse.diseases, 'teleconsultas')

      return NextResponse.json({
        content:  aiResponse.content,
        urgency:  aiResponse.urgency,
        diseases: aiResponse.diseases,
      })
    }

    return NextResponse.json({ error: 'Acção inválida' }, { status: 400 })

  } catch (error) {
    console.error('Erro na API teleconsulta:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
