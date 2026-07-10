# SSO V3 Board — Prompt para Vibe Coding

> Preencha apenas as **3 seções marcadas**. A IA cuida de toda a implementação técnica e gera um guia passo a passo para colocar o app no ar.

---

## Antes de começar — obtenha suas credenciais no V3 Board

Faça isso uma única vez, antes de enviar este arquivo para a IA:

1. Entre no V3 Board com sua conta de gestor ou administrador
2. No menu lateral, clique em **Sistemas**
3. Clique em **+ Novo Sistema** e preencha:
   - **Nome:** o nome do seu app (ex: "Portal de Relatórios")
   - **URL:** coloque `https://placeholder.com` por agora — você vai atualizar depois
4. Localize o card do sistema que acabou de criar
5. Clique no **ícone de olho (👁)** no canto do card
6. Copie os **quatro valores** que aparecem na tela (use o botão de copiar)

---

## ━━━ PREENCHA AQUI ━━━

### 1. Suas credenciais SSO

```
V3_BOARD_APP_ID=ca1ec38b-b522-403c-8535-2b94f695173d
V3_ORGANIZATION_ID=6cfa7687-9e59-457f-9f72-f845ef38b1f6
V3_PUBLIC_KEY_URL=https://jzdimxyefaiwxclckcew.supabase.co/functions/v1/public-key
V3_CONFIRM_URL=https://v3board.com.br/api/sso/confirm
```

> Os quatro valores são copiados de uma vez pelo botão no modal de integração.
> `V3_BOARD_APP_ID` = UUID do seu app | `V3_ORGANIZATION_ID` = UUID da sua empresa
> `V3_PUBLIC_KEY_URL` = endpoint da chave pública | `V3_CONFIRM_URL` = endpoint de confirmação

---

### 2. O que você quer criar
Quero um sistema de controle financeiro pessoal.
Nele deve ter cadastros de entradas e saídas de registros.
---

### 3. Como vai publicar o app

Marque **uma** opção:

```
[ ] Estou usando o Lovable para criar o app
[ X ] Estou usando outra ferramenta de IA (ChatGPT, Claude, Bolt, v0, Cursor, etc.)
```

Se marcou a segunda opção, onde quer publicar? (opcional — deixe em branco se não souber):

```
[ ] Vercel    [ ] Railway    [ ] Render    [ ] Netlify    [ X ] Outro: Quero fazer diretamente pelo Github Pages
```

Tem conta no GitHub? (opcional — permite que a IA configure o deploy automático):

```
[ X ] Sim — meu usuário do GitHub é: @lsouza-v3
[ ] Não tenho conta no GitHub
```

---

## ━━━ FIM DO QUE VOCÊ PRECISA PREENCHER ━━━

---

> **A partir daqui são instruções exclusivamente para a IA. Não altere nada abaixo.**

---

## Instruções para o modelo de IA

Você recebeu um pedido de um usuário não-técnico para criar um app integrado com SSO do V3 Board. Execute as Regras **em ordem, de 1 a 12**, sem pular nenhuma. O resultado final deve ser um app completo + arquivos de deploy + guia passo a passo para colocar o app no ar.

**Fluxo obrigatório — execute em ordem, sem pular:**
1. Regras 1–7 → implementar o app e a autenticação SSO
2. Regra 8 → gerar arquivos essenciais do projeto (gitignore, README, vite.config.ts, tsconfig.json)
3. Regra 9 → gerar arquivo de configuração da plataforma de deploy (vercel.json, netlify.toml, etc.)
4. Regra 10 → gerar workflow de CI/CD para GitHub Actions (se aplicável)
5. Regra 11 → gerar o arquivo `PROXIMOS_PASSOS.md` com guia completo de deploy
6. Regra 12 → aplicar boas práticas e revisar o projeto completo

---

### Regra 1 — Identificar a tecnologia

**Se o usuário marcou Lovable:** implemente o SSO via Supabase Edge Function (Implementação A).

**Se marcou outra ferramenta ou não especificou:** implemente via React com Vite + TypeScript (Implementação B). Este é o padrão — use mesmo que o usuário não tenha respondido.

---

### Regra 2 — Autenticação

Este app **não tem login próprio**. Não crie formulário de senha, cadastro ou tela de autenticação própria. A autenticação é 100% via SSO do V3 Board. O usuário acessa o app clicando em "Acessar" no V3 Board, que redireciona automaticamente para o app já autenticado.

