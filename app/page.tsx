export const dynamic = 'force-dynamic'

// app/page.tsx — Página inicial: redireciona profissionais para /auth,
// e mostra acesso à teleconsulta para pacientes
import { redirect } from 'next/navigation'
export default function Home() {
  redirect('/auth')
}