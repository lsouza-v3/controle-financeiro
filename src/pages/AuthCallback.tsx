import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { handleSSOCallback, saveSession } from '../lib/sso'

const ERROR_MESSAGES: Record<string, string> = {
  missing_token: 'Link de acesso inválido. Volte ao V3 Board e tente novamente.',
  invalid_token: 'Link expirado ou já utilizado. Volte ao V3 Board e clique em "Acessar" novamente.',
  invalid_organization: 'Acesso negado. Sua conta não tem permissão para este sistema.',
  token_replayed: 'Este link já foi utilizado. Clique em "Acessar" novamente no V3 Board.',
}

export function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = searchParams.get('token')
    const returnTo = searchParams.get('return_to') ?? '/dashboard'

    if (!token) {
      setError('missing_token')
      setLoading(false)
      return
    }

    handleSSOCallback(token)
      .then((session) => {
        saveSession(session)
        navigate(returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/dashboard')
      })
      .catch((err) => {
        const errorKey = err.message || 'invalid_token'
        setError(errorKey)
        setLoading(false)
      })
  }, [searchParams, navigate])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <p>Autenticando...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <h1>Erro na autenticação</h1>
        <p style={{ color: 'red', fontSize: '1.1rem' }}>
          {ERROR_MESSAGES[error] || 'Erro desconhecido. Volte ao V3 Board e tente novamente.'}
        </p>
      </div>
    )
  }

  return null
}
