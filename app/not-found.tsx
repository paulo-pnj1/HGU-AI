export const dynamic = 'force-dynamic'

export default function NotFound() {
  return (
    <html lang="pt">
      <body style={{ margin: 0, background: '#080d1a', color: '#fff', fontFamily: 'sans-serif',
        display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '4rem', margin: 0, color: '#2563eb' }}>404</h1>
          <p style={{ color: '#94a3b8' }}>Página não encontrada</p>
          <a href="/" style={{ color: '#2563eb' }}>Voltar ao início</a>
        </div>
      </body>
    </html>
  )
}