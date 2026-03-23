'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  History, Search, Plus, Trash2, Eye, Edit3,
  AlertTriangle, CheckCircle, Clock, Activity, FileText,
  X, MapPin, MessageSquare, RefreshCw, UserCheck
} from 'lucide-react'
import { Consultation, UrgencyLevel, Disease, MUNICIPIOS_UIGE, Role } from '@/types'
import { getConsultasRecentes, getAllConsultas, eliminarConsulta, actualizarConsulta } from '@/lib/firebase'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'

const URGENCY = {
  verde:      { label: 'Normal',      bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', dot: 'bg-emerald-400', Icon: CheckCircle },
  amarelo:    { label: 'Urgente',     bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',       dot: 'bg-amber-400',   Icon: Clock },
  vermelho:   { label: 'Emergência',  bg: 'bg-red-500/15 text-red-300 border-red-500/30',             dot: 'bg-red-400',     Icon: AlertTriangle },
  indefinido: { label: 'Por avaliar', bg: 'bg-slate-500/15 text-slate-400 border-slate-500/30',       dot: 'bg-slate-500',   Icon: Activity },
}

function UrgencyBadge({ u }: { u: UrgencyLevel }) {
  const c = URGENCY[u]; const Icon = c.Icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-medium border ${c.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} flex-shrink-0`} />
      <span className="hidden sm:inline">{c.label}</span>
    </span>
  )
}

function EditModal({ consulta, onSave, onClose }: { consulta: Consultation; onSave: (data: Partial<Consultation>) => Promise<void>; onClose: () => void }) {
  const [urgency,  setUrgency]  = useState<UrgencyLevel>(consulta.urgency)
  const [notas,    setNotas]    = useState(consulta.notas || '')
  const [municipio,setMunicipio]= useState(consulta.municipio)
  const [saving,   setSaving]   = useState(false)

  const handleSave = async () => {
    setSaving(true); await onSave({ urgency, notas, municipio }); setSaving(false); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0d1628, #0a1220)' }}>
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/5">
          <div>
            <h3 className="text-white font-semibold text-sm sm:text-base">Editar Consulta</h3>
            <p className="text-slate-400 text-xs mt-0.5">{consulta.patientCode}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1"><X size={18} /></button>
        </div>
        <div className="p-4 sm:p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Urgência</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(URGENCY) as UrgencyLevel[]).map(u => (
                <button key={u} onClick={() => setUrgency(u)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs sm:text-sm transition-all ${
                    urgency === u ? URGENCY[u].bg : 'border-white/10 text-slate-400 hover:border-white/20'
                  }`}>
                  <span className={`w-2 h-2 rounded-full ${URGENCY[u].dot} flex-shrink-0`} />
                  {URGENCY[u].label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Município</label>
            <select value={municipio} onChange={e => setMunicipio(e.target.value)}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50">
              {MUNICIPIOS_UIGE.map(m => <option key={m} value={m} style={{ background: '#0d1628' }}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Notas clínicas</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={3}
              placeholder="Adicionar notas..." className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder:text-slate-600" />
          </div>
        </div>
        <div className="flex gap-3 p-4 sm:p-5 pt-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 text-sm hover:bg-white/5">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
            {saving ? 'A guardar...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DetailModal({ consulta, onClose, onContinuarChat }: { consulta: Consultation; onClose: () => void; onContinuarChat?: (c: Consultation) => void }) {
  const data = consulta.createdAt instanceof Date ? consulta.createdAt : (consulta.createdAt as any)?.toDate?.() || new Date()
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-2xl max-h-[90vh] sm:max-h-[85vh] rounded-t-2xl sm:rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0d1628, #0a1220)' }}>
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)' }}>
              <FileText size={16} className="text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-white font-semibold text-sm sm:text-base truncate">{consulta.patientCode}</h3>
              <p className="text-slate-400 text-xs">{format(data, "dd MMM yyyy, HH:mm", { locale: pt })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <UrgencyBadge u={consulta.urgency} />
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1"><X size={18} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { icon: MapPin,        label: 'Município',  value: consulta.municipio },
              { icon: MessageSquare, label: 'Mensagens',  value: consulta.messages.length },
              { icon: FileText,      label: 'Relatório',  value: consulta.reportGenerated ? 'Gerado' : 'Pendente' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-white/5 rounded-xl p-2.5 sm:p-3 border border-white/5">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1"><Icon size={11} /><span className="hidden sm:inline">{label}</span><span className="sm:hidden">{label.slice(0,3)}</span></div>
                <p className="text-white text-xs sm:text-sm font-medium truncate">{value}</p>
              </div>
            ))}
          </div>
          {consulta.suspectedDiseases.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-400 mb-2">Doenças suspeitas</p>
              <div className="flex flex-wrap gap-2">
                {consulta.suspectedDiseases.map(d => (
                  <span key={d} className="px-2.5 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs capitalize">{d.replace('_', ' ')}</span>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-slate-400 mb-3">Histórico</p>
            <div className="space-y-2 max-h-48 sm:max-h-64 overflow-y-auto pr-1">
              {consulta.messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                    msg.role === 'user' ? 'bg-blue-600/30 text-blue-100 border border-blue-500/20' : 'bg-white/5 text-slate-300 border border-white/10'
                  }`}>{msg.content.length > 200 ? msg.content.slice(0, 200) + '...' : msg.content}</div>
                </div>
              ))}
            </div>
          </div>
          {consulta.notas && (
            <div>
              <p className="text-xs font-medium text-slate-400 mb-2">Notas clínicas</p>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-slate-300 text-sm">{consulta.notas}</div>
            </div>
          )}
        </div>
        <div className="flex-shrink-0 flex gap-3 p-4 sm:p-5 border-t border-white/5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 text-sm hover:bg-white/5">Fechar</button>
          {onContinuarChat && (
            <button onClick={() => { onContinuarChat(consulta); onClose() }}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
              <MessageSquare size={14} /> Continuar no Chat
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

interface ConsultasViewProps { userId: string; userRole: Role; onContinuarChat?: (c: Consultation) => void }

export default function ConsultasView({ userId, userRole, onContinuarChat }: ConsultasViewProps) {
  const [consultas,      setConsultas]      = useState<Consultation[]>([])
  const [loading,        setLoading]        = useState(true)
  const [search,         setSearch]         = useState('')
  const [filterUrgency,  setFilterUrgency]  = useState<UrgencyLevel | 'all'>('all')
  const [editConsulta,   setEditConsulta]   = useState<Consultation | null>(null)
  const [detailConsulta, setDetailConsulta] = useState<Consultation | null>(null)
  const [deleting,       setDeleting]       = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const data = userRole === 'admin' ? await getAllConsultas() : await getConsultasRecentes(userId)
    setConsultas(data); setLoading(false)
  }, [userId, userRole])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar esta consulta permanentemente?')) return
    setDeleting(id); await eliminarConsulta(id); setConsultas(prev => prev.filter(c => c.id !== id)); setDeleting(null)
  }

  const handleEdit = async (data: Partial<Consultation>) => {
    if (!editConsulta) return
    await actualizarConsulta(editConsulta.id, data)
    setConsultas(prev => prev.map(c => c.id === editConsulta.id ? { ...c, ...data } : c))
  }

  const filtered = consultas.filter(c => {
    const matchSearch = !search || c.patientCode.toLowerCase().includes(search.toLowerCase()) || c.municipio.toLowerCase().includes(search.toLowerCase())
    const matchUrgency = filterUrgency === 'all' || c.urgency === filterUrgency
    return matchSearch && matchUrgency
  })

  const counts = {
    all: consultas.length,
    vermelho: consultas.filter(c => c.urgency === 'vermelho').length,
    amarelo:  consultas.filter(c => c.urgency === 'amarelo').length,
    verde:    consultas.filter(c => c.urgency === 'verde').length,
  }

  return (
    <div className="h-full flex flex-col overflow-hidden min-h-0" style={{ background: 'linear-gradient(135deg, #080d1a, #0d1628)' }}>
      {/* Header */}
      <div className="flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white">Consultas</h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-0.5">{consultas.length} consultas</p>
          </div>
          <button onClick={load} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl border border-white/10 text-slate-400 text-xs sm:text-sm hover:text-white hover:border-white/20 transition-all">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
        {/* Filtros — scrollable horizontal no mobile */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
          {([['all', 'Todas', 'bg-white/10 text-white border-white/20'],
            ['vermelho', 'Emergência', 'bg-red-500/20 text-red-300 border-red-500/30'],
            ['amarelo', 'Urgentes', 'bg-amber-500/20 text-amber-300 border-amber-500/30'],
            ['verde', 'Normais', 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'],
          ] as const).map(([val, label, style]) => (
            <button key={val} onClick={() => setFilterUrgency(val as any)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                filterUrgency === val ? style : 'border-white/5 text-slate-500 hover:border-white/10 hover:text-slate-400'
              }`}>
              {label} <span className="opacity-70">({counts[val as keyof typeof counts] ?? consultas.length})</span>
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por código ou município..."
            className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <History size={36} className="mx-auto mb-3 text-slate-600" />
            <p className="text-slate-400 text-sm">Nenhuma consulta encontrada</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(c => {
              const data = c.createdAt instanceof Date ? c.createdAt : (c.createdAt as any)?.toDate?.() || new Date()
              const cfg = URGENCY[c.urgency]; const Icon = cfg.Icon
              return (
                <div key={c.id}
                  className="group flex items-center gap-3 p-3 sm:p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-all cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                  onClick={() => setDetailConsulta(c)}>
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${cfg.bg}`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-semibold text-white">{c.patientCode}</span>
                      <UrgencyBadge u={c.urgency} />
                      {c.reportGenerated && <FileText size={10} className="text-emerald-400" />}
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-500 mt-0.5">
                      <span className="flex items-center gap-1"><MapPin size={9} /><span className="truncate max-w-[80px] sm:max-w-none">{c.municipio}</span></span>
                      <span className="flex items-center gap-1"><MessageSquare size={9} />{c.messages.length}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <span className="text-xs text-slate-600 mr-1 hidden sm:block">
                      {format(data, 'dd MMM, HH:mm', { locale: pt })}
                    </span>
                    {onContinuarChat && (
                      <button onClick={() => onContinuarChat(c)} title="Continuar no Chat"
                        className="w-8 h-8 rounded-lg hover:bg-blue-500/20 flex items-center justify-center text-slate-400 hover:text-blue-300 transition-all">
                        <MessageSquare size={13} />
                      </button>
                    )}
                    <button onClick={() => setEditConsulta(c)}
                      className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all">
                      <Edit3 size={13} />
                    </button>
                    <button onClick={() => handleDelete(c.id)} disabled={deleting === c.id}
                      className="w-8 h-8 rounded-lg hover:bg-red-500/20 flex items-center justify-center text-slate-400 hover:text-red-400 transition-all">
                      {deleting === c.id ? <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" /> : <Trash2 size={13} />}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {editConsulta   && <EditModal   consulta={editConsulta}   onSave={handleEdit} onClose={() => setEditConsulta(null)} />}
      {detailConsulta && <DetailModal consulta={detailConsulta} onClose={() => setDetailConsulta(null)} onContinuarChat={onContinuarChat} />}
    </div>
  )
}
