# Especificação de Design: Megamenu de Serviços e Vídeo Showroom

Este documento descreve a lógica, o design e o comportamento para o novo menu "Serviços" com dropdown e simulação de vídeo integrado na Homepage do Reservacar.

## 📋 Resumo do Entendimento

* **Objetivo**: Substituir o link estático "Simulador" na Navbar pública por um botão dropdown interativo chamado "Serviços", que abre um Megamenu contendo links verticais e uma chamada com imagem para um vídeo de apresentação.
* **Componentes Principais**:
  * **Botão "Serviços"**: Exibido na Navbar com um ícone de seta (ChevronDown) que gira ao abrir o dropdown.
  * **Megamenu Dropdown**: Um painel suspenso absoluto de cantos arredondados, fundo branco e divisores finos.
    * **Esquerda**: Links verticais grandes ("Funcionalidades", "Simulador", "Impacto", "FAQ", "Empresa") com efeitos de hover lineares.
    * **Direita**: Imagem representativa de showroom moderno e botão oval verde-limão de CTA "VER VIDEO" com ícone de play.
  * **Modal de Vídeo Premium**: Um overlay escuro que surge ao clicar no CTA, simulando o carregamento e reprodução de um vídeo institucional do Reservacar com controles Flat de player.

---

## ⚙️ Premissas (Assumptions)

1. **Simulação Interativa**: O player de vídeo será simulado por meio de estados em React (`isPlayingVideo`), rodando uma contagem regressiva e barras de progresso animadas locais para dar a sensação de reprodução real.
2. **Design 100% Flat**: O Megamenu flutuante usará bordas de 1px em `#e2e8f0` e sombras sutis para profundidade de layout, mantendo a paleta neutra e limpa do Reservacar, com o realce pontual em Verde Limão (`#C1F651`).
3. **Ativação por Hover**: O megamenu abre dinamicamente ao passar o mouse sobre o botão "Serviços" no Desktop e fecha ao retirar o cursor ou clicar em um link.

---

## 🪵 Log de Decisão (Decision Log)

### 1. Substituição do "Simulador" por "Serviços"
* **O que foi decidido**: O menu "Serviços" centralizará a navegação da Landing Page no Desktop.
* **Alternativas consideradas**: Adicionar "Serviços" como um link separado, mantendo o "Simulador" na Navbar.
* **Justificativa**: Reduz a poluição de itens no cabeçalho e melhora a hierarquia visual.

### 2. Ativação via Hover (Desktop)
* **O que foi decidido**: O dropdown abrirá automaticamente ao passar o cursor (hover) sobre o item de menu "Serviços".
* **Alternativas consideradas**: Requerer clique do usuário.
* **Justificativa**: Mais fluido e moderno, comum em interfaces SaaS de ponta (Stripe, TailwindUI).

### 3. Simulação de Vídeo Local no Modal
* **O que foi decidido**: Implementar um modal com transição de loader e controles de reprodução simulados.
* **Alternativas consideradas**: Abrir uma aba do YouTube externa ou disparar um simples toast.
* **Justificativa**: Aumenta significativamente a fidelidade do protótipo e mantém o usuário imerso no produto Reservacar.

---

## 🎨 Design Final

### Dropdown "Serviços" (Megamenu)
* **Pai**: Div relativa na Navbar.
* **Painel**: Absoluto flutuante (`w-[820px]`, `rounded-[24px]`, `bg-white`, `border border-slate-200`, `shadow-2xl`).
* **Visual dos Links**: Links em `text-2xl` ou `text-3xl` em Preto Carbono com hover rápido.
* **Showroom**: Imagem do Unsplash (`w-[440px] h-[240px] rounded-[16px] object-cover`) com filtro de escurecimento sutil para destacar o botão.
* **CTA "VER VIDEO"**: Botão oval centralizado (`bg-[#C1F651]`, texto `#0B1B17`, ícone `<Play fill="currentColor" />`, hover com inversão de cores seca).

### Modal de Vídeo (`isPlayingVideo`)
* **Overlay**: `bg-slate-950/80` com `backdrop-blur-md` ocupando a tela inteira.
* **Loader**: Spinner Flat Verde Limão com contagem de carregamento.
* **Controls**: Barra de progresso flat, ícone play/pause e temporizador.
