// lib/firebase-admin.ts-Firebase Admin SDK (servidor)
// Usado para operações seguras do lado do servidor (API Routes)

import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { getAuth } from 'firebase-admin/auth'

function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0]

  const projectId   = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (projectId && clientEmail && privateKey) {
    // Variáveis de ambiente disponíveis (produção / .env.local)
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    })
  }

  // Fallback: ficheiro de service account local (desenvolvimento)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const serviceAccount = require('../hgu-ai-clinico-firebase-adminsdk-fbsvc-b3ec5a2409.json')
  return initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  })
}

// ─── Exports lazy-só inicializam quando chamados ───────────────
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