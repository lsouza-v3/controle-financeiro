# Próximos Passos — Como colocar seu app no ar

## O que foi criado

- `src/` — código fonte React com componentes e páginas
- `src/lib/sso.ts` — utilitário de autenticação SSO com validação JWT
- `src/lib/financeiro.ts` — lógica de controle financeiro (CRUD de transações)
- `src/pages/Dashboard.tsx` — página principal com formulário e listagem
- `vite.config.ts` — configuração de build Vite
- `.env.example` — template de variáveis (placeholders)
- `.env` — variáveis reais já preenchidas
- `.github/workflows/deploy.yml` — workflow de CI/CD para GitHub Pages
- `.gitignore` — arquivo de exclusão Git

## Passo 1a — Enviar o código para o GitHub

1. Acesse [github.com](https://github.com) e crie um novo repositório chamado `controle-financeiro` (pode ser privado)
2. Na página do repositório recém-criado, copie a URL (formato `https://github.com/lsouza-v3/controle-financeiro.git`)
3. Abra um terminal na pasta do projeto e execute:

```bash
git add .
git commit -m "Initial commit — SSO V3 Board integrado"
git branch -M main
git remote add origin https://github.com/lsouza-v3/controle-financeiro.git
git push -u origin main
```

## Passo 2 — Configurar as variáveis de ambiente no GitHub

> ⚠️ **CRÍTICO: use o prefixo `VITE_` exatamente como abaixo.**
> Sem o prefixo, o Vite não embute os valores no bundle e a autenticação falha silenciosamente
> com o erro `"unexpected \"aud\" claim value"`. Após configurar, aguarde ou force o redeploy.

1. No repositório GitHub, clique em **Settings** → **Secrets and variables** → **Actions**
2. Clique em **New repository secret** e adicione:

   **Nome:** `VITE_V3_BOARD_APP_ID`
   **Valor:** `ca1ec38b-b522-403c-8535-2b94f695173d`

3. Repita para adicionar:

   **Nome:** `VITE_V3_ORGANIZATION_ID`
   **Valor:** `6cfa7687-9e59-457f-9f72-f845ef38b1f6`

   **Nome:** `VITE_V3_PUBLIC_KEY_URL`
   **Valor:** `https://jzdimxyefaiwxclckcew.supabase.co/functions/v1/public-key`

   **Nome:** `VITE_V3_CONFIRM_URL`
   **Valor:** `https://v3board.com.br/api/sso/confirm`

## Passo 3 — Habilitar GitHub Pages

1. No repositório, clique em **Settings** → **Pages**
2. Em "Source", selecione **Deploy from a branch**
3. Em "Branch", selecione **gh-pages** e **/(root)**
4. Clique em **Save**

> ⚠️ **Importante:** o branch `gh-pages` será criado automaticamente pelo GitHub Actions na primeira vez que rodar o workflow.

## Passo 4 — Verificar o deploy

1. Vá para a aba **Actions** do repositório
2. Clique no workflow **Deploy to GitHub Pages** (deve estar rodando ou ter completado)
3. Se verde ✅ — o deploy funcionou e seu app está no ar
4. Se vermelho ❌ — clique para ver os erros (geralmente variáveis de ambiente faltando)

Sua URL será: `https://lsouza-v3.github.io/controle-financeiro/`

> ⚠️ **Nota:** Se o build falhar no GitHub Actions, confirme que:
> - Todos os 4 secrets foram adicionados com o prefixo `VITE_`
> - Os valores estão corretos (copie do arquivo `.env` local)
> - O branch está no `main`

## Passo 5 — Atualizar a URL no V3 Board

1. Acesse o V3 Board como administrador
2. Vá para **Sistemas** → seu sistema
3. Clique no ícone de olho (👁) → **Editar**
4. No campo **URL**, cole:

   ```
   https://lsouza-v3.github.io/controle-financeiro/
   ```

5. Salve

## Passo 6 — Testar o SSO

1. Acesse o V3 Board
2. Vá até seu sistema na lista e clique em **"Acessar"**
3. Você deve ser redirecionado para `https://lsouza-v3.github.io/controle-financeiro/` já autenticado
4. Se funcionar: o SSO está configurado corretamente ✅

## Passo 7 — Se não funcionar

| Erro no browser | Causa | Solução |
|---|---|---|
| `unexpected "aud" claim value` | Variáveis sem prefixo `VITE_` ou não configuradas | Configure os 4 secrets no GitHub com o prefixo `VITE_` exatamente e aguarde o redeploy automático |
| `Token inválido ou expirado` | Token gerado há mais de 1h | Volte ao V3 Board e clique em "Acessar" novamente |
| `/auth/callback` retorna 404 | Arquivo `dist/index.html` não está sendo servido | Confirme que o GitHub Pages está habilitado e apontando para o branch `gh-pages` |
| Build falha no GitHub Actions | Erro ao compilar TypeScript ou instalar dependências | Abra o log do workflow (aba Actions) e verifique qual comando falhou |

### Diagnóstico rápido — App não carrega no browser

Se o app não carrega após o deploy:
1. Acesse diretamente `https://lsouza-v3.github.io/controle-financeiro/` no navegador
2. Abra o DevTools (F12) → aba **Console**
3. Procure por erros relacionados a:
   - `VITE_V3_BOARD_APP_ID is undefined` — secret não foi configurado
   - `Failed to fetch public key` — problema com `VITE_V3_PUBLIC_KEY_URL`
   - `Unexpected redirect` — problema no flow de autenticação

### Erros comuns no GitHub Actions

#### ❌ Erro: "Dependencies lock file is not found"

**Log:**
```
Error: Dependencies lock file is not found in /home/runner/work/controle-financeiro/controle-financeiro.
Supported file patterns: package-lock.json,npm-shrinkwrap.json,yarn.lock
```

**Causa:** O arquivo `package-lock.json` não foi commitado. Esse arquivo é gerado automaticamente quando você roda `npm install` localmente e é essencial para o CI/CD funcionar.

**Solução:**
```bash
# Localmente, execute:
npm install

# Isso gera o arquivo package-lock.json

git add package-lock.json
git commit -m "Add package-lock.json"
git push origin main
```

**Por que o lock file é importante:**
- Garante que todos (você, CI/CD, outros devs) usam **exatamente as mesmas versões** das dependências
- Sem o lock file, `npm install` pode instalar versões diferentes em diferentes máquinas
- O GitHub Actions (`npm ci`) **requer** o lock file para garantir builds reproduzíveis

---

#### ⚠️ Aviso: "Node 20 is being deprecated"

**Log:**
```
Node 20 is being deprecated. This workflow is running with Node 24 by default.
If you need to temporarily use Node 20, you can set the ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true
```

**Causa:** O GitHub Actions usa Node 24 por padrão (mais novo), mas o workflow estava configurado para Node 20 (mais antigo).

**Solução:** O workflow foi atualizado para Node 24 automaticamente. Se você ainda vê esse aviso:

1. No repositório → `.github/workflows/deploy.yml`
2. Procure pela linha com `node-version`
3. Altere de `'20'` para `'24'` (ou a versão LTS mais recente)

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '24'  # ← Altere para a versão mais recente
    cache: 'npm'
```

**Será atualizado para:**
```bash
git add .github/workflows/deploy.yml
git commit -m "Update Node.js to version 24 in GitHub Actions"
git push origin main
```

**Por que isso acontece:**
- GitHub descontinua versões antigas do Node.js periodicamente
- Node 20 chegou ao fim de sua manutenção em April 2025
- Node 24 é a versão LTS (Long Term Support) recomendada
- Usar versões novas garante segurança e performance

## Próximas atualizações

A partir de agora, todo `git push` para o branch `main` dispara o workflow automaticamente:

```bash
git add .
git commit -m "Descrição da mudança"
git push origin main
```

O GitHub Actions compilará e fará deploy em ~2 minutos. Você pode acompanhar em Actions → Deploy to GitHub Pages.

## Referências

- [GitHub Pages Docs](https://pages.github.com/)
- [Vite Docs](https://vitejs.dev/)
- [React Router Docs](https://reactrouter.com/)
