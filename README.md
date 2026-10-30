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

### 3. Rodar os SQLs no Supabase (nesta ordem)

1. `supabase/schema.sql` — tabelas base + RLS
2. `supabase/team.sql` — equipe (dono/editor/visualização) e policies por agência
3. `supabase/demands.sql` — demandas, colunas de aprovação e admins
4. `supabase/portal.sql` — leitura pública do portal, bucket de logos e ações do cliente

> `clean_schema.sql`, `full_schema.sql` e `full_schema_v2.sql` na raiz são versões antigas/duplicadas e não devem ser usadas.

### 4. Rodar local

```bash
npm run dev
```

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
