# Especificação de Design: Controle de Perfis de Usuário (Dono vs Funcionário)

Este documento descreve a lógica e o design para a introdução do perfil de usuário secundário (Funcionário/Vendedor) e as restrições associadas no painel do Reservacar.

## 📋 Resumo do Entendimento

* **Objetivo**: Permitir a alternância entre os perfis de **Dono da Loja (Administrador)** e **Funcionário (Vendedor)**, oferecendo interfaces e permissões diferenciadas no dashboard.
* **Público-alvo**: Concessionárias e pátios multimarcas que possuem gestores (donos) e equipes de vendas (funcionários).
* **Restrições do Funcionário**:
  * Visualização restrita da barra lateral (apenas **Nova Proposta** e **Painel de Vendas**).
  * Modal de gerenciamento com campos administrativos ("Valor do Sinal" e "Atendente Responsável") em modo somente leitura.
  * Capacidade de alterar o status do andamento da reserva e adicionar/atualizar a imagem do veículo diretamente pelo modal.

---

## ⚙️ Premissas (Assumptions)

1. **Simulação e Prototipagem**: Toda a lógica será gerenciada de forma reativa localmente com o estado do React no navegador (SPA), sem necessidade de banco de dados ou backend real.
2. **Visual Flat**: Os elementos visuais adicionados (seletor de login, botões de fotos) seguirão estritamente a identidade visual claro/Flat do Reservacar (sem sombras, bordas de 1px/2px em `#e2e8f0`, realces em Preto Carbono `#0B1B17` e Verde Limão `#C1F651`).
3. **Gerenciamento de Imagens**: O "upload de imagem" será simulado pela seleção de presets existentes no showroom (`CAR_IMAGES`) ou pela colagem de um link de imagem externo.

---

## 🪵 Log de Decisão (Decision Log)

### 1. Seletor de Perfil na Tela de Login
* **O que foi decidido**: Incluir abas Flat (tabs) interativas diretamente na tela de login para escolher o perfil ("Dono da Loja" ou "Funcionário").
* **Alternativas consideradas**: Login por e-mails específicos ou simulação rápida na Sidebar.
* **Justificativa**: Mais prático para o usuário final demonstrar os dois fluxos de forma intuitiva durante as reuniões de demonstração.

### 2. Visibilidade da Sidebar para Funcionários
* **O que foi decidido**: Ocultar completamente as seções "Painel Central", "Vendedores", "Relatórios", "Configurações" e "Upgrade de Plano".
* **Alternativas consideradas**: Exibir todas as telas mas exibir mensagens de "Acesso Restrito" nas administrativas.
* **Justificativa**: Reduz a carga cognitiva do vendedor, focando a interface exclusivamente em suas ações comerciais essenciais.

### 3. Exibição de Campos Administrativos no Modal
* **O que foi decidido**: Exibir "Valor do Sinal" e "Atendente Responsável" como campos de texto desabilitados (somente leitura) com visual Flat para o Funcionário.
* **Alternativas consideradas**: Ocultar os campos do modal.
* **Justificativa**: É importante que o vendedor veja os termos combinados para a reserva, mesmo que ele não tenha poder para alterá-los diretamente.

### 4. Adição de Imagens
* **O que foi decidido**: Permitir a atualização/adição de fotos do veículo a partir de uma seção específica dentro do Modal de Gerenciamento da Reserva.
* **Alternativas consideradas**: Permitir a adição de fotos apenas no momento do cadastro inicial.
* **Justificativa**: O vendedor costuma ir ao pátio tirar fotos reais do carro e anexá-las à proposta após a criação inicial da reserva.

### 5. Estilização Visual 100% Flat na Coluna Esquerda do Login
* **O que foi decidido**: Remover as linhas verticais decorativas e os efeitos de luz verde/branco, deixando o fundo plano e sólido na cor `#0B1B17`.
* **Alternativas consideradas**: Manter as linhas ou glows com opacidades menores.
* **Justificativa**: Garante consistência com o posicionamento de design flat puro e reduz a sensação de poluição visual na interface de acesso.

---

## 🎨 Design Final

### Login (`LoginView`)
O formulário de login exibirá duas abas Flat logo antes do e-mail corporativo:
* **Fundo**: `#ffffff` com contorno de `1px` em `#e2e8f0`.
* **Aba Ativa**: Fundo `#0B1B17` com texto em Verde Limão `#C1F651`.
* **Aba Inativa**: Fundo `#f8f9fa`, texto `#64748b`.
* **Redirecionamento**: Dono vai para `hub`, Funcionário vai direto para `dashboard`.
* **Coluna Esquerda**: Fundo puramente sólido em `#0B1B17` sem linhas ou glows decorativos.

### Sidebar
* A Sidebar recebe a propriedade `currentUserRole`.
* Se `currentUserRole === 'employee'`, os itens do menu são limitados a `dashboard` e `sales-stats`. O rodapé exibe apenas o botão de logout e identifica o usuário como "Consultor".

### Gerenciamento de Reserva (`GerenciarReservaModal`)
* **Status**: Continua editável para alteração do andamento (Aguardando Sinal / PIX Recebido / Expirado).
* **Campos Estáticos**: Sinal e Atendente viram texto simples com fundo cinza `#f8f9fa`.
* **Seção Galeria**:
  * Exibe miniatura da foto cadastrada.
  * Botão Flat "Atualizar Imagem" abre um seletor visual dos presets `CAR_IMAGES` ou campo de link. O ícone de upload e a borda da imagem ativa usam a cor `#0B1B17` (Preto Carbono) para manter a coesão.
