import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { handleSSOCallback, saveSession } from '../lib/sso';
const ERROR_MESSAGES = {
    missing_token: 'Link de acesso inválido. Volte ao V3 Board e tente novamente.',
    invalid_token: 'Link expirado ou já utilizado. Volte ao V3 Board e clique em "Acessar" novamente.',
    invalid_organization: 'Acesso negado. Sua conta não tem permissão para este sistema.',
    token_replayed: 'Este link já foi utilizado. Clique em "Acessar" novamente no V3 Board.',
};
export function AuthCallback() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const token = searchParams.get('token');
        const returnTo = searchParams.get('return_to') ?? '/dashboard';
        if (!token) {
            setError('missing_token');
            setLoading(false);
            return;
        }
        handleSSOCallback(token)
            .then((session) => {
            saveSession(session);
            navigate(returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/dashboard');
        })
            .catch((err) => {
            const errorKey = err.message || 'invalid_token';
            setError(errorKey);
            setLoading(false);
        });
    }, [searchParams, navigate]);
    if (loading) {
        return (_jsx("div", { style: { textAlign: 'center', padding: '2rem' }, children: _jsx("p", { children: "Autenticando..." }) }));
    }
    if (error) {
        return (_jsxs("div", { style: { textAlign: 'center', padding: '2rem' }, children: [_jsx("h1", { children: "Erro na autentica\u00E7\u00E3o" }), _jsx("p", { style: { color: 'red', fontSize: '1.1rem' }, children: ERROR_MESSAGES[error] || 'Erro desconhecido. Volte ao V3 Board e tente novamente.' })] }));
    }
    return null;
}
