import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { Navigate } from 'react-router-dom';
import { getSession } from '../lib/sso';
export function ProtectedRoute({ children }) {
    const session = getSession();
    if (!session) {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    if (!session.userId || !session.email || !session.organizationId) {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    return _jsx(_Fragment, { children: children });
}
