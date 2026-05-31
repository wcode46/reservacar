<USER_REQUEST>
/brainstorming resolvas estes erros apresentados

Vou fazer uma leitura mais focada nas views de navegação e fluxos.Agora tenho tudo que preciso. Aqui está a análise focada e separada:

---

## Erros de Navegação

**N1 — `cadastrar-reserva` e `checkout-plano` invisíveis para a Navbar autenticada**
A Navbar só exibe o menu interno (`Painel Principal`, `Configurações`, `Sair`) nas rotas `['hub', 'sales-stats', 'dashboard', 'assinar', 'configuracoes']`. Nas rotas `cadastrar-reserva` e `checkout-plano`, um usuário logado vê o menu público da homepage (com "Assinar" e "Acesso Lojista"), como se tivesse deslogado.

**N2 — Botão "Voltar" do `CadastroReservaClienteView` no Step 1 leva para `home` em vez de `dashboard`**
```tsx
// linha 2929
if (step === 1) { navigateTo('home'); }
```
O fluxo correto: o vendedor chega ao cadastro vindo do `dashboard` → ao voltar, deveria ir para `dashboard`. A home não faz sentido para um usuário logado no meio de um fluxo interno.

**N3 — Após publicar uma reserva (`handlePublish`), o usuário é levado para `home`**
```tsx
// linha 1430
navigateTo('home');
```
Após confirmar e publicar uma proposta, o vendedor vai parar na homepage pública. O destino correto seria `dashboard` ou `sales-stats`, para ele ver o link recém-criado na lista.

**N4 — `PreviewView` em modo visualização (não pré-publicação) tem botão "Voltar ao Sistema" que vai para `dashboard`, mas não há como chegar no preview a partir do `sales-stats`**
No `SalesStatsView` os botões "Desktop" e "Mobile Sim" (linhas 1346–1362) chamam `navigateTo('preview')`, mas a lógica de retorno do preview usa `isPrePublish` para decidir o destino. Quando o usuário vem do `sales-stats`, `isPrePublish` é `false` e o botão "Voltar ao Sistema" vai para `dashboard` — não de volta para `sales-stats` de onde ele veio.

**N5 — `AssinaturaEmpresaView` tem 4 steps no progress bar mas só renderiza até o step 3**
```tsx
// linha 3066 — barra mostra 4 step
<truncated 4088 bytes>
hub')` funciona de qualquer lugar, inclusive direto da URL ou de um botão na home.

**F3 — Nenhuma validação de CNPJ no `AssinaturaEmpresaView`**
O campo CNPJ tem máscara de formatação, mas não valida se o CNPJ é matematicamente válido. Um CNPJ como `00.000.000/0000-00` passa sem erro.

**F4 — Não há confirmação antes de "Limpar Tudo" no `DashboardView`**
```tsx
// linha 1291
onClick={() => { setRecentReservations([]); showToast(...) }}
```
Um clique acidental apaga todas as reservas sem nenhum modal de confirmação ou possibilidade de desfazer.

**F5 — Não existe tela de detalhe de reserva individual**
No `DashboardView` e `SalesStatsView`, cada card tem botões de "Desktop/Mobile" para ver o preview, mas não há uma tela de gestão da reserva específica (status, histórico de visualizações, editar sinal, cancelar reserva).

**F6 — O `MobileClientView` não tem botão de voltar funcional ao contexto correto**
Por analogia com o `PreviewView` (N4), o `MobileClientView` provavelmente sofre do mesmo problema de destino de retorno, mas o fluxo de retorno não foi implementado explicitamente para diferenciar se o usuário veio do `sales-stats` ou do `dashboard`.

**F7 — Não há feedback visual de carregamento no Step 1 do cadastro ao trocar de marca/modelo**
O `isFipeLoading` existe e é usado para exibir um overlay geral, mas a seleção de modelos/anos ao mudar a marca não tem loading state individual nos selects — eles ficam habilitados instantaneamente mesmo antes dos dados carregarem.
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-05-31T19:10:46-03:00.

The user has mentioned some items in the form @[ITEM]. Here is extra information about the items that were mentioned by the user, in the order that they appear:

/brainstorming is a [Slash Command]:
<SKILL>The user requested you read and use the "brainstorming" skill. The path to the skill file is:
C:\Users\Wollace\.gemini\config\skills\brainstorming\SKILL.md</SKILL>
</ADDITIONAL_METADATA>