// app/api/teleconsulta/lista/route.ts — Listar e actualizar teleconsultas (uso interno)

import { NextRequest, NextResponse } from 'next/server'
import { db as getDb } from '@/lib/firebase-server'
import { enviarNotificacaoPush } from '@/lib/webpush'

export const dynamic = 'force-dynamic'


export async function GET(req: NextRequest) {
  try {
    const adminDb    = getDb()
    const patientCode = req.nextUrl.searchParams.get('patientCode')

    let snap
    if (patientCode) {
      // Busca por código de paciente — para recuperar perfil em novo dispositivo
      snap = await adminDb
        .collection('teleconsultas')
        .where('patientCode', '==', patientCode.toUpperCase())
        .limit(10)
        .get()
    } else {
      snap = await adminDb
        .collection('teleconsultas')
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get()
    }

    const teleconsultas = snap.docs
      .map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt }))
      .sort((a: any, b: any) => {
        const ta = a.createdAt?._seconds ?? a.createdAt?.seconds ?? 0
        const tb = b.createdAt?._seconds ?? b.createdAt?.seconds ?? 0
        return tb - ta
      })

    return NextResponse.json({ teleconsultas })
  } catch (error) {
    console.error('Erro ao listar teleconsultas:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, profissionalId, notaEspecialista, encaminharPresencial } = await req.json()
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

    const adminDb = getDb()

    // Construir a actualização base
    const update: Record<string, any> = {
      status:      'revisada',
      revisadoPor: profissionalId || null,
      revisadaEm:  new Date(),
    }

    // Adicionar nota do especialista se fornecida
    if (notaEspecialista?.trim()) {
      update.notaEspecialista = notaEspecialista.trim()

      // Adicionar a nota como mensagem no histórico da teleconsulta
      const snap = await adminDb.collection('teleconsultas').doc(id).get()
      const messages = snap.data()?.messages || []
      messages.push({
        id:        `especialista-${Date.now()}`,
        role:      'especialista',
        content:   notaEspecialista.trim(),
        timestamp: new Date(),
      })
      update.messages = messages
    }

    // Marcar encaminhamento presencial se indicado
    if (encaminharPresencial !== undefined) {
      update.encaminharPresencial = encaminharPresencial
    }

    await adminDb.collection('teleconsultas').doc(id).update(update)

    // Enviar notificação push ao paciente
    try {
      const tc = await adminDb.collection('teleconsultas').doc(id).get()
      const patientCode = tc.data()?.patientCode
      if (patientCode) {
        const subDoc = await adminDb.collection('push_subscriptions').doc(patientCode).get()
        if (subDoc.exists) {
          const subscription = subDoc.data()?.subscription
          if (subscription) {
            const temNota       = !!(notaEspecialista?.trim())
            const temEncaminhar = !!encaminharPresencial
            const corpo = temEncaminhar
              ? 'O seu médico recomenda consulta presencial no HGU. Abra a app para mais detalhes.'
              : temNota
                ? 'O especialista deixou uma nota clínica para si. Abra a app para ver.'
                : 'A sua teleconsulta foi revista por um especialista do HGU.'
            await enviarNotificacaoPush(subscription, '🏥 Teleconsulta Revista', corpo, { patientCode })
          }
        }
      }
    } catch (pushErr) {
      console.warn('Push não enviado:', pushErr)
      // Não falhar a requisição por causa do push
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro ao marcar teleconsulta:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}