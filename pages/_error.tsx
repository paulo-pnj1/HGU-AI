function Error({ statusCode }: { statusCode: number }) {
  return (
    <div style={{ textAlign: 'center', padding: '4rem', background: '#080d1a', minHeight: '100vh', color: '#fff' }}>
      <h1>{statusCode}</h1>
      <p>{statusCode === 404 ? 'Página não encontrada' : 'Erro no servidor'}</p>
      <a href="/" style={{ color: '#2563eb' }}>Voltar ao início</a>
    </div>
  )
}

Error.getInitialProps = ({ res, err }: any) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  return { statusCode }
}

export default Error