---

### Regra 3 — Implementação A: Lovable (Supabase Edge Function)

Crie `supabase/functions/auth-callback/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import * as jose from 'https://deno.land/x/jose@v4.15.4/index.ts'

const PUBLIC_KEY_URL = Deno.env.get('V3_PUBLIC_KEY_URL')!
const APP_ID = Deno.env.get('V3_BOARD_APP_ID')!
const ORG_ID = Deno.env.get('V3_ORGANIZATION_ID')!
const APP_URL = Deno.env.get('APP_URL') ?? ''
const AUDIENCE = `${APP_ID}:${ORG_ID}`

let cachedKey: jose.KeyLike | null = null
let keyFetchedAt = 0

async function getPublicKey() {
  if (cachedKey && Date.now() - keyFetchedAt < 86_400_000) return cachedKey
  const res = await fetch(PUBLIC_KEY_URL)
  const { public_key } = await res.json()
  cachedKey = await jose.importSPKI(public_key, 'RS256')
  keyFetchedAt = Date.now()
  return cachedKey
}

const usedJtis = new Set<string>()

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': APP_URL,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  const url = new URL(req.url)
  const token = url.searchParams.get('token')
  const rawReturnTo = url.searchParams.get('return_to') ?? '/dashboard'
  const returnTo = rawReturnTo.startsWith('/') && !rawReturnTo.startsWith('//') ? rawReturnTo : '/dashboard'

  let jti: string | null = null
  try {
    const parts = token?.split('.')
    if (parts && parts[1]) {
      const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
      jti = JSON.parse(atob(b64))?.jti ?? null
    }
  } catch {}

  if (!token) {
    return Response.redirect(`${APP_URL}/login?error=missing_token`, 302)
  }

  try {
    const publicKey = await getPublicKey()
    const { payload } = await jose.jwtVerify(token, publicKey, {
      issuer: 'v3-board',
      audience: AUDIENCE,
      algorithms: ['RS256'],
    })

    jti = payload.jti as string

    if (usedJtis.has(jti)) {
      return Response.redirect(`${APP_URL}/login?error=token_replayed`, 302)
    }
    usedJtis.add(jti)

    if ((payload.organization_id as string) !== ORG_ID) {
      return Response.redirect(`${APP_URL}/login?error=invalid_organization`, 302)
    }

    fetch(Deno.env.get('V3_CONFIRM_URL')!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jti, status: 'success' }),
    }).catch(() => {})

    const session = encodeURIComponent(JSON.stringify({
      userId: payload.sub,
      email: payload.email,
      name: payload.name,
      organizationId: payload.organization_id,
      roles: payload.roles,
    }))

    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${APP_URL}${returnTo}`,
        'Set-Cookie': `session=${session}; HttpOnly; SameSite=Lax; Max-Age=28800; Path=/`,
      },
    })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'unknown'
    if (jti) {
      fetch(Deno.env.get('V3_CONFIRM_URL')!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jti, status: 'failure', error: errMsg }),
      }).catch(() => {})
    }
    return Response.redirect(`${APP_URL}/login?error=invalid_token`, 302)
  }
})
```

---

### Regra 4 — Implementação B: React + Vite

Crie `src/lib/sso.ts` (utilitário de autenticação):

```typescript
import { importSPKI, jwtVerify, decodeJwt } from 'jose'

const PUBLIC_KEY_URL = import.meta.env.VITE_V3_PUBLIC_KEY_URL  // ⚠️ prefixo VITE_ obrigatório
const APP_ID = import.meta.env.VITE_V3_BOARD_APP_ID            // ⚠️ prefixo VITE_ obrigatório
const ORG_ID = import.meta.env.VITE_V3_ORGANIZATION_ID // ⚠️ prefixo VITE_ obrigatório
const AUDIENCE = `${APP_ID}:${ORG_ID}`
// Se APP_ID ou ORG_ID forem undefined, AUDIENCE será "undefined:undefined" e o JWT falhará.
// Isso acontece quando as variáveis são configuradas SEM o prefixo VITE_ na plataforma de deploy.

let cachedKey: CryptoKey | null = null
let keyFetchedAt = 0

