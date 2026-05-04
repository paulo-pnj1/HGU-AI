'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import ReactMarkdown from 'react-markdown'
import VoiceInterpreter from '@/components/VoiceInterpreter'
import {
  Send, FileText, AlertTriangle, CheckCircle, Clock,
  Loader2, X, ImageIcon, Globe, Stethoscope,
  MapPin, RefreshCw, Phone, Mail, UserCheck, Building2,
  Mic, MicOff, Languages
} from 'lucide-react'
import { Message, UrgencyLevel, Language, MUNICIPIOS_UIGE, Municipio, Consultation } from '@/types'
import { criarConsulta } from '@/lib/firebase'

// ─── Sintomas rápidos Kikongo ─────────────────────────────────────
const SINTOMAS_KIKONGO = [
  { kg: 'Ntima ya ntu', pt: 'Dor de cabeça' },
  { kg: 'Ntima ya vumu', pt: 'Dor de barriga' },
  { kg: 'Mbevo', pt: 'Febre' },
  { kg: 'Kinsukusuku', pt: 'Tosse' },
  { kg: 'Luvunu', pt: 'Vómitos' },
  { kg: 'Ntima ya ntolo', pt: 'Dor no peito' },
  { kg: 'Mpasi ya nitu', pt: 'Cansaço / fraqueza' },
  { kg: 'Ntima ya makalu', pt: 'Dores nas pernas' },
  { kg: 'Kubangula', pt: 'Tontura / vertigem' },
  { kg: 'Ntima ya moyo', pt: 'Palpitações' },
  { kg: 'Kubokama', pt: 'Dificuldade a respirar' },
  { kg: 'Nzunga', pt: 'Diarreia' },
]

// ─── Tipos ────────────────────────────────────────────────────────
interface MedicoInfo {
  uid: string
  nome: string
  departamento: string
  telefone: string
  email: string
  hospital: string
}

// UUID compatível com todos os browsers (incl. mobile antigo / HTTP)
function genId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

function gerarCodigoDoente(): string {
  return `HGU-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
}

function UrgencyBadge({ urgency }: { urgency: UrgencyLevel }) {
  const config = {
    verde:      { label: 'Não urgente', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', Icon: CheckCircle },
    amarelo:    { label: 'Urgente',     bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',       Icon: Clock },
    vermelho:   { label: 'Emergência',  bg: 'bg-red-500/20 text-red-300 border-red-500/30',             Icon: AlertTriangle },
    indefinido: { label: 'A avaliar',   bg: 'bg-slate-500/20 text-slate-400 border-slate-500/30',       Icon: Loader2 },
  }
  const c = config[urgency]; const Icon = c.Icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-medium border ${c.bg}`}>
      <Icon size={11} /><span className="hidden sm:inline">{c.label}</span>
    </span>
  )
}

// ─── Card de Médico Registado ─────────────────────────────────────
function MedicoCard({ medico }: { medico: MedicoInfo }) {
  return (
    <div className="rounded-xl border border-blue-500/30 overflow-hidden"
      style={{ background: 'rgba(37,99,235,0.08)' }}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-blue-500/20"
        style={{ background: 'rgba(37,99,235,0.12)' }}>
        <UserCheck size={13} className="text-blue-400 flex-shrink-0" />
        <span className="text-xs font-semibold text-blue-300 truncate">{medico.nome}</span>
      </div>
      <div className="px-3 py-2 space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <Building2 size={11} className="text-slate-500 flex-shrink-0" />
          <span className="truncate">{medico.departamento} · {medico.hospital}</span>
        </div>
        {medico.telefone && (
          <a href={`tel:${medico.telefone}`}
            className="flex items-center gap-2 text-xs text-emerald-300 hover:text-emerald-200 transition-colors">
            <Phone size={11} className="flex-shrink-0" />
            <span>{medico.telefone}</span>
          </a>
        )}
        {medico.email && (
          <a href={`mailto:${medico.email}`}
            className="flex items-center gap-2 text-xs text-blue-300 hover:text-blue-200 transition-colors truncate">
            <Mail size={11} className="flex-shrink-0" />
            <span className="truncate">{medico.email}</span>
          </a>
        )}
      </div>
    </div>
  )
}

