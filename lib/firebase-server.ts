import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { Message, Consultation, User } from '@/types'

function getAdminDb() {
  if (!getApps().length) {
    const projectId   = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL

    let privateKey = process.env.FIREBASE_PRIVATE_KEY ?? ''
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1)
    }
    privateKey = privateKey.replace(/\\n/g, '\n')

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        `Firebase Server: variáveis em falta — ` +
        `projectId=${!!projectId} clientEmail=${!!clientEmail} privateKey=${!!privateKey}`
      )
    }

    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    })
  }
  return getFirestore()
}

// Exportar db para uso directo nas API routes
export { getAdminDb as db }

// ── resto do ficheiro igual ──────────────────────────────────────

export async function adicionarMensagem(
  consultaId: string,
  message: Omit<Message, 'id'>,
  coleccao: string = 'consultas'
) {
  const db = getAdminDb()
  const ref = db.collection(coleccao).doc(consultaId)
  const snap = await ref.get()
  if (!snap.exists) throw new Error('Consulta não encontrada')

  const messages = snap.data()?.messages || []
  const newMsg = {
    ...message,
    id: crypto.randomUUID(),
    timestamp: new Date(),
  }
  messages.push(newMsg)
  await ref.update({ messages, updatedAt: new Date() })
  return newMsg
}

export async function actualizarUrgencia(
  consultaId: string,
  urgency: string,
  suspectedDiseases: string[],
  coleccao: string = 'consultas'
) {
  const db = getAdminDb()
  await db.collection(coleccao).doc(consultaId).update({
    urgency,
    suspectedDiseases,
    updatedAt: new Date(),
  })
}

export async function getTeleconsultasRemotas(limitN = 50) {
  const db = getAdminDb()
  const snap = await db
    .collection('teleconsultas')
    .orderBy('createdAt', 'desc')
    .limit(limitN)
    .get()
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function marcarTeleconsultaRevisada(id: string, profissionalId: string) {
  const db = getAdminDb()
  await db.collection('teleconsultas').doc(id).update({
    status: 'revisada',
    revisadoPor: profissionalId,
    revisadaEm: new Date(),
  })
}

export async function getConsulta(consultaId: string): Promise<Consultation | null> {
  const db = getAdminDb()
  const snap = await db.collection('consultas').doc(consultaId).get()
  if (!snap.exists) return null
  return { id: snap.id, ...snap.data() } as Consultation
}

export async function getProfissional(uid: string): Promise<User | null> {
  const db = getAdminDb()
  const snap = await db.collection('profissionais').doc(uid).get()
  if (!snap.exists) return null
  return { uid: snap.id, ...snap.data() } as User
}

export async function marcarRelatorioGerado(consultaId: string) {
  const db = getAdminDb()
  await db.collection('consultas').doc(consultaId).update({
    reportGenerated: true,
    closedAt: new Date(),
  })
}

export async function getConsultasRecentes(
  userId: string,
  limitN = 20
): Promise<Consultation[]> {
  const db = getAdminDb()
  const snap = await db
    .collection('consultas')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(limitN)
    .get()
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Consultation))
}