async function getPublicKey(): Promise<CryptoKey> {
  if (cachedKey && Date.now() - keyFetchedAt < 86_400_000) return cachedKey
  const res = await fetch(PUBLIC_KEY_URL)
  const { public_key } = (await res.json()) as { public_key: string }
  cachedKey = await importSPKI(public_key, 'RS256')
  keyFetchedAt = Date.now()
  return cachedKey
}

const usedJtis = new Set<string>()

export interface SessionData {
  userId: string
  email: string
  name: string
  organizationId: string
  roles: string[]
}

export async function handleSSOCallback(token: string): Promise<SessionData> {
  let jti: string | null = null
  try { jti = (decodeJwt(token).jti as string) ?? null } catch {}

  if (!token) {
    throw new Error('missing_token')
  }

  try {
    const publicKey = await getPublicKey()
    const { payload } = await jwtVerify(token, publicKey, {
      issuer: 'v3-board',
      audience: AUDIENCE,
      algorithms: ['RS256'],
    })

    jti = payload.jti as string

    if (usedJtis.has(jti)) {
      throw new Error('token_replayed')
    }
    usedJtis.add(jti)
    setTimeout(() => usedJtis.delete(jti!), 3_600_000)

    if ((payload.organization_id as string) !== ORG_ID) {
      throw new Error('invalid_organization')
    }

    fetch(import.meta.env.VITE_V3_CONFIRM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jti, status: 'success' }),
    }).catch(() => {})

    return {
      userId: payload.sub as string,
      email: payload.email as string,
      name: payload.name as string,
      organizationId: payload.organization_id as string,
      roles: payload.roles as string[],
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'unknown'
    if (jti) {
      fetch(import.meta.env.VITE_V3_CONFIRM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jti, status: 'failure', error: errMsg }),
      }).catch(() => {})
    }
    throw new Error(errMsg)
  }
}

export function saveSession(data: SessionData): void {
  localStorage.setItem('session', JSON.stringify(data))
}

export function getSession(): SessionData | null {
  const session = localStorage.getItem('session')
  return session ? JSON.parse(session) : null
}

export function clearSession(): void {
  localStorage.removeItem('session')
}
```

Crie `src/pages/AuthCallback.tsx` (componente que processa o callback):

```typescript
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
```

Instale: `npm install jose react-router-dom`

Configure o Vite com suporte a variáveis de ambiente:
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
})
```

Crie `src/App.tsx` (componente raiz com configuração de rotas):

```typescript
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthCallback } from './pages/AuthCallback'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { ProtectedRoute } from './components/ProtectedRoute'

export function App() {
  return (
    <Router>
      <Routes>
        {/* Rotas públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Rotas protegidas */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Redireciona raiz para dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  )
}
```

Crie `src/main.tsx` (ponto de entrada):

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

Crie `src/pages/Dashboard.tsx` (página protegida — exemplo):

```typescript
import { getSession, clearSession } from '../lib/sso'
import { useNavigate } from 'react-router-dom'

export function Dashboard() {
  const navigate = useNavigate()
  const session = getSession()

  const handleLogout = () => {
    clearSession()
    navigate('/login')
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Bem-vindo!</h1>
      <p>Email: {session?.email}</p>
      <p>Nome: {session?.name}</p>
      <p>Organização: {session?.organizationId}</p>
      <button onClick={handleLogout}>Sair</button>
    </div>
  )
}
```

