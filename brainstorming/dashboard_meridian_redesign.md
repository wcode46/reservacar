# Design — Redesign do app do lojista (estilo Meridian) + topbar + abas

> Status: **Design validado** (brainstorming concluído). Pronto para implementação.
> Referência visual: prints Meridian (Overview, Accounts, Workspace Settings).
> Mantém o design system inDrive já criado (lime `#C1F11D` / preto `#141414` / `#F4F4F2` / Manrope).

## 1. Resumo do entendimento

- **Topbar global** em todas as telas logadas: toggle collapse da sidebar · breadcrumb
  ("BMW Premium SP / {página}") · busca · "Atualizado HH:MM" + refresh · sino (badge real)
  · avatar com menu. Estilo Meridian, cores/tipografia do nosso design system.
- **Painel de loja** = antiga "Painel de vendas" (sales-stats) → **Overview Meridian**
  (KPIs + gráfico + atividade + tabela). O "Painel central" (hub) é absorvido.
- **Configurações com 4 abas** (estilo Workspace Settings): **Geral · Vendedores · Plano ·
  Relatórios**. Sidebar mantém os itens; cada um abre a área já na aba certa.
- **Busca/sino/avatar funcionais** (leve, client-side).
- **Sidebar** mantém o visual inDrive + ganha estado colapsado (rail de ícones).

## 2. Premissas confirmadas

- **A1 — Collapse:** rail de ícones (~72px) via toggle na topbar; persiste em `localStorage`
  (`sidebarCollapsed`). Mobile mantém o drawer atual.
- **A2 — "Nova proposta"** (dashboard do vendedor): mantém conteúdo; ganha a topbar global.
- **A3 — Conteúdo Overview:** KPIs = Sinal em caixa · Conversão · Reservas ativas ·
  Velocidade média; gráfico = sinais recebidos 30/60/90d; Atividade = `liveNotifications`;
  tabela = top propostas por sinal.
- **A4 — Abas reaproveitam** VendedoresView, RelatorioReservasView, PLANOS+checkout e
  ConfiguracoesView, re-skinados no chrome de abas.
- **A5 — Técnico:** protótipo client-side, mock, sem backend; reseta no reload. Novos
  componentes (`AppShell`/`Topbar`, `ConfiguracoesHub`) somam ao `reservacar.tsx`.

## 3. Decision Log

1. **`AppShell` único** envolvendo as rotas logadas (sidebar + topbar + conteúdo).
   Alternativa: topbar inline por view (rejeitada — duplicação).
2. **`ConfiguracoesHub`** com abas renderizando os conteúdos existentes. Alternativa:
   4 rotas separadas compartilhando cabeçalho (mais encanamento).
3. **Collapse = rail de ícones 72px** persistido em localStorage. Mobile = drawer atual.
4. **Overview:** KPIs (Sinal em caixa, Conversão, Reservas ativas, Velocidade média) ·
   gráfico sinais 30/60/90d · Atividade = liveNotifications · tabela top propostas.
5. **Abas:** Geral / Vendedores / Plano / Relatórios, reaproveitando as views existentes.

## 4. Design final

### 4.1 Chrome (AppShell)
- **Topbar** (~64px, branco, borda `#EBEBE8`): [toggle PanelLeft] [breadcrumb] · [busca pill
  `#F4F4F2` ⌘K] · [Atualizado HH:MM + refresh] [sino+badge → dropdown liveNotifications]
  [avatar iniciais → menu: Configurações/Suporte/Sair].
- **Sidebar colapsável:** expandida 256px ↔ rail 72px (ícones centralizados, tooltip no
  hover, esconde labels/seções). Estado em `localStorage`.
- **Roteamento:** hub absorvido; "Painel de vendas" → rota do Overview (label "Painel de
  loja"); Vendedores/Relatórios/Configurações → `ConfiguracoesHub` com `tabInicial`.
- **Busca:** filtra `recentReservations` + vendedores; dropdown de resultados.

### 4.2 Painel de loja (Overview)
- Cabeçalho: "Painel da loja" + subtítulo; botões Exportar (outline) + Nova proposta (preto/lime).
- **4 KPI cards** com sparkline SVG (Sinal em caixa, Conversão, Reservas ativas, Velocidade média).
- **Grid 2/3 + 1/3:** gráfico grande "Sinais recebidos" (toggle 30/60/90d, área lime sobre
  linha preta) + feed "Atividade" (liveNotifications, TODAY/ONTEM, "Ver toda atividade →").
- **Tabela "Top propostas por sinal":** Veículo · Vendedor · Sinal · Δ/Status · Cliente ·
  Expiração; badges de status semânticos; linha clicável → Gerenciar/Preview.

### 4.3 ConfiguracoesHub (4 abas)
- Cabeçalho + barra de abas sublinhada (ativa = underline lime + texto preto).
- **Geral:** cards com linhas de formulário (nome, URL vitrine, telefone, endereço/CEP,
  valor mínimo sinal, agenda de horários) + Salvar.
- **Vendedores:** VendedoresView re-skinada (contador, Adicionar, tabela estilo print 3).
- **Plano:** card do plano atual + uso (13/30) + 3 planos + CTA upgrade (checkout existente).
- **Relatórios:** RelatorioReservasView dentro do chrome de abas.

## 5. Riscos / atenção
- Wrapping das rotas logadas num AppShell sem quebrar o roteamento condicional atual no App.
- Reaproveitar VendedoresView/RelatorioReservasView dentro de abas pode exigir ajustar seus
  cabeçalhos próprios (evitar título duplicado).
- Sidebar colapsada precisa de tooltips para manter navegabilidade.
- Manter responsividade: topbar + collapse no mobile (drawer existente).
