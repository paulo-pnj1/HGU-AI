// lib/firebase-admin.ts — Firebase Admin SDK (servidor)
// Usado para operações seguras do lado do servidor (API Routes)

import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { getAuth } from 'firebase-admin/auth'

function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0]

  const projectId   = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET

  // Normaliza a private key — o Vercel pode entregar com \n literais ou sem aspas
  let privateKey = process.env.FIREBASE_PRIVATE_KEY ?? ''
  // Remove aspas externas se existirem
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1)
  }
  // Converte \n literais em newlines reais
  privateKey = privateKey.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      `Firebase Admin: variáveis de ambiente em falta. ` +
      `projectId=${!!projectId} clientEmail=${!!clientEmail} privateKey=${!!privateKey}`
    )
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    storageBucket,
  })
}

// ─── Exports lazy — só inicializam quando chamados ───────────────
// IMPORTANTE: não executar getAdminApp() no nível do módulo,
// senão o Next.js inicializa o Firebase durante o build.

export function getAdminDb()      { return getFirestore(getAdminApp()) }
export function getAdminStorage() { return getStorage(getAdminApp())   }
export function getAdminAuth()    { return getAuth(getAdminApp())      }

// Aliases para compatibilidade com código existente
export const adminDb      = new Proxy({} as ReturnType<typeof getFirestore>, { get: (_, p) => (getAdminDb() as any)[p] })
export const adminStorage = new Proxy({} as ReturnType<typeof getStorage>,   { get: (_, p) => (getAdminStorage() as any)[p] })
export const adminAuth    = new Proxy({} as ReturnType<typeof getAuth>,      { get: (_, p) => (getAdminAuth() as any)[p] })

// ─── Verificar token de autenticação ────────────────────────────
export async function verifyToken(token: string) {
  try {
    const decoded = await getAdminAuth().verifyIdToken(token)
    return decoded
  } catch {
    return null
  }
}

// ─── Criar utilizador profissional ──────────────────────────────
export async function criarProfissionalAdmin(
  email: string,
  password: string,
  nome: string,
  role: string,
  departamento: string
) {
  const auth = getAdminAuth()
  const db   = getAdminDb()

  const userRecord = await auth.createUser({
    email,
    password,
    displayName: nome,
  })

  await db.collection('profissionais').doc(userRecord.uid).set({
    uid: userRecord.uid,
    email,
    nome,
    role,
    departamento,
    hospital: 'Hospital Geral do Uíge',
    createdAt: new Date(),
  })

  return userRecord
}