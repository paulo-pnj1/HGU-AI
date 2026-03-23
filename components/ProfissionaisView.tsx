'use client'
// components/ProfissionaisView.tsx — CRUD de Profissionais (Admin)

import { useState, useEffect, useCallback } from 'react'
import {
  Users, Plus, Edit3, Trash2, Search, X, Eye, EyeOff,
  Shield, Stethoscope, CheckCircle, AlertCircle, RefreshCw,
  Phone, Mail, MapPin, Building2, CreditCard
} from 'lucide-react'
import { User, Role, DEPARTAMENTOS, ROLE_LABELS } from '@/types'
import { getAllProfissionais, criarProfissional, actualizarProfissional, eliminarProfissional } from '@/lib/firebase'

const ROLE_COLORS: Record<Role, string> = {
  admin:      'bg-purple-500/20 text-purple-300 border-purple-500/30',
  medico:     'bg-blue-500/20 text-blue-300 border-blue-500/30',
  enfermeiro: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  tecnico:    'bg-slate-500/20 text-slate-300 border-slate-500/30',
}

interface FormData {
  nome: string; email: string; role: Role; departamento: string
  numeroBI: string; hospital: string; telefone: string
}

const EMPTY_FORM: FormData = {
  nome: '', email: '', role: 'medico', departamento: DEPARTAMENTOS[0],
  numeroBI: '', hospital: 'Hospital Geral do Uíge', telefone: '',
}