**Scripts do package.json:**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint ."
  }
}
```

**Para rodar localmente:**
```bash
npm install
npm run dev
# Acessa localhost:3000
```

---

### Regra 5 — Arquivos de ambiente

Crie `.env.example` (vai para o repositório — use placeholders):
```env
# SSO V3 Board — cole os valores reais em .env (nunca no .env.example)
VITE_V3_BOARD_APP_ID=cole-aqui-o-uuid-do-seu-app
VITE_V3_ORGANIZATION_ID=cole-aqui-o-uuid-da-sua-empresa
```

Crie `.env` (valores reais do usuário — NÃO vai para o repositório):
```env
VITE_V3_BOARD_APP_ID=[primeiro código copiado do V3 Board — campo V3_BOARD_APP_ID da seção 1]
VITE_V3_ORGANIZATION_ID=[segundo código copiado do V3 Board — campo V3_ORGANIZATION_ID da seção 1]
```

Crie `.gitignore` (se ainda não existir) com pelo menos:
```
.env
.env.local
node_modules/
dist/
build/
```

O `.env.example` **deve** ir para o repositório (contém apenas placeholders). O `.env` **nunca** vai para o repositório.

> ⚠️ **O prefixo `VITE_` é obrigatório e não pode ser omitido.** O Vite embute os valores no bundle durante o build substituindo `import.meta.env.VITE_X` pelo valor real. Sem o prefixo, o valor vira `undefined` em produção — o `AUDIENCE` fica `"undefined:undefined"` e a validação do JWT falha com `"unexpected \"aud\" claim value"`. Configure as variáveis **com exatamente este prefixo** em toda plataforma de deploy (Railway, Vercel, Netlify, Render, Heroku, etc.) e faça redeploy após configurar.

**Para Lovable:** use `APP_URL` em vez de `VITE_` — Lovable gerencia variáveis de forma diferente.

---

### Regra 6 — Página /login

Crie `src/pages/Login.tsx`:

```typescript
export function Login() {
  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <h1>Acesso ao Sistema</h1>
      <p>O acesso a este sistema é feito pelo V3 Board.</p>
      <p style={{ marginTop: '1rem', fontSize: '0.95rem', color: '#666' }}>
        Retorne ao V3 Board e clique em "Acessar" para continuar.
      </p>
    </div>
  )
}
```

> Nota: Se vier com query string `?error=`, o AuthCallback já trata e mostra a mensagem apropriada antes de redirecionar para `/login`. Veja `src/pages/AuthCallback.tsx` para detalhes.

---

### Regra 7 — Proteção de rotas

Crie `src/components/ProtectedRoute.tsx` para proteger rotas:

```typescript
import { Navigate } from 'react-router-dom'
import { getSession, SessionData } from '../lib/sso'

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
```

Configure no seu router:
```typescript
<Route path="/dashboard" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />
```

> ⚠️ **Importante:** localStorage não é tão seguro quanto cookies httpOnly — um XSS pode roubar a sessão. Para apps que usam `roles` para controlar acesso a páginas diferentes, considere:
> - Usar cookies httpOnly via backend (cria complexity)
> - Ou validar `roles` no servidor antes de servir dados sensíveis
> 
> Para apps com apenas uma área autenticada (sem distinção por papel), localStorage é suficiente.

---

### Regra 8 — Arquivos essenciais do projeto

Crie os seguintes arquivos na raiz:

**`.gitignore`** (se não existir):
```
.env
.env.local
node_modules/
dist/
build/
.vite/
```

**`README.md`** com:
- Nome do app
- Descrição em uma linha
- Como rodar localmente (variáveis de ambiente necessárias)
- Stack utilizada (React + Vite + TypeScript)
- Instruções: `npm install` e `npm run dev`

**`vite.config.ts`** (se não tiver, crie com):
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
})
```

**`tsconfig.json`** (configure para React).

---

### Regra 9 — Arquivo de configuração da plataforma de deploy

Gere o arquivo abaixo de acordo com a plataforma escolhida pelo usuário na seção 3.

**Se o usuário não especificou plataforma:** gere `vercel.json` (padrão) e adicione no `PROXIMOS_PASSOS.md` a nota: *"Não escolheu a plataforma ainda? Basta preencher a seção de plataforma no início deste arquivo e rodar novamente — a IA gera o arquivo certo em segundos."*

---

**Vercel** → `vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```
> A regra `rewrites` é obrigatória para React Router — sem ela, acessar `/auth/callback` diretamente retorna 404.

---

**Netlify** → `netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```
> A regra de redirect é obrigatória para React Router — sem ela, acessar `/auth/callback` diretamente retorna 404.

---

**Railway** → `railway.json` + adicionar script `start` ao `package.json`:

`railway.json`:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npx serve dist -s -l $PORT",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

Adicione ao `package.json` (scripts):
```json
"start": "npx serve dist -s -l $PORT"
```
> O flag `-s` faz o `serve` redirecionar qualquer rota para `index.html` — necessário para React Router funcionar.

---

**Render** → `render.yaml`:
```yaml
services:
  - type: web
    name: app
    runtime: static
    buildCommand: npm run build
    staticPublishPath: ./dist
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
```

---

**Heroku** → `Procfile` + adicionar script `start` ao `package.json`:

