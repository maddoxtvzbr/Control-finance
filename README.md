# Controle Financeiro

Aplicativo pessoal mobile-first para registrar receitas, despesas e movimentações relacionadas a apostas, com histórico, edição, exclusão, filtros e relatórios por período.

## Estrutura

- `src/App.jsx`: aplicação funcional original preservada.
- `src/main.jsx`: inicialização do React e registro do Service Worker em produção.
- `src/index.css`: estilos globais/base.
- `public/manifest.webmanifest`: configuração instalável da PWA.
- `public/sw.js`: Service Worker para cache básico/offline.
- `public/icons/`: ícones 192, 512 e maskable.

## Tecnologias

- React
- Vite
- Lucide React
- PWA com manifest + Service Worker
- Persistência local com `localStorage`

## Rodar localmente

```bash
npm install
npm run dev
```

## Build de produção

```bash
npm run build
```

O build será criado em `dist/`.

## Testar o build

```bash
npm run preview
```

## Publicar na Vercel

1. Crie um repositório no GitHub e envie este projeto.
2. Na Vercel, importe o repositório.
3. Framework preset: Vite.
4. Build command: `npm run build`.
5. Output directory: `dist`.

Após a publicação HTTPS, abra o endereço no Android/Chrome e use **Instalar app** / **Adicionar à tela inicial**.

## Persistência dos dados

A aplicação preserva a chave original:

`controle_financeiro_transactions`

Os dados ficam no `localStorage` do navegador/dispositivo. Eles não sincronizam entre aparelhos e podem ser perdidos se o usuário apagar os dados do site.

## Próxima evolução recomendada

Migrar a camada `transactionRepository` para Supabase, adicionando autenticação e sincronização, mantendo a interface e a lógica financeira atuais.
