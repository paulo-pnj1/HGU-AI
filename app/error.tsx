'use client'
export const dynamic = 'force-dynamic'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ margin: 0, background: '#080d1a', color: '#fff', fontFamily: 'sans-serif',
      display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', margin: 0, color: '#ef4444' }}>Erro</h1>
        <p style={{ color: '#94a3b8' }}>Ocorreu um erro inesperado.</p>
        <button onClick={reset} style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}>
          Tentar novamente
        </button>
      </div>
    </div>
  )
}