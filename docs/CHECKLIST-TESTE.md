# Checklist de teste — Deliver

Rode na ordem. Cada item tem o resultado esperado.

## 0. Preparação

- [ ] `.env.local` criado a partir de `.env.example` (URL, anon key e service role key)
- [ ] `supabase/000_setup.sql` executado no SQL Editor **sem erro**
- [ ] `npm install && npm run dev` sobe em `http://localhost:3000`

## 1. Autenticação

- [ ] `/` carrega o login com o logo e o card centralizado
- [ ] Senha errada mostra "Erro: Invalid login credentials"
- [ ] Login de **dono** cai em `/agency`
- [ ] Login de **membro** cai em `/agency` (antes caía em "Agência não encontrada")
- [ ] Usuário sem agência vê "Sua conta não está vinculada a nenhuma agência"
- [ ] Acessar `/agency` deslogado redireciona para `/` (middleware)
- [ ] Acessar `/admin` deslogado redireciona para `/`
- [ ] Usuário comum em `/admin` é mandado para `/agency`

## 2. Visão geral (`/agency`)

- [ ] Sidebar com logo, nome da agência, menu e item ativo destacado
- [ ] Badge vermelho em "Alterações" quando existe pedido aberto
- [ ] Cards de estatística mostram fundo (não transparente)
- [ ] "Novo cliente" abre o modal e cria o cliente
- [ ] Cliente aparece na grade com avatar, contato e data
- [ ] Busca filtra por nome; ordenação A-Z funciona
- [ ] Botão de copiar link **sem slug configurado** avisa "Configure o slug…"

## 3. Clientes (`/agency/clients`)

- [ ] Criar cliente **com faturamento mensal** salva sem erro de coluna
- [ ] Upload de logo funciona (bucket `client-logos`)
- [ ] Editar logo / excluir cliente
- [ ] Cliente `viewer` não vê os botões de edição

## 4. Cliente (`/agency/client/[id]`)

- [ ] Criar projeto
- [ ] Adicionar vídeo com link do YouTube **completo** (`watch?v=…`, `youtu.be/…` ou `/shorts/…`)
- [ ] Adicionar vídeo com link do Drive 4K
- [ ] Link copiado abre o formato `/c/slug-agencia/slug-cliente`

## 5. Portal do cliente (sem login, aba anônima)

- [ ] Abre sem pedir login e mostra logo/nome da agência e do cliente
- [ ] Vídeo do YouTube **toca** dentro da página (embed correto)
- [ ] Botão "Baixar 4K" abre o Drive em nova aba
- [ ] "Aprovar" muda o selo para "✓ Aprovado" e persiste ao recarregar
- [ ] "Pedir alteração" com menos de 5 caracteres é bloqueado
- [ ] Pedido enviado aparece na aba "Revisões"
- [ ] Link com slug errado mostra "Agência/Cliente não encontrado"
- [ ] No DevTools → Network, a resposta de `/rest/v1/agencies` **não** traz `email`
- [ ] Idem para `clients` (sem `phone`, `email`, `monthly_revenue`)

## 6. Demandas e Alterações

- [ ] Criar demanda com prazo e total
- [ ] Coluna "entregue"/"restante" reflete a quantidade de vídeos do cliente
- [ ] Resolver alteração some do badge do menu
- [ ] Excluir demanda

## 7. Equipe (`/agency/team`)

- [ ] Dono vê "Adicionar usuário"; editor/viewer não vê
- [ ] Criar membro com senha de 6+ caracteres gera login válido
- [ ] Membro criado entra em `/agency` e enxerga os clientes da agência
- [ ] Membro `viewer` não vê botões de criar/editar
- [ ] Remover membro apaga o login (tentar logar depois falha)
- [ ] Sem `SUPABASE_SERVICE_ROLE_KEY`, a tela mostra erro claro em vez de travar

## 8. Configurações (`/agency/settings`)

- [ ] Salvar nome, slug e logo da agência
- [ ] Trocar o slug muda o link do portal
- [ ] Após salvar, o nome/logo do menu atualiza sem recarregar

## 9. Admin (`/admin`)

- [ ] Visão geral mostra totais de agências, clientes, vídeos e revisões
- [ ] Criar agência cria o usuário de login e vincula o dono
- [ ] Bloquear/desbloquear agência
- [ ] Receita soma os planos corretamente
- [ ] Logs listam os eventos

## 10. Regressões

- [ ] Nenhum `console.log` de debug no console do navegador/servidor
- [ ] `npm run build` passa sem erro
- [ ] Layout em 1280px e em 390px (mobile) sem sobreposição
- [ ] Recarregar `/agency` autenticado não entra em loop de loading
