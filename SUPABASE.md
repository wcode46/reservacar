# Reservacar — Integração Supabase (protótipo semifuncional)

Branch: `supabase-prototype`. A `main` permanece como protótipo de design (mock).

## Estrutura criada

```
.env.example            # modelo das variáveis (copie para .env)
src/lib/supabaseClient.ts  # cliente único (lê VITE_SUPABASE_URL / ..._ANON_KEY)
src/lib/types.ts        # tipos do domínio (espelham o schema)
supabase/schema.sql     # schema inicial (lojas, vendedores, propostas, visitas) + RLS
```

## Setup (uma vez)

1. Crie um projeto em https://supabase.com (free tier).
2. **Project Settings > API**: copie `Project URL` e `anon public key`.
3. Na raiz do projeto: copie `.env.example` para `.env` e preencha os 2 valores.
4. **SQL Editor**: cole e rode o conteúdo de `supabase/schema.sql`.
5. **Storage**: crie um bucket público chamado `veiculos` (para as fotos).
6. `npm install` (já inclui `@supabase/supabase-js`) e `npm run dev`.

## Ordem de integração sugerida (incremental)

1. **Mover `reservacar.tsx` para `src/`** e ajustar `tsconfig` (fecha o buraco do typecheck).
2. **Storage**: upload real de fotos no cadastro → salva URLs em `propostas.fotos`.
3. **DB — propostas/visitas**: substituir o estado mock (`recentReservations`) por leitura/escrita no Supabase.
4. **Auth**: login real do lojista (Supabase Auth) substituindo o login fake.
5. **Realtime** (opcional): painel "ao vivo" e hold de horário reais entre dispositivos.

## Deploy para testar / refinar

- **Frontend:** Vercel (importar o repo do GitHub, branch `supabase-prototype`).
  - Adicionar as env vars `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no painel da Vercel.
  - Cada push gera uma **preview URL** para enviar a refinamento.
- **Backend:** o próprio Supabase (já hospedado).
