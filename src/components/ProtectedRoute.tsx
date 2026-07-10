import { Navigate } from 'react-router-dom'
import { getSession } from '../lib/sso'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const session = getSession()

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (!session.userId || !session.email || !session.organizationId) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