`Procfile` (sem extensão, exatamente este nome):
```
web: npx serve dist -s -l $PORT
```

Adicione ao `package.json` (scripts):
```json
"start": "npx serve dist -s -l $PORT"
```

> Heroku usa a variável `$PORT` automaticamente — nunca hardcode uma porta.

---

**Fly.io** → `Dockerfile` + `nginx.conf` + `fly.toml`:

`Dockerfile`:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
```

`nginx.conf`:
```nginx
server {
  listen 8080;
  location / {
    root /usr/share/nginx/html;
    try_files $uri $uri/ /index.html;
  }
}
```

`fly.toml` (substitua `nome-do-app` pelo nome real):
```toml
app = "nome-do-app"
primary_region = "gru"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
```

> Para Fly.io: o usuário precisa ter a CLI `flyctl` instalada e executar `fly auth login` antes do deploy. Variáveis de ambiente são configuradas via `fly secrets set`.

---

**Todas as plataformas** requerem o mecanismo de SPA fallback para o React Router funcionar — sem ele, qualquer rota diferente de `/` retorna 404 quando acessada diretamente pelo browser. Cada plataforma usa um mecanismo diferente (já configurado acima): `rewrites` no Vercel, `[[redirects]]` no Netlify, `-s` flag no Railway/Heroku, `routes: rewrite` no Render, `try_files` no Nginx/Fly.io.

---

### Regra 10 — Configuração para GitHub e deploy

Se o usuário informou usuário do GitHub no campo 3, inclua no projeto:

**`.github/workflows/deploy.yml`** adequado para a plataforma escolhida:

Para **Vercel**:
```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

Para **Railway**:
```yaml
name: Deploy to Railway
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: bervProject/railway-deploy@main
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: ${{ secrets.RAILWAY_SERVICE_ID }}
```

Para **Render** ou **Netlify**: o deploy é automático quando o repositório GitHub é conectado — não é necessário GitHub Actions. Indique isso no `PROXIMOS_PASSOS.md`.

Se o usuário não informou plataforma específica, use a configuração do Vercel como padrão (plataforma mais comum para apps React/Vite).

---

### Regra 11 — Gerar o arquivo PROXIMOS_PASSOS.md

Ao terminar de criar o app, gere um arquivo `PROXIMOS_PASSOS.md` na raiz do projeto. Este arquivo é o guia do usuário para colocar o app no ar. Escreva em português simples, sem jargão técnico.

O arquivo deve conter exatamente estas seções, adaptadas à plataforma escolhida pelo usuário:

```markdown
# Próximos Passos — Como colocar seu app no ar

## O que foi criado
[Liste os arquivos principais gerados e o que cada um faz em 1 linha]
[Inclua o arquivo de configuração da plataforma gerado, ex: "vercel.json — configuração de build para Vercel" ou "netlify.toml — configuração de build e rotas para Netlify"]

## Passo 1 — Publicar o app
[Instrução específica para a plataforma escolhida — ver abaixo]

## Passo 2 — Configurar as variáveis de ambiente na plataforma

> ⚠️ **CRÍTICO: use o prefixo `VITE_` exatamente como abaixo.**
> Sem o prefixo, o Vite não embute os valores no bundle e a autenticação falha silenciosamente
> com o erro `"unexpected \"aud\" claim value"`. Após configurar, aguarde ou force o redeploy.

[Adapte a instrução abaixo para a plataforma escolhida:]

**Railway:** Settings → Variables → adicione `VITE_V3_BOARD_APP_ID` e `VITE_V3_ORGANIZATION_ID` → redeploy automático

**Vercel:** Settings → Environment Variables → adicione as duas variáveis com prefixo `VITE_` → clique em Redeploy

**Netlify:** Site configuration → Environment variables → adicione → redeploy automático

**Render:** Environment → Environment Variables → adicione → clique em Manual Deploy

**Heroku:** Settings → Config Vars → adicione as duas variáveis com prefixo `VITE_` → redeploy automático

**Fly.io:** `fly secrets set VITE_V3_BOARD_APP_ID=valor VITE_V3_ORGANIZATION_ID=valor` → redeploy automático

**Lovable:** Cloud → Secrets → adicione `VITE_V3_BOARD_APP_ID`, `VITE_V3_ORGANIZATION_ID` e `APP_URL`

## Passo 3 — Atualizar a URL no V3 Board
[URL exata a cadastrar, com explicação de onde encontrá-la]
[Para Lovable: explicar que é a URL da Edge Function Supabase, e como encontrar o Project ID]

## Passo 4 — Testar o SSO
1. Acesse o V3 Board
2. Vá até seu sistema na lista e clique em "Acessar"
3. Você deve ser redirecionado para seu app já autenticado
4. Se funcionar: o SSO está configurado corretamente ✅

## Passo 5 — Se não funcionar

| Erro no browser | Causa | Solução |
|---|---|---|
| `unexpected "aud" claim value` | Variáveis sem prefixo `VITE_` ou não configuradas | Configure `VITE_V3_BOARD_APP_ID` e `VITE_V3_ORGANIZATION_ID` com o prefixo e faça redeploy |
| `Token inválido ou expirado` | Token gerado há mais de 1h ou env vars erradas | Clique em "Acessar" novamente; confirme os UUIDs no V3 Board |
| `/auth/callback` retorna 404 | SPA fallback ausente no arquivo de config da plataforma | Verifique se o arquivo de config está na raiz com a regra de rewrite (`rewrites` no Vercel, `[[redirects]]` no Netlify, `-s` no Railway/Heroku, `routes` no Render) e faça redeploy |
| App não inicia (Railway/Heroku) | Script `start` ausente no `package.json` | Adicione `"start": "npx serve dist -s -l $PORT"` ao `package.json` |
| [Diagnóstico específico da plataforma para outros erros comuns]
```

