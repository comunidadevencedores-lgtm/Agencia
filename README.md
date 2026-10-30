# Deliver — Portal de entrega de criativos

Painel para agências entregarem vídeos aos clientes, receberem pedidos de alteração e aprovações.

## Stack

- Next.js 14 (App Router)
- Supabase (auth, banco e storage)

## Setup

### 1. Instalar dependências

```bash
npm install
```

### 2. Criar `.env.local`

Copie `.env.example` e preencha:

```
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key   # só servidor (/api/team)
```

### 3. Criar o banco no Supabase

Cole `supabase/000_setup.sql` no **SQL Editor** e rode. Ele é idempotente (pode rodar várias vezes)
e cria: tabelas, colunas, índices, funções, policies de RLS, o bucket `client-logos` e os admins iniciais.

> Os arquivos `schema.sql`, `team.sql`, `demands.sql` e `portal.sql` são as partes separadas.
> Use-os apenas se quiser aplicar por etapas — o `000_setup.sql` já contém tudo.

### 4. Rodar local

```bash
npm run dev
```

### 5. Conferir se o banco respondeu

```bash
npm run db:check     # testa tabelas, funções do portal, storage e admin API
npm run db:seed      # opcional: cria agência/cliente/vídeos de demonstração
npm run db:clean     # remove o cenário de demonstração
```

O `db:seed` imprime o login (`teste.agencia@deliver.local` / `Teste@12345`) e o link do portal
`/c/agencia-teste/cliente-teste` para você validar o fluxo do cliente sem montar tudo na mão.

## Rotas

| Rota | Quem acessa |
|---|---|
| `/` | login da agência |
| `/agency` | visão geral (clientes, demandas, alterações) |
| `/agency/clients` | lista de clientes |
| `/agency/client/[id]` | projetos, vídeos e alterações do cliente |
| `/agency/demands` | demandas mensais |
| `/agency/revisions` | todas as alterações |
| `/agency/team` | equipe (só o dono adiciona/remove) |
| `/agency/settings` | nome, slug e logo da agência |
| `/admin` | super admin |
| `/c/[agency-slug]/[client-slug]` | portal público do cliente (sem login) |

## Fluxo

1. Agência loga em `/`
2. Cria o cliente em `/agency/clients`
3. Abre o cliente, cria um projeto e adiciona vídeos (YouTube + Drive 4K)
4. Copia o link e envia no WhatsApp
5. O cliente abre o link, assiste, baixa em 4K, aprova ou pede alteração
6. A agência vê os pedidos em `/agency/revisions` (badge no menu)

## Modelo de permissão

- `agencies.id` = `auth.uid()` do dono
- Membros ficam em `agency_members` (`owner` | `editor` | `viewer`)
- `agency_of(uid)` resolve a agência do dono **ou** do membro
- `viewer` só lê; `editor` e `owner` escrevem
- Admins do sistema ficam em `admin_users` e são reconhecidos pela função `is_admin()`
  (compara o e-mail do JWT) — um usuário comum não consegue listar essa tabela

## Super admin

Para liberar o `/admin` para uma conta:

1. crie o usuário em **Authentication → Users** com **Auto Confirm User** ligado
2. rode no SQL Editor:

```sql
insert into public.admin_users (email, name)
values ('seu@email.com', 'Seu Nome')
on conflict (email) do nothing;
```

A criação de agências no painel passa pela rota `POST /api/admin/agencies`, que usa a
`service_role` no servidor. Assim a sessão do admin **não** é trocada pela conta nova
(era o comportamento antigo, que usava `signUp` no navegador).
