-- ============================================================
--  Reservacar — schema inicial (rascunho)
--  Aplicar em: Supabase > SQL Editor > New query > Run
--  Ajuste conforme necessário antes de produção.
-- ============================================================

-- ---------- Tabelas ----------

create table if not exists public.lojas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj text,
  email text,
  telefone text,
  endereco text,
  cep text,
  valor_minimo_sinal numeric not null default 1500,
  plano text not null default 'Plus' check (plano in ('Basic','Plus','Premium')),
  agenda_horarios text[] not null default '{09:00,10:00,11:00,14:00,15:00,16:00,17:00,18:00,19:00}',
  owner_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.vendedores (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.lojas (id) on delete cascade,
  nome text not null,
  cargo text not null default 'Consultor de Vendas',
  ativo boolean not null default true,
  links_gerados int not null default 0,
  conversao int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.propostas (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.lojas (id) on delete cascade,
  vendedor_id uuid references public.vendedores (id) on delete set null,
  title text not null,
  ano text, cor text, motor text, cambio text, km text, opcionais text,
  fipe_value numeric, valor_venda numeric,
  sinal numeric not null default 0,
  expiracao int not null default 60,                       -- minutos
  status text not null default 'Active' check (status in ('Active','Completed','Expired')),
  cliente_nome text,
  fotos text[] not null default '{}',                      -- URLs públicas do Storage
  created_at timestamptz not null default now()
);

create table if not exists public.visitas (
  id uuid primary key default gen_random_uuid(),
  proposta_id uuid not null references public.propostas (id) on delete cascade,
  cliente_nome text not null,
  whatsapp text not null,
  dia date not null,
  hora text not null,                                      -- "16:00"
  status text not null default 'agendada' check (status in ('agendada','compareceu','cancelada','no-show')),
  created_at timestamptz not null default now()
);

create index if not exists idx_vendedores_loja on public.vendedores (loja_id);
create index if not exists idx_propostas_loja on public.propostas (loja_id);
create index if not exists idx_visitas_proposta on public.visitas (proposta_id);

-- ---------- Row Level Security ----------
-- Esboço mínimo. A proposta e a visita precisam ser legíveis publicamente
-- (o cliente abre o link sem login); escrita restrita ao dono autenticado.

alter table public.lojas       enable row level security;
alter table public.vendedores  enable row level security;
alter table public.propostas   enable row level security;
alter table public.visitas     enable row level security;

-- Leitura pública das propostas/visitas (link do cliente):
create policy "propostas legíveis publicamente" on public.propostas for select using (true);
create policy "visitas legíveis publicamente"   on public.visitas   for select using (true);

-- Link público da proposta também precisa ler nome/contato da loja e nome do vendedor:
create policy "lojas legiveis publicamente"      on public.lojas      for select to public using (true);
create policy "vendedores legiveis publicamente" on public.vendedores for select to public using (true);

-- Cliente pode CRIAR uma visita (agendamento) sem login:
create policy "qualquer um cria visita" on public.visitas for insert with check (true);

-- Dono autenticado gerencia a própria loja e dados relacionados:
create policy "dono lê sua loja"      on public.lojas      for select using (auth.uid() = owner_id);
create policy "dono edita sua loja"   on public.lojas      for update using (auth.uid() = owner_id);
create policy "dono gere vendedores"  on public.vendedores for all
  using (exists (select 1 from public.lojas l where l.id = loja_id and l.owner_id = auth.uid()));
create policy "dono gere propostas"   on public.propostas  for all
  using (exists (select 1 from public.lojas l where l.id = loja_id and l.owner_id = auth.uid()));

-- ---------- Visualizações do link público (Realtime) ----------
-- O cliente abre ?p=<id> -> registra uma view; o lojista recebe via Realtime.
create table if not exists public.proposta_views (
  id uuid primary key default gen_random_uuid(),
  proposta_id uuid not null references public.propostas(id) on delete cascade,
  loja_id uuid not null references public.lojas(id) on delete cascade,
  proposta_title text,
  created_at timestamptz not null default now()
);
create index if not exists idx_proposta_views_loja on public.proposta_views(loja_id);
alter table public.proposta_views enable row level security;
create policy "qualquer um registra view" on public.proposta_views for insert to public with check (true);
create policy "dono le views da sua loja"  on public.proposta_views for select to public
  using (exists (select 1 from public.lojas l where l.id = proposta_views.loja_id and l.owner_id = auth.uid()));
-- Habilita Realtime:
alter publication supabase_realtime add table public.proposta_views;

-- ---------- Eventos de atividade da proposta (Realtime) ----------
-- Tabela única de eventos (view | visita | foto). Substitui o papel do
-- proposta_views no código: o cliente anônimo registra a visita, o lojista
-- recebe via Realtime e o feed "Atividade" também carrega o histórico (72h).
create table if not exists public.proposta_eventos (
  id          uuid primary key default gen_random_uuid(),
  loja_id     uuid not null references public.lojas(id) on delete cascade,
  proposta_id uuid references public.propostas(id) on delete cascade,
  tipo        text not null check (tipo in ('view','visita','foto')),
  titulo      text,
  descricao   text,
  meta        jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists idx_prop_eventos_loja_created
  on public.proposta_eventos (loja_id, created_at desc);
alter table public.proposta_eventos enable row level security;
create policy "qualquer um registra evento"
  on public.proposta_eventos for insert to public with check (true);
create policy "dono le eventos da sua loja"
  on public.proposta_eventos for select to public
  using (exists (select 1 from public.lojas l
                 where l.id = proposta_eventos.loja_id and l.owner_id = auth.uid()));
alter publication supabase_realtime add table public.proposta_eventos;

-- ---------- Storage (fotos dos veículos) ----------
-- Rode também (ou crie pelo painel: Storage > New bucket > "veiculos", público):
--   insert into storage.buckets (id, name, public) values ('veiculos','veiculos', true)
--   on conflict (id) do nothing;
-- E uma policy de upload autenticado / leitura pública no bucket 'veiculos'.
