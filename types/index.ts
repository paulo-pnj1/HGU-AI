// types/index.ts-Tipos globais HGU AI

export type Language = 'pt' | 'kg'
export type UrgencyLevel = 'verde' | 'amarelo' | 'vermelho' | 'indefinido'
export type Disease = 'paludismo' | 'tuberculose' | 'diarreia' | 'saude_materna' | 'outro'
export type Role = 'medico' | 'enfermeiro' | 'tecnico' | 'admin'

export interface User {
  uid: string
  email: string
  nome: string
  role: Role
  departamento: string
  numeroBI: string
  hospital: string
  telefone?: string
  activo?: boolean
  createdAt: Date
  updatedAt?: Date
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  imageUrl?: string
  urgency?: UrgencyLevel
  diseases?: Disease[]
}

export interface Consultation {
  id: string
  userId: string
  patientCode: string
  patientAge?: number
  patientSex?: 'M' | 'F'
  municipio: string
  messages: Message[]
  urgency: UrgencyLevel
  suspectedDiseases: Disease[]
  createdAt: Date
  updatedAt: Date
  closedAt?: Date
  reportGenerated: boolean
  language: Language
  notas?: string
}

export interface SymptomForm {
  queixaPrincipal: string
  duracaoSintomas: string
  febre: boolean
  temperatura?: number
  tosse: boolean
  diarreia: boolean
  vomitos: boolean
  cefaleias: boolean
  calafrios: boolean
  gravidez?: boolean
  semanasGestacao?: number
  medicacaoActual: string
  alergias: string
  municipio: string
}

export interface ReportData {
  consultation: Consultation
  professional: User
  generatedAt: Date
  summary: string
  recommendations: string[]
  urgencyJustification: string
}

export const MUNICIPIOS_UIGE = [
  'Uíge (cidade)', 'Negage', 'Sanza Pombo', 'Maquela do Zombo', 'Bembe',
  'Bungo', 'Quimbele', 'Damba', 'Puri', 'Mucaba',
  'Alto Cauale', 'Ambuila', 'Kangola', 'Songo', 'Mua', 'Cuilo Futa',
] as const

export type Municipio = (typeof MUNICIPIOS_UIGE)[number]

export const DEPARTAMENTOS = [
  'Urgência', 'Medicina Interna', 'Pediatria', 'Maternidade',
  'Cirurgia', 'Ortopedia', 'Oftalmologia', 'Dermatologia',
  'Laboratório', 'Radiologia', 'Farmácia', 'Administração',
] as const

export const ROLE_LABELS: Record<Role, string> = {
  medico: 'Médico',
  enfermeiro: 'Enfermeiro',
  tecnico: 'Técnico',
  admin: 'Administrador',
}
