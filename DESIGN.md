---
name: Reservacar
description: Acelerador de Escassez Premium - Plataforma de reserva de veículos com sinal instantâneo.
colors:
  primary: "#2563eb"
  primary-hover: "#1d4ed8"
  neutral-bg: "#ffffff"
  neutral-surface: "#f8f9fa"
  neutral-text: "#0f172a"
  neutral-text-muted: "#64748b"
  neutral-border: "#e2e8f0"
  accent-success: "#16a34a"
typography:
  display:
    fontFamily: "'Sora', ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3rem)"
    fontWeight: 900
    lineHeight: 1.15
  body:
    fontFamily: "'Sora', ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.5
rounded:
  sm: "6px"
  md: "12px"
  lg: "20px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-bg}"
    rounded: "{rounded.sm}"
    padding: "14px 24px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
---

# Design System: Reservacar

## 1. Overview

**Creative North Star: "Acelerador de Escassez Premium (Tema Claro & Flat)"**

O sistema de design do Reservacar adota uma estética contemporânea, limpa e de alto contraste, utilizando o **Tema Claro (Light Mode)** por padrão. Abandonando a saturação do tema escuro tradicional de tecnologia, o Reservacar projeta profissionalismo e clareza por meio de superfícies brancas puras, tons equilibrados de cinza e preto para contraste forte, e o uso cirúrgico de um **Azul Cobalto Vibrante** para botões e chamadas à ação (CTAs) principais. 

A interface rejeita deliberadamente o uso de sombras decorativas e gradientes espalhafatosos, apoiando-se em uma filosofia **100% Flat (Plana)**. A hierarquia visual e a profundidade são estabelecidas através de espessuras de bordas sólidas finas, contrastes de cor de fundo e tipografia pesada.

**Key Characteristics:**
* **Contraste Extremo**: Texto preto sobre fundo branco puro, otimizando a leitura sob qualquer iluminação.
* **Layout Flat Puro**: Sem sombras de elevação, sem efeitos tridimensionais ou blurs de vidro.
* **Accent Pontual**: O azul cobalto é a única cor de destaque ativo (usada em ≤10% da tela) para orientar o olhar do usuário.
* **Bordas Estruturais**: Uso de divisores cinza claro sólidos para separar seções e inputs com precisão.

## 2. Colors

A paleta de cores é focada no contraste limpo e legibilidade.

### Primary
- **Azul Cobalto Vibrante** (#2563eb): Usado apenas para elementos acionáveis primários (CTAs) e indicações de status ativo.

### Neutral
- **Branco Absoluto** (#ffffff): Fundo principal da aplicação e de cards de destaque.
- **Cinza Off-White** (#f8f9fa): Fundo de páginas secundárias e áreas de agrupamento de dados.
- **Preto Carbono** (#0f172a): Títulos principais, textos de corpo de alta leitura e ícones de alto contraste.
- **Cinza Muted** (#64748b): Subtítulos, textos de apoio e rótulos secundários.
- **Cinza Divisor** (#e2e8f0): Bordas de cards, divisores horizontais e contornos de inputs.

### Accent
- **Verde Pix Comercial** (#16a34a): Usado estritamente para indicar sucesso financeiro (sinais recebidos, transações finalizadas).

### Named Rules
**The Strict Neutral Rule.** Todos os elementos neutros devem usar a escala de cinza/preto definida sem qualquer tonalidade fria ou quente. A neutralidade deve ser absoluta para dar destaque ao Azul Cobalto.

## 3. Typography

**Display Font:** 'Sora', ui-sans-serif, system-ui, sans-serif
**Body Font:** 'Sora', ui-sans-serif, system-ui, sans-serif

**Character:** Tipografia geométrica, moderna, limpa e com forte variação de peso para separar claramente títulos de parágrafos.

### Hierarchy
- **Display** (ExtraBold (900), clamp(2rem, 5vw, 3rem), 1.15): Títulos principais das telas (Ex: "Gerador de Reservas").
- **Headline** (Bold (700), 24px, 1.25): Títulos de seções de cards e cabeçalhos de passos do wizard.
- **Title** (SemiBold (600), 18px, 1.3): Títulos de itens de lista ou nomes de veículos nos cards.
- **Body** (Medium (500), 14px, 1.5): Textos informativos, descrições de veículos (limite recomendado de 65–75ch).
- **Label** (Bold (700), 12px, tracking-wider, uppercase): Rótulos de campos de formulário e pequenas tags de status.

## 4. Elevation

O Reservacar é um sistema **Flat-By-Default**. Não são utilizadas sombras em nenhuma circunstância.

**The Flat Separation Rule.** A separação de elementos é feita exclusivamente pelo contraste de cor de fundo (ex: card branco `#ffffff` sobre fundo da tela off-white `#f8f9fa`) e por bordas finas sólidas de `1px` ou `2px` usando a cor de Cinza Divisor (`#e2e8f0`).

## 5. Components

### Buttons
- **Shape:** Cantos levemente arredondados (radius de 12px / `rounded-xl` ou 6px / `rounded-sm`).
- **Primary:** Fundo Azul Cobalto sólido (`#2563eb`), texto branco, sem gradiente.
- **Hover:** Transiciona a cor de fundo para Azul Escuro (`#1d4ed8`) de forma seca, sem transições lentas ou efeitos de escala.
- **Secondary:** Fundo Branco sólido com borda Cinza Divisor (`#e2e8f0`), texto Preto Carbono (`#0f172a`).

### Cards / Containers
- **Corner Style:** Curva sutil (radius de 12px ou 20px).
- **Background:** Branco absoluto ou Cinza Off-White.
- **Border:** Borda contínua de 1px sólida na cor Cinza Divisor (`#e2e8f0`). Sem sombras.

### Inputs / Fields
- **Style:** Fundo cinza suave (`#f8f9fa`) ou branco, contorno de 2px sólida na cor Cinza Divisor (`#e2e8f0`).
- **Focus:** Ao focar, a borda torna-se Preto Carbono (`#0f172a`) de forma instantânea.
- **Error:** Borda vermelha sólida de 2px.

### Navigation
- **Style:** Barra fixa no topo, fundo Branco absoluto com borda inferior sólida Cinza Divisor. Links em Preto Carbono com hover destacando em Azul Cobalto.

## 6. Do's and Don'ts

### Do:
- **Do** usar fundo branco absoluto para blocos de conteúdo e cinza off-white para o fundo das páginas.
- **Do** delimitar todos os cards e campos de entrada com bordas sólidas cinzas claras de 1px ou 2px.
- **Do** usar o Azul Cobalto para CTAs principais de conversão, limitando-o a elementos estratégicos de interação.

### Don't:
- **Don't** utilizar sombras (`box-shadow`) ou brilhos de fundo sob nenhuma circunstância.
- **Don't** utilizar gradientes de cor em fundos, textos ou botões.
- **Don't** utilizar escala ativa (`active:scale-95`) ou qualquer animação de deformação nos botões ao clicar.
- **Don't** usar o tema escuro (Dark Mode). O sistema deve ser integralmente claro.