**Conteúdo do Passo 1 por plataforma:**

**Lovable:**
> 1. No Lovable, clique em "Publish" no canto superior direito
> 2. Seu app estará disponível em uma URL no formato `https://seu-app.lovable.app`
> 3. A Edge Function Supabase também precisa ser publicada: acesse supabase.com → seu projeto → Edge Functions → clique em "Deploy" na função `auth-callback`
> 4. Para encontrar o ID do projeto Supabase: no Lovable, abra a aba Cloud → Supabase → copie o Project URL (formato `https://abcxyz.supabase.co`)

**Vercel (com GitHub):**
> O arquivo `vercel.json` já está no projeto com as configurações corretas.
> 1. Crie uma conta em vercel.com (se ainda não tiver)
> 2. No Vercel, clique em "Add New Project" → "Import Git Repository"
> 3. Conecte sua conta do GitHub e selecione o repositório `[nome-do-repo]`
> 4. Clique em "Deploy" — o `vercel.json` configura o build automaticamente
> 5. Sua URL será algo como `https://seu-app.vercel.app`
> 6. A partir daqui, todo push para o branch `main` do GitHub faz redeploy automático

**Vercel (sem GitHub):**
> O arquivo `vercel.json` já está no projeto com as configurações corretas.
> 1. Crie uma conta em vercel.com
> 2. Instale a CLI: abra o terminal e execute `npm install -g vercel`
> 3. Na pasta do projeto, execute `vercel` e siga as instruções
> 4. Sua URL será exibida ao final do deploy
> 5. Configure as variáveis de ambiente (`VITE_V3_BOARD_APP_ID`, `VITE_V3_ORGANIZATION_ID`) no Vercel Dashboard

**Railway (com GitHub):**
> O arquivo `railway.json` já está no projeto com as configurações corretas.
> 1. Crie uma conta em railway.app
> 2. Clique em "New Project" → "Deploy from GitHub repo"
> 3. Conecte o GitHub e selecione o repositório `[nome-do-repo]`
> 4. O Railway usa o `railway.json` para buildar e servir o app automaticamente
> 5. Configure as variáveis de ambiente (`VITE_V3_BOARD_APP_ID`, `VITE_V3_ORGANIZATION_ID`) em Settings → Variables
> 6. Sua URL aparece em Settings → Domains

**Render (com GitHub):**
> O arquivo `render.yaml` já está no projeto — o Render lê este arquivo automaticamente.
> 1. Crie uma conta em render.com
> 2. Clique em "New" → **"Blueprint"** → "Connect a repository"
> 3. Conecte o GitHub e selecione `[nome-do-repo]`
> 4. O Render detecta o `render.yaml` e configura o static site automaticamente
> 5. Configure as variáveis de ambiente (`VITE_V3_BOARD_APP_ID`, `VITE_V3_ORGANIZATION_ID`) em Environment → Environment Variables
> 6. Clique em "Apply" — sua URL aparece no Dashboard

