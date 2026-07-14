---
name: Reservacar
description: Acelerador de Escassez Premium - Plataforma de reserva de veículos com sinal instantâneo.
colors:
  primary: "#141414"
  primary-hover: "#2A2A26"
  accent: "#C1F11D"
  accent-hover: "#d4ff3d"
  neutral-bg: "#F4F4F2"
  neutral-surface: "#ffffff"
  neutral-text: "#141414"
  neutral-text-secondary: "#5F5F5A"
  neutral-text-muted: "#8A8A85"
  neutral-text-faint: "#B9B9B4"
  neutral-border: "#E5E5E2"
  neutral-border-soft: "#EBEBE8"
  whatsapp: "#25D366"
  status-waiting: "amber (50/400/600)"
  status-expired: "rose (50/400/600)"
  status-paid: "#C1F11D"
typography:
  display:
    fontFamily: "'Manrope', ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 4vw, 2.25rem)"
    fontWeight: 800
    lineHeight: 1.15
  body:
    fontFamily: "'Manrope', ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.5
rounded:
  sm: "12px"
  md: "14px"
  lg: "22px"
  xl: "24px"
  xxl: "32px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
  button-accent:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.primary}"
---

# Design System: Reservacar

> Regenerado a partir do código real (`src/reservacar.tsx` + `src/index.css`) em 2026-07-13.
> A versão anterior deste arquivo descrevia Azul Cobalto e fonte Geist — ambos NÃO existem mais no app.

## 1. Overview

**Creative North Star: linguagem visual inDrive — lima ácido sobre preto/branco, flat e de alto contraste.**

Tema claro por padrão. Superfícies brancas sobre fundo `#F4F4F2`, separação por bordas
finas de 1px (`#E5E5E2` externa, `#EBEBE8` interna) — **sem sombras, sem gradientes,
sem glassmorphism**. O Preto Carbono `#141414` é a cor de ação primária e de painéis
de destaque (banners escuros, slot picker); o **Verde Lima `#C1F11D`** é o único acento,
usado com parcimônia (≤10% da tela) para seleção, sucesso Pix e chamadas visuais.
Tints do lima via opacidade: `/10 /15 /20 /25 /30`.

**Key Characteristics:**
* **Contraste extremo**: texto `#141414` sobre branco; legível sob luz solar de pátio.
* **Flat puro**: profundidade só por contraste de fundo e borda 1px.
* **Acento pontual**: lima para estado ativo/selecionado/pago; nunca decorativo em massa.
* **Painéis escuros de ênfase**: cards `#141414` com controles `white/10` e acentos lima
  (banner de sinais, seletor de horários do link público).

## 2. Colors

### Primary
- **Preto Carbono** `#141414` (hover `#2A2A26` ou `black`): botões primários, títulos, painéis escuros.

### Accent
- **Verde Lima** `#C1F11D` (hover `#d4ff3d` / `#b0e040`): seleção ativa, badges de sucesso,
  CTAs de conversão (ex.: "Confirmar PIX"). Texto sobre lima é sempre `#141414`.
- **WhatsApp** `#25D366` (hover `#20BA5A`): exclusivo para ações de WhatsApp.

### Neutral (escala real usada no código)
- Fundo de página: `#F4F4F2` · superfícies: `#ffffff` · superfície suave: `#FAFAF8` / `#F8FAFC`
- Texto: `#141414` (título) → `#2A2A26` (forte) → `#5F5F5A` (secundário) → `#6F6F6A` →
  `#8A8A85` (muted) → `#B9B9B4` (faint/labels) → `#D9D9D5` (desabilitado/ícones vazios)
- Bordas: `#E5E5E2` (padrão) · `#EBEBE8` (divisores internos) · `#D9D9D5`/`#B9B9B4` (hover)

### Status
- **Aguardando Sinal**: âmbar (`amber-50` fundo, `amber-400` dot, `amber-600/700` texto)
- **PIX Recebido / sucesso**: lima `#C1F11D` (badge `bg-[#C1F11D]/15`, dot sólido)
- **Expirado / crítico**: rose (`rose-50` fundo, `rose-400/500` dot, `rose-600/700` texto)