// ─── Bloco de Contactos Médicos ───────────────────────────────────
function ContactosMedicosBloco({ especialidade, onClose }: { especialidade: string; onClose: () => void }) {
  const [medicos, setMedicos] = useState<MedicoInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [erro,    setErro]    = useState(false)

  useEffect(() => {
    setLoading(true); setErro(false)
    fetch(`/api/medicos?especialidade=${encodeURIComponent(especialidade)}`)
      .then(r => r.json())
      .then(data => {
        setMedicos(data.medicos || [])
        setLoading(false)
      })
      .catch(() => { setErro(true); setLoading(false) })
  }, [especialidade])

  return (
    <div className="mx-3 sm:mx-4 mb-3 rounded-2xl border border-blue-500/25 overflow-hidden"
      style={{ background: 'rgba(13,22,45,0.85)' }}>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-blue-500/20"
        style={{ background: 'rgba(37,99,235,0.15)' }}>
        <div className="flex items-center gap-2">
          <Stethoscope size={13} className="text-blue-400" />
          <span className="text-xs font-semibold text-blue-200">
            Médicos registados no HGU
            {especialidade && <span className="text-blue-400 font-normal ml-1">· {especialidade}</span>}
          </span>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300 p-0.5">
          <X size={13} />
        </button>
      </div>

      {/* Conteúdo */}
      <div className="p-3">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-4 text-xs text-slate-500">
            <Loader2 size={13} className="animate-spin" />
            A carregar médicos do sistema...
          </div>
        )}
        {erro && (
          <p className="text-xs text-red-400 text-center py-3">
            Erro ao carregar dados. Verifique a ligação.
          </p>
        )}
        {!loading && !erro && medicos.length === 0 && (
          <div className="text-center py-4">
            <p className="text-xs text-slate-400 mb-1">Nenhum médico encontrado para esta especialidade.</p>
            <p className="text-xs text-slate-500">Contacte directamente o HGU: <span className="text-blue-300">+244 236 222 333</span></p>
          </div>
        )}
        {!loading && !erro && medicos.length > 0 && (
          <div className="space-y-2">
            {medicos.map(m => <MedicoCard key={m.uid} medico={m} />)}
            <p className="text-xs text-slate-600 text-center pt-1">
              Dados reais registados no sistema HGU
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function MessageBubble({ msg, translation, onTranslate, translating }: {
  msg: Message
  translation?: string
  onTranslate?: () => void
  translating?: boolean
}) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3 sm:mb-4`}>
      {!isUser && (
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center mr-2 flex-shrink-0 mt-1"
          style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
          <Stethoscope size={12} className="text-white sm:hidden" />
          <Stethoscope size={14} className="text-white hidden sm:block" />
        </div>
      )}
      <div className={`max-w-[88%] sm:max-w-[80%]`}>
        {msg.imageUrl && (
          <div className="mb-2 rounded-xl overflow-hidden border border-white/10">
            <img src={msg.imageUrl} alt="Imagem clínica" className="max-w-full max-h-48 sm:max-h-64 object-contain bg-black/20" />
          </div>
        )}
        <div className={`rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm leading-relaxed ${
          isUser ? 'text-white rounded-br-sm' : 'text-slate-200 rounded-bl-sm border border-white/5'
        }`} style={isUser
          ? { background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }
          : { background: 'rgba(255,255,255,0.05)' }}>
          {isUser
            ? <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
            : <div className="prose prose-sm max-w-none prose-invert prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 text-sm">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
          }
          {translation && (
            <div className="mt-2 pt-2 border-t border-white/10">
              <p className="text-xs text-blue-300 font-medium mb-1">🇦🇴 Tradução (PT)</p>
              <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">{translation}</p>
            </div>
          )}
        </div>
        <div className={`flex items-center gap-2 mt-1 px-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
          <span className="text-xs text-slate-600">
            {msg.timestamp instanceof Date ? msg.timestamp.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : ''}
          </span>
          {msg.urgency && msg.urgency !== 'indefinido' && <UrgencyBadge urgency={msg.urgency} />}
          {onTranslate && !translation && (
            <button
              onClick={onTranslate}
              disabled={translating}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-400 transition-colors disabled:opacity-50"
              title="Traduzir para Português">
              {translating ? <Loader2 size={10} className="animate-spin" /> : <Languages size={10} />}
              <span>{translating ? '' : 'Traduzir'}</span>
            </button>
          )}
          {translation && (
            <span className="text-xs text-blue-400 flex items-center gap-1"><Languages size={10} /> PT</span>
          )}
        </div>
      </div>
    </div>
  )
}

