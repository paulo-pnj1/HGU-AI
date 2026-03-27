'use client'
import { useState, useEffect } from 'react'
import {
  Stethoscope, History, Users, LogOut,
  ChevronRight, BarChart3, Zap, Sun, Moon, Wifi, X, Menu
} from 'lucide-react'
import ChatWindow from '@/components/ChatWindow'
import ConsultasView from '@/components/ConsultasView'
import ProfissionaisView from '@/components/ProfissionaisView'
import AdminView from '@/components/AdminView'
import TeleconsultasView from '@/components/TeleconsultasView'
import {
  getConsultasRecentes, onAuthChange, logoutProfissional,
  getProfissional, getEstatisticasGerais
} from '@/lib/firebase'
import { User, Consultation } from '@/types'

type View = 'chat' | 'consultas' | 'teleconsultas' | 'profissionais' | 'admin'
type Theme = 'dark' | 'light'

const T = {
  dark: {
    app:           'linear-gradient(135deg, #080d1a 0%, #0d1628 50%, #080d1a 100%)',
    sidebar:       'linear-gradient(180deg, rgba(13,22,45,0.98) 0%, rgba(8,13,26,0.99) 100%)',
    border:        'border-white/5',
    navActive:     'linear-gradient(135deg, rgba(37,99,235,0.3), rgba(29,78,216,0.2))',
    navActiveClr:  'text-white font-medium',
    navInactive:   'text-slate-400 hover:text-white hover:bg-white/5',
    title:         'text-white',
    sub:           'text-slate-400',
    statBg:        'bg-white/5',
    statText:      'text-white',
    statSub:       'text-slate-500',
    footerBox:     'bg-blue-500/10 border-blue-500/20',
    footerTxt:     'text-blue-300/80',
    zapClr:        'text-blue-400',
    logout:        'text-slate-500 hover:bg-red-500/10 hover:text-red-400',
    themeBtn:      'text-slate-400 hover:bg-white/5 hover:text-yellow-300',
    logo:          'text-blue-400/70',
    overlay:       'bg-black/60',
    headerBg:      'rgba(8,13,26,0.95)',
  },
  light: {
    app:           'linear-gradient(135deg, #f5f5f0 0%, #eeede8 50%, #f5f5f0 100%)',
    sidebar:       'linear-gradient(180deg, #ffffff 0%, #f8f7f2 100%)',
    border:        'border-slate-200',
    navActive:     'linear-gradient(135deg, rgba(37,99,235,0.10), rgba(29,78,216,0.06))',
    navActiveClr:  'text-blue-700 font-medium',
    navInactive:   'text-slate-500 hover:text-slate-700 hover:bg-slate-100',
    title:         'text-slate-800',
    sub:           'text-slate-500',
    statBg:        'bg-slate-100',
    statText:      'text-slate-800',
    statSub:       'text-slate-400',
    footerBox:     'bg-blue-50 border-blue-200',
    footerTxt:     'text-blue-600',
    zapClr:        'text-blue-500',
    logout:        'text-slate-400 hover:bg-red-50 hover:text-red-500',
    themeBtn:      'text-slate-500 hover:bg-slate-100 hover:text-blue-600',
    logo:          'text-blue-500',
    overlay:       'bg-black/40',
    headerBg:      'rgba(245,245,240,0.95)',
  },
}

const NAV_ITEMS: { id: View; label: string; icon: any; adminOnly?: boolean }[] = [
  { id: 'chat',          label: 'Nova Consulta',  icon: Stethoscope },
  { id: 'consultas',     label: 'Consultas',       icon: History },
  { id: 'teleconsultas', label: 'Teleconsultas',   icon: Wifi },
  { id: 'profissionais', label: 'Profissionais',   icon: Users,    adminOnly: true },
  { id: 'admin',         label: 'Painel Admin',    icon: BarChart3, adminOnly: true },
]

