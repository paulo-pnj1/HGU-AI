// hooks/useAuth.ts-Hook de autenticação

'use client'

import { useState, useEffect } from 'react'
import { User as FirebaseUser } from 'firebase/auth'
import { onAuthChange, getProfissional } from '@/lib/firebase'
import { User } from '@/types'

interface AuthState {
  firebaseUser: FirebaseUser | null
  profissional: User | null
  loading: boolean
  authenticated: boolean
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    firebaseUser: null,
    profissional: null,
    loading: true,
    authenticated: false,
  })

  useEffect(() => {
    const unsub = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profissional = await getProfissional(firebaseUser.uid)
          setState({
            firebaseUser,
            profissional,
            loading: false,
            authenticated: !!profissional,
          })
        } catch {
          setState({ firebaseUser, profissional: null, loading: false, authenticated: false })
        }
      } else {
        setState({ firebaseUser: null, profissional: null, loading: false, authenticated: false })
      }
    })

    return unsub
  }, [])

  return state
}