function ConsultForm({ onStart, userId }: { onStart: (id: string, lang: Language) => void; userId: string }) {
  const [patientCode, setPatientCode] = useState(() => gerarCodigoDoente())
  const [municipio,   setMunicipio]   = useState<Municipio>(MUNICIPIOS_UIGE[0])
  const [lang,        setLang]        = useState<Language>('pt')
  const [age,         setAge]         = useState('')
  const [sex,         setSex]         = useState<'M' | 'F' | ''>('')
  const [loading,     setLoading]     = useState(false)

  const handleStart = async () => {
    if (!patientCode.trim()) return
    setLoading(true)
    try {
      const id = await criarConsulta(userId, patientCode, municipio, lang, age ? parseInt(age) : undefined, sex || undefined)
      onStart(id, lang)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const inp = "w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 placeholder:text-slate-600"
  const lbl = "block text-xs font-medium text-slate-400 mb-1.5"

  return (
    <div className="w-full max-w-lg mx-auto px-4 sm:px-0">
      <div className="p-4 sm:p-6 rounded-2xl border border-white/10 shadow-2xl"
        style={{ background: 'linear-gradient(135deg, rgba(13,22,45,0.9), rgba(8,13,26,0.95))' }}>
        <h2 className="text-white font-semibold text-base sm:text-lg mb-4 sm:mb-5">Iniciar consulta</h2>
        <div className="space-y-3 sm:space-y-4">
          <div>
            <label className={lbl}>Código do doente *</label>
            <div className="flex gap-2">
              <input value={patientCode} onChange={e => setPatientCode(e.target.value)}
                placeholder="Ex.: HGU-2025-0001" className={inp + ' flex-1'} />
              <button onClick={() => setPatientCode(gerarCodigoDoente())} title="Gerar novo"
                className="px-3 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all flex-shrink-0">
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div>
              <label className={lbl}>Idade</label>
              <input type="number" value={age} onChange={e => setAge(e.target.value)}
                placeholder="Anos" min="0" max="120" className={inp} />
            </div>
            <div>
              <label className={lbl}>Sexo</label>
              <div className="flex gap-2 h-[42px]">
                {(['M', 'F'] as const).map(s => (
                  <button key={s} onClick={() => setSex(sex === s ? '' : s)}
                    className={`flex-1 rounded-xl border text-sm font-medium transition-all ${
                      sex === s ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-white'
                    }`}>{s === 'M' ? 'M' : 'F'}</button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className={lbl}><MapPin size={11} className="inline mr-1" />Município</label>
            <select value={municipio} onChange={e => setMunicipio(e.target.value as Municipio)}
              className={inp} style={{ background: '#0d1628' }}>
              {MUNICIPIOS_UIGE.map(m => <option key={m} value={m} style={{ background: '#0d1628' }}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}><Globe size={11} className="inline mr-1" />Idioma</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { code: 'pt', label: '🇦🇴 Português' },
                { code: 'kg', label: '🌍 Kikongo' },
                { code: 'en', label: '🇬🇧 Inglês' },
                { code: 'fr', label: '🇫🇷 Francês' },
                { code: 'es', label: '🇪🇸 Espanhol' },
                { code: 'ln', label: '🇨🇩 Lingala' },
              ] as { code: Language; label: string }[]).map(({ code, label }) => (
                <button key={code} onClick={() => setLang(code)}
                  className={`py-2 rounded-xl text-xs sm:text-sm font-medium border transition-all ${
                    lang === code ? 'text-white border-blue-500/50' : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-white'
                  }`}
                  style={lang === code ? { background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#ffffff' } : {}}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleStart} disabled={!patientCode.trim() || loading}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow: '0 4px 16px rgba(37,99,235,0.3)' }}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Stethoscope size={16} />}
            {loading ? 'A iniciar...' : 'Iniciar consulta'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface ChatWindowProps {
  userId: string; userName: string
  resumeConsulta?: Consultation | null
  onClearResume?: () => void
}

export default function ChatWindow({ userId, userName, resumeConsulta, onClearResume }: ChatWindowProps) {
  const [consultaId,        setConsultaId]        = useState<string | null>(null)
  const [language,          setLanguage]           = useState<Language>('pt')
  const [messages,          setMessages]           = useState<Message[]>([])
  const [input,             setInput]              = useState('')
  const [loading,           setLoading]            = useState(false)
  const [urgency,           setUrgency]            = useState<UrgencyLevel>('indefinido')
  const [pendingImage,      setPendingImage]       = useState<{ url: string; file: File } | null>(null)
  const [imageContext,      setImageContext]        = useState('')
  const [generatingPDF,     setGeneratingPDF]      = useState(false)
  const [resumedPatientCode,setResumedPatientCode] = useState<string | null>(null)
  const [contactosMedicos,  setContactosMedicos]   = useState<{ visible: boolean; especialidade: string }>({ visible: false, especialidade: '' })
  const bottomRef = useRef<HTMLDivElement>(null)

  const [showInterpreter, setShowInterpreter] = useState(false)

  // ── Estado de tradução ──
  const [translations,   setTranslations]   = useState<Record<string, string>>({})
  const [translatingId,  setTranslatingId]  = useState<string | null>(null)
  const [translatingAll, setTranslatingAll] = useState(false)
  const isNonPt = language !== 'pt'

  const translateOne = async (msg: Message) => {
    if (translatingId || translations[msg.id]) return
    setTranslatingId(msg.id)
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: msg.content, sourceLang: language }),
      })
      const data = await res.json()
      if (data.translated) setTranslations(prev => ({ ...prev, [msg.id]: data.translated }))
    } catch { /* ignora */ }
    finally { setTranslatingId(null) }
  }

  const translateAll = async () => {
    if (translatingAll) return
    setTranslatingAll(true)
    const toTranslate = messages.filter(m => !translations[m.id] && m.content)
    for (const msg of toTranslate) {
      try {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: msg.content, sourceLang: language }),
        })
        const data = await res.json()
        if (data.translated) setTranslations(prev => ({ ...prev, [msg.id]: data.translated }))
      } catch { /* ignora */ }
    }
    setTranslatingAll(false)
  }

  // ── Estados de reconhecimento de voz ──────────────────────────
  const [isRecording,   setIsRecording]   = useState(false)
  const [voiceSupport,  setVoiceSupport]  = useState(false)
  const [interimText,   setInterimText]   = useState('')
  const [wordCount,     setWordCount]     = useState(0)
  const [showKikongo,   setShowKikongo]   = useState(false)
  const recognitionRef  = useRef<any>(null)
  const shouldRecordRef = useRef(false)   // flag persistente: "utilizador quer gravar"
  const committedLengthRef = useRef(0)    // nº de chars já confirmados no input (evita duplicação no mobile)

  const isKikongo = language === 'kg'

  // Verificar suporte Web Speech API
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    setVoiceSupport(!!SR)
  }, [])
  // Cleanup ao desmontar componente
  useEffect(() => {
    return () => {
      shouldRecordRef.current = false
      if (recognitionRef.current) {
        try { recognitionRef.current.stop() } catch {}
        recognitionRef.current = null
      }
    }
  }, [])


  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  useEffect(() => {
    if (resumeConsulta) {
      setConsultaId(resumeConsulta.id)
      setLanguage(resumeConsulta.language)
      setUrgency(resumeConsulta.urgency)
      setResumedPatientCode(resumeConsulta.patientCode)
      const msgs: Message[] = resumeConsulta.messages.map(m => ({
        ...m, timestamp: m.timestamp instanceof Date ? m.timestamp : (m.timestamp as any)?.toDate?.() || new Date(),
      }))
      setMessages(msgs)
      if (onClearResume) onClearResume()
    }
  }, [resumeConsulta])


  // ── Controlo do microfone ──────────────────────────────────────
  const startRecording = () => {
    if (!voiceSupport || isKikongo) return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const isEdge = /Edg\//.test(navigator.userAgent)
    const lang = isEdge ? 'pt-PT' : 'pt-AO'
    shouldRecordRef.current = true

    // sessionId garante que resultados de sessões anteriores são ignorados no mobile
    let currentSessionId = 0

    const buildAndStart = () => {
      if (!shouldRecordRef.current) return
      const recognition = new SR()
      recognition.lang = lang
      recognition.continuous = !isEdge
      recognition.interimResults = true
      recognition.maxAlternatives = 1

      // Cada sessão tem o seu próprio ID e índice — evita duplicação no mobile
      const sessionId = ++currentSessionId
      let lastCommittedIndex = -1

      recognition.onresult = (e: any) => {
        // Ignora eventos de sessões antigas
        if (sessionId !== currentSessionId) return
        let interim = ''
        let finalText = ''
        for (let i = 0; i < e.results.length; i++) {
          const transcript = e.results[i][0].transcript
          if (e.results[i].isFinal) {
            if (i > lastCommittedIndex) {
              finalText += transcript + ' '
              lastCommittedIndex = i
            }
          } else {
            if (i >= (lastCommittedIndex + 1)) {
              interim += transcript
            }
          }
        }
        if (finalText) {
          setInput(prev => {
            const updated = (prev + ' ' + finalText).trim()
            setWordCount(updated.split(/[\s]+/).filter(Boolean).length)
            return updated
          })
        }
        setInterimText(interim)
      }

      recognition.onerror = (e: any) => {
        if (sessionId !== currentSessionId) return
        setInterimText('')
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          shouldRecordRef.current = false
          setIsRecording(false)
        }
      }

      recognition.onend = () => {
        if (sessionId !== currentSessionId) return
        setInterimText('')
        recognitionRef.current = null
        if (shouldRecordRef.current) {
          setTimeout(buildAndStart, isEdge ? 400 : 200)
        } else {
          setIsRecording(false)
        }
      }

      recognitionRef.current = recognition
      try { recognition.start() } catch {}
    }

    buildAndStart()
    setIsRecording(true)
  }

  const stopRecording = () => {
    shouldRecordRef.current = false
    setIsRecording(false)
    setInterimText('')
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
      recognitionRef.current = null
    }
  }

  const toggleRecording = () => { isRecording ? stopRecording() : startRecording() }

  const insertKikongoSintoma = (s: typeof SINTOMAS_KIKONGO[0]) => {
    const texto = `${s.kg} (${s.pt})`
    setInput(prev => {
      const updated = prev ? prev + ' ' + texto : texto
      setWordCount(updated.split(/\s+/).filter(Boolean).length)
      return updated
    })
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file || !consultaId) return
    const formData = new FormData()
    formData.append('file', file); formData.append('consultaId', consultaId)
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    const data = await res.json()
    if (data.url) setPendingImage({ url: data.url, file })
  }, [consultaId])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 1, disabled: !consultaId,
  })

  const sendMessage = async () => {
    if (isRecording) stopRecording()
    const finalInput = (input + ' ' + interimText).trim()
    if ((!finalInput && !pendingImage) || loading || !consultaId) return
    const userContent = pendingImage ? (imageContext || 'Análise de imagem clínica') : finalInput
    const userMsg: Message = { id: genId(), role: 'user', content: userContent, timestamp: new Date(), imageUrl: pendingImage?.url }
    setMessages(prev => [...prev, userMsg])
    setInput(''); setPendingImage(null); setImageContext(''); setInterimText(''); setWordCount(0); setLoading(true)
    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }))
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultaId, message: pendingImage ? undefined : userContent,
          imageUrl: pendingImage?.url, imageContext: pendingImage ? userContent : undefined, history, language }),
      })
      const data = await res.json()
      if (data.content) {
        setMessages(prev => [...prev, { id: data.message?.id || genId(), role: 'assistant', content: data.content, timestamp: new Date(), urgency: data.urgency, diseases: data.diseases }])
        setUrgency(data.urgency)
        // Mostrar contactos de médicos reais se a IA detectou pedido de contacto
        if (data.contactoMedico) {
          setContactosMedicos({ visible: true, especialidade: data.especialidadeSugerida || '' })
        }
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const gerarPDF = async () => {
    if (!consultaId || generatingPDF) return
    setGeneratingPDF(true)
    try {
      const res = await fetch('/api/report', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultaId, userId, language }) })
      if (res.ok) {
        const blob = await res.blob(); const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url
        a.download = `relatorio-hgu-${consultaId.slice(0, 8)}.pdf`; a.click()
        URL.revokeObjectURL(url)
      }
    } catch (e) { console.error(e) }
    finally { setGeneratingPDF(false) }
  }

  if (!consultaId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 sm:p-6"
        style={{ background: 'linear-gradient(135deg, #080d1a, #0d1628)' }}>
        <div className="mb-6 sm:mb-8 text-center">
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4">
            <div className="absolute inset-0 rounded-2xl opacity-30 animate-pulse"
              style={{ background: 'radial-gradient(circle, #3b82f6, transparent)' }} />
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow: '0 8px 32px rgba(37,99,235,0.4)' }}>
              <Stethoscope size={24} className="text-white sm:hidden" />
              <Stethoscope size={28} className="text-white hidden sm:block" />
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">HGU AI Clínico</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">Assistente de apoio ao diagnóstico · Uíge</p>
        </div>
        <ConsultForm onStart={(id, lang) => { setConsultaId(id); setLanguage(lang) }} userId={userId} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0" style={{ background: 'linear-gradient(135deg, #080d1a, #0d1628)' }}>
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/5 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2"
        style={{ background: 'rgba(13,22,45,0.8)', backdropFilter: 'blur(10px)' }}>
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
            <Stethoscope size={14} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {resumedPatientCode ? resumedPatientCode : 'Consulta activa'}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {resumedPatientCode ? 'A continuar' : `ID: ${consultaId.slice(0, 8).toUpperCase()}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <button
            onClick={() => setShowInterpreter(true)}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-medium rounded-lg border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20 transition-all"
            title="Abrir intérprete de voz">
            <Languages size={11} />
            <span className="hidden sm:inline">Intérprete</span>
          </button>
          {messages.length > 0 && (
            <button
              onClick={translateAll}
              disabled={translatingAll}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-500/40 text-blue-300 hover:bg-blue-500/20 transition-all disabled:opacity-50"
              title="Traduzir toda a conversa para Português">
              {translatingAll ? <Loader2 size={11} className="animate-spin" /> : <Languages size={11} />}
              <span className="hidden sm:inline">{translatingAll ? 'A traduzir...' : '🇦🇴 Traduzir'}</span>
            </button>
          )}
          <UrgencyBadge urgency={urgency} />
          <button onClick={gerarPDF} disabled={messages.length < 2 || generatingPDF}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-medium rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/20 disabled:opacity-30 transition-all">
            {generatingPDF ? <Loader2 size={11} className="animate-spin" /> : <FileText size={11} />}
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button onClick={() => { setConsultaId(null); setMessages([]); setUrgency('indefinido'); setResumedPatientCode(null); setContactosMedicos({ visible: false, especialidade: '' }) }}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-medium rounded-lg border border-white/10 text-slate-400 hover:text-red-400 hover:border-red-500/20 transition-all">
            <X size={11} /><span className="hidden sm:inline">Encerrar</span>
          </button>
        </div>
      </div>

      {showInterpreter && (
        <VoiceInterpreter
          patientLang={language}
          onClose={() => setShowInterpreter(false)}
        />
      )}

      {/* Aviso */}
      <div className="flex-shrink-0 px-3 sm:px-4 py-1.5 sm:py-2 border-b border-amber-500/10 bg-amber-500/5">
        <p className="text-xs text-amber-500/80 text-center">
          Este assistente apoia-não substitui-o julgamento clínico.
        </p>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 sm:py-4">
        {messages.length === 0 && (
          <div className="text-center py-8 sm:py-12">
            <p className="text-slate-500 text-sm mb-3 sm:mb-4">Descreva os sintomas para iniciar a análise</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {['Febre e calafrios', 'Tosse com expectoração', 'Diarreia aguda', 'Dor abdominal'].map(s => (
                <button key={s} onClick={() => setInput(s)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-white/10 text-slate-400 hover:border-blue-500/40 hover:text-blue-300 transition-all"
                  style={{ background: 'rgba(255,255,255,0.03)' }}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            translation={translations[msg.id]}
            onTranslate={() => translateOne(msg)}
            translating={translatingId === msg.id}
          />
        ))}
        {loading && (
          <div className="flex justify-start mb-4">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center mr-2 flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
              <Stethoscope size={12} className="text-white" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-bl-sm border border-white/5" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="flex gap-1">
                {[0, 150, 300].map(d => (
                  <span key={d} className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Contactos de Médicos Reais */}
      {contactosMedicos.visible && (
        <ContactosMedicosBloco
          especialidade={contactosMedicos.especialidade}
          onClose={() => setContactosMedicos({ visible: false, especialidade: '' })}
        />
      )}

      {/* Preview imagem */}
      {pendingImage && (
        <div className="flex-shrink-0 px-3 sm:px-4 pb-2">
          <div className="flex gap-3 items-start p-3 rounded-xl border border-blue-500/20 bg-blue-500/5">
            <img src={pendingImage.url} alt="preview" className="w-12 h-12 sm:w-14 sm:h-14 object-cover rounded-lg border border-white/10 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-300 mb-1">Imagem clínica</p>
              <input type="text" value={imageContext} onChange={e => setImageContext(e.target.value)}
                placeholder="Descreva o contexto..."
                className="w-full text-xs px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500/40 placeholder:text-slate-600" />
            </div>
            <button onClick={() => setPendingImage(null)} className="text-slate-500 hover:text-red-400 p-1 flex-shrink-0"><X size={13} /></button>
          </div>
        </div>
      )}

      {/* Painel Kikongo */}
      {isKikongo && showKikongo && (
        <div className="flex-shrink-0 border-t border-blue-500/20 bg-blue-500/5 px-3 py-2">
          <p className="text-xs text-blue-300 font-medium mb-2">🌍 Sintomas em Kikongo — toque para inserir:</p>
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
            {SINTOMAS_KIKONGO.map((s) => (
              <button
                key={s.kg}
                onClick={() => insertKikongoSintoma(s)}
                className="px-2.5 py-1 rounded-lg text-xs border border-blue-500/30 text-blue-200 hover:bg-blue-500/20 transition-all active:scale-95"
                style={{ background: 'rgba(37,99,235,0.1)' }}>
                {s.kg}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Texto interim */}
      {interimText && (
        <div className="flex-shrink-0 px-3 sm:px-4 pb-1">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-red-500/20 bg-red-500/5">
            <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse flex-shrink-0" />
            <p className="text-xs text-slate-400 italic truncate">{interimText}</p>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 border-t border-white/5 safe-bottom" style={{ background: 'rgba(13,22,45,0.5)' }}>

        {/* Barra de voz */}
        <div className="flex items-center justify-between px-3 pt-2 pb-1">
          <div className="flex items-center gap-2">
            {!isKikongo && voiceSupport && (
              <button
                onClick={toggleRecording}
                title={isRecording ? 'Parar gravação' : 'Falar sintomas'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                  isRecording
                    ? 'border-red-500/60 bg-red-500/20 text-red-300 animate-pulse'
                    : 'border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20'
                }`}>
                {isRecording ? <MicOff size={13} /> : <Mic size={13} />}
                {isRecording ? 'A gravar...' : 'Falar'}
              </button>
            )}
            {isKikongo && (
              <button
                onClick={() => setShowKikongo(!showKikongo)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                  showKikongo
                    ? 'border-blue-500/60 bg-blue-500/25 text-blue-200'
                    : 'border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20'
                }`}>
                🌍 {showKikongo ? 'Fechar' : 'Sintomas Kikongo'}
              </button>
            )}
            {!isKikongo && !voiceSupport && (
              <span className="text-xs text-slate-600 italic">Use Chrome para activar voz</span>
            )}
          </div>
          {wordCount > 0 && (
            <span className="text-xs text-slate-500">{wordCount} palavra{wordCount !== 1 ? 's' : ''}</span>
          )}
        </div>

        <div className="flex gap-2 px-3 pb-3">
          <div {...getRootProps()}
            title="Carregar imagem clínica"
            className={`flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 self-end rounded-xl border flex items-center justify-center transition-all ${
              isDragActive ? 'border-blue-400 bg-blue-500/20 text-blue-300' : consultaId ? 'border-white/25 bg-white/8 hover:bg-white/15 hover:border-white/40 text-slate-200 cursor-pointer' : 'border-white/10 text-slate-600 cursor-not-allowed'
            }`}>
            <input {...getInputProps()} />
            <ImageIcon size={16} />
          </div>
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={e => {
                setInput(e.target.value)
                setWordCount(e.target.value.split(/\s+/).filter(Boolean).length)
              }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder={
                isRecording
                  ? 'A ouvir... descreva os sintomas'
                  : isKikongo
                    ? 'Bakisa masamu yaku...'
                    : 'Descreva os sintomas ou faça uma pergunta...'
              }
              rows={3}
              className={`w-full px-3 py-3 bg-white/5 border rounded-xl text-white text-sm resize-none focus:outline-none focus:ring-2 max-h-40 placeholder:text-slate-600 transition-all ${
                isRecording
                  ? 'border-red-500/40 focus:ring-red-500/40'
                  : 'border-white/10 focus:ring-blue-500/40'
              }`}
            />
            {isRecording && (
              <span className="absolute right-3 top-3 w-2 h-2 bg-red-400 rounded-full animate-pulse" />
            )}
          </div>
          <button onClick={sendMessage} disabled={(!input.trim() && !interimText.trim() && !pendingImage) || loading}
            className="flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 self-end rounded-xl flex items-center justify-center text-white disabled:opacity-30 transition-all"
            style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
            <Send size={14} className="sm:hidden" />
            <Send size={15} className="hidden sm:block" />
          </button>
        </div>
        <p className="text-xs text-slate-700 pb-1.5 text-center hidden sm:block">Enter para enviar · Shift+Enter para nova linha</p>
      </div>
    </div>
  )
}