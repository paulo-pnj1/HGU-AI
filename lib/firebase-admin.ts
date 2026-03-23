// lib/firebase-admin.ts — Firebase Admin SDK (servidor)
// Usado para operações seguras do lado do servidor (API Routes)

import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { getAuth } from 'firebase-admin/auth'

let adminApp: App

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0]
  }

  // Usa variável de ambiente com o JSON da service account
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}'
  )

  adminApp = initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  })

  return adminApp
}

export const adminDb = getFirestore(getAdminApp())
export const adminStorage = getStorage(getAdminApp())
export const adminAuth = getAuth(getAdminApp())

// ─── Verificar token de autenticação ────────────────────────────
export async function verifyToken(token: string) {
  try {
    const decoded = await adminAuth.verifyIdToken(token)
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
  const userRecord = await adminAuth.createUser({
    email,
    password,
    displayName: nome,
  })

  await adminDb.collection('profissionais').doc(userRecord.uid).set({
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
