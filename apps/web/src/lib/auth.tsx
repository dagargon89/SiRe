import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  onIdTokenChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import { auth } from './firebase'
import { api } from './apiClient'
import { ApiError, type Usuario } from './api'

interface AuthState {
  firebaseUser: User | null
  perfil: Usuario | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [perfil, setPerfil] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onIdTokenChanged(auth, async (user) => {
      setFirebaseUser(user)
      if (!user) {
        setPerfil(null)
        setLoading(false)
        return
      }
      try {
        setPerfil(await api.me())
      } catch (e) {
        // Perfil inactivo/inexistente en el backend: cerrar sesión de Firebase.
        if (e instanceof ApiError && (e.status === 403 || e.status === 401)) {
          await signOut(auth)
          setPerfil(null)
        }
      } finally {
        setLoading(false)
      }
    })
  }, [])

  async function login(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(auth, email, password)
    // El perfil se carga en onIdTokenChanged.
  }

  async function logout(): Promise<void> {
    await signOut(auth)
  }

  async function resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email)
  }

  return (
    <AuthContext.Provider value={{ firebaseUser, perfil, loading, login, logout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
