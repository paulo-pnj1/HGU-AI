'use client'
import { useState, useEffect, useCallback } from 'react'
import { Wifi, Search, RefreshCw, CheckCircle, Clock, AlertTriangle, Activity, MapPin, MessageSquare, User, Phone, X, FileText, Eye, UserCheck, Calendar, Baby, LogIn, Building2, Send, Edit3 } from 'lucide-react'
import { UrgencyLevel } from '@/types'
import { format } from 'date-fns'
import { pt as ptLocale } from 'date-fns/locale'

interface Teleconsulta {
  id: string; patientCode: string; patientName: string; patientAge?: number
  patientSex?: 'M' | 'F'; municipio: string; telefone?: string
  gravidez?: boolean; semanasGestacao?: number; language: 'pt' | 'kg'
  messages: any[]; urgency: UrgencyLevel; suspectedDiseases: string[]
  status: 'activa' | 'revisada'; createdAt: any; revisadoPor?: string
  notaEspecialista?: string; encaminharPresencial?: boolean
}

const URGENCY = {
  verde:      { label: 'Normal',      bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', dot: 'bg-emerald-400', Icon: CheckCircle },
  amarelo:    { label: 'Urgente',     bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',       dot: 'bg-amber-400',   Icon: Clock },
  vermelho:   { label: 'Emergência',  bg: 'bg-red-500/15 text-red-300 border-red-500/30',             dot: 'bg-red-400',     Icon: AlertTriangle },
  indefinido: { label: 'Por avaliar', bg: 'bg-slate-500/15 text-slate-400 border-slate-500/30',       dot: 'bg-slate-500',   Icon: Activity },
}

function UBadge({ u }: { u: UrgencyLevel }) {
  const c = URGENCY[u]; const Icon = c.Icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-medium border ${c.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      <span className="hidden sm:inline">{c.label}</span>
    </span>
  )
}

function DetailModal({ tc, onClose, onMarcarRevisada }: { tc: Teleconsulta; onClose: () => void; onMarcarRevisada: (id: string, nota: string, encaminhar: boolean) => Promise<void> }) {
  const [marking,      setMarking]      = useState(false)
  const [nota,         setNota]         = useState('')
  const [encaminhar,   setEncaminhar]   = useState(false)
  const [editando,     setEditando]     = useState(false)
  const [notaEditada,  setNotaEditada]  = useState(tc.notaEspecialista || '')
  const [salvandoEdit, setSalvandoEdit] = useState(false)
  const data = tc.createdAt?.toDate?.() || new Date()
  const handleMarcar = async () => {
    setMarking(true)
    await onMarcarRevisada(tc.id, nota, encaminhar)
    setMarking(false)
    onClose()
  }
  const handleGuardarEdicao = async () => {
    setSalvandoEdit(true)
    try {
      await fetch('/api/teleconsulta/lista', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: tc.id,
          notaEspecialista: notaEditada,
          encaminharPresencial: tc.encaminharPresencial,
          reenviarPush: true,
        })
      })
      tc.notaEspecialista = notaEditada
      setEditando(false)
    } catch {}
    setSalvandoEdit(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-2xl max-h-[90vh] rounded-t-2xl sm:rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0d1628, #0a1220)' }}>
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
              <Wifi size={16} className="text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-white font-semibold text-sm sm:text-base truncate">{tc.patientName}</h3>
              <p className="text-slate-400 text-xs font-mono">{tc.patientCode}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <UBadge u={tc.urgency} />
            {tc.status === 'revisada' && <UserCheck size={14} className="text-violet-400" />}
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1"><X size={18} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {[
              { icon: User,     label: 'Sexo',      value: tc.patientSex === 'M' ? 'Masculino' : tc.patientSex === 'F' ? 'Feminino' : '—' },
              { icon: Calendar, label: 'Idade',     value: tc.patientAge ? `${tc.patientAge} anos` : '—' },
              { icon: MapPin,   label: 'Município', value: tc.municipio },
              { icon: Phone,    label: 'Telefone',  value: tc.telefone || '—' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-white/5 rounded-xl p-2.5 sm:p-3 border border-white/5">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1"><Icon size={11} />{label}</div>
                <p className="text-white text-xs sm:text-sm font-medium truncate">{value}</p>
              </div>
            ))}
          </div>
          {tc.gravidez && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-pink-500/30 bg-pink-500/10">
              <Baby size={14} className="text-pink-400 flex-shrink-0" />
              <p className="text-pink-300 text-sm font-medium">Grávida{tc.semanasGestacao ? ` — ${tc.semanasGestacao} semanas` : ''}</p>
            </div>
          )}
          {tc.suspectedDiseases.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-400 mb-2">Doenças suspeitas</p>
              <div className="flex flex-wrap gap-2">
                {tc.suspectedDiseases.map(d => (
                  <span key={d} className="px-2.5 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs capitalize">{d.replace('_', ' ')}</span>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-slate-400 mb-3">Histórico ({tc.messages.length} mensagens)</p>
            <div className="space-y-2 max-h-48 sm:max-h-72 overflow-y-auto pr-1">
              {tc.messages.map((msg: any, i: number) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                    msg.role === 'user' ? 'bg-violet-600/30 text-violet-100 border border-violet-500/20' : 'bg-white/5 text-slate-300 border border-white/10'
                  }`}>
                    <div className="text-xs opacity-60 mb-1 font-medium">{msg.role === 'user' ? `👤 ${tc.patientName}` : '🩺 Assistente IA'}</div>
                    {msg.content.length > 300 ? msg.content.slice(0, 300) + '...' : msg.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Nota do especialista + encaminhamento */}
        {tc.status !== 'revisada' && (
          <div className="flex-shrink-0 px-4 sm:px-5 pt-4 pb-2 border-t border-white/5 space-y-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-1.5">
                <Send size={11} /> Nota clínica para o paciente (opcional)
              </label>
              <textarea
                value={nota}
                onChange={e => setNota(e.target.value)}
                placeholder="Ex: Diagnóstico confirmado. Recomendo hidratação oral e repouso por 48h..."
                rows={3}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 resize-none"
              />
            </div>
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-all">
              <input type="checkbox" checked={encaminhar} onChange={e => setEncaminhar(e.target.checked)} className="w-4 h-4 rounded accent-amber-500" />
              <div className="flex items-center gap-2">
                <Building2 size={14} className="text-amber-400 flex-shrink-0" />
                <span className="text-amber-300 text-xs font-medium">Encaminhar para consulta presencial no HGU</span>
              </div>
            </label>
          </div>
        )}

        {/* Nota já registada — editável */}
        {tc.status === 'revisada' && (
          <div className="flex-shrink-0 px-4 sm:px-5 pt-3 pb-2 border-t border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-xs font-medium text-violet-400">
                <UserCheck size={11} /> Nota do especialista
              </p>
              <button onClick={() => setEditando(!editando)}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-white/5 transition-all">
                <Edit3 size={11} /> {editando ? 'Cancelar' : 'Editar'}
              </button>
            </div>
            {editando ? (
              <div className="space-y-2">
                <textarea value={notaEditada} onChange={e => setNotaEditada(e.target.value)} rows={4}
                  className="w-full px-3 py-2 bg-white/5 border border-violet-500/30 rounded-xl text-white text-xs placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 resize-none" />
                <button onClick={handleGuardarEdicao} disabled={salvandoEdit}
                  className="w-full py-2 rounded-xl text-white text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
                  {salvandoEdit ? <Activity size={13} className="animate-spin" /> : <Send size={13} />}
                  {salvandoEdit ? 'A guardar...' : 'Guardar e reenviar ao paciente'}
                </button>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
                <p className="text-violet-100 text-xs leading-relaxed">
                  {tc.notaEspecialista || <span className="text-slate-500 italic">Sem nota registada</span>}
                </p>
              </div>
            )}
            {tc.encaminharPresencial && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <Building2 size={13} className="text-amber-400 flex-shrink-0" />
                <p className="text-amber-300 text-xs font-medium">Encaminhado para consulta presencial no HGU</p>
              </div>
            )}
          </div>
        )}

        <div className="flex-shrink-0 flex gap-3 p-4 sm:p-5 border-t border-white/5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 text-sm hover:bg-white/5">Fechar</button>
          {tc.status !== 'revisada' && (
            <button onClick={handleMarcar} disabled={marking}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
              {marking ? <Activity size={14} className="animate-spin" /> : <UserCheck size={14} />}
              <span className="hidden sm:inline">Confirmar revisão</span>
              <span className="sm:hidden">Confirmar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function TeleconsultasView({ currentUserId }: { currentUserId: string }) {
  const [lista,   setLista]   = useState<Teleconsulta[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [filtro,  setFiltro]  = useState<'all' | 'activa' | 'revisada' | 'vermelho'>('all')
  const [detalhe, setDetalhe] = useState<Teleconsulta | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { const res = await fetch('/api/teleconsulta/lista'); const json = await res.json(); setLista(json.teleconsultas || []) }
    catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [load])

  const handleMarcarRevisada = async (id: string, nota: string, encaminhar: boolean) => {
    await fetch('/api/teleconsulta/lista', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, profissionalId: currentUserId, notaEspecialista: nota || undefined, encaminharPresencial: encaminhar })
    })
    setLista(prev => prev.map(t => t.id === id ? { ...t, status: 'revisada', notaEspecialista: nota || undefined, encaminharPresencial: encaminhar } : t))
  }

  const filtered = lista.filter(t => {
    const q = search.toLowerCase()
    const matchSearch = !q || t.patientName.toLowerCase().includes(q) || t.patientCode.toLowerCase().includes(q) || t.municipio.toLowerCase().includes(q)
    const matchFiltro = filtro === 'all' || t.status === filtro || t.urgency === filtro
    return matchSearch && matchFiltro
  })

  const counts = {
    all:      lista.length,
    activa:   lista.filter(t => t.status === 'activa').length,
    revisada: lista.filter(t => t.status === 'revisada').length,
    vermelho: lista.filter(t => t.urgency === 'vermelho').length,
  }

  return (
    <div className="h-full flex flex-col overflow-hidden min-h-0" style={{ background: 'linear-gradient(135deg, #080d1a, #0d1628)' }}>
      <div className="flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Wifi size={16} className="text-violet-400" />
              <h1 className="text-lg sm:text-xl font-bold text-white">Teleconsultas</h1>
            </div>
            <p className="text-slate-400 text-xs sm:text-sm">{lista.length} consultas remotas</p>
          </div>
          {/* Stats */}
          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
              <span className="text-violet-300 text-xs font-bold">{counts.activa}</span>
              <span className="text-slate-500 text-xs">activas</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-emerald-300 text-xs font-bold">{counts.revisada}</span>
              <span className="text-slate-500 text-xs">revistas</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20">
              <span className="text-red-300 text-xs font-bold">{counts.vermelho}</span>
              <span className="text-slate-500 text-xs">emerg.</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { window.location.href = '/auth' }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-300 text-xs hover:bg-blue-500/20 hover:border-blue-500/50 transition-all"
              title="Voltar ao login">
              <LogIn size={13} />
              <span className="hidden sm:inline">Login</span>
            </button>
            <button onClick={load} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl border border-white/10 text-slate-400 text-xs sm:text-sm hover:text-white hover:border-white/20 transition-all">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
          </div>
        </div>
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          {([
            ['all',      `Todas (${counts.all})`,             'bg-white/10 text-white border-white/20'],
            ['activa',   `Activas (${counts.activa})`,         'bg-violet-500/20 text-violet-300 border-violet-500/30'],
            ['revisada', `Revisadas (${counts.revisada})`,     'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'],
            ['vermelho', `Emerg. (${counts.vermelho})`,        'bg-red-500/20 text-red-300 border-red-500/30'],
          ] as const).map(([val, label, style]) => (
            <button key={val} onClick={() => setFiltro(val as any)}
              className={`flex-shrink-0 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${filtro === val ? style : 'border-white/5 text-slate-500 hover:border-white/10 hover:text-slate-400'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, código ou município..."
            className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16"><Wifi size={36} className="mx-auto mb-3 text-slate-600" /><p className="text-slate-400 text-sm">Nenhuma teleconsulta encontrada</p></div>
        ) : (
          <div className="space-y-2">
            {filtered.map(tc => {
              const data = tc.createdAt?.toDate?.() || new Date()
              const cfg = URGENCY[tc.urgency]; const Icon = cfg.Icon
              return (
                <div key={tc.id}
                  className="group flex items-center gap-3 p-3 sm:p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-all cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                  onClick={() => setDetalhe(tc)}>
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${cfg.bg}`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs sm:text-sm font-semibold text-white truncate max-w-[140px] sm:max-w-none">{tc.patientName}</span>
                      <UBadge u={tc.urgency} />
                      {tc.status === 'activa' && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs bg-violet-500/20 text-violet-300 border border-violet-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                          <span className="hidden sm:inline">Aguarda</span>
                        </span>
                      )}
                      {tc.status === 'revisada' && <UserCheck size={11} className="text-emerald-400" />}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                      <span className="font-mono">{tc.patientCode}</span>
                      <span className="flex items-center gap-1"><MapPin size={9} />{tc.municipio}</span>
                      <span className="flex items-center gap-1"><MessageSquare size={9} />{tc.messages.length}</span>
                      {tc.gravidez && <Baby size={9} className="text-pink-400/70" />}
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5 sm:hidden">
                      {format(data, 'dd MMM, HH:mm', { locale: ptLocale })}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 flex-shrink-0 hidden sm:block">
                    {format(data, 'dd MMM, HH:mm', { locale: ptLocale })}
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 sm:flex hidden transition-opacity" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setDetalhe(tc)} className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white">
                      <Eye size={12} />
                    </button>
                  </div>
                  <div className="sm:hidden flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setDetalhe(tc)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400">
                      <Eye size={13} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      {detalhe && <DetailModal tc={detalhe} onClose={() => setDetalhe(null)} onMarcarRevisada={handleMarcarRevisada} />}
    </div>
  )
}