// app/api/teleconsulta/paciente/route.ts
// GET  ?nome=XYZ  — listar teleconsultas do paciente
// DELETE ?id=XYZ  — eliminar teleconsulta

import { NextRequest, NextResponse } from 'next/server'
import { db as getDb } from '@/lib/firebase-server'

export async function GET(req: NextRequest) {
  const nome = req.nextUrl.searchParams.get('nome')
  if (!nome) return NextResponse.json({ error: 'nome obrigatório' }, { status: 400 })

  try {
    const adminDb = getDb()
    // Sem orderBy para evitar necessidade de índice composto no Firestore
    const snap = await adminDb
      .collection('teleconsultas')
      .where('patientName', '==', nome)
      .limit(50)
      .get()

    // Ordenar em memória por data decrescente
    const teleconsultas = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => {
        const ta = a.createdAt?._seconds ?? a.createdAt?.seconds ?? 0
        const tb = b.createdAt?._seconds ?? b.createdAt?.seconds ?? 0
        return tb - ta
      })

    return NextResponse.json({ teleconsultas })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  try {
    const adminDb = getDb()
    await adminDb.collection('teleconsultas').doc(id).delete()
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
