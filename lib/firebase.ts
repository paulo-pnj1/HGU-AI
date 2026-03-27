// lib/firebase.ts-Firebase com CRUD completo para HGU AI

import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import {
  getAuth, Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged, User as FirebaseUser,
} from 'firebase/auth'
import {
  getFirestore, Firestore, collection, doc, addDoc, updateDoc, setDoc,
  deleteDoc, getDoc, getDocs, query, where, orderBy, limit,
  serverTimestamp,
} from 'firebase/firestore'
import {
  getStorage, FirebaseStorage, ref, uploadBytes, getDownloadURL, deleteObject,
} from 'firebase/storage'
import { Consultation, User, Message } from '@/types'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
}

let app: FirebaseApp
let auth: Auth
let db: Firestore
let storage: FirebaseStorage

if (!getApps().length) { app = initializeApp(firebaseConfig) } else { app = getApps()[0] }
auth = getAuth(app); db = getFirestore(app); storage = getStorage(app)
export { auth, db, storage }

// ─── Auth ────────────────────────────────────────────────────────
export async function loginProfissional(email: string, password: string) {
  return (await signInWithEmailAndPassword(auth, email, password)).user
}
export async function logoutProfissional() { await signOut(auth) }
export function onAuthChange(cb: (u: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, cb)
}

// ─── CRUD Profissionais ──────────────────────────────────────────
export async function getProfissional(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'profissionais', uid))
  if (!snap.exists()) return null
  return { uid: snap.id, ...snap.data() } as User
}
export async function getAllProfissionais(): Promise<User[]> {
  const snap = await getDocs(query(collection(db, 'profissionais'), orderBy('nome', 'asc')))
  return snap.docs.map(d => ({ uid: d.id, ...d.data() } as User))
}
export async function criarProfissional(data: Omit<User, 'uid' | 'createdAt'>, password: string): Promise<string> {
  const cred = await createUserWithEmailAndPassword(auth, data.email, password)
  const uid = cred.user.uid
  await setDoc(doc(db, 'profissionais', uid), { ...data, createdAt: serverTimestamp(), activo: true })
  return uid
}
export async function actualizarProfissional(uid: string, data: Partial<User>): Promise<void> {
  const { uid: _uid, ...rest } = data as any
  await updateDoc(doc(db, 'profissionais', uid), { ...rest, updatedAt: serverTimestamp() })
}
export async function eliminarProfissional(uid: string): Promise<void> {
  await updateDoc(doc(db, 'profissionais', uid), { activo: false, eliminadoEm: serverTimestamp() })
}

// ─── CRUD Consultas ──────────────────────────────────────────────
export async function criarConsulta(
  userId: string, patientCode: string, municipio: string,
  language: 'pt' | 'kg' = 'pt', patientAge?: number, patientSex?: 'M' | 'F'
): Promise<string> {
  const ref = await addDoc(collection(db, 'consultas'), {
    userId, patientCode, municipio,
    patientAge: patientAge ?? null, patientSex: patientSex ?? null,
    messages: [], urgency: 'indefinido', suspectedDiseases: [],
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    reportGenerated: false, language,
  })
  return ref.id
}
export async function getConsulta(id: string): Promise<Consultation | null> {
  const snap = await getDoc(doc(db, 'consultas', id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Consultation
}
export async function getConsultasRecentes(userId: string, n = 20): Promise<Consultation[]> {
  const q = query(collection(db, 'consultas'), where('userId', '==', userId), orderBy('createdAt', 'desc'), limit(n))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Consultation))
}
export async function getAllConsultas(n = 100): Promise<Consultation[]> {
  const q = query(collection(db, 'consultas'), orderBy('createdAt', 'desc'), limit(n))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Consultation))
}
export async function actualizarConsulta(id: string, data: Partial<Consultation>): Promise<void> {
  const { id: _id, ...rest } = data as any
  await updateDoc(doc(db, 'consultas', id), { ...rest, updatedAt: serverTimestamp() })
}
export async function eliminarConsulta(id: string): Promise<void> {
  await deleteDoc(doc(db, 'consultas', id))
}
export async function adicionarMensagem(consultaId: string, message: Omit<Message, 'id'>) {
  const consultaRef = doc(db, 'consultas', consultaId)
  const snap = await getDoc(consultaRef)
  if (!snap.exists()) throw new Error('Consulta não encontrada')
  const messages = [...(snap.data().messages || []), { ...message, id: crypto.randomUUID() }]
  await updateDoc(consultaRef, { messages, updatedAt: serverTimestamp() })
  return messages[messages.length - 1]
}
export async function actualizarUrgencia(id: string, urgency: string, suspectedDiseases: string[]) {
  await updateDoc(doc(db, 'consultas', id), { urgency, suspectedDiseases, updatedAt: serverTimestamp() })
}
export async function marcarRelatorioGerado(id: string) {
  await updateDoc(doc(db, 'consultas', id), { reportGenerated: true, closedAt: serverTimestamp() })
}

// ─── Storage ─────────────────────────────────────────────────────
export async function uploadImagemClinica(file: File, consultaId: string): Promise<string> {
  const ext = file.name.split('.').pop()
  const storageRef = ref(storage, `imagens/${consultaId}/${Date.now()}.${ext}`)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}
export async function eliminarImagem(url: string) {
  await deleteObject(ref(storage, url))
}

// ─── Estatísticas ────────────────────────────────────────────────
export async function getEstatisticasGerais() {
  const [cSnap, pSnap] = await Promise.all([
    getDocs(collection(db, 'consultas')),
    getDocs(collection(db, 'profissionais')),
  ])
  const consultas = cSnap.docs.map(d => d.data())
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  return {
    totalConsultas: consultas.length,
    totalProfissionais: pSnap.size,
    consultasHoje: consultas.filter(c => c.createdAt?.toDate?.() >= hoje).length,
    emergencias: consultas.filter(c => c.urgency === 'vermelho').length,
    urgentes: consultas.filter(c => c.urgency === 'amarelo').length,
    normais: consultas.filter(c => c.urgency === 'verde').length,
    relatoriosGerados: consultas.filter(c => c.reportGenerated).length,
  }
}