function ProfissionalModal({
  profissional, onSave, onClose
}: { profissional: User | null; onSave: () => void; onClose: () => void }) {
  const isEdit = !!profissional
  const [form, setForm] = useState<FormData>(
    profissional
      ? { nome: profissional.nome, email: profissional.email, role: profissional.role,
          departamento: profissional.departamento, numeroBI: profissional.numeroBI,
          hospital: profissional.hospital, telefone: profissional.telefone || '' }
      : EMPTY_FORM
  )
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }))

  const handleSave = async () => {
    if (!form.nome || !form.email) { setError('Nome e email são obrigatórios'); return }
    if (!isEdit && !password) { setError('Password é obrigatória'); return }
    setSaving(true); setError('')
    try {
      if (isEdit) {
        await actualizarProfissional(profissional!.uid, form)
      } else {
        await criarProfissional(form as any, password)
      }
      onSave(); onClose()
    } catch (e: any) {
      setError(e.message || 'Erro ao guardar')
    } finally { setSaving(false) }
  }

  const inputCls = "w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 placeholder:text-slate-600"
  const labelCls = "block text-xs font-medium text-slate-400 mb-1.5"

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg max-h-[92vh] rounded-t-2xl sm:rounded-2xl border border-white/10 shadow-2xl overflow-y-auto"
        style={{ background: 'linear-gradient(135deg, #0d1628, #0a1220)' }}>

        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/5">
          <div>
            <h3 className="text-white font-semibold">{isEdit ? 'Editar Profissional' : 'Novo Profissional'}</h3>
            <p className="text-slate-400 text-xs mt-0.5">{isEdit ? profissional!.email : 'Criar conta de acesso'}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1"><X size={18} /></button>
        </div>

        <div className="p-4 sm:p-5 space-y-4 max-h-[65vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="col-span-2">
              <label className={labelCls}>Nome completo *</label>
              <input value={form.nome} onChange={set('nome')} placeholder="Dr. João Silva" className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Email institucional *</label>
              <input type="email" value={form.email} onChange={set('email')}
                disabled={isEdit} placeholder="nome@hgu.minsaangola.ao"
                className={inputCls + (isEdit ? ' opacity-50 cursor-not-allowed' : '')} />
            </div>
            {!isEdit && (
              <div className="col-span-2">
                <label className={labelCls}>Password</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres" className={inputCls + ' pr-10'} />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            )}
            <div>
              <label className={labelCls}>Função</label>
              <select value={form.role} onChange={set('role') as any}
                className={inputCls.replace('text-white', '') + ' text-white'} style={{ background: '#0d1628' }}>
                {(Object.entries(ROLE_LABELS) as [Role, string][]).map(([k, v]) =>
                  <option key={k} value={k} style={{ background: '#0d1628' }}>{v}</option>
                )}
              </select>
            </div>
            <div>
              <label className={labelCls}>Departamento</label>
              <select value={form.departamento} onChange={set('departamento') as any}
                className={inputCls} style={{ background: '#0d1628' }}>
                {DEPARTAMENTOS.map(d => <option key={d} value={d} style={{ background: '#0d1628' }}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Nº BI</label>
              <input value={form.numeroBI} onChange={set('numeroBI')} placeholder="000000000LA000" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Telefone</label>
              <input value={form.telefone} onChange={set('telefone')} placeholder="+244 9XX XXX XXX" className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Hospital / Unidade</label>
              <input value={form.hospital} onChange={set('hospital')} className={inputCls} />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/15 border border-red-500/30">
              <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
              <p className="text-red-300 text-xs">{error}</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-4 sm:p-5 border-t border-white/5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 text-sm hover:bg-white/5">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50 transition-all"
            style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
            {saving ? 'A guardar...' : (isEdit ? 'Guardar alterações' : 'Criar profissional')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ProfissionaisView({ currentUser }: { currentUser: User }) {
  const [profissionais, setProfissionais] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState<Role | 'all'>('all')
  const [modal, setModal] = useState<{ open: boolean; profissional: User | null }>({ open: false, profissional: null })
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await getAllProfissionais()
    setProfissionais(data.filter(p => p.activo !== false))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (uid: string) => {
    if (uid === currentUser.uid) { alert('Não pode eliminar a sua própria conta.'); return }
    if (!confirm('Desactivar este profissional?')) return
    setDeleting(uid)
    await eliminarProfissional(uid)
    setProfissionais(prev => prev.filter(p => p.uid !== uid))
    setDeleting(null)
  }

  const filtered = profissionais.filter(p => {
    const matchSearch = !search || p.nome.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase())
    const matchRole = filterRole === 'all' || p.role === filterRole
    return matchSearch && matchRole
  })

  return (
    <div className="h-full flex flex-col overflow-hidden min-h-0" style={{ background: 'linear-gradient(135deg, #080d1a, #0d1628)' }}>

      {/* Header */}
      <div className="flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">Profissionais</h1>
            <p className="text-slate-400 text-sm">{profissionais.length} profissionais registados</p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 text-slate-400 text-sm hover:text-white">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => setModal({ open: true, profissional: null })}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-medium text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
              <Plus size={15} /> <span className="hidden sm:inline">Novo profissional</span><span className="sm:hidden">Novo</span>
            </button>
          </div>
        </div>

        {/* Filtro por role */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-none">
          {([['all', 'Todos'], ...Object.entries(ROLE_LABELS)] as [string, string][]).map(([val, label]) => (
            <button key={val} onClick={() => setFilterRole(val as any)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                filterRole === val
                  ? (val === 'all' ? 'bg-white/10 text-white border-white/20' : ROLE_COLORS[val as Role])
                  : 'border-white/5 text-slate-500 hover:border-white/10 hover:text-slate-400'
              }`}>
              {label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou email..."
            className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
        </div>
      </div>

      {/* Grid de profissionais */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map(p => (
              <div key={p.uid}
                className="group p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-all"
                style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)' }}>
                      {p.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{p.nome}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-lg border text-xs font-medium ${ROLE_COLORS[p.role]}`}>
                        {ROLE_LABELS[p.role]}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setModal({ open: true, profissional: p })}
                      className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all">
                      <Edit3 size={13} />
                    </button>
                    <button onClick={() => handleDelete(p.uid)} disabled={deleting === p.uid}
                      className="w-8 h-8 rounded-lg hover:bg-red-500/20 flex items-center justify-center text-slate-400 hover:text-red-400 transition-all">
                      {deleting === p.uid ? <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" /> : <Trash2 size={13} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Mail size={11} /><span className="truncate">{p.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Building2 size={11} /><span>{p.departamento}</span>
                  </div>
                  {p.telefone && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Phone size={11} /><span>{p.telefone}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="col-span-3 text-center py-16">
                <Users size={40} className="mx-auto mb-3 text-slate-600" />
                <p className="text-slate-400 text-sm">Nenhum profissional encontrado</p>
              </div>
            )}
          </div>
        )}
      </div>

      {modal.open && (
        <ProfissionalModal
          profissional={modal.profissional}
          onSave={load}
          onClose={() => setModal({ open: false, profissional: null })}
        />
      )}
    </div>
  )
}
