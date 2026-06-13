# Design — Página Pricing + reestruturação do header

> Status: **Design validado** (brainstorming concluído). Pronto para implementação.
> Data: 2026-06-11.

## 1. Resumo do entendimento

- **Header:** trocar o item de menu **"Impacto" → "Pricing"** nas 2 cópias do navbar
  (HomeView e EmpresaView), nos 2 menus mobile e no card "Planos e tarifas" do
  megamenu Serviços. Demais itens (Funcionalidades, Serviços▾, FAQ, Empresa) ficam.
- **Roteamento:** "Pricing" vira **página real** (nova rota `pricing`), não mais âncora.
- **Página Pricing** (estilo SaaS): 3 colunas de planos + lista de recursos por plano +
  toggle Mensal/Anual + tabela comparativa + FAQ de preços + header/footer compartilhados.
- **CTA de cada coluna** → fluxo "Assinar Reservacar" com o plano **pré-selecionado**.

### Para quem / por quê
Lojistas/concessionárias avaliando contratar. Hoje não há página de preços real e o
card "Planos e tarifas" do megamenu não leva a lugar útil (aponta para `#simulator`).

## 2. Premissas confirmadas

- **A1 — Preços anuais:** `precoAnual = precoMensal × 10` (2 meses grátis). No toggle
  anual exibe `precoAnual/12` como "/mês · cobrado anualmente".
- **A2 — Recursos por plano:** links ativos (10/30/50), vendedores (3/10/∞), painel ao
  vivo, busca FIPE, Pix direto, relatórios avançados (Plus+), suporte (E-mail/Prioritário/24h).
- **A3 — Pré-seleção:** estado `planoSelecionado` lido no passo 3 da Assinatura, sem
  alterar a lógica do fluxo.
- **A4 — Seção métricas (`#stats`) da home:** permanece na home; só sai do menu.
- **A5 — Técnico:** página estática client-side; novo componente `PricingView` no
  `reservacar.tsx`; sem backend; sem impacto de performance/segurança.

## 3. Decision Log

1. **Fonte de dados dos planos → Opção A (unificar).** Extrair constante única `PLANOS`;
   Assinatura, Checkout e Pricing consomem dela. Alternativas: B (dados próprios na Pricing,
   rejeitada por duplicação), C (constante só p/ Pricing, meio-termo). Escolhida A para
   eliminar os 3–4 pontos de duplicação de preço/limite existentes.
2. **Pré-seleção via estado `planoSelecionado`** no App, lido no passo 3 da Assinatura.
   Alternativa: deep-link com plano na navegação; rejeitada por exigir mudar `navigateTo`.
3. **Cards reaproveitam o estilo do passo 3 da Assinatura** (anel/tint lima no
   destaque/selecionado) para consistência visual.
4. **FAQ reusa o accordion da home;** tabela comparativa com scroll horizontal no mobile.
5. **Header: troca mínima** (só Impacto→Pricing); mantém Funcionalidades, Serviços▾, FAQ,
   Empresa. Alternativas: simplificar p/ 3 itens, consolidar em "Produtos▾"; rejeitadas.

## 4. Design final

### 4.1 Modelo de dados + roteamento
- `PLANOS` (topo do arquivo, ~linha 85):
  ```
  Basic:   { precoMensal:159.90, precoAnual:1599.00, limite:10, vendedores:3,   recursos:[…], destaque:false }
  Plus:    { precoMensal:239.90, precoAnual:2399.00, limite:30, vendedores:10,  recursos:[…], destaque:true  }
  Premium: { precoMensal:349.90, precoAnual:3499.00, limite:50, vendedores:'∞', recursos:[…], destaque:false }
  ```
- Refatorar `getPlanPrice`/`getPlanCredits` (Assinatura), `infoPlanos` (Checkout) e os
  cards do passo 3 para lerem de `PLANOS`.
- `App`: rota `pricing` → `<PricingView navigateTo setPlanoSelecionado />`; estado
  `planoSelecionado` (default `null`).
- Header (4 pontos): "Impacto" → "Pricing" (`navigateTo('pricing')`); card "Planos e
  tarifas" do megamenu → `pricing`.

### 4.2 Layout da PricingView
1. **Hero** verde `#0B1B17`: badge "Preços", título, subtítulo, **toggle Mensal/Anual**
   (pill, ativo em lima, selo "2 meses grátis" no anual). Estado local `ciclo`.
2. **3 colunas** (`-mt-16` sobre o hero): card branco `rounded-[24px]`; Plus em destaque
   (anel lima + "Mais Popular"). Cada card: nome, preço (varia com toggle), /mês + nota,
   lista de recursos (`CheckCircle2` lima), CTA pill "Assinar {plano}" →
   `setPlanoSelecionado(plano)` + `navigateTo('assinar')`.
3. **Faixa de confiança:** "Sem comissão · Pix direto · Cancele quando quiser".
4. **Tabela comparativa:** Recurso × {Basic,Plus,Premium}; coluna Plus em lima-tint;
   `Check`/`Minus`/texto. Mobile: scroll horizontal.
5. **FAQ de preços:** accordion (mesmo visual da home): fidelidade, anual, troca de plano,
   taxa por reserva.
6. **CTA final:** "Assinar Reservacar" + "Falar com a equipe".

### 4.3 Fiação da pré-seleção
- `App`: `[planoSelecionado, setPlanoSelecionado] = useState(null)`.
- `PricingView` CTA: `setPlanoSelecionado('Plus'); navigateTo('assinar')`.
- `AssinaturaEmpresaView`: `empresaData.plano` inicial = `planoSelecionado || 'Plus'`.

## 5. Riscos / pontos de atenção
- Refatoração A toca em Assinatura e Checkout (fluxos com lógica de pagamento) — validar
  que preços/limites continuam idênticos após extrair `PLANOS`.
- Header duplicado em 2 componentes — não esquecer de editar as duas cópias + mobile.
- Toggle anual exige formatação de preço consistente (mensal vs anual/12).