export default function DashboardPageClient() {
  const [user,           setUser]           = useState<User | null>(null)
  const [consultas,      setConsultas]      = useState<Consultation[]>([])
  const [view,           setView]           = useState<View>('chat')
  const [loading,        setLoading]        = useState(true)
  const [theme,          setTheme]          = useState<Theme>('dark')
  const [resumeConsulta, setResumeConsulta] = useState<Consultation | null>(null)
  const [sidebarOpen,    setSidebarOpen]    = useState(false)

  const C = T[theme]

  useEffect(() => {
    const unsub = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        const profissional = await getProfissional(firebaseUser.uid)
        setUser(profissional)
        if (profissional) {
          const [recentes] = await Promise.all([
            getConsultasRecentes(firebaseUser.uid),
          ])
          setConsultas(recentes)
        }
      } else { window.location.href = '/auth' }
      setLoading(false)
    })
    return unsub
  }, [])

  const handleContinuarChat = (consulta: Consultation) => {
    setResumeConsulta(consulta); setView('chat'); setSidebarOpen(false)
  }

  const navTo = (v: View) => { setView(v); setSidebarOpen(false) }

  if (loading) return (
    <div className="flex items-center justify-center h-screen"
      style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1a2d 50%, #0a1628 100%)' }}>
      <div className="text-center">
        <div className="relative w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4">
          <div className="absolute inset-0 rounded-2xl bg-blue-500/20 animate-ping" />
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Stethoscope size={24} className="text-white" />
          </div>
        </div>
        <p className="text-blue-300 text-sm font-medium">A carregar sistema...</p>
      </div>
    </div>
  )

  if (!user) return null

  const hoje = new Date()
  const consultasHoje = consultas.filter(c => {
    const d = c.createdAt instanceof Date ? c.createdAt : (c.createdAt as any)?.toDate?.()
    return d && d.toDateString() === hoje.toDateString()
  })
  const urgentes    = consultas.filter(c => c.urgency === 'amarelo').length
  const emergencias = consultas.filter(c => c.urgency === 'vermelho').length
  const isAdmin     = user.role === 'admin'
  const navItems    = NAV_ITEMS.filter(n => !n.adminOnly || isAdmin)

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`p-4 sm:p-5 border-b ${C.border} flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow: '0 4px 16px rgba(37,99,235,0.4)' }}>
            <Stethoscope size={18} className="text-white" />
          </div>
          <div>
            <p className={`text-sm font-bold ${C.title}`}>HGU AI Clínico</p>
            <p className={`text-xs ${C.logo}`}>Uíge · Angola</p>
          </div>
        </div>
        <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 text-slate-400 hover:text-white">
          <X size={18} />
        </button>
      </div>

      {/* Perfil */}
      <div className={`p-3 sm:p-4 border-b ${C.border}`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)' }}>
            {user.nome.charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden flex-1 min-w-0">
            <p className={`text-sm font-semibold ${C.title} truncate`}>{user.nome}</p>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
              <p className={`text-xs ${C.sub} truncate capitalize`}>{user.role} · {user.departamento}</p>
            </div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1.5 sm:gap-2">
          <div className={`text-center p-1.5 sm:p-2 rounded-lg ${C.statBg}`}>
            <p className={`text-sm sm:text-base font-bold ${C.statText}`}>{consultasHoje.length}</p>
            <p className={`text-xs ${C.statSub}`}>Hoje</p>
          </div>
          <div className="text-center p-1.5 sm:p-2 rounded-lg bg-amber-500/10">
            <p className="text-sm sm:text-base font-bold text-amber-400">{urgentes}</p>
            <p className={`text-xs ${C.statSub}`}>Urg.</p>
          </div>
          <div className="text-center p-1.5 sm:p-2 rounded-lg bg-red-500/10">
            <p className="text-sm sm:text-base font-bold text-red-400">{emergencias}</p>
            <p className={`text-xs ${C.statSub}`}>Em.</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 sm:p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const Icon   = item.icon
          const active = view === item.id
          return (
            <button key={item.id} onClick={() => navTo(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 sm:py-3 rounded-xl text-sm transition-all duration-200 ${active ? C.navActiveClr : C.navInactive}`}
              style={active ? { background: C.navActive, borderLeft: '2px solid #3b82f6', paddingLeft: 'calc(0.75rem - 2px)' } : {}}>
              <Icon size={16} className={active ? 'text-blue-500 flex-shrink-0' : 'flex-shrink-0'} />
              <span className="truncate">{item.label}</span>
              {active && <ChevronRight size={12} className="ml-auto text-blue-500 opacity-60 flex-shrink-0" />}
              {item.id === 'consultas' && emergencias > 0 && (
                <span className="ml-auto text-xs bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold flex-shrink-0">
                  {emergencias}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className={`p-2 sm:p-3 border-t ${C.border}`}>
        <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm mb-2 transition-all ${C.themeBtn}`}>
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
        </button>
        <div className={`${C.footerBox} border rounded-xl p-2.5 sm:p-3 mb-2`}>
          <div className="flex items-start gap-2">
            <Zap size={12} className={`${C.zapClr} flex-shrink-0 mt-0.5`} />
            <p className={`text-xs ${C.footerTxt} leading-relaxed`}>Apoio por IA. Não substitui julgamento clínico.</p>
          </div>
        </div>
        <button onClick={logoutProfissional}
          className={`w-full flex items-center gap-2.5 px-3 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm transition-all ${C.logout}`}>
          <LogOut size={14} /> Terminar sessão
        </button>
        <a href="/auth"
          className="w-full flex items-center gap-2.5 px-3 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm transition-all text-slate-500 hover:bg-blue-500/10 hover:text-blue-400 mt-1">
          <LogOut size={14} className="rotate-180" /> Voltar ao Login
        </a>
      </div>
    </div>
  )

  return (
    <div className="flex h-svh overflow-hidden" style={{ background: C.app }}>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className={`fixed inset-0 z-40 ${C.overlay} backdrop-blur-sm lg:hidden`}
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar-hidden on mobile, slide-in overlay */}
      <aside className={`
        fixed top-0 left-0 h-full z-50 w-[85vw] sm:w-72 transition-transform duration-300
        lg:relative lg:translate-x-0 lg:z-auto lg:w-72
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `} style={{ background: C.sidebar, borderRight: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#e2e8f0'}` }}>
        {theme === 'dark' && (
          <div className="absolute top-0 left-0 w-full h-48 opacity-10 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 30% 0%, #3b82f6 0%, transparent 70%)' }} />
        )}
        <div className="relative h-full">
          <SidebarContent />
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-0">
        {/* Mobile topbar */}
        <header className={`lg:hidden flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b ${C.border}`}
          style={{ background: C.headerBg, backdropFilter: 'blur(10px)' }}>
          <button onClick={() => setSidebarOpen(true)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center ${C.navInactive} border ${C.border}`}>
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
              <Stethoscope size={12} className="text-white" />
            </div>
            <span className={`text-sm font-semibold ${C.title} truncate`}>
              {NAV_ITEMS.find(n => n.id === view)?.label || 'HGU AI'}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-hidden min-h-0">
          {view === 'chat' && (
            <ChatWindow userId={user.uid} userName={user.nome}
              resumeConsulta={resumeConsulta} onClearResume={() => setResumeConsulta(null)} />
          )}
          {view === 'consultas' && (
            <ConsultasView userId={user.uid} userRole={user.role} onContinuarChat={handleContinuarChat} />
          )}
          {view === 'teleconsultas' && <TeleconsultasView currentUserId={user.uid} />}
          {view === 'profissionais' && isAdmin && <ProfissionaisView currentUser={user} />}
          {view === 'admin' && isAdmin && <AdminView currentUser={user} />}
        </main>
      </div>
    </div>
  )
}