**Netlify (com GitHub):**
> O arquivo `netlify.toml` já está no projeto — o Netlify lê este arquivo automaticamente, incluindo a regra de rotas para o React Router.
> 1. Crie uma conta em netlify.com
> 2. Clique em "Add new site" → "Import an existing project" → GitHub
> 3. Selecione o repositório `[nome-do-repo]`
> 4. **Não altere** build command nem publish directory — o `netlify.toml` já configura tudo
> 5. Configure as variáveis de ambiente (`VITE_V3_BOARD_APP_ID`, `VITE_V3_ORGANIZATION_ID`) em Site configuration → Environment variables
> 6. Clique em "Deploy site"

**Heroku (com GitHub):**
> O arquivo `Procfile` já está no projeto com as configurações corretas.
> 1. Crie uma conta em heroku.com (se ainda não tiver)
> 2. Clique em "New" → "Create new app" → dê um nome ao app
> 3. Em "Deploy method", selecione **GitHub** e conecte o repositório `[nome-do-repo]`
> 4. Ative "Automatic deploys" para que cada push ao `main` gere redeploy
> 5. Configure as variáveis de ambiente em Settings → **Config Vars** → clique em "Reveal Config Vars":
>    - `VITE_V3_BOARD_APP_ID` = [seu valor]
>    - `VITE_V3_ORGANIZATION_ID` = [seu valor]
> 6. Clique em "Deploy Branch" para o primeiro deploy manual
> 7. Sua URL será `https://nome-do-app.herokuapp.com`

**Fly.io (via CLI):**
> Os arquivos `Dockerfile`, `nginx.conf` e `fly.toml` já estão no projeto.
> Fly.io requer a CLI `flyctl` — não tem interface web para o primeiro deploy.
> 1. Instale a CLI: acesse fly.io/docs/hands-on/install-flyctl e siga as instruções para seu sistema operacional
> 2. Faça login: `fly auth login`
> 3. Na pasta do projeto, execute: `fly deploy`
> 4. Configure as variáveis de ambiente:
>    ```
>    fly secrets set VITE_V3_BOARD_APP_ID=seu-valor VITE_V3_ORGANIZATION_ID=seu-valor
>    ```
> 5. Sua URL aparece ao final do deploy (formato `https://nome-do-app.fly.dev`)
> 6. A partir daqui, execute `fly deploy` a cada atualização

**GitHub — enviar o código (sempre incluir para apps não-Lovable):**

Para qualquer plataforma que não seja Lovable, **sempre** inclua este bloco no início do Passo 1, antes das instruções da plataforma. Se o usuário informou `@usuario` do GitHub, use o nome dele nos comandos; caso contrário, use `seu-usuario` como placeholder:

> **Passo 1a — Enviar o código para o GitHub**
> 1. Acesse github.com e crie um novo repositório chamado `[nome-do-app]` (pode ser privado)
> 2. Na página do repositório recém-criado, copie a URL (formato `https://github.com/seu-usuario/nome-do-app.git`)
> 3. Se você está usando uma ferramenta de IA no navegador (ex: Claude, ChatGPT), faça o download do projeto como arquivo `.zip`, extraia em uma pasta e abra o terminal nessa pasta
> 4. Execute os comandos abaixo no terminal:
>    ```
>    git init
>    git add .
>    git commit -m "Initial commit — SSO V3 Board integrado"
>    git branch -M main
>    git remote add origin https://github.com/seu-usuario/nome-do-app.git
>    git push -u origin main
>    ```
> 5. Agora siga o Passo 1b para conectar ao repositório na plataforma de deploy

---

### Regra 12 — Boas práticas obrigatórias

- Nunca exponha `V3_BOARD_APP_ID` ou `V3_ORGANIZATION_ID` no frontend (sem prefixo `NEXT_PUBLIC_` ou `VITE_`)
- Cookie de sessão deve ser `httpOnly: true` e `sameSite: 'lax'`
- Sempre valide `return_to` para evitar open redirect: aceitar apenas paths que começam com `/` mas não com `//`
- Nunca logar o token JWT completo — apenas `jti` e `sub`

