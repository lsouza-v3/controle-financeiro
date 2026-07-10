# Controle Financeiro V3 Board

Sistema de controle financeiro pessoal integrado com SSO do V3 Board.

## Descrição

App web para gerenciar entradas e saídas de registros financeiros, com autenticação 100% via SSO do V3 Board (sem login local).

## Tecnologia

- **React** 18 + **Vite** + **TypeScript**
- **React Router** para navegação
- **jose** para validação de JWT
- **localStorage** para persistência de dados

## Como rodar localmente

### Pré-requisitos

- Node.js 18+
- npm

### Instalação

```bash
npm install
```

### Variáveis de ambiente

Crie um arquivo `.env` na raiz com os valores do V3 Board:

```env
VITE_V3_BOARD_APP_ID=seu-uuid-aqui
VITE_V3_ORGANIZATION_ID=seu-uuid-aqui
VITE_V3_PUBLIC_KEY_URL=https://jzdimxyefaiwxclckcew.supabase.co/functions/v1/public-key
VITE_V3_CONFIRM_URL=https://v3board.com.br/api/sso/confirm
```

### Executar

```bash
npm run dev
```

Acesse `http://localhost:3000`

## Build para produção

```bash
npm run build
npm run preview
```

## Estrutura do projeto

```
src/
├── components/       # Componentes reutilizáveis
├── pages/           # Páginas da aplicação
├── lib/             # Utilitários (autenticação, financeiro)
├── styles/          # Estilos CSS
├── App.tsx          # Componente raiz
├── main.tsx         # Ponto de entrada
└── index.css        # Estilos globais
```

## Fluxo de autenticação

1. Usuário clica em "Acessar" no V3 Board
2. V3 Board redireciona para `/auth/callback` com token JWT
3. `AuthCallback.tsx` valida o token e salva sessão no localStorage
4. Usuário é redirecionado para `/dashboard` já autenticado

## Segurança

- Sem login/senha local — 100% SSO
- Tokens JWT validados com chave pública do V3 Board
- Prevenção contra token replay (jti tracking)
- Validação de `organization_id` no JWT
- localStorage para sessão (considerar httpOnly cookies para dados sensíveis)

## Deployment

Este projeto usa **GitHub Actions** para CI/CD automático com **GitHub Pages**.

### Arquivos importantes

- `.github/workflows/deploy.yml` — workflow que compila e faz deploy automático
- `vite.config.ts` — configuração de build para produção
- `.env.example` — template de variáveis (commitado, sem valores reais)
- `package-lock.json` — lock file com versões exatas das dependências

### Como funciona o deploy

1. Você faz `git push origin main`
2. GitHub Actions executa o workflow `.github/workflows/deploy.yml`
3. Node.js instala dependências (`npm ci` usando `package-lock.json`)
4. Vite compila React para arquivos estáticos (`npm run build`)
5. `peaceiris/actions-gh-pages` publica em `gh-pages` branch
6. GitHub Pages serve o site em `https://lsouza-v3.github.io/controle-financeiro/`

### Variáveis de ambiente no CI/CD

As variáveis `VITE_*` são configuradas como **GitHub Secrets** (não no `.env`):
- `VITE_V3_BOARD_APP_ID`
- `VITE_V3_ORGANIZATION_ID`
- `VITE_V3_PUBLIC_KEY_URL`
- `VITE_V3_CONFIRM_URL`

O workflow as injeta durante o build (`.github/workflows/deploy.yml` linha 28-33).

### Por que `package-lock.json` é crítico

O `npm ci` (usado no CI/CD) **requer** `package-lock.json` para:
- Instalar **exatamente as mesmas versões** que você tem localmente
- Evitar surpresas de dependências incompatíveis em produção
- Garantir builds reproduzíveis

**Sempre commit `package-lock.json` junto com qualquer mudança em `package.json`.**

## Licença

Privado
