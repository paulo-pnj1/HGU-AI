'use client'
// app/teleconsulta/page.tsx — Portal público de teleconsulta para pacientes

import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  Stethoscope, Send, User, MapPin, Globe, ChevronRight,
  AlertTriangle, CheckCircle, Clock, Activity, Loader2,
  FileText, Phone, X, ArrowLeft, Wifi, Shield,
  MessageSquare, History, Plus, Trash2, Edit3,
  Menu, Home, Settings, LogOut, Baby, RefreshCw,
  Eye, ChevronDown, ChevronUp
} from 'lucide-react'
import { MUNICIPIOS_UIGE, Language, UrgencyLevel, Municipio } from '@/types'

// ─── Helper: UUID compatível com todos os browsers (incl. mobile antigo) ─
function genId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback para browsers sem crypto.randomUUID (HTTP ou mobile antigo)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

// ─── Helper: converte timestamps do Firestore para Date ──────────
function toDate(v: any): Date {
  if (!v) return new Date()
  if (v instanceof Date) return v
  // Admin SDK serializado via JSON: { _seconds, _nanoseconds } ou { seconds, nanoseconds }
  const secs = v._seconds ?? v.seconds
  if (typeof secs === 'number') return new Date(secs * 1000)
  // String ISO ou número em ms
  const d = new Date(v)
  return isNaN(d.getTime()) ? new Date() : d
}


interface ChatMsg {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  urgency?: UrgencyLevel
}

interface PatientProfile {
  nome: string
  idade?: number
  sexo?: 'M' | 'F'
  municipio: string
  telefone?: string
  gravidez?: boolean
  semanasGestacao?: number
  lang: Language
}

interface Teleconsulta {
  id: string
  patientCode: string
  patientName: string
  municipio: string
  urgency: UrgencyLevel
  status: 'activa' | 'revisada'
  messages: ChatMsg[]
  createdAt: any
  suspectedDiseases: string[]
  gravidez?: boolean
}

type View = 'home' | 'nova' | 'consultas' | 'detalhe' | 'chat' | 'perfil'

