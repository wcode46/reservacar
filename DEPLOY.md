# Deploy na Vercel — Reservacar (protótipo)

Frontend (Vite/React) na **Vercel** + backend na **Supabase** (já configurado).
Branch a publicar: **`supabase-prototype`**.

## Pré-requisito: subir o código para o GitHub

A Vercel publica a partir do GitHub. Rode (na pasta do projeto):

```powershell
./push-github.ps1
```
ou manualmente:
```powershell
git push -u origin supabase-prototype
```

## Passo a passo na Vercel

1. Acesse https://vercel.com e faça login **com o GitHub** (`wcode46`).
2. **Add New… → Project** → importe o repo `wcode46/reservacar`.
3. Em **Configure Project**:
   - **Framework Preset:** Vite (detecta sozinho)
   - **Build Command:** `npm run build` · **Output Directory:** `dist` (padrão)
   - **Production Branch / Branch:** selecione **`supabase-prototype`**
4. **Environment Variables** — adicione as duas (mesmos valores do seu `.env`):

   | Name | Value |
   |------|-------|
   | `VITE_SUPABASE_URL` | `https://oajhhzxhsbadkwephrfb.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | `sb_publishable_Sf6i7YZCf6SF3tCdKCyVKg_nj8oYQqb` |

5. **Deploy.** Em ~1 min sai a URL de produção (ex.: `https://reservacar-xxxx.vercel.app`).
   - Cada `git push` futuro gera uma **preview URL** automática (ideal para refinamento).

## Importante: configurar a URL no Supabase (senão a confirmação de e-mail falha)

Com a confirmação de e-mail **ligada**, o link enviado precisa apontar para o site publicado.

No painel do Supabase → **Authentication → URL Configuration**:
- **Site URL:** a URL da Vercel (ex.: `https://reservacar-xxxx.vercel.app`)
- **Redirect URLs:** adicione `https://reservacar-xxxx.vercel.app/**`

> Me envie a URL da Vercel depois do primeiro deploy que eu ajusto isso pelo MCP.

## Checklist pós-deploy (teste de refinamento)

- [ ] Abrir a URL → landing carrega
- [ ] Criar conta → recebe e-mail de confirmação → confirmar
- [ ] Login → onboarding cria a loja → painel
- [ ] Criar proposta com **upload de foto** → publica
- [ ] Recarregar → proposta e foto persistem
- [ ] Abrir o link da proposta no celular → agendar visita / Pix

## Notas
- A `anon/publishable key` é pública por design (vai no bundle do client). A segurança real vem das **RLS policies** já aplicadas.
- `vercel.json` faz o rewrite SPA (todas as rotas servem `index.html`).
