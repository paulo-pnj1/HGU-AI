'use client'
import { useState } from 'react'
import { Stethoscope, Eye, EyeOff, Loader2, Shield, Activity } from 'lucide-react'
import { loginProfissional } from '@/lib/firebase'

export default function AuthPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      await loginProfissional(email, password)
      window.location.href = '/dashboard'
    } catch {
      setError('Credenciais inválidas. Verifique o email e palavra-passe.')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative"
      style={{ background: 'linear-gradient(135deg, #050a14 0%, #0a1628 50%, #050a14 100%)' }}>

      {/* Fundo decorativo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 sm:w-96 h-64 sm:h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #2563eb, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-48 sm:w-80 h-48 sm:h-80 rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #7c3aed, transparent 70%)', filter: 'blur(50px)' }} />
        <div className="absolute inset-0 opacity-[0.02]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-5">
            <div className="absolute inset-0 rounded-2xl opacity-40 animate-pulse"
              style={{ background: 'radial-gradient(circle, #3b82f6, transparent)', filter: 'blur(12px)' }} />
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', boxShadow: '0 16px 48px rgba(37,99,235,0.4)' }}>
              <Stethoscope size={28} className="text-white sm:hidden" />
              <Stethoscope size={36} className="text-white hidden sm:block" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">HGU AI Clínico</h1>
          <p className="text-blue-400/70 text-xs sm:text-sm mt-1.5">Hospital Geral do Uíge · Angola</p>
          <div className="flex items-center justify-center gap-4 mt-3">
            {[['Sistema seguro', Shield], ['IA médica', Activity]].map(([label, Icon]: any) => (
              <div key={label as string} className="flex items-center gap-1.5 text-xs text-slate-500">
                <Icon size={11} className="text-blue-500/60" />{label}
              </div>
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(13,22,45,0.9), rgba(8,13,26,0.95))', backdropFilter: 'blur(20px)', boxShadow: '0 32px 64px rgba(0,0,0,0.5)' }}>
          <div className="p-5 sm:p-6">
            <h2 className="text-white font-semibold mb-4 sm:mb-5 text-sm sm:text-base">Acesso de profissional</h2>
            <form onSubmit={handleLogin} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Email institucional</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="nome@hgu.minsaangola.ao" required
                  className="w-full px-3 py-2.5 sm:py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Palavra-passe</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
                    className="w-full px-3 py-2.5 sm:py-3 pr-10 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all" />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors p-1">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0 mt-1" />
                  <p className="text-red-300 text-xs">{error}</p>
                </div>
              )}
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow: '0 8px 24px rgba(37,99,235,0.4)' }}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Stethoscope size={16} />}
                {loading ? 'A entrar...' : 'Iniciar sessão'}
              </button>
            </form>
            <div className="mt-4 pt-4 border-t border-white/5">
              <p className="text-slate-500 text-xs text-center leading-relaxed">
                Acesso restrito a profissionais de saúde do HGU.<br />
                Contacte o administrador para obter credenciais.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3 p-3 rounded-xl border border-amber-500/15 bg-amber-500/5">
          <p className="text-amber-500/70 text-xs text-center">
            Sistema de uso exclusivo para apoio clínico. Não partilhe as suas credenciais.
          </p>
        </div>

        <div className="mt-3 p-4 rounded-2xl border border-violet-500/20 bg-violet-500/8">
          <p className="text-violet-300 text-xs font-medium text-center mb-2">
            🏠 É paciente? Faça a sua consulta em casa
          </p>
          <a href="/teleconsulta"
            className="block w-full py-2.5 rounded-xl text-center text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 4px 16px rgba(124,58,237,0.35)' }}>
            Teleconsulta Remota →
          </a>
          <p className="text-slate-600 text-xs text-center mt-2">Sem conta ou deslocação ao hospital</p>
        </div>

        <p className="text-slate-700 text-xs text-center mt-4">© 2025 Hospital Geral do Uíge · MINSA Angola</p>
      </div>
    </div>
  )
}
