<p align="center">
  <img src="logo-fynko.png" alt="Fynko" width="120" />
</p>

<h1 align="center">Fynko</h1>

<p align="center">
  Um aplicativo web de finanças pessoais — organize contas, cartões, despesas e metas em um só lugar.
</p>

<p align="center">
  <a href="https://fynko.netlify.app/"><strong>🔗 Acessar o app ao vivo</strong></a>
</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white" />
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-Postgres-3ECF8E?logo=supabase&logoColor=white" />
</p>

---

## Sobre o projeto

O **Fynko** nasceu como uma ferramenta pessoal para eu controlar minhas próprias finanças sem depender de planilhas. Com o tempo, ganhou contas de usuário, isolamento de dados por pessoa e virou uma aplicação multiusuário completa, com foco em **segurança**, **clareza visual** e **precisão nos cálculos**.

Todo valor monetário é armazenado em **centavos (inteiros)** para evitar erros de arredondamento, e os saldos seguem o regime de **caixa** (calculados a partir dos lançamentos reais, pela data de pagamento).

## Demonstração

> As imagens abaixo usam uma **conta de teste com dados fictícios** — nenhum dado financeiro real é exibido.

<!-- Adicione suas capturas em docs/screenshots/ e elas aparecerão aqui -->
<p align="center">
  <img src="docs/screenshots/dashboard.png" alt="Dashboard" width="80%" />
  <br /><em>Dashboard com previsão de saldo e gráficos</em>
</p>

<p align="center">
  <img src="docs/screenshots/cartoes.png" alt="Cartões" width="80%" />
  <br /><em>Controle de cartões, fatura e limite</em>
</p>

## Funcionalidades

- **Dashboard** com previsão de saldo do mês, indicadores e gráficos (receitas × despesas, evolução do saldo, gastos por categoria).
- **Contas** — bancos, carteiras digitais e dinheiro em espécie, com saldo calculado automaticamente.
- **Receitas e Despesas** — lançamentos com categorias, filtros, busca e status (pago, a vencer, vencido).
- **Cartões de crédito** — fatura atual, limite disponível, parcelas e logo da bandeira.
- **Metas** — objetivos de economia com aportes e acompanhamento de progresso.
- **Orçamentos (Limites)** — teto de gastos por categoria/mês com alertas.
- **Assinaturas** — controle de serviços recorrentes com reconhecimento automático do logo.
- **Patrimônio** — ativos e passivos com cálculo de patrimônio líquido.
- **Transferências** entre contas e **Linha do tempo** com o histórico financeiro.
- **Calendário** de vencimentos e recebimentos.
- **Relatórios** com exportação para **PDF** e **Excel**, além de backup/importação de toda a conta.
- **Anexos** de comprovantes às movimentações.
- **Busca global** (⌘K / Ctrl+K), tema claro/escuro e design responsivo (mobile e desktop).

## Tecnologias

**Front-end**
- React 18 + TypeScript
- Vite (build e dev server)
- Tailwind CSS v4
- TanStack Query (cache e sincronização de dados)
- React Router
- Recharts (gráficos) · Lucide (ícones)
- jsPDF e SheetJS (xlsx) para exportações

**Back-end**
- Supabase — PostgreSQL, Authentication e Storage
- **Row Level Security (RLS)**: cada usuário só acessa os próprios dados, garantido no nível do banco
- Netlify Functions (job agendado de retenção de anexos)

**Infra**
- Deploy contínuo na Netlify a partir do GitHub
- Testes com Vitest

## Rodando localmente

### Pré-requisitos
- Node.js 20+
- Um projeto no [Supabase](https://supabase.com)

### Passos

```bash
# 1. Clonar o repositório
git clone https://github.com/Manko135/Fynko.git
cd Fynko

# 2. Instalar as dependências
npm install

# 3. Configurar as variáveis de ambiente
cp .env.example .env.local
# edite .env.local com a URL e a anon key do seu projeto Supabase

# 4. Rodar em desenvolvimento
npm run dev
```

### Banco de dados
As migrations ficam em [`src/supabase/migrations`](src/supabase/migrations). Rode os arquivos `.sql` na ordem, pelo **SQL Editor** do Supabase, para criar as tabelas, políticas de RLS e regras de storage.

## Variáveis de ambiente

| Variável | Onde | Descrição |
|---|---|---|
| `VITE_SUPABASE_URL` | Front-end | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Front-end | Chave pública (anon) — segura para o navegador |
| `SUPABASE_URL` | Netlify (função) | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE` | Netlify (função) | Chave secreta — **apenas no servidor**, nunca no front-end |

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe o servidor de desenvolvimento |
| `npm run build` | Gera a versão de produção em `dist/` |
| `npm run preview` | Serve localmente o build de produção |
| `npm run test` | Roda os testes |
| `npm run lint` | Verifica o código com o ESLint |

## Deploy

O deploy é feito na **Netlify**, conectada a este repositório. Cada `push` na branch `main` dispara um novo build automaticamente. O redirecionamento de SPA e a função agendada estão configurados em [`netlify.toml`](netlify.toml).

---

<p align="center">
  Feito por <a href="https://github.com/Manko135">João Pedro Vaz</a>
</p>
