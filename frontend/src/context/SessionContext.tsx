/**
 * SessionContext — persists the wizard state to localStorage
 * so the user does not lose progress on accidental page refresh.
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react'
import type { SessionState, CADetails } from '../types'

const STORAGE_KEY = 'certify_genie_session_v3'

const defaultCADetails: CADetails = {
  name: '',
  firm_name: '',
  membership_no: '',
  address: '',
  date: new Date().toLocaleDateString('en-IN'),
}

const defaultSession: SessionState = {
  step: 1,
  uploadResponse: null,
  certificateType: null,
  extractionResponse: null,
  certificateResponse: null,
  caDetails: defaultCADetails,
  overrides: {},
  editorState: null,
  entityType: 'company',
  selectedNWMethod: null,
  nwMethodResults: [],
}

interface SessionContextValue {
  session: SessionState
  setStep: (step: number) => void
  updateSession: (patch: Partial<SessionState>) => void
  resetSession: () => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

function loadSession(): SessionState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as SessionState
      return { ...defaultSession, ...parsed }
    }
  } catch {
    // ignore parse errors
  }
  return defaultSession
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionState>(loadSession)

  // Persist every change to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  }, [session])

  const updateSession = useCallback((patch: Partial<SessionState>) => {
    setSession((prev) => ({ ...prev, ...patch }))
  }, [])

  const setStep = useCallback((step: number) => {
    setSession((prev) => ({ ...prev, step }))
  }, [])

  const resetSession = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setSession(defaultSession)
  }, [])

  return (
    <SessionContext.Provider value={{ session, setStep, updateSession, resetSession }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within SessionProvider')
  return ctx
}
