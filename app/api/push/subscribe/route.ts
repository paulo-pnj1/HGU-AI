// app/api/push/subscribe/route.ts — Guardar subscrição push do paciente

import { NextRequest, NextResponse } from 'next/server'
import { db as getDb } from '@/lib/firebase-server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { patientCode, subscription } = await req.json()

    if (!patientCode || !subscription?.endpoint) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    const adminDb = getDb()

    // Guardar subscrição associada ao código do paciente
    await adminDb.collection('push_subscriptions').doc(patientCode).set({
      patientCode,
      subscription,
      updatedAt: new Date(),
    }, { merge: true })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro ao guardar subscrição push:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}