const URGENCY_CFG = {
  verde:      { label: 'Não urgente', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', dot: 'bg-emerald-400', Icon: CheckCircle },
  amarelo:    { label: 'Urgente',     cls: 'bg-amber-500/20 text-amber-300 border-amber-500/40',       dot: 'bg-amber-400',   Icon: Clock },
  vermelho:   { label: 'Emergência',  cls: 'bg-red-500/20 text-red-300 border-red-500/40',             dot: 'bg-red-400',     Icon: AlertTriangle },
  indefinido: { label: 'A avaliar',   cls: 'bg-slate-500/20 text-slate-400 border-slate-500/40',       dot: 'bg-slate-500',   Icon: Activity },
}

// ─── Componentes utilitários ──────────────────────────────────────
function UrgBadge({ u }: { u: UrgencyLevel }) {
  const { label, cls, Icon } = URGENCY_CFG[u]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${cls}`}>
      <Icon size={11} />{label}
    </span>
  )
}

function Bubble({ msg, nome }: { msg: ChatMsg; nome: string }) {
  const isUser = msg.role === 'user'
  const ts = msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp)
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-xl flex items-center justify-center mr-2 flex-shrink-0 mt-1"
          style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
          <Stethoscope size={14} className="text-white" />
        </div>
      )}
      <div className="max-w-[85%]">
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser ? 'text-white rounded-br-sm' : 'text-slate-200 rounded-bl-sm border border-white/10'
        }`} style={isUser
          ? { background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }
          : { background: 'rgba(255,255,255,0.06)' }}>
          {isUser
            ? <p className="whitespace-pre-wrap">{msg.content}</p>
            : <div className="prose prose-sm max-w-none prose-invert prose-p:my-1 prose-ul:my-1 prose-li:my-0.5">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
          }
        </div>
        <div className={`flex items-center gap-2 mt-1 px-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
          <span className="text-xs text-slate-600">
            {ts.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {msg.urgency && msg.urgency !== 'indefinido' && <UrgBadge u={msg.urgency} />}
        </div>
      </div>
    </div>
  )
}

// ─── Sidebar / Menu ───────────────────────────────────────────────
function Sidebar({ view, setView, profile, menuOpen, setMenuOpen, onLogout }: {
  view: View
  setView: (v: View) => void
  profile: PatientProfile | null
  menuOpen: boolean
  setMenuOpen: (v: boolean) => void
  onLogout: () => void
}) {
  const nav = [
    { id: 'home' as View,      icon: Home,        label: 'Início' },
    { id: 'nova' as View,      icon: Plus,        label: 'Nova Consulta' },
    { id: 'consultas' as View, icon: History,     label: 'Minhas Consultas' },
    { id: 'perfil' as View,    icon: Settings,    label: 'Meu Perfil' },
  ]

  return (
    <>
      {/* Overlay mobile */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMenuOpen(false)} />
      )}

      <aside className={`fixed top-0 left-0 h-full z-50 w-72 flex flex-col border-r border-white/8 transition-transform duration-300 ${
        menuOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:relative lg:translate-x-0 lg:z-auto`}
        style={{ background: 'linear-gradient(180deg, #0d1628 0%, #080d1a 100%)' }}>

        {/* Fundo decorativo */}
        <div className="absolute top-0 left-0 w-full h-40 opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 30% 0%, #7c3aed 0%, transparent 70%)' }} />

        {/* Logo */}
        <div className="relative p-5 border-b border-white/8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 4px 16px rgba(124,58,237,0.4)' }}>
              <Stethoscope size={20} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">HGU Teleconsulta</p>
              <p className="text-xs text-violet-400/70">Uíge · Angola</p>
            </div>
          </div>
          <button onClick={() => setMenuOpen(false)} className="lg:hidden text-slate-400 hover:text-white p-1">
            <X size={18} />
          </button>
        </div>

        {/* Perfil resumido */}
        {profile && (
          <div className="p-4 border-b border-white/8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
                {profile.nome.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{profile.nome}</p>
                <p className="text-xs text-slate-400 truncate">{profile.municipio}</p>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {nav.map(item => {
            const Icon   = item.icon
            const active = view === item.id
            return (
              <button key={item.id}
                onClick={() => { setView(item.id); setMenuOpen(false) }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all ${
                  active
                    ? 'text-white font-medium'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                style={active ? {
                  background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(109,40,217,0.2))',
                  borderLeft: '2px solid #7c3aed',
                  paddingLeft: 'calc(0.75rem - 2px)',
                } : {}}>
                <Icon size={16} className={active ? 'text-violet-400' : ''} />
                {item.label}
                {active && <ChevronRight size={12} className="ml-auto text-violet-400 opacity-60" />}
              </button>
            )
          })}
        </nav>

        {/* Rodapé */}
        <div className="p-3 border-t border-white/8">
          <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3 mb-3">
            <p className="text-xs text-violet-300/80 leading-relaxed">
              ⚕️ Este serviço não substitui atendimento médico presencial. Em emergência, ligue <strong>112</strong>.
            </p>
          </div>
          {profile && (
            <button onClick={onLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-all">
              <LogOut size={15} /> Sair / Trocar utilizador
            </button>
          )}
        </div>
      </aside>
    </>
  )
}

// ─── Ecrã de Boas-vindas / Início ────────────────────────────────
function HomeScreen({ profile, setView }: { profile: PatientProfile | null; setView: (v: View) => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-full p-6 text-center">
      <div className="relative w-20 h-20 mx-auto mb-6">
        <div className="absolute inset-0 rounded-2xl opacity-30 animate-pulse"
          style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />
        <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 8px 40px rgba(124,58,237,0.5)' }}>
          <Stethoscope size={36} className="text-white" />
        </div>
      </div>

      <h1 className="text-2xl font-bold text-white mb-2">
        {profile ? `Olá, ${profile.nome.split(' ')[0]}! 👋` : 'HGU Teleconsulta'}
      </h1>
      <p className="text-slate-400 text-sm mb-8 max-w-sm leading-relaxed">
        {profile
          ? 'O que deseja fazer hoje?'
          : 'Consulte um assistente médico a partir de casa, sem se deslocar ao hospital.'}
      </p>

      <div className="grid grid-cols-1 gap-3 w-full max-w-sm">
        <button onClick={() => setView('nova')}
          className="flex items-center gap-4 p-4 rounded-2xl border border-violet-500/30 text-left transition-all hover:border-violet-500/60 active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(109,40,217,0.08))' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
            <Plus size={20} className="text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Nova Consulta</p>
            <p className="text-slate-400 text-xs mt-0.5">Descrever sintomas agora</p>
          </div>
          <ChevronRight size={16} className="ml-auto text-violet-400" />
        </button>

        {profile && (
          <button onClick={() => setView('consultas')}
            className="flex items-center gap-4 p-4 rounded-2xl border border-white/8 text-left transition-all hover:border-white/15 active:scale-[0.98]"
            style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)' }}>
              <History size={20} className="text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Minhas Consultas</p>
              <p className="text-slate-400 text-xs mt-0.5">Ver histórico e resultados</p>
            </div>
            <ChevronRight size={16} className="ml-auto text-slate-400" />
          </button>
        )}

        <div className="grid grid-cols-3 gap-2 mt-2">
          {[
            { icon: Shield, label: 'Seguro\ne Privado' },
            { icon: Wifi,   label: 'Acesso\nRemoto' },
            { icon: MessageSquare, label: 'Resposta\nImediata' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-white/8"
              style={{ background: 'rgba(255,255,255,0.03)' }}>
              <Icon size={18} className="text-violet-400" />
              <p className="text-xs text-slate-400 text-center whitespace-pre-line leading-tight">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Formulário de Perfil / Dados do Paciente ─────────────────────
function ProfileForm({ initial, onSave, title, subtitle }: {
  initial: Partial<PatientProfile>
  onSave: (p: PatientProfile) => void
  title: string
  subtitle: string
}) {
  const [nome,     setNome]     = useState(initial.nome     || '')
  const [idade,    setIdade]    = useState(initial.idade?.toString() || '')
  const [sexo,     setSexo]     = useState<'M' | 'F' | ''>(initial.sexo || '')
  const [municipio,setMunicipio]= useState<Municipio>(initial.municipio as Municipio || MUNICIPIOS_UIGE[0])
  const [telefone, setTelefone] = useState(initial.telefone  || '')
  const [gravidez, setGravidez] = useState(initial.gravidez  || false)
  const [semanas,  setSemanas]  = useState(initial.semanasGestacao?.toString() || '')
  const [lang,     setLang]     = useState<Language>(initial.lang || 'pt')

  const inp = "w-full px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 placeholder:text-slate-600"

  return (
    <div className="max-w-md w-full mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
          <User size={18} className="text-white" />
        </div>
        <div>
          <h2 className="text-white font-bold text-lg">{title}</h2>
          <p className="text-slate-400 text-xs">{subtitle}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Nome completo *</label>
          <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex.: Maria António" className={inp} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Idade</label>
            <input type="number" value={idade} onChange={e => setIdade(e.target.value)} placeholder="Anos" min="0" max="120" className={inp} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Sexo</label>
            <div className="flex gap-2 h-[46px]">
              {(['M', 'F'] as const).map(s => (
                <button key={s} onClick={() => setSexo(sexo === s ? '' : s)}
                  className={`flex-1 rounded-xl border text-sm font-medium transition-all ${
                    sexo === s ? 'bg-violet-500/20 border-violet-500/40 text-violet-300' : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-white'
                  }`}>{s === 'M' ? 'Masc.' : 'Fem.'}</button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5"><MapPin size={11} className="inline mr-1" />Município</label>
          <select value={municipio} onChange={e => setMunicipio(e.target.value as Municipio)} className={inp} style={{ background: '#0d1628' }}>
            {MUNICIPIOS_UIGE.map(m => <option key={m} value={m} style={{ background: '#0d1628' }}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5"><Phone size={11} className="inline mr-1" />Telefone (opcional)</label>
          <input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="+244 9XX XXX XXX" className={inp} />
        </div>
        {sexo === 'F' && (
          <div className="p-3 rounded-xl border border-pink-500/20 bg-pink-500/5">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={gravidez} onChange={e => setGravidez(e.target.checked)} className="w-4 h-4 rounded accent-pink-500" />
              <span className="text-sm text-pink-300">Estou grávida</span>
            </label>
            {gravidez && (
              <input type="number" value={semanas} onChange={e => setSemanas(e.target.value)}
                placeholder="Semanas de gestação" min="1" max="42" className={inp + ' mt-3'} />
            )}
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5"><Globe size={11} className="inline mr-1" />Idioma</label>
          <div className="flex gap-2">
            {(['pt', 'kg'] as Language[]).map(l => (
              <button key={l} onClick={() => setLang(l)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                  lang === l ? 'text-white border-violet-500/50' : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-white'
                }`}
                style={lang === l ? { background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(109,40,217,0.2))' } : {}}>
                {l === 'pt' ? '🇦🇴 Português' : '🌍 Kikongo'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button onClick={() => nome.trim() && onSave({ nome: nome.trim(), idade: idade ? parseInt(idade) : undefined, sexo: sexo || undefined, municipio, telefone: telefone.trim() || undefined, gravidez: sexo === 'F' ? gravidez : false, semanasGestacao: gravidez && semanas ? parseInt(semanas) : undefined, lang })}
        disabled={!nome.trim()}
        className="w-full mt-6 py-4 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-2 disabled:opacity-40 transition-all active:scale-95"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 6px 24px rgba(124,58,237,0.4)' }}>
        Guardar <ChevronRight size={18} />
      </button>
      <p className="text-xs text-slate-600 text-center mt-3 leading-relaxed">
        🔒 Os seus dados ficam guardados apenas neste dispositivo.
      </p>
    </div>
  )
}

// ─── Lista de Consultas (CRUD) ─────────────────────────────────────
function ConsultasList({ profile, onChat, onDetalhe }: {
  profile: PatientProfile
  onChat: (tc: Teleconsulta) => void
  onDetalhe: (tc: Teleconsulta) => void
}) {
  const [lista,   setLista]   = useState<Teleconsulta[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting,setDeleting]= useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/teleconsulta/paciente?nome=${encodeURIComponent(profile.nome)}`)
      const json = await res.json()
      setLista(json.teleconsultas || [])
    } catch { /* ignora */ }
    finally { setLoading(false) }
  }, [profile.nome])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar esta consulta? Esta acção não pode ser desfeita.')) return
    setDeleting(id)
    await fetch(`/api/teleconsulta/paciente?id=${id}`, { method: 'DELETE' })
    setLista(prev => prev.filter(t => t.id !== id))
    setDeleting(null)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={32} className="text-violet-400 animate-spin" />
    </div>
  )

  if (lista.length === 0) return (
    <div className="text-center py-16 px-6">
      <History size={44} className="mx-auto mb-4 text-slate-600" />
      <p className="text-white font-semibold mb-1">Sem consultas anteriores</p>
      <p className="text-slate-400 text-sm">As suas teleconsultas aparecerão aqui.</p>
    </div>
  )

  return (
    <div className="px-4 py-4 space-y-3 max-w-lg mx-auto w-full">
      <div className="flex items-center justify-between mb-2">
        <p className="text-slate-400 text-sm">{lista.length} consulta{lista.length !== 1 ? 's' : ''}</p>
        <button onClick={load} className="text-slate-500 hover:text-white transition-all">
          <RefreshCw size={14} />
        </button>
      </div>
      {lista.map(tc => {
        const cfg  = URGENCY_CFG[tc.urgency]
        const Icon = cfg.Icon
        const data  = toDate(tc.createdAt)
        return (
          <div key={tc.id} className="rounded-2xl border border-white/8 overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/5 transition-all"
              onClick={() => onDetalhe(tc)}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${cfg.cls}`}>
                <Icon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-white font-mono">{tc.patientCode}</span>
                  <UrgBadge u={tc.urgency} />
                  {tc.status === 'revisada' && (
                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                      <CheckCircle size={10} /> Revisada
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                  <span>{data.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  <span>{tc.messages.length} msg</span>
                  {tc.suspectedDiseases?.[0] && (
                    <span className="text-blue-400/70 capitalize">{tc.suspectedDiseases[0].replace('_', ' ')}</span>
                  )}
                </div>
              </div>
              <ChevronRight size={14} className="text-slate-500 flex-shrink-0" />
            </div>
            <div className="flex border-t border-white/8">
              <button onClick={() => onChat(tc)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs text-violet-300 hover:bg-violet-500/10 transition-all">
                <MessageSquare size={12} /> Continuar Chat
              </button>
              <div className="w-px bg-white/8" />
              <button onClick={() => onDetalhe(tc)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs text-slate-400 hover:bg-white/5 transition-all">
                <Eye size={12} /> Ver Detalhes
              </button>
              <div className="w-px bg-white/8" />
              <button onClick={() => handleDelete(tc.id)} disabled={deleting === tc.id}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-all disabled:opacity-40">
                {deleting === tc.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                Eliminar
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Detalhe de uma Consulta ──────────────────────────────────────
function DetalheConsulta({ tc, onBack, onChat }: {
  tc: Teleconsulta
  onBack: () => void
  onChat: (tc: Teleconsulta) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const data = toDate(tc.createdAt)
  const isEmerg = tc.urgency === 'vermelho'
  const isUrg   = tc.urgency === 'amarelo'

  return (
    <div className="max-w-lg mx-auto px-4 py-6 w-full">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-5 transition-all">
        <ArrowLeft size={16} /> Voltar
      </button>

      {/* Cabeçalho */}
      <div className="p-4 rounded-2xl border border-white/10 mb-4"
        style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="text-white font-bold text-lg font-mono">{tc.patientCode}</p>
            <p className="text-slate-400 text-xs mt-0.5">
              {data.toLocaleDateString('pt-PT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <UrgBadge u={tc.urgency} />
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-slate-400">
          <span className="flex items-center gap-1"><MapPin size={11} />{tc.municipio}</span>
          <span className="flex items-center gap-1"><MessageSquare size={11} />{tc.messages.length} mensagens</span>
        </div>
      </div>

      {/* Alerta por urgência */}
      {isEmerg && (
        <div className="p-4 rounded-2xl border border-red-500/30 bg-red-500/10 mb-4">
          <p className="text-red-300 font-bold text-sm">🚨 Dirija-se URGENTEMENTE ao hospital!</p>
          <p className="text-red-400/80 text-xs mt-1">Estado requer atenção médica imediata. Ligue 112.</p>
        </div>
      )}
      {isUrg && !isEmerg && (
        <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 mb-4">
          <p className="text-amber-300 font-bold text-sm">⚠️ Consulte um médico nas próximas horas.</p>
        </div>
      )}

      {/* Doenças suspeitas */}
      {tc.suspectedDiseases?.length > 0 && (
        <div className="p-4 rounded-2xl border border-white/10 mb-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <p className="text-xs font-medium text-slate-400 mb-2">Possíveis causas identificadas</p>
          <div className="flex flex-wrap gap-2">
            {tc.suspectedDiseases.map(d => (
              <span key={d} className="px-3 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs capitalize">
                {d.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Histórico de mensagens (colapsável) */}
      <div className="rounded-2xl border border-white/10 mb-4 overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <button onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm text-slate-300 hover:bg-white/5 transition-all">
          <span className="font-medium">Histórico da conversa ({tc.messages.length} mensagens)</span>
          {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </button>
        {expanded && (
          <div className="px-3 pb-3 max-h-80 overflow-y-auto border-t border-white/8">
            <div className="pt-3 space-y-2">
              {tc.messages.map((msg: any, i: number) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-violet-600/25 text-violet-100 border border-violet-500/20'
                      : 'bg-white/5 text-slate-300 border border-white/10'
                  }`}>
                    {msg.content.length > 250 ? msg.content.slice(0, 250) + '...' : msg.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Acções */}
      <button onClick={() => onChat(tc)}
        className="w-full py-3.5 rounded-2xl text-white font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 6px 24px rgba(124,58,237,0.4)' }}>
        <MessageSquare size={16} /> Continuar Consulta
      </button>
    </div>
  )
}

// ─── Chat ─────────────────────────────────────────────────────────
function ChatScreen({ profile, tcExistente, setView }: {
  profile: PatientProfile
  tcExistente?: Teleconsulta
  setView: (v: View) => void
}) {
  const [consultaId,  setConsultaId]  = useState<string | null>(tcExistente?.id || null)
  const [patientCode, setPatientCode] = useState<string | null>(tcExistente?.patientCode || null)
  const [messages,    setMessages]    = useState<ChatMsg[]>(() => {
    if (!tcExistente) return []
    return (tcExistente.messages || []).map((m: any) => ({
      ...m,
      timestamp: toDate(m.timestamp),
    }))
  })
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [urgency, setUrgency] = useState<UrgencyLevel>(tcExistente?.urgency || 'indefinido')
  const [starting,setStarting]= useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  // Iniciar nova consulta automaticamente se não há existente
  useEffect(() => {
    if (!tcExistente && !consultaId) { initConsulta() }
  }, [])

  const initConsulta = async () => {
    setStarting(true)
    try {
      const res = await fetch('/api/teleconsulta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'criar',
          nome:            profile.nome,
          idade:           profile.idade,
          sexo:            profile.sexo,
          municipio:       profile.municipio,
          telefone:        profile.telefone,
          gravidez:        profile.gravidez,
          semanasGestacao: profile.semanasGestacao,
          language:        profile.lang,
        }),
      })
      const json = await res.json()
      if (json.consultaId) {
        setConsultaId(json.consultaId)
        setPatientCode(json.patientCode)
        setMessages([{
          id: genId(),
          role: 'assistant',
          content: json.welcome,
          timestamp: new Date(),
        }])
      }
    } catch (e) { console.error(e) }
    finally { setStarting(false) }
  }

  const sendMessage = async () => {
    if (!input.trim() || loading || !consultaId) return
    const txt = input.trim()
    const userMsg: ChatMsg = { id: genId(), role: 'user', content: txt, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }))
      const res = await fetch('/api/teleconsulta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          consultaId,
          message: txt,
          history,
          language: profile.lang,
          patientContext: profile,
        }),
      })
      const data = await res.json()
      if (data.content) {
        setMessages(prev => [...prev, { id: genId(), role: 'assistant', content: data.content, timestamp: new Date(), urgency: data.urgency }])
        setUrgency(data.urgency || 'indefinido')
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  if (starting) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <Loader2 size={40} className="text-violet-400 animate-spin mx-auto mb-4" />
        <p className="text-white font-medium">A preparar a consulta...</p>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header do chat */}
      <div className="flex-shrink-0 border-b border-white/8 px-4 py-3 flex items-center justify-between"
        style={{ background: 'rgba(13,22,45,0.9)', backdropFilter: 'blur(10px)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => setView('consultas')} className="text-slate-400 hover:text-white mr-1">
            <ArrowLeft size={16} />
          </button>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
            <Stethoscope size={14} className="text-white" />
          </div>
          <div>
            <p className="text-white text-sm font-semibold">Assistente HGU</p>
            <p className="text-xs text-slate-400">{patientCode || '...'}</p>
          </div>
        </div>
        <UrgBadge u={urgency} />
      </div>

      {/* Aviso */}
      <div className="flex-shrink-0 px-4 py-2 border-b border-amber-500/10 bg-amber-500/5">
        <p className="text-xs text-amber-500/80 text-center">
          ⚕️ Assistente de apoio — não substitui médico. Emergência: ligue 112.
        </p>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && !starting && (
          <div className="text-center py-10">
            <p className="text-slate-500 text-sm mb-3">Descreva os seus sintomas</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {['Tenho febre há 2 dias', 'Tenho dores de cabeça', 'Estou com diarreia', 'Tenho tosse'].map(s => (
                <button key={s} onClick={() => setInput(s)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-white/10 text-slate-400 hover:border-violet-500/40 hover:text-violet-300 transition-all"
                  style={{ background: 'rgba(255,255,255,0.03)' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map(m => <Bubble key={m.id} msg={m} nome={profile.nome} />)}
        {loading && (
          <div className="flex justify-start mb-4">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mr-2 flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
              <Stethoscope size={14} className="text-white" />
            </div>
            <div className="px-4 py-3 rounded-2xl border border-white/8" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="flex gap-1">
                {[0, 150, 300].map(d => (
                  <span key={d} className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-4 border-t border-white/8 safe-bottom" style={{ background: 'rgba(13,22,45,0.5)' }}>
        <div className="flex gap-2">
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="Descreva os seus sintomas..."
            rows={1}
            className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/40 max-h-28 placeholder:text-slate-600" />
          <button onClick={sendMessage} disabled={!input.trim() || loading}
            className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-white disabled:opacity-30 transition-all"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── App principal ────────────────────────────────────────────────
const PROFILE_KEY = 'hgu_patient_profile'

export default function TeleconsultaApp() {
  const [profile,    setProfile]    = useState<PatientProfile | null>(null)
  const [view,       setView]       = useState<View>('home')
  const [menuOpen,   setMenuOpen]   = useState(false)
  const [selectedTc, setSelectedTc] = useState<Teleconsulta | null>(null)
  const [hydrated,   setHydrated]   = useState(false)

  // Carregar perfil do localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROFILE_KEY)
      if (raw) setProfile(JSON.parse(raw))
    } catch {}
    setHydrated(true)
  }, [])

  const saveProfile = (p: PatientProfile) => {
    setProfile(p)
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p))
    setView('home')
  }

  const logout = () => {
    localStorage.removeItem(PROFILE_KEY)
    setProfile(null)
    setView('home')
    setMenuOpen(false)
  }

  const goChat = (tc: Teleconsulta) => {
    setSelectedTc(tc)
    setView('chat')
  }

  const goDetalhe = (tc: Teleconsulta) => {
    setSelectedTc(tc)
    setView('detalhe')
  }

  if (!hydrated) return (
    <div className="flex items-center justify-center h-screen" style={{ background: '#080d1a' }}>
      <Loader2 size={32} className="text-violet-400 animate-spin" />
    </div>
  )

  // Se não tem perfil e não está na view de criar perfil, pede dados
  const needsProfile = !profile && view !== 'perfil'

  const renderContent = () => {
    // Sem perfil → formulário inicial
    if (needsProfile) {
      return (
        <ProfileForm
          initial={{}}
          onSave={saveProfile}
          title="Bem-vindo(a) ao HGU Teleconsulta"
          subtitle="Preencha os seus dados para começar. Só é necessário uma vez."
        />
      )
    }

    switch (view) {
      case 'home':
        return <HomeScreen profile={profile} setView={setView} />
      case 'nova':
        return <ChatScreen profile={profile!} setView={setView} />
      case 'consultas':
        return profile ? (
          <ConsultasList profile={profile} onChat={goChat} onDetalhe={goDetalhe} />
        ) : null
      case 'detalhe':
        return selectedTc ? (
          <DetalheConsulta tc={selectedTc} onBack={() => setView('consultas')} onChat={goChat} />
        ) : null
      case 'chat':
        return <ChatScreen profile={profile!} tcExistente={selectedTc || undefined} setView={setView} />
      case 'perfil':
        return (
          <ProfileForm
            initial={profile || {}}
            onSave={saveProfile}
            title="Meu Perfil"
            subtitle="Actualize os seus dados pessoais."
          />
        )
      default:
        return null
    }
  }

  // Títulos do header
  const PAGE_TITLE: Record<View, string> = {
    home:      'Início',
    nova:      'Nova Consulta',
    consultas: 'Minhas Consultas',
    detalhe:   'Detalhe da Consulta',
    chat:      'Chat',
    perfil:    'Meu Perfil',
  }

  return (
    <div className="flex h-svh overflow-hidden" style={{ background: 'linear-gradient(135deg, #080d1a 0%, #0d1628 100%)' }}>
      {/* Sidebar — só visível em desktop (lg+) */}
      {profile && (
        <Sidebar
          view={view}
          setView={setView}
          profile={profile}
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
          onLogout={logout}
        />
      )}

      {/* Área principal */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Topbar */}
        <header className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-white/8"
          style={{ background: 'rgba(8,13,26,0.9)', backdropFilter: 'blur(10px)' }}>
          {profile && (
            <button onClick={() => setMenuOpen(true)}
              className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all">
              <Menu size={18} />
            </button>
          )}
          <div className="flex items-center gap-2 flex-1">
            {!profile && (
              <div className="w-7 h-7 rounded-lg flex items-center justify-center mr-1"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
                <Stethoscope size={14} className="text-white" />
              </div>
            )}
            <h1 className="text-white font-semibold text-sm">
              {needsProfile ? 'HGU Teleconsulta' : PAGE_TITLE[view]}
            </h1>
          </div>
          {profile && view !== 'nova' && view !== 'chat' && (
            <button onClick={() => { setSelectedTc(null); setView('nova') }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
              <Plus size={13} /> <span className="hidden sm:inline">Nova Consulta</span><span className="sm:hidden">Nova</span>
            </button>
          )}
          {/* Botão voltar ao login — sempre visível na topbar */}
          <a href="/auth"
            className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border border-blue-500/25 bg-blue-500/8 text-blue-400 hover:bg-blue-500/20 transition-all"
            title="Acesso profissional">
            <LogOut size={12} className="rotate-180" />
            <span className="hidden sm:inline">Login Staff</span>
            <span className="sm:hidden">Staff</span>
          </a>
        </header>

        {/* Conteúdo com scroll — padding-bottom para não ficar atrás da bottom nav */}
        <main className={`flex-1 overflow-y-auto ${profile && view !== 'chat' && view !== 'nova' ? 'pb-16 lg:pb-0' : ''}`}>
          {renderContent()}
        </main>

        {/* Bottom Navigation Bar — apenas mobile, apenas com perfil */}
        {profile && (
          <nav className="lg:hidden flex-shrink-0 flex items-center border-t border-white/8 safe-bottom"
            style={{ background: 'rgba(8,13,26,0.97)', backdropFilter: 'blur(16px)' }}>
            {[
              { id: 'home' as View,      icon: Home,        label: 'Início' },
              { id: 'nova' as View,      icon: Plus,        label: 'Consulta' },
              { id: 'consultas' as View, icon: History,     label: 'Histórico' },
              { id: 'perfil' as View,    icon: Settings,    label: 'Perfil' },
            ].map(item => {
              const Icon = item.icon
              const active = view === item.id
              return (
                <button key={item.id}
                  onClick={() => { setSelectedTc(null); setView(item.id); setMenuOpen(false) }}
                  className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-all ${active ? 'text-violet-400' : 'text-slate-500'}`}>
                  {item.id === 'nova'
                    ? <div className="w-10 h-10 rounded-2xl flex items-center justify-center -mt-5 shadow-lg"
                        style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 4px 16px rgba(124,58,237,0.5)' }}>
                        <Icon size={20} className="text-white" />
                      </div>
                    : <Icon size={20} />
                  }
                  <span className={`text-xs leading-none ${item.id === 'nova' ? 'mt-1' : ''}`}>{item.label}</span>
                </button>
              )
            })}
          </nav>
        )}
      </div>
    </div>
  )
}
