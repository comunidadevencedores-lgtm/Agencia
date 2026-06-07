# Deliver — Portal de entrega de criativos

## Setup

### 1. Instalar dependências
```bash
npm install
```

### 2. Criar .env.local na raiz do projeto
```
NEXT_PUBLIC_SUPABASE_URL=https://uopsfcsjxortvjsnaesb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

### 3. Rodar local
```bash
npm run dev
```

## Rotas
- `/` — login da agência
- `/agency` — painel com lista de clientes
- `/agency/client/[id]` — detalhe do cliente, projetos, vídeos e alterações
- `/agency/revisions` — todas as alterações pendentes
- `/c/[agency-slug]/[client-slug]` — portal público do cliente (link enviado por WhatsApp)

## Fluxo
1. Agência loga em `/`
2. Cria cliente em `/agency`
3. Abre o cliente, cria projeto e adiciona vídeos (link YouTube + Drive)
4. Copia o link e manda pro cliente via WhatsApp
5. Cliente abre o link, assiste, baixa em 4K, pede alteração
6. Agência vê as alterações em `/agency/revisions` ou na página do cliente
