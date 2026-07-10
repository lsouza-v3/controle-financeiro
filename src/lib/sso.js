/// <reference types="vite/client" />
import { importSPKI, jwtVerify, decodeJwt } from 'jose';
const PUBLIC_KEY_URL = import.meta.env.VITE_V3_PUBLIC_KEY_URL;
const APP_ID = import.meta.env.VITE_V3_BOARD_APP_ID;
const ORG_ID = import.meta.env.VITE_V3_ORGANIZATION_ID;
const CONFIRM_URL = import.meta.env.VITE_V3_CONFIRM_URL;
const AUDIENCE = `${APP_ID}:${ORG_ID}`;
let cachedKey = null;
let keyFetchedAt = 0;
async function getPublicKey() {
    if (cachedKey && Date.now() - keyFetchedAt < 86400000)
        return cachedKey;
    const res = await fetch(PUBLIC_KEY_URL);
    const { public_key } = (await res.json());
    cachedKey = await importSPKI(public_key, 'RS256');
    keyFetchedAt = Date.now();
    return cachedKey;
}
const usedJtis = new Set();
export async function handleSSOCallback(token) {
    let jti = null;
    try {
        jti = decodeJwt(token).jti ?? null;
    }
    catch { }
    if (!token) {
        throw new Error('missing_token');
    }
    try {
        const publicKey = await getPublicKey();
        const { payload } = await jwtVerify(token, publicKey, {
            issuer: 'v3-board',
            audience: AUDIENCE,
            algorithms: ['RS256'],
        });
        jti = payload.jti;
        if (usedJtis.has(jti)) {
            throw new Error('token_replayed');
        }
        usedJtis.add(jti);
        setTimeout(() => usedJtis.delete(jti), 3600000);
        if (payload.organization_id !== ORG_ID) {
            throw new Error('invalid_organization');
        }
        fetch(CONFIRM_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jti, status: 'success' }),
        }).catch(() => { });
        return {
            userId: payload.sub,
            email: payload.email,
            name: payload.name,
            organizationId: payload.organization_id,
            roles: payload.roles,
        };
    }
    catch (err) {
        const errMsg = err instanceof Error ? err.message : 'unknown';
        if (jti) {
            fetch(CONFIRM_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jti, status: 'failure', error: errMsg }),
            }).catch(() => { });
        }
        throw new Error(errMsg);
    }
}
export function saveSession(data) {
    localStorage.setItem('session', JSON.stringify(data));
}
export function getSession() {
    const session = localStorage.getItem('session');
    return session ? JSON.parse(session) : null;
}
export function clearSession() {
    localStorage.removeItem('session');
}
