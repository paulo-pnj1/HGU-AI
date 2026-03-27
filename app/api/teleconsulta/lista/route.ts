// app/api/teleconsulta/lista/route.ts-Listar e actualizar teleconsultas (uso interno)

import { NextRequest, NextResponse } from 'next/server'
import { db as getDb } from '@/lib/firebase-server'

export const dynamic = 'force-dynamic'


export async function GET(req: NextRequest) {
  try {
    const adminDb    = getDb()
    const patientCode = req.nextUrl.searchParams.get('patientCode')

    let snap
    if (patientCode) {
      // Busca por código de paciente-para recuperar perfil em novo dispositivo
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
    const { id, profissionalId } = await req.json()
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

    const adminDb = getDb()
    await adminDb.collection('teleconsultas').doc(id).update({
      status:      'revisada',
      revisadoPor: profissionalId || null,
      revisadaEm:  new Date(),
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro ao marcar teleconsulta:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}