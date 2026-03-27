// app/api/medicos/route.ts-Buscar médicos reais registados no HGU

import { NextRequest, NextResponse } from 'next/server'
import { db as getDb } from '@/lib/firebase-server'

export const dynamic = 'force-dynamic'


export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const especialidade = searchParams.get('especialidade') || ''
    const departamento  = searchParams.get('departamento')  || ''

    const adminDb = getDb()

    // Buscar profissionais activos com role 'medico'
    let q = adminDb
      .collection('profissionais')
      .where('activo', '==', true)
      .where('role', '==', 'medico')

    const snap = await q.get()

    let medicos = snap.docs.map(d => {
      const data = d.data()
      return {
        uid:          d.id,
        nome:         data.nome         || '',
        departamento: data.departamento || '',
        telefone:     data.telefone     || '',
        email:        data.email        || '',
        hospital:     data.hospital     || 'Hospital Geral do Uíge (HGU)',
        role:         data.role         || 'medico',
      }
    })

    // Filtrar por departamento/especialidade (case-insensitive, parcial)
    if (especialidade.trim()) {
      const termo = especialidade.toLowerCase()
      medicos = medicos.filter(m =>
        m.departamento.toLowerCase().includes(termo) ||
        m.nome.toLowerCase().includes(termo)
      )
    }
    if (departamento.trim()) {
      const termo = departamento.toLowerCase()
      medicos = medicos.filter(m =>
        m.departamento.toLowerCase().includes(termo)
      )
    }

    return NextResponse.json({ medicos })
  } catch (error) {
    console.error('Erro ao buscar médicos:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}