## 3. Typography

**Única família: 'Manrope' (400–800) para TUDO — títulos, corpo, labels e NÚMEROS.**
A Geist/Geist Mono foi removida do projeto; não existem mais classes `font-mono`.

### Hierarchy
- **Display** (ExtraBold 800, 24–36px): títulos de página (ex.: "Relatórios").
- **Headline** (Bold 700, 18–20px): títulos de cards e seções.
- **Title** (Bold 700, 13–16px, tracking-tight): nomes de veículos em listas.
- **Body** (Medium/SemiBold, 13–14px): textos informativos.
- **Label** (Bold 700–900, 9–11px, uppercase, tracking-wider, cor `#B9B9B4`/`#8A8A85`):
  rótulos de campos, chips e micro-cabeçalhos.
- **Valores monetários**: ExtraBold/Black em Manrope, formatados por `formatCurrency` (pt-BR).

## 4. Elevation

**Flat-by-default. Nenhuma sombra.** Separação exclusivamente por contraste de fundo
(branco sobre `#F4F4F2`; `#FAFAF8` para linhas expandidas) e bordas sólidas de 1px.

## 5. Components

### Buttons
- **Primary:** fundo `#141414`, texto branco, hover `#2A2A26`/`black`; `rounded-xl` (12px);
  texto 10–12px bold uppercase tracking-wider; sem escala no clique.
- **Accent (conversão):** fundo `#C1F11D`, texto `#141414`, hover `#b0e040`.
- **Secondary:** fundo branco, borda `#E5E5E2`, texto `#5F5F5A`, hover `bg-[#F4F4F2]`.
- **Destructive:** `bg-rose-50` + borda `rose-200` + texto `rose-700`, hover `rose-100`.
- **Chips/filtros:** pill (`rounded-full`), ativo = fundo `#141414` texto branco;
  inativo = branco com borda `#E5E5E2`.

### Cards / Containers
- Raio generoso: 12/14/22/24/28/32px conforme hierarquia (cards de lista `rounded-3xl`,
  painéis maiores `rounded-[32px]`).
- Fundo branco, borda 1px `#E5E5E2`, hover de borda `#D9D9D5`/`#B9B9B4`.
- Painéis escuros de ênfase: fundo `#141414`, texto branco, controles `bg-white/10`.

### Inputs / Fields
- Fundo branco ou `#F8FAFC`, borda `#E5E5E2`, `rounded-xl`/`rounded-2xl`,
  texto sm font-semibold; **focus: borda `#141414`** instantânea. Erro: rose.

### Status badges
- Pill pequena (9–10px bold uppercase) com dot colorido de 1.5–2px à esquerda
  (âmbar = aguardando, lima = pago, rose = expirado, cinza = neutro).

### Navigation
- **Topbar** fixa branca com borda inferior `#E5E5E2`; **Sidebar** colapsável com item
  ativo destacado; abas de hub (Configurações) com **underline lima 0.5px** no item ativo.

## 6. Motion

Animações curtas com easing expo-out (`cubic-bezier(0.16, 1, 0.3, 1)`), definidas em
`index.css`: `fade-in-down` 0.35s, `ticker-in` 0.45s, `rapida-step-in` 0.55s,
`pulse-ring` 2s (indicadores ao vivo). Acordeões via `grid-rows` transition 300ms.
**`prefers-reduced-motion` é respeitado** (animações desligam).

## 7. Do's and Don'ts

### Do:
- **Do** usar branco para conteúdo e `#F4F4F2` para o fundo das páginas.
- **Do** delimitar cards e inputs com borda 1px `#E5E5E2`.
- **Do** usar lima `#C1F11D` apenas para ação de conversão, seleção ativa e sucesso Pix.
- **Do** usar Manrope para números também (não existe mais fonte mono).

### Don't:
- **Don't** usar sombras, gradientes ou glassmorphism.
- **Don't** usar azul como cor de ação (o azul cobalto foi removido do sistema).
- **Don't** usar escala/deformação no clique de botões.
- **Don't** usar tema escuro como base (painéis escuros são ênfase pontual, não tema).
