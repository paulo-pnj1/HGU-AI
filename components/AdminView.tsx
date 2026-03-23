'use client'
import { useState, useEffect } from 'react'
import { BarChart3, Users, FileText, AlertTriangle, CheckCircle, Clock, Activity, RefreshCw, Shield, Zap, ArrowUpRight, Calendar, MapPin } from 'lucide-react'
import { User } from '@/types'
import { getEstatisticasGerais, getAllConsultas } from '@/lib/firebase'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'

function StatCard({ label, value, sub, color, icon: Icon }: { label: string; value: number | string; sub?: string; color: string; icon: any }) {
  return (
    <div className="p-4 sm:p-5 rounded-2xl border border-white/5 relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}><Icon size={16} /></div>
      <p className="text-2xl sm:text-3xl font-bold text-white mb-1">{value}</p>
      <p className="text-slate-400 text-xs sm:text-sm">{label}</p>
      {sub && <p className="text-xs text-slate-600 mt-0.5 truncate">{sub}</p>}
    </div>
  )
}

export default function AdminView({ currentUser }: { currentUser: User }) {
  const [stats,           setStats]           = useState<any>(null)
  const [recentConsultas, setRecentConsultas] = useState<any[]>([])
  const [loading,         setLoading]         = useState(true)

  const load = async () => {
    setLoading(true)
    const [estatisticas, consultas] = await Promise.all([getEstatisticasGerais(), getAllConsultas(10)])
    setStats(estatisticas); setRecentConsultas(consultas); setLoading(false)
  }

  useEffect(() => { load() }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-full" style={{ background: 'linear-gradient(135deg, #080d1a, #0d1628)' }}>
      <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
    </div>
  )

  const urgencyTotal = (stats?.emergencias || 0) + (stats?.urgentes || 0) + (stats?.normais || 0)
  const urgencyBars = [
    { label: 'Emergências', value: stats?.emergencias || 0, color: 'bg-red-500',     textColor: 'text-red-400' },
    { label: 'Urgentes',    value: stats?.urgentes    || 0, color: 'bg-amber-500',   textColor: 'text-amber-400' },
    { label: 'Normais',     value: stats?.normais     || 0, color: 'bg-emerald-500', textColor: 'text-emerald-400' },
  ]

  return (
    <div className="h-full overflow-y-auto" style={{ background: 'linear-gradient(135deg, #080d1a, #0d1628)' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white">Painel Admin</h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-0.5">Visão geral do sistema HGU AI</p>
          </div>
          <button onClick={load} className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl border border-white/10 text-slate-400 text-xs sm:text-sm hover:text-white">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>

        {/* Stats grid — 2 cols mobile, 4 cols desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <StatCard label="Total Consultas"  value={stats?.totalConsultas    || 0} sub="Todas"           color="bg-blue-500/20 text-blue-400"    icon={FileText} />
          <StatCard label="Hoje"             value={stats?.consultasHoje     || 0} sub={format(new Date(), "dd MMM", { locale: pt })} color="bg-emerald-500/20 text-emerald-400" icon={Calendar} />
          <StatCard label="Profissionais"    value={stats?.totalProfissionais|| 0} sub="Activos"         color="bg-purple-500/20 text-purple-400" icon={Users} />
          <StatCard label="Relatórios PDF"   value={stats?.relatoriosGerados || 0} sub="Gerados"         color="bg-teal-500/20 text-teal-400"     icon={FileText} />
        </div>

        {/* Urgência — 3 cols mobile e desktop */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <StatCard label="Emergências" value={stats?.emergencias || 0} color="bg-red-500/20 text-red-400"       icon={AlertTriangle} />
          <StatCard label="Urgentes"    value={stats?.urgentes    || 0} color="bg-amber-500/20 text-amber-400"   icon={Clock} />
          <StatCard label="Normais"     value={stats?.normais     || 0} color="bg-emerald-500/20 text-emerald-400" icon={CheckCircle} />
        </div>

        {/* Barras de distribuição */}
        <div className="p-4 sm:p-5 rounded-2xl border border-white/5" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2 text-sm sm:text-base">
            <BarChart3 size={15} className="text-blue-400" /> Distribuição por Urgência
          </h3>
          <div className="space-y-3">
            {urgencyBars.map(bar => (
              <div key={bar.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs sm:text-sm font-medium ${bar.textColor}`}>{bar.label}</span>
                  <span className="text-xs text-slate-400">{bar.value} ({urgencyTotal > 0 ? Math.round(bar.value / urgencyTotal * 100) : 0}%)</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${bar.color}`}
                    style={{ width: urgencyTotal > 0 ? `${(bar.value / urgencyTotal) * 100}%` : '0%', opacity: 0.8 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Consultas recentes */}
        <div className="p-4 sm:p-5 rounded-2xl border border-white/5" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2 text-sm sm:text-base">
            <Activity size={15} className="text-blue-400" /> Consultas Recentes
          </h3>
          {recentConsultas.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">Nenhuma consulta</p>
          ) : (
            <div className="space-y-1.5 sm:space-y-2">
              {recentConsultas.map(c => {
                const data = c.createdAt?.toDate?.() || new Date()
                const urgColors: Record<string, string> = { vermelho: 'text-red-400 bg-red-500/10', amarelo: 'text-amber-400 bg-amber-500/10', verde: 'text-emerald-400 bg-emerald-500/10', indefinido: 'text-slate-400 bg-slate-500/10' }
                return (
                  <div key={c.id} className="flex items-center gap-2 sm:gap-3 py-2 px-2.5 sm:px-3 rounded-xl hover:bg-white/5 transition-all">
                    <span className={`text-xs px-2 py-1 rounded-lg font-medium ${urgColors[c.urgency] || urgColors.indefinido} capitalize flex-shrink-0`}>{c.urgency}</span>
                    <span className="text-xs sm:text-sm text-white flex-1 truncate">{c.patientCode}</span>
                    <span className="hidden sm:flex items-center gap-1 text-xs text-slate-500 flex-shrink-0"><MapPin size={10} />{c.municipio}</span>
                    <span className="text-xs text-slate-600 flex-shrink-0">{format(data, 'dd/MM HH:mm', { locale: pt })}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Info sistema — 1 col mobile, 2 cols desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="p-4 sm:p-5 rounded-2xl border border-white/5" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2 text-sm"><Shield size={14} className="text-blue-400" /> Sistema</h3>
            <div className="space-y-2">
              {[['Versão','HGU AI 2.0'],['Motor IA','Grok (xAI)'],['Base de dados','Firebase'],['Idiomas','PT · Kikongo']].map(([k,v]) => (
                <div key={k} className="flex justify-between text-xs sm:text-sm">
                  <span className="text-slate-500">{k}</span>
                  <span className="text-slate-300 font-medium">{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 sm:p-5 rounded-2xl border border-white/5" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2 text-sm"><Zap size={14} className="text-amber-400" /> Doenças Monitorizadas</h3>
            <div className="space-y-2">
              {['Paludismo','Tuberculose','Diarreia','Saúde Materna'].map(d => (
                <div key={d} className="flex items-center gap-2 text-xs sm:text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                  <span className="text-slate-300">{d}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
