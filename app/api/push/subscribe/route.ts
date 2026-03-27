// app/api/push/subscribe/route.ts — Guardar subscrição push do paciente

import { NextRequest, NextResponse } from 'next/server'
import { db as getDb } from '@/lib/firebase-server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { patientCode, patientName, subscription } = await req.json()

    if (!patientCode || !subscription?.endpoint) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    const adminDb = getDb()

    // Guardar subscrição pelo código do paciente
    await adminDb.collection('push_subscriptions').doc(patientCode).set({
      patientCode,
      patientName: patientName || null,
      subscription,
      updatedAt: new Date(),
    }, { merge: true })

    // Se tem nome, guardar também pelo nome (normalizado) para busca cruzada
    if (patientName) {
      const nomeKey = patientName.trim().toLowerCase().replace(/\s+/g, '_')
      await adminDb.collection('push_subscriptions_nome').doc(nomeKey).set({
        patientCode,
        patientName,
        subscription,
        updatedAt: new Date(),
      }, { merge: true })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro ao guardar subscrição push:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}