// app/api/upload/route.ts-Upload de imagens clínicas para Firebase Storage (Admin SDK)

import { NextRequest, NextResponse } from 'next/server'
import { getAdminStorage } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'


export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const consultaId = formData.get('consultaId') as string | null

    if (!file || !consultaId) {
      return NextResponse.json(
        { error: 'Ficheiro e consultaId obrigatórios' },
        { status: 400 }
      )
    }

    // Validar tipo de ficheiro
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!tiposPermitidos.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de ficheiro não suportado. Use JPEG, PNG ou WebP.' },
        { status: 400 }
      )
    }

    // Validar tamanho (máximo 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Ficheiro demasiado grande. Máximo 10MB.' },
        { status: 400 }
      )
    }

    // Converter File para Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const ext = file.name.split('.').pop() || 'jpg'
    const destPath = `imagens/${consultaId}/${Date.now()}.${ext}`

    // Upload via Admin SDK
    const bucket = getAdminStorage().bucket()
    const fileRef = bucket.file(destPath)
    await fileRef.save(buffer, {
      metadata: { contentType: file.type },
    })

    // Gerar URL público
    await fileRef.makePublic()
    const url = `https://storage.googleapis.com/${bucket.name}/${destPath}`

    return NextResponse.json({ url, success: true })
  } catch (error) {
    console.error('Erro no upload:', error)
    return NextResponse.json(
      { error: 'Erro ao carregar imagem', detail: String(error) },
      { status: 500 }
    )
  }
}