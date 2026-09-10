# Pulse — AGENTS.md

> **Para agentes de IA:** este documento é a fonte única de verdade sobre o produto, a arquitetura, os padrões de código e as regras que devem ser seguidas ao contribuir com o projeto Pulse. Leia-o inteiro antes de fazer qualquer alteração.

> 🚫 **PROIBIDO ABSOLUTO — Git:** agentes de IA **nunca** devem executar `git commit`, `git push`, `git merge`, `git rebase` ou qualquer comando que altere o histórico ou envie código para repositórios remotos. Todas as alterações de código devem ser feitas nos arquivos locais e apresentadas ao desenvolvedor humano, que decide se e quando commitar e fazer push.

> 📝 **MANUTENÇÃO ATIVA DESTE DOCUMENTO — Obrigatório:** Sempre que um agente de IA implementar um padrão novo, uma boa prática que não estava documentada, uma decisão arquitetural, ou qualquer convenção que surgiu organicamente do código, **ele deve atualizar este AGENTS.md imediatamente**, na mesma sessão de trabalho, sem precisar de instrução explícita do desenvolvedor. Este documento deve sempre refletir o estado real do código. Se você implementou algo e não está descrito aqui — adicione. Se uma regra existente ficou desatualizada — corrija. O AGENTS.md é um documento vivo.

**Versão da stack implementada:** Next.js 16 (App Router) + PostgreSQL + Prisma v7 + TypeScript strict  
**Última revisão:** Junho de 2026

---

## Sumário

1. [O que é o Pulse](#1-o-que-é-o-pulse)
2. [Contexto Regulatório](#2-contexto-regulatório)
3. [Modelo SaaS e Multi-tenant](#3-modelo-saas-e-multi-tenant)
4. [Papéis e Permissões](#4-papéis-e-permissões)
5. [Decisões de Arquitetura](#5-decisões-de-arquitetura)
6. [Stack e Dependências](#6-stack-e-dependências)
7. [Estrutura de Pastas](#7-estrutura-de-pastas)
8. [Schema do Banco de Dados](#8-schema-do-banco-de-dados)
9. [Padrões de Código — Regras Obrigatórias](#9-padrões-de-código--regras-obrigatórias)
10. [Design Patterns](#10-design-patterns)
11. [Fluxo de Dados](#11-fluxo-de-dados)
12. [Autenticação e Sessão](#12-autenticação-e-sessão)
13. [Contratos de Integrações Externas](#13-contratos-de-integrações-externas)
14. [Design System](#14-design-system)
15. [Pagamento e Faturamento (Stripe)](#15-pagamento-e-faturamento-stripe)
16. [Conformidade LGPD](#16-conformidade-lgpd)
17. [Termos de Uso da Plataforma](#17-termos-de-uso-da-plataforma)
18. [Jobs Agendados](#18-jobs-agendados)
19. [Migrations](#19-migrations)
20. [Fluxos de Negócio Críticos](#20-fluxos-de-negócio-críticos)
21. [Variáveis de Ambiente](#21-variáveis-de-ambiente)
22. [Comandos Úteis](#22-comandos-úteis)
23. [localStorage — Padrão de Uso](#23-localstorage--padrão-de-uso)
24. [Labels e Badges — Valores de Enum na UI](#24-labels-e-badges--valores-de-enum-na-ui)
25. [Padrão de Navegação em Listagens](#25-padrão-de-navegação-em-listagens)
26. [Fronteiras de Camada](#26-fronteiras-de-camada)
27. [Abstração de SDKs e ORM](#27-abstração-de-sdks-e-orm)
28. [Queries Cross-tenant — Convenção de Naming para Jobs](#28-queries-cross-tenant--convenção-de-naming-para-jobs)
29. [Checklist de Conformidade Pré-PR](#29-checklist-de-conformidade-pré-pr)
30. [Testes Unitários](#30-testes-unitários)
31. [Paginação — Padrão Obrigatório](#31-paginação--padrão-obrigatório)
32. [Centralização de Cores — CSS Variables](#32-centralização-de-cores--css-variables)
33. [Endereços de E-mail — Variáveis de Ambiente](#33-endereços-de-e-mail--variáveis-de-ambiente)
34. [Variáveis de Ambiente — Acesso Centralizado](#34-variáveis-de-ambiente--acesso-centralizado)
35. [Selects — Componente Padrão Obrigatório](#35-selects--componente-padrão-obrigatório)
36. [Confirmações Destrutivas — Modal Obrigatório](#36-confirmações-destrutivas--modal-obrigatório)

---

## 1. O que é o Pulse

O **Pulse** é um software SaaS de monitoramento de saúde ocupacional que ajuda empresas a monitorar a saúde ocupacional dos colaboradores e cumprir obrigações legais trabalhistas. O sistema:

1. Envia pesquisas rápidas e anônimas para colaboradores via mensagem automaticamente por setor (funcionalidade opcional no plano)
2. Agrupa resultados por setor e emite alertas automáticos quando detecta queda de indicadores
3. Oferece canal permanente de relato anônimo
4. Gera relatórios de evidência em PDF para o PGR (Programa de Gerenciamento de Riscos)

**Fluxo resumido:**

```
RH cadastra colaboradores → sistema envia pesquisas periodicamente → colaborador aceita TCLE inline na primeira pesquisa
  → colaborador responde pesquisas → RH acompanha métricas e alertas
  → Admin exporta relatório mensal para o PGR
```

### O que o Super Admin NÃO pode fazer

Por exigência da LGPD:

- Acessar respostas de formulários de qualquer empresa
- Acessar relatos anônimos de qualquer empresa
- Acessar documentos internos de qualquer empresa
- Fazer login como usuário de uma organização cliente (impersonação proibida)

---

## 2. Contexto Regulatório

A legislação trabalhista exige que empresas monitorem fatores de risco psicossocial (estresse, sobrecarga, clima) e produzam documentação comprobatória. O Pulse atende essa exigência com:

- **TCLE (Termo de Consentimento Livre e Esclarecido):** registro imutável de que cada colaborador foi informado e consentiu
- **Anonimato duplo:** respostas sem `employee_id` + métricas exibidas apenas com ≥ 5 respondentes
- **Audit trail imutável:** toda ação relevante registrada em `audit_logs` sem UPDATE/DELETE
- **PGR PDF:** relatório mensal consolidando métricas, alertas, relatos, planos de ação e aceites

---

## 3. Modelo SaaS e Multi-tenant

Cada empresa contratante é um **tenant** isolado. O isolamento é implementado por **Row-Level Isolation** — coluna `tenant_id uuid` em todas as tabelas de dados operacionais, sempre filtrada em cada query.

### Acesso da empresa

O usuário acessa via:
```
Organização → acme          (slug único)
E-mail      → joao@acme.com
Senha       → ••••••••
```

O mesmo e-mail pode existir em organizações diferentes sem conflito — a unicidade é `(tenant_id, email)`.

### Criação de uma organização

Feita exclusivamente pelo Super Admin. Campos:

| Campo | Obrigatório |
|---|---|
| Nome da empresa | Sim |
| Slug (identificador único de login) | Sim — gerado automaticamente, editável |
| E-mail do Admin principal | Sim — recebe convite de primeiro acesso |
| Plano atribuído | Não — admin pode contratar depois via Stripe |
| Fuso horário | Não — padrão `America/Sao_Paulo` |

---

## 4. Papéis e Permissões

### Papéis existentes

| Papel | Escopo | Descrição |
|---|---|---|
| `super_admin` | Plataforma | Gerencia orgs, planos, Super Admins e termos da plataforma |
| `admin` | Tenant | Acesso total à org; pode excluir registros |
| `rh` | Tenant | Operacional; não pode excluir registros sensíveis |

### Matriz de permissões

| Recurso | super_admin | admin | rh | Observação |
|---|---|---|---|---|
| organizations | CRUD | — | — | |
| plans | CRUD | — | — | |
| departments | — | CRUD | CR + U | |
| employees | — | CRUD | CR + U | |
| health_survey_configurations | — | CRUD | CRUD | |
| health_survey_dispatches | — | CR | CR | |
| climate_survey_configurations | — | CRUD | CRUD | Feature de plano `climate_surveys` |
| climate_survey_dispatches | — | CR | CR | Feature de plano `climate_surveys` |
| anonymous_reports | — | CRU + D | CRU | |
| action_plans | — | CRUD | CRU | |
| documents | — | CRUD | CR | |
| alerts | — | RU | RU | |
| pgr_reviews | — | CRUD | CR | |
| audit_logs | — | R | R | |
| **employee_consents** | **— (🔒)** | **— (🔒)** | **— (🔒)** | **Sem UI. Append-only. Apenas banco e jobs internos.** |

### Implementação das permissões

```typescript
// libs/auth/permissions.ts
export type OrgUserRole = "admin" | "rh"

export interface OrgSessionContext {
  userId: string
  tenantId: string
  role: OrgUserRole
}

export function isOrgAdmin(context: OrgSessionContext): boolean
export function isOrgRh(context: OrgSessionContext): boolean
export function assertOrgAdmin(context: OrgSessionContext): void  // throws if not admin
export function assertOrgMember(context: OrgSessionContext, tenantId: string): void  // throws if tenant mismatch
```

---

## 5. Decisões de Arquitetura

### 5.1 Next.js 16 App Router

- **React Server Components (RSC):** leitura de dados sem round-trip desnecessário — dados lidos diretamente no servidor, HTML pré-renderizado
- **Server Actions:** mutações sem API layer adicional — formulários chamam funções no servidor diretamente
- **Route Groups:** `(tenant)`, `(super-admin)`, `(auth)`, `(public)`, `(onboarding)` — layouts completamente isolados por contexto de acesso
- **`src/proxy.ts`:** arquivo de proxy do Next.js 16 (o nome `middleware.ts` foi descontinuado na v16; o export deve se chamar `proxy` e o arquivo deve ser `proxy.ts` na raiz de `src/`)

### 5.2 Prisma v7 com `@prisma/adapter-pg`

- Schema declarativo em `prisma/schema.prisma`: fonte única de verdade para estrutura do banco e tipos TypeScript
- Migrations em `prisma/migrations/` — commitadas no repositório, aplicadas de forma determinística
- `prisma generate` produz client totalmente tipado
- **OBRIGATÓRIO:** toda interação com o banco usa exclusivamente o Prisma Client. `$queryRaw`, `$executeRaw` e `$queryRawUnsafe` são proibidos
- **Prisma v7 com PG adapter:** o `PrismaClient` é construído com `{ adapter }` — ver `src/libs/db/index.ts`

### 5.3 Adapter Pattern para integrações externas

Toda integração (email, messaging, storage, billing) é acessada via interface. O service nunca instancia o adapter diretamente — usa a factory em `src/libs/integrations/index.ts`. Trocar de provedor exige apenas criar novo adapter e atualizar a variável `*_PROVIDER` no `.env`.

### 5.4 Multi-tenancy por Row-Level Isolation

- `tenant_id` em todas as tabelas de dados de tenant
- Repositórios recebem `tenantId` sempre como primeiro parâmetro
- Nenhuma query em tabela com `tenant_id` pode omitir o filtro — ver regra do Tenant Guard

### 5.5 TypeScript strict

Todo o projeto usa `"strict": true` mais flags adicionais (ver seção 9). `any`, `object`, `{}` e `Function` são proibidos em todo o código.

---

## 6. Stack e Dependências

### Core

| Tecnologia | Versão | Uso |
|---|---|---|
| Next.js | 16 | Framework fullstack (App Router + Server Actions) |
| React | 19 | UI |
| TypeScript | 5+ | Linguagem principal — strict mode |
| PostgreSQL | 15+ | Banco de dados |
| Prisma | v7 | ORM com `@prisma/adapter-pg` |
| Tailwind CSS | v4 | Estilização |
| shadcn/ui | latest | Componentes UI via Radix UI / Base UI |

### Bibliotecas de suporte

| Lib | Uso |
|---|---|
| `zod` | Validação schema-first no cliente e servidor |
| `react-hook-form` + `@hookform/resolvers/zod` | Formulários com validação integrada |
| `@t3-oss/env-nextjs` | Variáveis de ambiente tipadas — erro em build se faltarem |
| `date-fns` + `date-fns-tz` | Datas e timezones (ex: validação de janela de trabalho) |
| `bcryptjs` | Hash de senhas |
| `jose` | JWT para sessões |
| `sonner` | Toasts |
| `next-themes` | Light/dark theme SSR-safe |
| `lucide-react` | Ícones |
| `nuqs` | State de query params na URL (filtros, paginação) |
| `react-email` | Templates de e-mail como componentes React |
| `@react-pdf/renderer` | Geração de PDFs (relatório PGR) |
| `stripe` | SDK Stripe (billing) |
| `resend` | SDK Resend (e-mail) |
| `bullmq` + `ioredis` | Fila de jobs com Redis |
| `@base-ui/react` | Componentes primitivos de UI (Select usa Base UI, não Radix) |
| `pino` + `pino-pretty` | Logger estruturado para a aplicação principal (`src/libs/logger.ts`) |
| `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` | Storage S3 (adapter `src/libs/integrations/storage/s3.adapter.ts`) |
| `@tiptap/react` + extensões | Editor de rich text (starter-kit, placeholder, underline) |
| `@tanstack/react-table` | Tabelas com ordenação, filtros e paginação no lado cliente |
| `recharts` | Gráficos e visualização de dados (usado no dashboard) |
| `sanitize-html` | Sanitização HTML segura (complementa `src/libs/utils/sanitize.ts`) |
| `imask` + `react-imask` | Máscaras de input (telefone, CNPJ, etc.) |
| `exceljs` | Geração de arquivos Excel (exportação de dados) e leitura de planilhas na importação |
| `unpdf` | Extração de texto de PDFs (puro JS, baseada em pdf.js) — importação de pesquisas existentes |
| `cmdk` | Componente de command menu (palette de comandos) |
| `rate-limiter-flexible` | Rate limiting granular por chave/janela com suporte a Redis |

---

## 7. Estrutura de Pastas

```
src/
├── app/                                    # Next.js App Router
│   ├── (public)/                           # Rotas públicas (sem autenticação)
│   │   ├── health-survey/[token]/page.tsx         # Formulário de pesquisa + Consent Gate inline (sem login)
│   │   ├── health-survey/[orgSlug]/[shortCode]/page.tsx  # Pretty URL — alias para /health-survey/[token]
│   │   ├── climate-survey/[token]/page.tsx        # Formulário de clima + Consent Gate (sem login)
│   │   ├── climate-survey/[token]/[shortCode]/page.tsx  # Pretty URL — orgSlug no 1º segmento + shortCode
│   │   ├── climate-survey/link/[linkToken]/page.tsx  # Unlock por telefone/documento
│   │   └── report/[orgSlug]/page.tsx       # Canal de relato anônimo
│   ├── platform-terms/page.tsx             # Termos de Uso — página pública standalone (linked no footer)
│   ├── privacy-policy/page.tsx             # Política de Privacidade — página pública standalone
│   ├── consent-terms/page.tsx             # TCLE dos Colaboradores — página pública standalone
│   ├── learn-more/page.tsx                 # Landing page de apresentação do produto
│   └── data-deletion/page.tsx             # Instruções de exclusão de dados (exigência de plataformas de mensagem)
│   │
│   ├── (auth)/                             # Rotas de autenticação
│   │   ├── login/page.tsx
│   │   ├── logout/actions.ts               # Server Action de logout do tenant
│   │   ├── forgot-password/
│   │   │   ├── page.tsx
│   │   │   ├── forgot-password-form.tsx    # Client Component
│   │   │   └── actions.ts                  # Server Action
│   │   ├── reset-password/[token]/
│   │   │   ├── page.tsx
│   │   │   ├── reset-password-form.tsx     # Client Component
│   │   │   └── actions.ts                  # Server Action
│   │   ├── checkout/
│   │   │   ├── page.tsx                    # Checkout pós-convite (novo admin escolhe plano)
│   │   │   ├── checkout-form.tsx           # Client Component
│   │   │   ├── actions.ts                  # Server Action
│   │   │   └── success/page.tsx            # Confirmação de checkout concluído
│   │   ├── accept-terms/
│   │   │   ├── page.tsx                    # Guard: redireciona se não há termos pendentes
│   │   │   ├── accept-terms-form.tsx       # Client Component
│   │   │   └── actions.ts                  # Server Action (registra IP, user-agent)
│   │   └── layout.tsx                      # Layout centralizado max-w-md
│   │
│   ├── (onboarding)/                       # Primeiro acesso
│   │   └── invite/[token]/page.tsx         # Admin define senha ao aceitar convite
│   │
│   ├── (super-admin-public)/               # Login/Logout do Super Admin (sem sessão)
│   │   └── super-admin/
│   │       ├── login/page.tsx              # Login do Super Admin
│   │       └── logout/actions.ts           # Server Action de logout
│   │
│   ├── (super-admin)/                      # Painel Super Admin SaaS (requer sessão super_admin)
│   │   ├── layout.tsx
│   │   ├── super-admin/
│   │   │   ├── dashboard/page.tsx          # KPIs: orgs ativas, colaboradores, mensagens
│   │   │   ├── organizations/
│   │   │   │   ├── page.tsx                # Lista organizações + botão "Nova organização" + coluna Trial por linha
│   │   │   │   ├── set-trial-modal-button.tsx  # Client Component — modal de gestão de trial por linha da listagem
│   │   │   │   ├── new/
│   │   │   │   │   ├── page.tsx            # RSC — busca planos e renderiza formulário de criação
│   │   │   │   │   ├── create-org-form.tsx # Client Component — form com auto-slug, NativeSelect de plano e timezone
│   │   │   │   │   └── actions.ts          # createOrgByAdminAction — cria org + envia convite de primeiro acesso
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx
│   │   │   │       ├── set-trial-form.tsx  # Client Component — form de trial na página de detalhe
│   │   │   │       ├── actions.ts          # setOrgTrialAction — revalida listagem + detalhe
│   │   │   │       └── billing/page.tsx    # Status de assinatura + override de limite
│   │   │   ├── plans/
│   │   │   │   ├── page.tsx                # Lista planos com funcionalidades inclusas
│   │   │   │   ├── new/page.tsx
│   │   │   │   ├── [id]/pricing/page.tsx   # Gerencia preços (plan_prices) do plano
│   │   │   │   └── [id]/features/page.tsx  # Gerencia funcionalidades do plano (action_plans, documents, etc.)
│   │   │   ├── terms/
│   │   │   │   ├── page.tsx                # Hub: Termos de Uso, Política de Privacidade e TCLE
│   │   │   │   ├── terms-hub.tsx           # Tabs de navegação entre os 3 documentos legais
│   │   │   │   ├── terms-version-list.tsx          # Lista versões de Termos de Uso
│   │   │   │   ├── new-terms-version-form.tsx       # Formulário de nova versão de Termos
│   │   │   │   ├── privacy-policy-version-list.tsx  # Lista versões de Política de Privacidade
│   │   │   │   ├── new-privacy-policy-version-form.tsx
│   │   │   │   ├── actions.ts                       # Server Actions de Termos de Uso
│   │   │   │   └── privacy-policy-actions.ts        # Server Actions de Política de Privacidade
│   │   │   ├── consent-terms/
│   │   │   │   └── page.tsx                # Gerencia versões do TCLE dos colaboradores
│   │   │   ├── admins/page.tsx
│   │   │   ├── jobs/page.tsx               # Monitoramento de filas BullMQ (live + histórico)
│   │   │   └── logs/page.tsx               # Logs de requests HTTP
│   │
│   ├── (tenant)/                           # Painel da empresa (Admin + RH)
│   │   ├── layout.tsx                      # Guard: verifica termos pendentes → /accept-terms
│   │   ├── dashboard/page.tsx
│   │   ├── governance/page.tsx             # Dashboard de governança (macro + roadmap de ondas)
│   │   ├── employees/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   ├── import/page.tsx             # Upload Excel ou CSV
│   │   │   ├── import/preview/page.tsx     # Preview válidos/erros antes de confirmar
│   │   │   └── [id]/page.tsx
│   │   ├── departments/
│   │   ├── health-surveys/
│   │   ├── climate-surveys/                # Feature gate: climate_surveys — Sidebar: Pesquisa de Clima (Board, Adesão, Banco de Perguntas, Disparo & Canais, Plano de Ação)
│   │   │   ├── compare/page.tsx            # Comparativo entre ondas (Onda 1 × Onda 2 / ROI)
│   │   │   └── configure/                  # Banco de Perguntas (importa perguntas de arquivo via IA)
│   │   ├── reports/
│   │   ├── action-plans/
│   │   ├── documents/
│   │   ├── alerts/
│   │   ├── workforce/                      # Indicadores de Pessoas — Headcount, Turnover e Absenteísmo
│   │   │   ├── import/                     # Upload de arquivos + status das importações
│   │   │   └── insights/                   # Cruzamento Workforce × Clima + análise com IA
│   │   ├── pgr/
│   │   ├── settings/
│   │   └── billing/page.tsx               # Admin acessa Stripe Billing Portal
│   │
│   └── api/
│       ├── webhooks/stripe/route.ts        # POST — recebe eventos Stripe (assinado)
│       ├── webhooks/messaging/route.ts     # POST/GET — status de entrega de mensagens (enviado/entregue/lido/falhou)
│       ├── jobs/[job-name]/route.ts        # Manual trigger de jobs (x-cron-secret)
│       ├── auth/logout/route.ts            # GET/POST — logout via rota de API
│       ├── health/route.ts                 # GET — health check do banco de dados
│       ├── documents/[id]/route.ts         # GET — download/acesso a documentos
│       ├── pgr/[id]/pdf/route.ts           # GET — geração de PDF do relatório PGR
│       ├── internal/request-log/route.ts   # POST — recebe logs de request do instrumentation.ts
│       ├── internal/rate-limit-proxy/route.ts  # POST — endpoint de rate-limit chamado pelo proxy (2s timeout)
│       ├── internal/data-ingestion/route.ts    # POST — aciona a ingestão de dados com IA (x-cron-secret)
│       ├── csp-report/route.ts             # POST — recebe violações de CSP (rate-limitado 20/60s por IP)
│       └── super-admin/export/route.ts     # GET — exportação de dados (autenticado como super_admin)
│
├── modules/                                # Módulos de domínio (feature-first)
│   ├── organizations/
│   │   ├── organization.repository.ts
│   │   ├── organization.service.ts
│   │   ├── organization.schema.ts          # Zod schemas
│   │   └── organization.types.ts
│   ├── plans/
│   │   ├── plan.repository.ts
│   │   ├── plan.service.ts
│   │   ├── plan.schema.ts
│   │   └── plan.types.ts
│   ├── auth/
│   │   ├── auth.service.ts                 # login, requestPasswordReset, resetPassword
│   │   ├── auth.schema.ts
│   │   ├── session.ts                      # Leitura/escrita de cookie de sessão JWT
│   │   └── invite.service.ts               # Primeiro acesso + envio de convite
│   ├── employees/
│   │   ├── employee.repository.ts
│   │   ├── employee.service.ts
│   │   ├── employee.schema.ts
│   │   ├── employee.types.ts
│   │   ├── employee-import.service.ts      # Importação via Excel ou CSV (header detection, colunas opcionais de jornada)
│   │   └── employee-import.types.ts
│   ├── departments/
│   ├── consent/
│   │   ├── consent.repository.ts           # Append-only — sem update/delete
│   │   ├── consent.service.ts
│   │   ├── consent.schema.ts
│   │   └── consent.types.ts
│   ├── health-surveys/
│   │   ├── health-survey-dispatch.service.ts      # Agendamento e disparo automático/manual
│   │   └── health-survey-reminder.service.ts      # Lembrete para não-respondentes (runHealthSurveyResponseReminder)
│   ├── climate-surveys/
│   │   ├── climate-survey.repository.ts
│   │   ├── climate-survey-config.service.ts
│   │   ├── climate-survey-topic.repository.ts
│   │   ├── climate-survey-topic.service.ts
│   │   ├── climate-survey-dispatch.service.ts
│   │   ├── climate-survey-response.service.ts
│   │   ├── climate-survey-dashboard.service.ts
│   │   ├── climate-survey-comparison.service.ts   # Comparativo entre ondas (Onda 1 × Onda 2 / ROI)
│   │   ├── climate-survey-import.service.ts       # Extração de perguntas de arquivo existente com IA
│   │   ├── climate-survey-import.schema.ts        # Zod schema da tool save_climate_survey_question
│   │   ├── climate-survey-action-plan.service.ts
│   │   ├── climate-survey-metrics.ts
│   │   ├── climate-survey-adherence.service.ts
│   │   ├── climate-survey-campaign.service.ts
│   │   ├── climate-survey-reminder.service.ts
│   │   ├── climate-survey-anonymity.service.ts
│   │   ├── climate-survey-analytics.service.ts
│   │   ├── climate-survey-analytics.repository.ts
│   │   ├── climate-survey-analytics.types.ts
│   │   └── climate-survey.types.ts
│   ├── anonymous-reports/
│   ├── action-plans/
│   │   ├── action-plan.repository.ts
│   │   ├── action-plan.service.ts
│   │   ├── action-plan.schema.ts
│   │   ├── action-plan.types.ts
│   │   └── suggestions/                   # Sugestões automáticas de plano de ação (job diário)
│   │       ├── action-plan-suggestion.repository.ts
│   │       ├── action-plan-suggestion.service.ts
│   │       └── types.ts                   # ActionPlanSuggestion types
│   ├── documents/
│   ├── alerts/
│   ├── pgr/
│   ├── terms/
│   │   ├── terms.repository.ts             # CRUD de PlatformTermsVersion e PlatformTermsAcceptance
│   │   ├── terms.service.ts                # getPendingTermsForUser, acceptTerms, createNewTermsVersion
│   │   └── terms.types.ts                  # CreateTermsVersionInput, AcceptTermsInput
│   ├── privacy-policy/
│   │   ├── privacy-policy.repository.ts    # CRUD de PrivacyPolicyVersion
│   │   ├── privacy-policy.service.ts       # getActivePrivacyPolicyVersion, createNewPrivacyPolicyVersion
│   │   ├── privacy-policy.schema.ts
│   │   └── privacy-policy.types.ts
│   ├── billing/
│   │   ├── billing.repository.ts           # CRUD de organization_subscriptions
│   │   ├── billing.service.ts              # checkout, webhook, portal
│   │   ├── webhook.handler.ts              # Switch de eventos Stripe → ações internas
│   │   └── billing.types.ts
│   ├── platform-metrics/
│   │   ├── platform-metrics.repository.ts  # Queries agregadas para Super Admin dashboard
│   │   ├── platform-metrics.service.ts
│   │   └── platform-metrics.types.ts
│   ├── dashboard/
│   │   ├── dashboard.repository.ts         # Métricas do painel tenant
│   │   └── dashboard.service.ts
│   ├── data-ingestion/
│   │   ├── data-ingestion.repository.ts      # Lotes de importação + linhas mensais (1 colaborador × 1 competência)
│   │   ├── data-ingestion.service.ts         # Pipeline de 2 passadas de IA (extração + validação) com tool handler
│   │   ├── data-ingestion.schema.ts          # Zod schemas das tools e tipos inferidos
│   │   └── data-ingestion.types.ts
│   ├── workforce/
│   │   ├── workforce.repository.ts           # Leitura dos registros mensais para os indicadores
│   │   ├── workforce.service.ts              # Métricas de Headcount, Turnover e Absenteísmo (por competência/setor)
│   │   ├── workforce-insights.service.ts     # Cruzamento Workforce × Clima + geração de insights com IA
│   │   ├── workforce-insight.repository.ts   # Persistência (replace atômico) dos insights por competência
│   │   ├── workforce-insights.schema.ts      # Zod schema da tool save_workforce_insight
│   │   └── workforce.types.ts
│   ├── governance/
│   │   ├── governance.service.ts            # Dashboard de governança (macro: clima, pessoas, alertas, planos, roadmap)
│   │   └── governance.types.ts
│   ├── job-logs/
│   │   ├── job-log.repository.ts           # INSERT + listagem de logs de jobs
│   │   ├── job-log.service.ts
│   │   └── job-log.types.ts               # InsertJobLogInput, JobLogRow, JobLogFilters
│   ├── queue-status/
│   │   ├── queue-status.service.ts         # Leitura ao vivo das filas BullMQ (contagem, jobs ativos)
│   │   └── queue-status.types.ts          # QueueStatus, LiveJobSummary
│   ├── request-logs/
│   │   ├── request-log.repository.ts       # Append-only — sem update/delete
│   │   ├── request-log.service.ts
│   │   └── request-log.types.ts
│   ├── messaging/
│   │   ├── message-log.repository.ts       # create + update de status por external_id / queue_job_id
│   │   ├── messaging.service.ts            # envio outbound + aplicação de status do webhook
│   │   ├── email-log.repository.ts         # create + open/click tracking de e-mails de pesquisa
│   │   └── survey-email.service.ts         # envio outbound via getEmailService + tracking first-party
│   │   ├── messaging.service.ts            # processOutboundSurveyMessage, applyMessageDeliveryStatus, listDispatchMessageLogs
│   │   └── messaging.service.test.ts
│   └── audit/
│       ├── audit.repository.ts             # Apenas INSERT — sem update/delete
│       └── audit.types.ts
│
├── libs/
│   ├── db/index.ts                         # Prisma client singleton (com PG adapter; em dev recria se o client estiver stale sem delegates novos)
│   ├── logger.ts                           # Logger estruturado (pino) — usado pela app principal
│   ├── local-storage.ts                    # Utilitário SSR-safe para localStorage (ver seção 23)
│   ├── design-system/
│   │   ├── index.ts
│   │   ├── tokens/                         # Design tokens (colors.ts, spacing.ts, typography.ts)
│   │   └── components/
│   │       ├── layout/                     # Sidebar, Header, SuperAdminSidebar, PageHeader
│   │       ├── feedback/                   # Alert, EmptyState, LoadingSpinner
│   │       └── data-display/              # StatCard, DataTable, StatusBadge, SectorHealthBar, KpiBlock
│   ├── integrations/
│   │   ├── messaging/
│   │   │   ├── messaging.interface.ts      # IMessagingService
│   │   │   ├── smsbarato.adapter.ts        # ✅ Implementação SMS Barato (SMS)
│   │   │   ├── smsbarato-wa.adapter.ts     # ✅ Implementação SMS Barato (WhatsApp — template)
│   │   │   └── console-message.adapter.ts  # Desenvolvimento local
│   │   ├── email/
│   │   │   ├── email.interface.ts          # IEmailService
│   │   │   ├── resend.adapter.ts           # ✅ Implementação atual
│   │   │   └── console-email.adapter.ts    # Desenvolvimento local (imprime HTML completo)
│   │   ├── storage/
│   │   │   ├── storage.interface.ts        # IStorageService
│   │   │   ├── s3.adapter.ts               # ✅ Implementação S3 (AWS)
│   │   │   └── console-storage.adapter.ts  # Desenvolvimento local (persiste em tmpdir, legível entre processos)
│   │   ├── pdf/
│   │   │   ├── pdf.interface.ts            # IPDFService — interface genérica (não usada pelo PGR)
│   │   │   ├── pgr-pdf.adapter.tsx         # ✅ Implementação @react-pdf/renderer — gera PDF PGR
│   │   │   └── pgr-pdf.types.ts            # Tipos próprios de input do PDF (PgrPdfInput, etc.)
│   │   ├── billing/
│   │   │   ├── billing.interface.ts        # IBillingService
│   │   │   └── stripe.adapter.ts           # ✅ Implementação atual
│   │   ├── rate-limiter/
│   │   │   ├── rate-limiter.interface.ts   # IRateLimiterService
│   │   │   ├── redis-rate-limiter.adapter.ts  # ✅ Produção (rate-limiter-flexible + ioredis)
│   │   │   ├── in-memory-rate-limiter.adapter.ts  # Testes/dev sem Redis
│   │   │   └── redis-client.ts             # getRedisClient() — factory lazy que cria o ioredis singleton apenas na primeira chamada (evita conexões prematuras na inicialização do módulo; pino logging, isTest guard, reconexão)
│   │   ├── ai/
│   │   │   ├── ai.interface.ts             # IAIService (generate com suporte a tool-calling)
│   │   │   ├── openai.adapter.ts           # ✅ Implementação OpenAI (fetch, sem SDK)
│   │   │   ├── claude.adapter.ts           # ✅ Implementação Anthropic/Claude (fetch, sem SDK)
│   │   │   ├── gemini.adapter.ts           # ✅ Implementação Google Gemini (fetch, sem SDK)
│   │   │   └── console-ai.adapter.ts       # Desenvolvimento local (no-op)
│   │   └── index.ts                        # Factories: getEmailService(), getBillingService(), getRateLimiterService(), getAIService()…
│   ├── email-templates/
│   │   ├── index.ts                        # getTemplate(name, vars) → { subject, Component }
│   │   ├── org-invite.tsx
│   │   ├── password-reset.tsx
│   │   ├── plan-subscribed.tsx
│   │   ├── payment-failed.tsx
│   │   └── plan-cancelled.tsx
│   ├── auth/
│   │   └── permissions.ts                 # isOrgAdmin, isOrgRh, assertOrgAdmin, assertOrgMember
│   ├── errors/
│   │   └── app-error.ts                   # AppError e isAppError — erros de domínio esperados
│   ├── rate-limit.ts                       # Helpers para rate limiting em Server Actions: enforceRateLimit, checkRateLimit, getClientIp
│   └── utils/
│       ├── action-result.ts               # ActionResult interface
│       ├── anonymity.ts                   # MINIMUM_RESPONDENTS_FOR_DISPLAY (health, env HEALTH_SURVEY_MINIMUM_RESPONDENTS_FOR_DISPLAY, padrão 5) + clima por percentual: CLIMATE_SURVEY_MIN_RESPONDENTS_FLOOR=3, climateSurveyRequiredRespondents(), canRevealClimateSurveyGroupResults()
│       ├── client-ip.ts                   # extractClientIp(headers) — cf-connecting-ip → x-real-ip → x-forwarded-for
│       ├── cn.ts                          # cn(...inputs) = twMerge(clsx(inputs))
│       ├── json.ts                        # JsonValue — tipo JSON próprio da aplicação (não usa Prisma)
│       ├── phone.ts                       # normalizePhoneToE164(raw) — normaliza número brasileiro para E.164
│       ├── sanitize.ts                    # sanitizeRichHtml (editor) + sanitizeLegalDocument (docs oficiais)
│       ├── pagination.ts
│       ├── date.ts
│       └── slug.ts
│
├── components/
│   ├── ui/                                 # shadcn/ui (Button, Input, Select, Dialog, Table…)
│   │                                       # Instalados em src/components/ui/ pelo CLI do shadcn
│   ├── theme-provider.tsx                  # ThemeProvider — mantém estado do tema, escreve cookie + localStorage
│   ├── theme-toggle.tsx                    # ThemeToggle — CSS-only (ambos ícones no DOM, dark:scale-* controla visibilidade)
│   ├── animate-in.tsx                      # Wrapper de animação de entrada via IntersectionObserver
│   ├── confirm-action-modal.tsx            # Modal de confirmação genérico (variant: destructive | warning)
│   ├── confirm-delete-modal.tsx            # Wrapper sobre ConfirmActionModal para exclusões simples
│   ├── phone-input.tsx                     # Input de telefone com máscara (react-imask)
│   ├── alert-type-info.tsx                 # Tooltip com informações sobre tipos de alerta
│   ├── page-help.tsx                       # Tooltip genérico de ajuda em páginas
│   ├── danger-zone.tsx                     # Padrão de zona de perigo (collapsible) para ações destrutivas
│   ├── chart-card.tsx                      # Card wrapper para gráficos recharts
│   ├── score-segment-tooltip.tsx           # Tooltip de segmentos de score (gráfico de distribuição)
│   └── edit-name-modal.tsx                 # Modal de edição inline de nome
├── proxy.ts                                # Next.js 16 proxy (auth + tenant resolution + rate limiting por IP + CSP)
│                                           # ⚠️ Não é middleware.ts — Next.js 16 usa proxy.ts
│                                           # Rate limiting: /login (20/15min) · /forgot-password (5/15min) · /super-admin/login (10/15min)
│                                           # Fail-closed: bloqueia com 429 se Redis indisponível
├── instrumentation.ts                      # Next.js instrumentation hook — captura erros e envia para /api/internal/request-log
├── env.ts                                  # Variáveis de ambiente tipadas (@t3-oss/env-nextjs + Zod)
├── lib/
│   └── utils.ts                            # Utilitário `cn()` do shadcn/ui (classnames + tailwind-merge)
└── workers/
    ├── job-worker.ts                       # Worker BullMQ — consome e executa todos os jobs
    └── register-schedules.ts              # Script de setup — registra schedules recorrentes no Redis

prisma/
├── schema.prisma                           # Schema do banco — fonte única de verdade
└── migrations/                             # Migrations SQL commitadas no repositório
```

---

## 8. Schema do Banco de Dados

### Convenções de nomenclatura

| Elemento | Convenção | Exemplo |
|---|---|---|
| Nomes de tabela | snake_case, plural | `organization_users` |
| Nomes de coluna | snake_case | `created_at`, `tenant_id` |
| Chaves primárias | `id` UUID | `gen_random_uuid()` |
| Chaves estrangeiras | `{tabela_singular}_id` | `department_id` |
| Timestamps | `created_at`, `updated_at` | `timestamptz NOT NULL` |
| Exclusão lógica | `deleted_at` | `timestamptz NULL` |
| Tenant isolation | `tenant_id` | FK → `organizations.id` |

### Nomes de relações Prisma — regra obrigatória

**Todo `@relation` com nome explícito deve usar o nome completo e único da relação, nunca abreviações genéricas.**

O motivo: um mesmo modelo pode participar de múltiplas relações com tabelas diferentes. Um nome genérico como `"SuggestionDismisser"` torna-se ambíguo quando existem outros tipos de sugestão ou outros fluxos no futuro.

```prisma
// ❌ PROIBIDO — nome genérico que pode colidir com outras relações futuras
dismisser       OrganizationUser? @relation("SuggestionDismisser", ...)
dismissedSuggestions ActionPlanSuggestion[] @relation("SuggestionDismisser")

// ✅ CORRETO — nome completo identifica inequivocamente o par de tabelas e o papel
dismisser       OrganizationUser? @relation("ActionPlanSuggestionDismisser", ...)
dismissedActionPlanSuggestions ActionPlanSuggestion[] @relation("ActionPlanSuggestionDismisser")
```

**Padrão de nomenclatura para `@relation`:**

```
"{ModeloOrigem}{PapelNaRelação}"
```

Exemplos:
- `"ActionPlanSuggestionDismisser"` — OrganizationUser que descartou uma ActionPlanSuggestion
- `"PgrReviewRegistrar"` — OrganizationUser que registrou uma PgrReview
- `"DocumentCreator"` — OrganizationUser que criou um Document

Campos da relação inversa no modelo pai devem também usar o nome completo:

```prisma
// Em OrganizationUser
dismissedActionPlanSuggestions ActionPlanSuggestion[] @relation("ActionPlanSuggestionDismisser")
```



#### `plans`

Template de plano. Alterações aqui **não afetam** assinaturas existentes — condições vigentes ficam no snapshot de `organization_subscriptions`.

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| name | varchar(100) | NOT NULL |
| description | text | |
| max_employees | integer | NULL = ilimitado |
| is_active | boolean | NOT NULL, default true |
| external_product_id | varchar(255) | UNIQUE — ID do Product no Stripe |
| deleted_at | timestamptz | NULL = ativo; NOT NULL = soft-deleted (não aparece em novas assinaturas) |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

> **Soft-delete de planos:** ao excluir um plano via Super Admin, o campo `deleted_at` é preenchido. O plano some da listagem e não pode ser mais assinado, mas todas as assinaturas existentes continuam funcionando normalmente (referenciam `plan_prices`, não `plans` diretamente).

#### `plan_prices`

Cada plano pode ter múltiplas variantes (mensal, anual). Preços antigos nunca são deletados — assinaturas existentes os referenciam.

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| plan_id | uuid | NOT NULL, FK → plans.id |
| external_price_id | varchar(255) | UNIQUE — ID do Price no Stripe |
| interval | varchar(10) | NOT NULL — `'month'` \| `'year'` |
| price_in_cents | integer | NOT NULL |
| is_active | boolean | NOT NULL, default true |
| created_at | timestamptz | NOT NULL |

> Quando o Super Admin atualiza um preço, é criado **novo `plan_prices`** e o anterior é desativado. O Stripe não permite editar `unit_amount` — um novo Price é criado no Stripe também.

#### `plan_features`

Funcionalidades incluídas em cada plano. Append por transação — ao atualizar features do plano, todas as linhas antigas são deletadas e as novas inseridas atomicamente.

| Coluna | Tipo | Constraints |
|---|---|---|
| plan_id | uuid | NOT NULL, FK → plans.id ON DELETE CASCADE |
| feature | varchar(30) | NOT NULL — `'action_plans'` \| `'documents'` \| `'anonymous_reports'` \| `'pgr'` \| `'messaging'` \| `'climate_surveys'` |
| PK | (plan_id, feature) | |

> Alterar `plan_features` **não afeta** clientes que já assinaram — as features vigentes ficam em `subscription_features`, que é atualizado apenas quando o cliente faz upgrade/downgrade de plano via Stripe.

#### `subscription_features`

Snapshot imutável das funcionalidades no momento da contratação. Mesmo princípio de `organization_subscriptions` para os demais campos do plano.

| Coluna | Tipo | Constraints |
|---|---|---|
| subscription_id | uuid | NOT NULL, FK → organization_subscriptions.id ON DELETE CASCADE |
| feature | varchar(30) | NOT NULL — mesmos valores de `plan_features` (inclui `'messaging'` e `'climate_surveys'`) |
| PK | (subscription_id, feature) | |

> Inserido na criação da assinatura e atualizado quando o cliente troca de plano (webhook `customer.subscription.updated`). Garante que as features refletem o plano **atualmente vigente** — não o plano original de contratação. Alterações feitas pelo Super Admin em `plan_features` de um plano **não afetam** assinantes existentes; apenas a troca de plano pelo cliente atualiza este snapshot.

**Como checar se um tenant tem acesso a uma feature:**

```typescript
import { hasTenantPlanFeature } from "@/modules/billing/billing.service"

const canSeePgr = await hasTenantPlanFeature(tenantId, "pgr")
if (!canSeePgr) return
```

**Regra para jobs com alerts de feature específica:**  
Antes de criar alertas relacionados a uma funcionalidade (ex: `pgr_review_due`), o job deve verificar `hasTenantPlanFeature(tenantId, feature)`. Se o tenant não tem a feature → pular.

#### `super_admins`

Mapeado em banco como `super_admins`. Modelo Prisma: `SuperAdmin`.

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| email | varchar(255) | NOT NULL, UNIQUE |
| password_hash | varchar(255) | NOT NULL |
| name | varchar(255) | NOT NULL |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

#### `platform_terms_versions`

Versões dos Termos de Uso da plataforma Pulse. Quando uma nova versão é publicada, todos os admins de organizações devem aceitar novamente.

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| version | varchar(20) | NOT NULL, UNIQUE |
| title | varchar(255) | NOT NULL |
| content | text | NOT NULL — HTML completo dos termos |
| is_active | boolean | NOT NULL, default true |
| effective_at | timestamptz | NOT NULL |
| created_at | timestamptz | NOT NULL |

#### `platform_terms_acceptances`

Registro imutável de cada aceite de termos por usuário admin de organização.

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| terms_version_id | uuid | NOT NULL, FK → platform_terms_versions.id |
| user_id | uuid | NOT NULL, FK → organization_users.id |
| accepted_at | timestamptz | NOT NULL |
| ip_address | varchar(45) | NULL — registrado quando disponível |
| user_agent | text | NULL — registrado quando disponível |
| created_at | timestamptz | NOT NULL |

#### `consent_term_versions`

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| version | varchar(20) | NOT NULL, UNIQUE |
| content | text | NOT NULL |
| content_hash | varchar(255) | NOT NULL — SHA-256 do conteúdo (prova de qual texto foi aceito) |
| is_active | boolean | NOT NULL, default false — apenas uma versão com `is_active = true` por vez |
| created_at | timestamptz | NOT NULL |

#### `privacy_policy_versions`

Versões da Política de Privacidade da plataforma Pulse. Exibida publicamente em `/privacy-policy` e gerenciada pelo Super Admin no hub de documentos legais.

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| version | varchar(20) | NOT NULL, UNIQUE |
| title | varchar(255) | NOT NULL |
| content | text | NOT NULL — HTML completo da política |
| is_active | boolean | NOT NULL, default false |
| effective_at | timestamptz | NOT NULL |
| created_at | timestamptz | NOT NULL |

> Diferente dos `platform_terms_versions`, a política de privacidade **não exige aceite explícito** dos usuários — é um documento informativo público. Apenas uma versão deve ter `is_active = true` por vez.

---

### Tabelas com `tenant_id`

Todas têm `tenant_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE`.

#### `organizations`

O tenant. `id` é o `tenant_id` de todas as demais tabelas.

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| slug | varchar(100) | NOT NULL, UNIQUE |
| name | varchar(255) | NOT NULL |
| timezone | varchar(50) | NOT NULL, default `'America/Sao_Paulo'` |
| external_customer_id | varchar(255) | UNIQUE — ID do customer no provedor de billing |
| billing_status | varchar(20) | `'pending'` \| `'active'` \| `'past_due'` \| `'suspended'` \| `'cancelled'` |
| max_employees_override | integer | NULL = usa limite do plano |
| climate_survey_min_respondents_percent | integer | NOT NULL, default 40 — percentual mínimo de participação (sobre destinatários) para exibir resultados de Pesquisa de Clima; piso absoluto de 3 respondentes; configurável pelo admin no Dashboard de Pesquisa de Clima (`/climate-surveys`, botão "Configurações") |
| trial_expires_at | timestamptz | NULL = sem trial ativo; NOT NULL = trial ativo até essa data (bypass do billing wall) |
| deletion_scheduled_at | timestamptz | NULL = sem exclusão agendada; NOT NULL = exclusão permanente pendente |
| is_active | boolean | NOT NULL, default true |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

> Limite efetivo de colaboradores: `COALESCE(organizations.max_employees_override, subscription.snapshot_max_employees)`.

#### `organization_users`

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL, FK → organizations.id |
| email | varchar(255) | NOT NULL |
| password_hash | varchar(255) | NOT NULL |
| name | varchar(255) | NOT NULL |
| role | varchar(20) | `'admin'` \| `'rh'` |
| email_verified_at | timestamptz | NULL = não verificado |
| is_active | boolean | NOT NULL, default true |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |
| UNIQUE | (tenant_id, email) | |

#### `organization_subscriptions`

Snapshot imutável das condições do plano no momento da contratação. Alterações futuras em `plans` ou `plan_prices` **não afetam** este registro.

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL, FK → organizations.id |
| plan_id | uuid | NOT NULL, FK → plans.id |
| external_subscription_id | varchar(255) | NOT NULL, UNIQUE — ID da assinatura no provedor de billing |
| status | varchar(20) | `'trialing'` \| `'active'` \| `'past_due'` \| `'unpaid'` \| `'cancelled'` |
| current_period_start | timestamptz | NOT NULL |
| current_period_end | timestamptz | NOT NULL |
| cancel_at_period_end | boolean | NOT NULL, default false — assinatura encerra ao fim do período atual |
| snapshot_plan_name | varchar(100) | NOT NULL |
| snapshot_max_employees | integer | NULL = ilimitado |
| snapshot_price_in_cents | integer | NOT NULL |
| snapshot_interval | varchar(10) | NOT NULL |
| snapshot_external_price_id | varchar(255) | NOT NULL |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

#### `billing_webhook_events`

Garante processamento idempotente. Antes de processar qualquer evento, verifica se `external_event_id` já existe.

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | FK → organizations.id — NULL para eventos não vinculados a tenant específico |
| external_event_id | varchar(255) | NOT NULL, UNIQUE — ID do evento no provedor de billing |
| type | varchar(100) | NOT NULL |
| processed_at | timestamptz | NULL = ainda não processado |
| error | text | |
| payload | jsonb | NOT NULL |
| created_at | timestamptz | NOT NULL |

#### `auth_tokens`

Tokens de uso único para reset de senha e fluxos de autenticação stateless. Suporta apenas usuários de organização (`organization_users`).

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | NOT NULL, FK → organization_users.id |
| type | varchar(30) | `'password_reset'` \| `'email_verification'` \| `'account_deletion'` |
| token | varchar(255) | NOT NULL, UNIQUE |
| used_at | timestamptz | |
| expires_at | timestamptz | NOT NULL |
| created_at | timestamptz | NOT NULL |

#### `organization_invitations`

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL, FK → organizations.id |
| email | varchar(255) | NOT NULL |
| role | varchar(20) | NOT NULL — `'admin'` \| `'rh'` |
| token | varchar(255) | NOT NULL, UNIQUE |
| expires_at | timestamptz | NOT NULL |
| accepted_at | timestamptz | |
| created_at | timestamptz | NOT NULL |

#### `departments`

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL, FK → organizations.id |
| name | varchar(255) | NOT NULL |
| is_active | boolean | NOT NULL, default true |
| work_start_time | varchar(5) | `"HH:MM"` — início do expediente padrão (default `"09:00"`) |
| work_end_time | varchar(5) | `"HH:MM"` — fim do expediente padrão (default `"18:00"`) |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

Dias de trabalho do departamento em `department_work_days` (join table — ver abaixo). Padrão: Segunda a Sexta (`[1,2,3,4,5]`).

**Índice:** `(tenant_id, is_active)`

#### `employees`

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL |
| department_id | uuid | NOT NULL, FK → departments.id |
| name | varchar(255) | NOT NULL |
| email | varchar(255) | |
| phone | varchar(20) | NOT NULL |
| document | varchar(50) | NULL — número do documento do colaborador (opcional); usado para identificação no link assinado |
| work_start_time | varchar(5) | `"HH:MM"` — horário de início do turno (ex: `"09:00"`). NULL = usa horário do setor |
| work_end_time | varchar(5) | `"HH:MM"` — horário de fim do turno. NULL = usa horário do setor |
| status | varchar(20) | `'active'` \| `'inactive'` \| `'paused'` |
| pause_start_at | date | |
| pause_end_at | date | |
| deleted_at | timestamptz | NULL = ativo; NOT NULL = soft-deleted (excluído da UI e de novos dispatches) |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

> `work_start_time` e `work_end_time` do colaborador sobrepõem os valores do departamento quando preenchidos (cadeia: `employee → department`). Dias de trabalho opcionais em `employee_work_days` (join table — ver abaixo); quando vazio, herda de `department_work_days`. Todos avaliados no `organizations.timezone` no momento do dispatch.

#### `employee_consents`

**Tabela append-only — nenhuma linha é jamais atualizada ou deletada.** O estado atual do colaborador é determinado pelo registro mais recente (`ORDER BY created_at DESC LIMIT 1`).

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL |
| employee_id | uuid | NOT NULL, FK → employees.id |
| consent_term_version_id | uuid | NOT NULL, FK → consent_term_versions.id |
| event | varchar(20) | `'accepted'` \| `'refused'` \| `'revoked'` \| `'opted_out'` |
| source | varchar(20) | `'message_link'` \| `'health_survey_form'` \| `'climate_survey_form'` \| `'system'` |
| document_hash | varchar(255) | SHA-256 do documento (ex: CPF) — apenas no evento `accepted` |
| created_at | timestamptz | NOT NULL |

> Documento nunca armazenado em texto puro. `ConsentRepository` não expõe `update()` nem `delete()`.

#### `health_survey_configurations`

Uma configuração pode cobrir **N setores** via join table `health_survey_config_departments`. Cada configuração é identificada por nome e descrição opcionais.

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL |
| name | varchar(255) | NOT NULL, default `'Pesquisa de Saúde'` — nome de identificação da configuração |
| description | text | NULL — descrição opcional |
| frequency | varchar(20) | `'daily'` \| `'twice_weekly'` \| `'weekly'` \| `'biweekly'` \| `'monthly'` |
| scheduled_day_of_month | integer | NULL — dia do mês (1–28) para frequência `'monthly'`; quando NULL e frequência mensal, usa intervalo de 28 dias |
| dispatch_time | varchar(5) | NOT NULL, default `'09:00'` — `"HH:MM"` — horário exato em que a pesquisa será disparada |
| respect_employee_schedule | boolean | NOT NULL, default false — quando `true`, as mensagens são enviadas no início do turno de cada colaborador (com delay BullMQ), em vez de todas ao mesmo tempo no `dispatch_time` |
| token_expiry_hours | integer | NOT NULL, default 48 — tempo em horas que o token de resposta permanece válido após o disparo (ou após `scheduledSendAt` quando `respectEmployeeSchedule = true`). Mínimo: 1, máximo: 1000 |
| is_active | boolean | NOT NULL |
| INDEX | (tenant_id) | |

Dias de trabalho da pesquisa em `health_survey_config_work_days` (join table — ver abaixo). Armazenados como `day_of_week INT` (0=Dom … 6=Sáb).

> `dispatch_time` define o horário exato de disparo da pesquisa (avaliado no fuso da organização). O scheduler dispara quando o horário atual está dentro de uma janela de 60 minutos a partir de `dispatch_time` (ex: `dispatchTime = "09:00"` → dispara entre 09:00 e 09:59). A janela de 60 minutos garante que um restart ou deploy do worker não cause perda do disparo — o `lastDispatchedAt` protege contra double-dispatch dentro da mesma janela. **Horários de expediente pertencem ao setor e ao colaborador — não à configuração de pesquisa.** Cadeia de herança de horário de expediente para snapshot do token: `employee.workStartTime/workEndTime → department.workStartTime/workEndTime`. Para dias de trabalho por funcionário: `employee_work_days` (se não vazio) → `department_work_days`. Todos avaliados no `organizations.timezone`.

> **`respect_employee_schedule`:** quando `true`, o filtro de dia de trabalho no momento do disparo é desabilitado — todos os colaboradores elegíveis são incluídos independentemente do dia de hoje. Para cada colaborador, `buildEmployeeDispatchScheduleMap` calcula o próximo dia útil (dentro de 7 dias) e o horário de início do turno, e o job de mensagem BullMQ recebe `opts.delay` correspondente ao milissegundos até esse momento. O `expiresAt` do token é calculado como `scheduledSendAt + tokenExpiryHours` (em vez de `now + tokenExpiryHours`). Colaboradores sem dia útil configurado nos próximos 7 dias não recebem token nem mensagem naquele ciclo, mas ainda são contados em `total_recipients`.

> **Frequência mensal com `scheduled_day_of_month`:** quando preenchido, o scheduler dispara apenas no dia exato do mês (avaliado no fuso da organização) e impede reenvio se o último disparo foi há menos de 25 dias. Dias 29–31 são excluídos da UI — o valor máximo é 28 para garantir compatibilidade com fevereiro.

> Não existe mais `send_days` (jsonb) nem `send_time` (time) separados — o disparo ocorre automaticamente pelo scheduler ao detectar que estamos no horário configurado (`dispatch_time`).

#### `health_survey_config_departments`

Join table que associa uma configuração a um ou mais setores. Uma configuração cobre todos os setores listados aqui.

| Coluna | Tipo | Constraints |
|---|---|---|
| config_id | uuid | NOT NULL, FK → health_survey_configurations.id ON DELETE CASCADE |
| department_id | uuid | NOT NULL, FK → departments.id ON DELETE CASCADE |
| PK | (config_id, department_id) | |

> **Mudança de modelo:** a arquitetura anterior tinha `department_id` diretamente em `health_survey_configurations` (1 config por setor). A arquitetura atual usa esta join table para permitir que 1 configuração cubra N setores, reduzindo duplicação de perguntas e simplificando o gerenciamento.

#### `department_work_days`

Tabela de dias de trabalho do departamento. Relacionamento N:1 com `departments`.

| Coluna | Tipo | Constraints |
|---|---|---|
| department_id | uuid | NOT NULL, FK → departments.id ON DELETE CASCADE |
| day_of_week | integer | NOT NULL — 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb |
| PK | (department_id, day_of_week) | |

#### `employee_work_days`

Dias de trabalho específicos de um colaborador. Quando presente, sobrepõe `department_work_days` para esse colaborador. Quando ausente, o colaborador herda os dias do departamento.

| Coluna | Tipo | Constraints |
|---|---|---|
| employee_id | uuid | NOT NULL, FK → employees.id ON DELETE CASCADE |
| day_of_week | integer | NOT NULL — 0=Dom … 6=Sáb |
| PK | (employee_id, day_of_week) | |

#### `health_survey_config_work_days`

Dias de trabalho configurados para uma pesquisa. Define em quais dias o scheduler dispara essa configuração.

| Coluna | Tipo | Constraints |
|---|---|---|
| config_id | uuid | NOT NULL, FK → health_survey_configurations.id ON DELETE CASCADE |
| day_of_week | integer | NOT NULL — 0=Dom … 6=Sáb |
| PK | (config_id, day_of_week) | |

#### `health_survey_questions`

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL |
| health_survey_configuration_id | uuid | NOT NULL, FK → health_survey_configurations.id ON DELETE CASCADE |
| text | text | NOT NULL |
| order | integer | NOT NULL, default 0 |
| score_direction | varchar(30) | NOT NULL — `'higher_is_better'` \| `'lower_is_better'` (afeta cálculo de score) |
| is_active | boolean | NOT NULL, default true |

**Índice:** `(tenant_id, health_survey_configuration_id)` — queries frequentes de perguntas por configuração

#### `health_survey_dispatches`

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL |
| health_survey_configuration_id | uuid | NOT NULL, FK → health_survey_configurations.id |
| scheduled_at | timestamptz | NOT NULL |
| dispatched_at | timestamptz | NULL = ainda não disparado |
| adherence_checked_at | timestamptz | NULL = ainda não verificado |
| status | varchar(20) | `'scheduled'` \| `'available'` \| `'failed'` \| `'cancelled'` |
| source | varchar(10) | NOT NULL, default `'auto'` — `'auto'` \| `'manual'` |
| signed_link_token | varchar(255) | NOT NULL, UNIQUE — token do link assinado público (`/health-survey/link/[token]`) |
| created_at | timestamptz | NOT NULL |

**Índice:** `(tenant_id, health_survey_configuration_id, scheduled_at DESC)`

**Dois tipos de dispatch:**
- `source: 'auto'` — criado pelo auto-scheduler; usado no cálculo de `lastDispatchedAt` para evitar duplo-disparo semanal
- `source: 'manual'` — criado pelo RH via botão "Agendar"; **não** conta para o cooldown do auto-scheduler, garantindo que o auto-scheduler dispare normalmente no próximo horário configurado

> Totais de recipientes e respostas **não ficam** nesta tabela — estão em `health_survey_dept_dispatches` (por setor). Para obter os totais do dispatch inteiro, some os valores de `health_survey_dept_dispatches` para aquele `dispatch_id`.

#### `health_survey_dept_dispatches`

Rastreia totais de recipientes e respostas **por setor** dentro de um dispatch. Criada/atualizada por `upsertHealthSurveyDeptDispatch` durante o processo de disparo.

| Coluna | Tipo | Constraints |
|---|---|---|
| dispatch_id | uuid | NOT NULL, FK → health_survey_dispatches.id ON DELETE CASCADE |
| department_id | uuid | NOT NULL, FK → departments.id |
| total_recipients | integer | NOT NULL, default 0 |
| total_responses | integer | NOT NULL, default 0 |
| PK | (dispatch_id, department_id) | |

> **Por que por setor?** Uma configuração agora cobre N setores. Rastrear os totais por setor permite calcular a taxa de adesão por setor sem cruzar dados de respondentes anônimos.

#### `health_survey_response_tokens`

Token de uso único por colaborador/dispatch com snapshot do horário de trabalho. **Duas camadas de proteção contra fraude:**
1. **Expiração em 48h** — link inativo após 2 dias do disparo
2. **Janela de horário de trabalho** — válido apenas dentro do `work_start_time`–`work_end_time`, avaliado no fuso da organização. Mudanças posteriores na configuração do setor não afetam tokens já emitidos.

Após o uso, `used_at` é preenchido, mas **nenhum vínculo** é criado entre token/employee e a resposta.

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL |
| dispatch_id | uuid | NOT NULL, FK → health_survey_dispatches.id |
| employee_id | uuid | NOT NULL, FK → employees.id |
| token | varchar(255) | NOT NULL, UNIQUE |
| short_code | varchar(7) | NULL, UNIQUE per `(tenant_id, short_code)` — código de 7 dígitos usado na pretty URL `/health-survey/[orgSlug]/[shortCode]`. Gerado apenas para tokens criados via disparo de mensagem; NULL para tokens criados via link assinado. |
| used_at | timestamptz | |
| expires_at | timestamptz | NOT NULL — `dispatched_at + tokenExpiryHours` (valor de `health_survey_configurations.token_expiry_hours`, padrão 48h) |
| work_start_time | varchar(5) | NOT NULL — snapshot `"HH:MM"` no momento do disparo |
| work_end_time | varchar(5) | NOT NULL — snapshot `"HH:MM"` no momento do disparo |
| created_at | timestamptz | NOT NULL |

#### `health_survey_responses`

**Sem `employee_id`** — desvinculamento garante anonimato completo. O desvinculamento ocorre no momento do uso do token.

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL |
| dispatch_id | uuid | NOT NULL, FK → health_survey_dispatches.id |
| department_id | uuid | NULL, FK → departments.id — setor do respondente no momento da resposta (preenchido a partir de `employee.departmentId` via token, sem identificar o respondente) |
| created_at | timestamptz | NOT NULL |

> `department_id` é populado no momento da resposta a partir do setor do colaborador vinculado ao token. Mesmo sendo nulo (respostas via link assinado sem identificação prévia), o anonimato é preservado — não há vínculo entre `department_id` e o colaborador específico.

#### `health_survey_response_items`

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| health_survey_response_id | uuid | NOT NULL, FK → health_survey_responses.id ON DELETE CASCADE |
| question_id | uuid | NOT NULL, FK → health_survey_questions.id |
| score | smallint | NOT NULL, CHECK (score BETWEEN 1 AND 5) |

#### `climate_survey_configurations`

Configuração de Pesquisa de Clima Organizacional — módulo paralelo às pesquisas de saúde. Feature de plano: `climate_surveys`.

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL |
| name | varchar | NOT NULL, default `'Pesquisa de Clima'` |
| description | text | NULL |
| frequency | varchar(20) | `'daily'` \| `'twice_weekly'` \| `'weekly'` \| `'biweekly'` \| `'monthly'` |
| scheduled_day_of_month | integer | NULL — dia do mês (1–28) para frequência `'monthly'` |
| dispatch_time | varchar(5) | NOT NULL, default `'09:00'` |
| respect_employee_schedule | boolean | NOT NULL, default false |
| token_expiry_hours | integer | NOT NULL, default 48 |
| send_via_messaging | boolean | NOT NULL, default true — canal de mensagem (exige também feature `messaging`) |
| send_via_signed_link | boolean | NOT NULL, default true — gera `signed_link_token` na onda |
| is_active | boolean | NOT NULL |
| INDEX | (tenant_id) | |
| created_at / updated_at | timestamptz | NOT NULL |

Join tables: `climate_survey_config_departments`, `climate_survey_config_work_days` (mesmo padrão das health surveys).

> **Mapeamento vs modelo conceitual `clima_*`:** não existem tabelas com nomes em português. Equivalências: `clima_surveys` → `climate_survey_configurations` (`name`, `is_active`≈status, `frequency`≈recorrência; sem `created_by` / `data_inicio` / `data_fim` dedicados — a janela da onda fica em `climate_survey_dispatches.scheduled_at` / `dispatched_at`). `clima_topics` → tabela `climate_survey_topics` (catálogo por tenant: 8 tópicos de sistema + customizados; `climate_survey_questions.dimension` referencia `key`). `clima_questions` + `clima_survey_questions` → `climate_survey_questions` (1:N na config, com `order`; sem join M:N reutilizável). `clima_campaigns` → `climate_survey_dispatches` (canais na **config**, não por onda). `clima_recipients` → `climate_survey_response_tokens` (`employee_id`, `token`, `used_at`; status de envio em `message_logs` / `email_logs`). `clima_answers` → `climate_survey_responses` + `climate_survey_response_items` (**sem `token` nem `employee_id` nas respostas** — anonimato). `clima_action_plans` → `action_plans` com `climate_survey_dispatch_id` (sem `topic_id` / `responsavel_id` no plano; responsável fica em `action_tasks.assignee_id`).

#### `climate_survey_questions`

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL |
| climate_survey_configuration_id | uuid | NOT NULL, FK → climate_survey_configurations.id ON DELETE CASCADE |
| text | text | NOT NULL |
| order | integer | NOT NULL |
| score_direction | varchar(30) | `'higher_is_better'` \| `'lower_is_better'` |
| dimension | varchar | NOT NULL, default `'organizational_culture'` — chave do tópico (`climate_survey_topics.key`); os 8 tópicos de sistema são `'job_satisfaction'` \| `'internal_communication'` \| `'relationships'` \| `'recognition_reward'` \| `'professional_development'` \| `'work_life_balance'` \| `'organizational_culture'` \| `'leadership_trust'`; tópicos customizados criados pelo RH também são válidos |
| is_active | boolean | NOT NULL, default true |

**Índices:** `(tenant_id)`, `(tenant_id, climate_survey_configuration_id)`, `(dimension)`

#### `climate_survey_topics`

Catálogo de tópicos (dimensões) por tenant. Os 8 tópicos de sistema (`is_system = true`) são criados de forma lazy por tenant via `ensureClimateSurveySystemTopics` — sem seed em migration. Tópicos customizados (`is_system = false`) podem ser criados/renomeados/desativados pelo RH; tópicos de sistema não podem ser editados nem excluídos. `climate_survey_questions.dimension` referencia `key`.

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL, FK → organizations.id ON DELETE CASCADE |
| key | varchar(60) | NOT NULL — slug do tópico (ex: `'seguranca-psicologica'`) |
| label | varchar(100) | NOT NULL — nome exibido |
| is_system | boolean | NOT NULL, default false — tópico padrão protegido |
| is_active | boolean | NOT NULL, default true |
| sort_order | integer | NOT NULL, default 0 |
| created_at / updated_at | timestamptz | NOT NULL |

**Índices:** `(tenant_id)`, UNIQUE `(tenant_id, key)`

> O `dimension` de perguntas, métricas, dashboards (radar/heatmap), planos de ação e formulário público resolve o label pelo catálogo do tenant (`resolveClimateSurveyTopicLabel`), com fallback para os labels de sistema. Tópicos customizados aparecem no radar e no heatmap da onda em que foram usados.

#### `climate_survey_dispatches`

Onda de pesquisa de clima. Espelha `health_survey_dispatches`.

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL |
| climate_survey_configuration_id | uuid | NOT NULL |
| scheduled_at | timestamptz | NOT NULL |
| dispatched_at | timestamptz | |
| adherence_checked_at | timestamptz | |
| status | varchar(20) | `'scheduled'` \| `'available'` \| `'failed'` \| `'cancelled'` |
| source | varchar(10) | `'auto'` \| `'manual'` |
| signed_link_token | varchar(255) | UNIQUE, NULL quando `send_via_signed_link = false` |
| created_at | timestamptz | NOT NULL |

**Índices:** `(tenant_id)`, `(climate_survey_configuration_id)`, `(tenant_id, status, scheduled_at)`, `(created_at)`

Totais por setor em `climate_survey_dept_dispatches`. Tokens em `climate_survey_response_tokens` (com `short_code`, janela de trabalho, `reminder_sent_at`; `token` UNIQUE). Respostas anônimas em `climate_survey_responses` (**sem `employee_id`**) + `climate_survey_response_items`.

**Índices de lookup (anonimato + adesão):**
- `climate_survey_response_tokens`: `(tenant_id)`, `(dispatch_id, employee_id)`, `(created_at)` + UNIQUE `(token)`
- `climate_survey_responses`: `(tenant_id)`, `(dispatch_id)`, `(created_at)`, `(tenant_id, created_at)`
- `climate_survey_response_items`: `(climate_survey_response_id)`, `(question_id)`
- `action_plans`: `(tenant_id)`, `(climate_survey_dispatch_id)`, `(created_at)`

#### `climate_survey_analytics_events`

Stream append-only de eventos de funil da Pesquisa de Clima. Nomes de evento no banco seguem o catálogo de produto em português (`pesquisa_criada`, `email_aberto`, etc.); tabelas/código em inglês.

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL |
| event | varchar | NOT NULL — ver catálogo abaixo |
| config_id | uuid | |
| dispatch_id | uuid | FK → climate_survey_dispatches |
| action_plan_id | uuid | |
| question_id | uuid | |
| question_order | integer | |
| email_log_id | uuid | |
| session_id | uuid | |
| quantity | integer | NOT NULL, default 1 — ex.: lembretes em lote |
| created_at | timestamptz | NOT NULL |

**Catálogo de eventos:** `pesquisa_criada`, `pergunta_selecionada`, `campanha_disparada`, `email_aberto`, `link_clicado`, `resposta_iniciada`, `resposta_concluida`, `lembrete_disparado`, `acao_criada`, `acao_concluida`.

**Índices:** `(tenant_id, event, created_at)`, `(tenant_id, dispatch_id, event)`, `(tenant_id, config_id, event)`

#### `climate_survey_response_sessions`

Sessão de participação (por token) para tempo médio e abandono por pergunta. Vincula `token_id` (participação) — **não** vincula resposta anônima.

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL |
| dispatch_id | uuid | NOT NULL |
| token_id | uuid | UNIQUE, FK → climate_survey_response_tokens |
| started_at | timestamptz | NOT NULL |
| completed_at | timestamptz | |
| last_question_id | uuid | |
| last_question_order | integer | |
| question_count | integer | NOT NULL |
| created_at / updated_at | timestamptz | NOT NULL |

**Índices:** `(tenant_id, dispatch_id)`, `(tenant_id, completed_at)`

#### `anonymous_reports`

Relatos anônimos enviados pelo canal público. O campo `category` é texto livre (não FK), não existe tabela `report_categories`.

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL |
| org_slug | varchar(100) | NOT NULL — slug da organização no momento do relato |
| content | text | NOT NULL |
| category | varchar(100) | NULL — categoria livre informada pelo colaborador |
| status | varchar(20) | NOT NULL, default `'open'` — `'open'` \| `'resolved'` |
| resolved_at | timestamptz | |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

**Índice:** `(tenant_id, status)`

#### `action_plans`

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL |
| title | varchar(255) | NOT NULL |
| description | text | NOT NULL |
| status | varchar(20) | `'open'` \| `'in_progress'` \| `'completed'` |
| priority | varchar(20) | NOT NULL, default `'medium'` — `'low'` \| `'medium'` \| `'high'` |
| alert_id | uuid | FK → alerts.id |
| report_id | uuid | FK → anonymous_reports.id |
| climate_survey_dispatch_id | uuid | FK → climate_survey_dispatches.id — origem opcional via CTA da onda (`ActionPlanOriginClimateSurveyDispatch`) |
| climate_survey_dimension | varchar | NULL — tópico de clima (`ClimateSurveyDimension`) quando a ação é do módulo de clima |
| assignee_id | uuid | NULL, FK → organization_users.id — responsável da ação (`ActionPlanAssignee`) |
| due_date | timestamptz | |
| completed_at | timestamptz | |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

**Índices:** `(tenant_id)`, `(climate_survey_dispatch_id)`, `(climate_survey_dimension)`, `(assignee_id)`, `(created_at)`

> Status na UI de clima: `open` = Planejado · `in_progress` = Em andamento · `completed` = Concluído. Prioridade: `high`/`medium`/`low` = Alta/Média/Baixa.

#### `action_tasks`

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL |
| plan_id | uuid | NOT NULL, FK → action_plans.id ON DELETE CASCADE |
| title | varchar(255) | NOT NULL |
| assignee_id | uuid | FK → organization_users.id — responsável pela tarefa |
| due_date | timestamptz | |
| completed_at | timestamptz | |
| created_at | timestamptz | NOT NULL |

#### `action_plan_suggestions`

Sugestões automáticas de plano de ação geradas pelo job diário `action-plan-suggestion-generator`. Exibidas no painel do Admin/RH como cards que podem ser aceitos (convertendo em `action_plans`) ou descartados.

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL, FK → organizations.id ON DELETE CASCADE |
| suggestion_key | varchar(255) | NOT NULL — chave idempotente (evita duplicatas por período) |
| title | varchar(255) | NOT NULL |
| description | text | NOT NULL |
| priority | varchar(20) | NOT NULL, default `'medium'` — `'low'` \| `'medium'` \| `'high'` |
| reason | text | NOT NULL — explicação do porquê da sugestão |
| status | varchar(20) | NOT NULL, default `'pending'` — `'pending'` \| `'converted'` \| `'dismissed'` |
| dismissed_at | timestamptz | |
| dismissed_by | uuid | FK → organization_users.id |
| action_plan_id | uuid | FK → action_plans.id — preenchido ao converter |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

**Índices:** `(tenant_id, status)`, `(tenant_id, suggestion_key)`, `(dismissed_by)`

#### `action_plan_suggestion_tasks`

Tarefas sugeridas vinculadas a uma `action_plan_suggestion`. Copiadas para `action_tasks` ao converter.

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| suggestion_id | uuid | NOT NULL, FK → action_plan_suggestions.id ON DELETE CASCADE |
| title | varchar(255) | NOT NULL |
| sort_order | integer | NOT NULL, default 0 |

#### `documents`

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL |
| title | varchar(255) | NOT NULL |
| type | varchar(50) | NOT NULL — categoria do documento (ex: `'pgr'`, `'pcmso'`, `'laudo'`) |
| file_url | varchar(500) | NOT NULL — URL pública ou assinada do arquivo |
| is_active | boolean | NOT NULL, default true |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

#### `document_versions`

Preservação de versões anteriores de documentos. Cada upload cria uma versão nova.

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| document_id | uuid | NOT NULL, FK → documents.id ON DELETE CASCADE |
| version | integer | NOT NULL |
| file_url | varchar(500) | NOT NULL |
| uploaded_by_id | uuid | NOT NULL, FK → organization_users.id |
| created_at | timestamptz | NOT NULL |

#### `pgr_reviews`

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL |
| period | varchar(20) | NOT NULL — período de referência da revisão (ex: `'2024-Q1'`) |
| file_url | varchar(500) | — URL do documento PGR gerado |
| status | varchar(20) | NOT NULL, default `'pending'` — `'pending'` \| `'completed'` |
| reviewed_at | timestamptz | NULL = não revisado ainda |
| next_review_at | timestamptz | NULL = não agendado |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

#### `alerts`

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL |
| department_id | uuid | NULL, FK → departments.id |
| type | varchar(30) | `'low_score'` \| `'score_drop'` \| `'negative_trend'` \| `'low_adherence'` \| `'crisis_report'` \| `'pgr_review_due'` |
| severity | varchar(10) | `'high'` \| `'medium'` \| `'low'` |
| message | text | NOT NULL |
| is_read | boolean | NOT NULL, default false |
| resolved_at | timestamptz | |
| resolved_by | uuid | FK → organization_users.id |
| created_at | timestamptz | NOT NULL |

**Índices:** `(tenant_id)`, `(tenant_id, resolved_at)`, `(tenant_id, is_read, severity)`

| Tipo | Quando dispara |
|---|---|
| `low_score` | Score do setor abaixo do limiar crítico |
| `score_drop` | Score caiu >1 ponto em relação ao período anterior |
| `negative_trend` | 3 períodos consecutivos abaixo da média histórica |
| `low_adherence` | <80% de resposta após 48h do disparo |
| `crisis_report` | Relato anônimo com palavras-chave de crise detectadas |
| `pgr_review_due` | 30 dias antes de `pgr_reviews.next_review_at` |

#### `audit_logs`

**Append-only — sem `updated_at`, sem `deleted_at`.** Registra toda ação relevante.

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL, FK → organizations.id |
| user_id | uuid | FK → organization_users.id ON DELETE SET NULL — NULL para ações do sistema |
| action | varchar(100) | NOT NULL — ex: `'document.deleted'`, `'report.exported'` |
| resource | varchar(100) | NOT NULL — tipo da entidade afetada (ex: `'document'`, `'employee'`) |
| resource_id | uuid | — ID da entidade afetada |
| metadata | jsonb | — valores anterior/posterior, contexto adicional |
| created_at | timestamptz | NOT NULL |

**Índices:** `(tenant_id, created_at DESC)`, `(user_id, created_at DESC)`

#### `message_logs`

Registro de todas as mensagens enviadas (envio individual por colaborador). Fonte dos dados de métricas do Super Admin e do log completo do disparo.

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL, FK → organizations.id ON DELETE CASCADE |
| employee_id | uuid | NULL — ID do colaborador destinatário (sem vínculo obrigatório para preservar o anonimato) |
| dispatch_id | uuid | NULL — onda de pesquisa (health ou climate) associada ao envio |
| type | varchar(30) | NOT NULL — `'health_survey_dispatch'` \| `'health_survey_reminder'` \| `'climate_survey_dispatch'` \| `'climate_survey_reminder'` |
| provider | varchar(50) | NOT NULL — nome do provedor utilizado (ex: `'smsbarato-wa'`, `'smsbarato'`, `'console'`) |
| external_id | varchar(255) | ID retornado pelo provedor (chave para webhook de status) |
| survey_link | varchar(500) | Link único da pesquisa enviado ao colaborador |
| status | varchar(20) | NOT NULL — `'queued'` \| `'sent'` \| `'delivered'` \| `'read'` \| `'failed'` |
| error_message | text | Detalhe da falha (quando `status = 'failed'`) |
| queue_job_id | varchar(255) | ID do job BullMQ `send-message` |
| sent_at | timestamptz | NOT NULL |
| delivered_at | timestamptz | NULL |
| read_at | timestamptz | NULL |
| failed_at | timestamptz | NULL |
| updated_at | timestamptz | NOT NULL |

**Índices:** `(tenant_id)`, `(tenant_id, dispatch_id)`, `(external_id)`, `(queue_job_id)`, `(tenant_id, sent_at DESC)`

**Ciclo de status:** criação em `sent` (ou `failed`) no worker → webhook `/api/webhooks/messaging` atualiza para `delivered` / `read` / `failed` sem regredir (ex.: `read` não volta para `delivered`). Falhas temporárias do provedor lançam `MessagingTemporaryError` e o BullMQ reenvia (3 tentativas, backoff exponencial 5s).

#### `email_logs`

Registro de e-mails de pesquisa de clima enviados via `getEmailService()` (Resend/console). Inclui tracking first-party de abertura e clique.

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL, FK → organizations.id ON DELETE CASCADE |
| employee_id | uuid | NULL |
| dispatch_id | uuid | NULL — onda de clima associada |
| type | varchar(30) | NOT NULL — `'climate_survey_dispatch'` \| `'climate_survey_reminder'` |
| provider | varchar(50) | NOT NULL — valor de `EMAIL_PROVIDER` |
| external_id | varchar(255) | ID retornado pelo provedor de e-mail |
| recipient_email | varchar(255) | NOT NULL |
| survey_link | varchar(500) | NOT NULL — link único da pesquisa (antes do redirect de tracking) |
| tracking_token | uuid | NOT NULL, UNIQUE — usado em `/api/track/email/[trackingToken]/{open\|click}` |
| status | varchar(20) | NOT NULL — `'sent'` \| `'failed'` \| `'opened'` \| `'clicked'` |
| error_message | text | |
| queue_job_id | varchar(255) | ID do job BullMQ `send-email` |
| sent_at | timestamptz | NOT NULL |
| opened_at | timestamptz | |
| clicked_at | timestamptz | |
| failed_at | timestamptz | |
| updated_at | timestamptz | NOT NULL |

**Índices:** `(tenant_id)`, `(tenant_id, dispatch_id)`, `(external_id)`, `(queue_job_id)`, `(tenant_id, sent_at DESC)`

**Tracking:** `GET /api/track/email/[trackingToken]/open` devolve GIF 1×1 e marca `opened`; `GET /api/track/email/[trackingToken]/click` registra clique e redireciona para `survey_link`. Rotas públicas (sem autenticação).

#### `job_logs`

Registro persistido de todas as execuções de jobs (completed/failed). **Append-only — sem update/delete.** Inserido pelos event listeners do BullMQ Worker no evento `completed` ou `failed`.

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| queue_name | varchar(50) | NOT NULL — ex: `'jobs'`, `'messages'` |
| job_name | varchar(100) | NOT NULL — ex: `'health-survey-dispatcher'`, `'send-message'` |
| job_id | varchar(255) | NOT NULL — ID do job no BullMQ |
| status | varchar(20) | NOT NULL — `'completed'` \| `'failed'` |
| duration_ms | integer | Duração da execução em ms |
| payload | jsonb | Payload do job (input) |
| result | jsonb | Resultado do job (output) |
| error_message | text | Mensagem de erro (apenas `status = 'failed'`) |
| error_stack | text | Stack trace do erro (apenas `status = 'failed'`) |
| attempt_number | integer | NOT NULL, default 1 |
| max_attempts | integer | NOT NULL, default 1 |
| queued_at | timestamptz | Momento em que o job entrou na fila |
| started_at | timestamptz | Início da execução |
| finished_at | timestamptz | Fim da execução |

**Índices:** `(queue_name, job_name, started_at DESC)`, `(status, started_at DESC)`

#### `request_logs`

Registro de requests HTTP recebidos pela aplicação. **Append-only — sem update/delete.** Inserido pelo `instrumentation.ts` e `proxy.ts`.

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| method | varchar(10) | NOT NULL — `'GET'`, `'POST'`, etc. |
| path | varchar(500) | NOT NULL |
| query | text | NULL — query string da URL (ex: `?page=1&status=open`) |
| ip | varchar(45) | NULL — IP do cliente |
| user_agent | text | NULL |
| request_headers | jsonb | NOT NULL |
| request_body | jsonb | NULL |
| response_status | integer | NULL — código de status HTTP da resposta |
| response_headers | jsonb | NULL |
| response_body | jsonb | NULL |
| duration_ms | integer | NULL — duração total da request |
| tenant_id | uuid | FK → organizations.id — NULL para requests do super admin ou públicas |
| user_id | uuid | NULL — ID do usuário autenticado (se houver) |
| user_type | varchar(20) | NULL — `'org_user'` \| `'super_admin'` |
| is_redirect | boolean | NOT NULL, default false |
| redirect_to | varchar(500) | NULL — URL de destino se for redirect |
| error_message | text | NULL |
| error_stack | text | NULL |
| created_at | timestamptz | NOT NULL |

**Índices:** `(created_at DESC)`, `(tenant_id)`, `(user_id)`, `(method)`, `(response_status)` — para listagem e filtragem no Super Admin

#### `pgr_dept_results`

Resultado por departamento gerado na revisão PGR. Normalizado para permitir queries por setor.

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| pgr_review_id | uuid | NOT NULL, FK → pgr_reviews.id ON DELETE CASCADE |
| department_id | uuid | NOT NULL, FK → departments.id |
| department_name | varchar(255) | NOT NULL — snapshot do nome do setor no momento da revisão |
| employee_count | integer | NOT NULL |
| avg_score | float | NOT NULL |
| response_count | integer | NOT NULL |
| total_recipients | integer | NOT NULL |
| created_at | timestamptz | NOT NULL |

#### `pgr_question_results`

Resultado por pergunta gerado na revisão PGR. Permite análise de tendência por fator de risco.

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| pgr_review_id | uuid | NOT NULL, FK → pgr_reviews.id ON DELETE CASCADE |
| department_id | uuid | NOT NULL, FK → departments.id |
| question_id | uuid | NOT NULL, FK → health_survey_questions.id |
| question_text | text | NOT NULL — snapshot do texto da pergunta no momento da revisão |
| question_order | integer | NOT NULL |
| score_direction | varchar(30) | NOT NULL — `'higher_is_better'` \| `'lower_is_better'` |
| avg_score | float | NOT NULL |
| response_count | integer | NOT NULL |
| created_at | timestamptz | NOT NULL |

---

#### `data_import_batches`

Lote de importação de arquivos operacionais (AFD/ponto, espelho, planilha). Cada upload cria um lote, processado pelo pipeline de IA (extração + validação).

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL, FK → organizations.id ON DELETE CASCADE |
| file_name | varchar | NOT NULL |
| file_url | varchar(500) | NULL — URL/chave no storage. Nulo quando o lote foi criado a partir de texto inline (endpoint interno), sem arquivo persistido |
| file_type | varchar | NOT NULL — `'afd'` \| `'espelho'` \| `'planilha'` \| … |
| competencia | varchar | NOT NULL — `AAAA-MM` |
| status | varchar(20) | `'received'` \| `'processing'` \| `'extracted'` \| `'validated'` \| `'failed'` |
| ai_provider | varchar | NOT NULL |
| total_records / corrected_records / error_records | integer | NOT NULL, default 0 |
| error_message | text | |
| created_by_id | uuid | FK → organization_users.id ON DELETE SET NULL |
| created_at / updated_at | timestamptz | NOT NULL |

**Índices:** `(tenant_id)`, `(tenant_id, status)`

#### `employee_monthly`

Base Master Mensal. **1 registro = 1 colaborador × 1 competência mensal.**

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL |
| batch_id | uuid | NOT NULL, FK → data_import_batches.id ON DELETE CASCADE |
| competencia | varchar | NOT NULL |
| employee_name | varchar | NOT NULL |
| document / registration | varchar | |
| department_name / role_name | varchar | |
| admission_date / termination_date | timestamptz | |
| expected_hours / worked_hours | float | |
| justified_absence_hours / unjustified_absence_hours | float | |
| absence_rate_percent | float | |
| termination_type | varchar | |
| quality_status | varchar(20) | `'pending'` \| `'validated'` \| `'corrected'` \| `'error'` |
| validation_notes | text | |
| row_hash | varchar | NOT NULL — hash idempotente (dedup por lote) |
| created_at / updated_at | timestamptz | NOT NULL |

**Índices:** `(tenant_id)`, `(tenant_id, competencia)`, `(tenant_id, batch_id)`, UNIQUE `(tenant_id, batch_id, row_hash)`

#### `workforce_insights`

Insights gerados por IA a partir do cruzamento de indicadores de pessoas (Headcount/Turnover/Absenteísmo) com o clima organizacional. Persistidos por competência — a geração substitui atomicamente o conjunto anterior da competência (`deleteMany` + `createMany` em transação).

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL, FK → organizations.id ON DELETE CASCADE |
| competencia | varchar | NOT NULL — `AAAA-MM` |
| kind | varchar(30) | `'root_cause'` \| `'burnout_risk'` \| `'action_suggestion'` |
| severity | varchar(10) | `'high'` \| `'medium'` \| `'low'` |
| department_name | varchar | NULL — setor relacionado (nulo = insight geral) |
| title | varchar | NOT NULL |
| description | text | NOT NULL |
| created_at | timestamptz | NOT NULL |

**Índices:** `(tenant_id, competencia)`

---

### Resumo: Tabelas por Grupo

| Grupo | Tabelas |
|---|---|
| **Sistêmicas** (sem tenant_id) | `plans`, `plan_prices`, `plan_features`, `super_admins`, `consent_term_versions`, `platform_terms_versions`, `privacy_policy_versions` |
| **Auth / Onboarding** | `organization_invitations`, `auth_tokens` |
| **Billing** | `billing_webhook_events`, `subscription_features` |
| **Termos da plataforma** | `platform_terms_versions`, `platform_terms_acceptances` |
| **Tenant — estrutura** | `organizations`, `organization_subscriptions`, `organization_users`, `departments` |
| **Tenant — colaboradores** | `employees`, `employee_consents` |
| **Tenant — pesquisas** | `health_survey_configurations`, `health_survey_config_departments`, `health_survey_questions`, `health_survey_dispatches`, `health_survey_dept_dispatches`, `health_survey_response_tokens`, `health_survey_responses`, `health_survey_response_items` |
| **Tenant — clima organizacional** | `climate_survey_configurations`, `climate_survey_config_departments`, `climate_survey_config_work_days`, `climate_survey_questions`, `climate_survey_topics`, `climate_survey_dispatches`, `climate_survey_dept_dispatches`, `climate_survey_response_tokens`, `climate_survey_response_token_work_days`, `climate_survey_responses`, `climate_survey_response_items`, `climate_survey_analytics_events`, `climate_survey_response_sessions` |
| **Tenant — ocorrências** | `anonymous_reports`, `action_plans`, `action_tasks`, `action_plan_suggestions`, `action_plan_suggestion_tasks` |
| **Tenant — documentos e PGR** | `documents`, `document_versions`, `pgr_reviews`, `pgr_dept_results`, `pgr_question_results` |
| **Tenant — operacional** | `alerts`, `audit_logs` |
| **Tenant — ingestão de dados** | `data_import_batches`, `employee_monthly`, `workforce_insights` |
| **Plataforma** | `message_logs`, `email_logs`, `job_logs`, `request_logs` |

---

## 9. Padrões de Código — Regras Obrigatórias

### TypeScript strict

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true
  }
}
```

### Tipos proibidos

| Tipo proibido | Substituto |
|---|---|
| `any` | Interface ou type específico |
| `object` | Interface com campos explícitos |
| `{}` | Interface ou type específico |
| `unknown` sem narrowing | Validar com Zod antes de usar |
| `Function` | `() => void`, `(x: T) => R` |
| `[]` (array vazio sem tipo) | `Array<T>` ou `T[]` |

### Proibido: colunas JSON no banco de dados

**Nunca use `Json` (Prisma) ou `JSONB`/`JSON` (SQL) para armazenar dados relacionais estruturados.**  
Qualquer dado que possa ser normalizado em linhas deve ser salvo em tabela própria.

```prisma
// ❌ PROIBIDO — dado estruturado como JSON
model PgrReview {
  reportJson Json? @map("report_json")
}

// ✅ CORRETO — tabela relacional própria
model PgrDeptResult {
  pgrReviewId  String @map("pgr_review_id")
  avgScore     Float  @map("avg_score")
  // ...
  pgrReview PgrReview @relation(...)
}
```

**Casos de uso aceitáveis para JSON** (raros, exige justificativa explícita):
- Payload de webhook externo de terceiros (imutável, não consultado por campo)
- Log de auditoria com estrutura variável definida externamente

### Tipo JsonValue — proibido usar Prisma.InputJsonValue fora de repositórios

Quando um campo aceita dados JSON arbitrários, use o tipo próprio da aplicação — nunca exponha tipos do Prisma ou de SDKs externos fora da camada de repositório.

```typescript
// ❌ Proibido — tipo Prisma vazando para o domínio
import type { Prisma } from "@prisma/client"
interface WebhookEventInput {
  payload?: Prisma.InputJsonValue
}

// ✅ Correto — tipo próprio da aplicação
import type { JsonValue } from "@/libs/utils/json"
interface WebhookEventInput {
  payload?: JsonValue
}
```

O arquivo `src/libs/utils/json.ts` define `JsonValue` como tipo recursivo puro sem nenhuma dependência externa. **O cast para `Prisma.InputJsonValue` fica exclusivamente no repository**, que é a única camada que conhece o ORM.

```typescript
// src/libs/utils/json.ts
type JsonPrimitive = string | number | boolean | null
type JsonArray = JsonValue[]
interface JsonObject { [key: string]: JsonValue }
export type JsonValue = JsonPrimitive | JsonObject | JsonArray

// src/modules/billing/billing.repository.ts — ÚNICO lugar com cast Prisma
if (data.payload !== undefined) createData.payload = data.payload as Prisma.InputJsonValue
```

```typescript
// ❌ Proibido
function process(data: any) { ... }

// ✅ Correto
function process(data: CreateEmployeeInput): Promise<Employee> { ... }
```

### Retorno explícito obrigatório

```typescript
// ❌ Proibido — retorno implícito
async function getEmployee(id: string) {
  return prisma.employee.findFirst({ where: { id } })
}

// ✅ Correto
async function getEmployee(id: string): Promise<Employee | null> {
  return prisma.employee.findFirst({ where: { id } })
}
```

### Interfaces nomeadas para inputs/outputs

```typescript
// ❌ Proibido — objeto inline sem interface
function createPlan(data: { name: string; price: number }) { ... }

// ✅ Correto
interface CreatePlanInput {
  name: string
  priceInCents: number
  maxEmployees: number | null
  interval: "month" | "year"
}
function createPlan(data: CreatePlanInput): Promise<Plan> { ... }
```

### Proibição de SQL raw

```typescript
// ✅ Correto
const rows = await prisma.employee.findMany({
  where: { tenantId, status: "active" },
})

// ❌ Proibido
const rows = await prisma.$queryRaw`SELECT * FROM employees WHERE tenant_id = ${tenantId}`
```

### Strings vazias são proibidas em campos de banco de dados

**Nunca use `""` (string vazia) como valor a ser persistido no banco.** Campos opcionais/nullable devem receber `null` ou `undefined`. Campos obrigatórios sem valor disponível devem lançar `AppError`. Nunca use `?? ""` ou `.default("")` como fallback para persistência.

```typescript
// ❌ PROIBIDO — armazena "" quando externalPriceId é null
snapshotExternalPriceId: planPrice.externalPriceId ?? ""

// ✅ CORRETO — lança erro explícito
if (!planPrice.externalPriceId) {
  throw new AppError("PLAN_PRICE_NOT_CONFIGURED", "Preço do plano sem ID externo configurado.")
}
snapshotExternalPriceId: planPrice.externalPriceId

// ❌ PROIBIDO — armazena "" quando price.id é undefined
const priceId = subscription.items.data[0]?.price.id ?? ""

// ✅ CORRETO — early return explícito se dado obrigatório não existe
const priceItem = subscription.items.data[0]
if (!priceItem) return
const priceId = priceItem.price.id
```

**Regras derivadas:**

| Cenário | Solução correta |
|---|---|
| Campo nullable no banco, valor ausente | `null` — nunca `""` |
| Campo não-nullable no banco, valor ausente | `AppError` — nunca `""` |
| Campo opcional em interface TypeScript (`field?: string`) | Usar conditional spread `...(val ? { field: val } : {})` |
| Resultado de adaptador externo sem ID | `externalId: null` no tipo, conditional spread no log |
| Job sem ID ao registrar log | Pular o insert — nunca `jobId: ""` |
| Tipo intermediário que será preenchido depois | Usar `Omit<T, 'field'>` como tipo intermediário |

**`exactOptionalPropertyTypes` e conditional spread:**

Com `exactOptionalPropertyTypes: true`, nunca atribua `string | undefined` a um campo `field?: string`:

```typescript
// ❌ PROIBIDO — tipo incompatível com exactOptionalPropertyTypes
await createLog({ externalId: result.externalId ?? undefined })

// ✅ CORRETO — conditional spread
await createLog({
  ...(result.externalId !== null ? { externalId: result.externalId } : {}),
})
```

**Tipos intermediários sem o campo de ID (padrão para criação atômica):**

Quando um repositório precisa receber objetos antes de conhecer o ID gerado pelo banco (ex: PGR), use `Omit<T, 'id'>` como tipo intermediário. O repositório adiciona o ID no `.map()` antes do `createMany`. Nunca passe `pgrReviewId: ""` ou `id: ""` como placeholder.

```typescript
// ❌ PROIBIDO — placeholder string vazia
const deptResults: CreatePgrDeptResultInput[] = depts.map((d) => ({ pgrReviewId: "", ... }))

// ✅ CORRETO — tipo intermediário sem o campo
const deptResults: PgrDeptResultWithoutReviewId[] = depts.map((d) => ({ departmentId: d.id, ... }))
// No repositório, o ID é adicionado atomicamente:
const resultsWithId = deptResults.map((r) => ({ ...r, pgrReviewId: review.id }))
```

### Tenant Guard obrigatório

Toda query em tabela com `tenant_id` **deve** incluí-lo:

```typescript
// ✅ Correto
const result = await prisma.employee.findMany({
  where: { tenantId, departmentId },
})

// ❌ Proibido — ausência do tenant guard
const result = await prisma.employee.findMany()
```

Repositórios recebem `tenantId` sempre como **primeiro parâmetro**:

```typescript
async findByDepartment(tenantId: string, departmentId: string): Promise<Employee[]>
async create(tenantId: string, data: CreateEmployeeInput): Promise<Employee>
```

### Proibição de comentários

**Comentários em código são proibidos** — incluindo `//`, `/* */` e JSDoc (`/** */`). O código deve ser autoexplicativo.

```typescript
// ❌ Proibido
// Verifica se atingiu o limite do plano
const count = await prisma.employee.count({ where: { tenantId } })

// ✅ Correto
const currentEmployeeCount = await prisma.employee.count({ where: { tenantId } })
const hasReachedPlanLimit = currentEmployeeCount >= planEmployeeLimit
if (hasReachedPlanLimit) throw new AppError("EMPLOYEE_LIMIT_REACHED", "Limite atingido.")
```

> **Motivo:** comentários mentem — o código muda, o comentário fica desatualizado. Código bem nomeado é sempre verdadeiro. Se um trecho parece precisar de comentário, o problema está no nome ou na estrutura, não na ausência de explicação.

### Princípio geral de nomenclatura — contexto completo obrigatório

**Todo identificador deve conter o contexto completo do domínio ao qual pertence. Nomes abreviados ou genéricos são proibidos em absolutamente qualquer parte do código.**

Um nome genérico força quem lê a navegar até a implementação para entender do que se trata. Um nome completo torna o código auto-documentado e evita colisões futuras quando novos domínios ou fluxos similares forem adicionados ao sistema.

**Pergunta de validação obrigatória antes de nomear qualquer coisa:**
> *"Se eu ler apenas esse nome num log, num painel de monitoramento, numa listagem de arquivos ou numa revisão de código, saberei exatamente o que ele faz e a qual domínio pertence — sem abrir o arquivo?"*

Se a resposta for **não**, o nome está incompleto e deve ser reescrito.

```typescript
// ❌ PROIBIDO — genérico, sem contexto de domínio
findPending(tenantId)
create(tenantId, data)
dismiss(tenantId, id)
convert(tenantId, id)
generate()
cleanup()
reminder()
checker()
interface WithDetails { ... }
interface CreateInput { ... }
<Card />
<List />
"generator"
"cleanup"

// ✅ CORRETO — nome completo: domínio + entidade + ação + complemento quando necessário
findPendingActionPlanSuggestions(tenantId)
createActionPlanSuggestion(tenantId, data)
dismissActionPlanSuggestion(tenantId, id)
convertActionPlanSuggestionToActionPlan(tenantId, id)
generateActionPlanSuggestions()
healthSurveyResponseTokenCleanup()
pgrReviewDueReminder()
healthSurveyAdherenceChecker()
interface ActionPlanSuggestionWithTasks { ... }
interface CreateActionPlanSuggestionInput { ... }
<ActionPlanSuggestionCard />
<ActionPlanSuggestionList />
"action-plan-suggestion-generator"
"health-survey-response-token-cleanup"
```

**A regra se aplica a todo artefato sem exceção:** funções, variáveis, parâmetros, interfaces, types, constantes, componentes React, hooks, jobs BullMQ, nomes de schedules, rotas, nomes de arquivo, eventos de audit log, tipos de alerta, tipos de mensagem, campos de `@relation` no Prisma.

### Naming conventions

| Contexto | Convenção | Exemplo |
|---|---|---|
| Arquivos de módulo | kebab-case | `employee.service.ts` |
| Componentes React | PascalCase | `EmployeeCard.tsx` |
| Funções e variáveis | camelCase | `getEmployeeById` |
| Constantes de módulo | UPPER_SNAKE_CASE | `MAX_FILE_SIZE_MB` |
| Zod schemas | camelCase + sufixo `Schema` | `createEmployeeSchema` |
| Types / Interfaces | PascalCase | `Employee`, `CreateEmployeeInput` |
| Rotas / pastas | kebab-case em inglês | `/action-plans/[id]`, `/learn-more` |

### Rotas em inglês — obrigatório

**Todos os segmentos de URL (pastas dentro de `src/app/`) devem ser escritos em inglês.**

```
✅ /learn-more       /action-plans       /employees/new
❌ /saiba-mais       /planos-de-acao     /novo-funcionario
```

Isso inclui:
- Nomes de pastas de rotas (`src/app/nome-da-pasta/`)
- Segmentos dinâmicos (`[id]`, `[token]` — já são neutros)
- Grupos de rotas `(auth)`, `(tenant)` — convencional, não vira URL

**Razões:** consistência com o restante da stack (bibliotecas, logs, audit trail), evitar encoding de caracteres especiais em URLs, e padrão universal de APIs e rotas web.

**Nota:** textos exibidos ao usuário (labels, labels de nav, títulos de página) podem e devem estar em português. A restrição é exclusivamente sobre o **segmento da URL**.

### Timezone e datas — regras obrigatórias

**O banco de dados armazena TUDO em UTC.** Nunca persiste offsets, strings com timezone, ou timestamps locais.

- Colunas `DateTime` no Prisma → sempre UTC (padrão do Prisma/PostgreSQL)
- Campos de hora como string (`work_start_time`, `work_end_time`) são armazenados como `"HH:MM"` sem timezone — representam hora local sem contexto de fuso
- O fuso horário de cada organização fica em `organizations.timezone` (ex: `"America/Sao_Paulo"`) — **esse é o único lugar onde o fuso é armazenado**

**Na lógica de negócio (ex: dispatch de pesquisas):**
- Nunca use `new Date().getDay()` ou `new Date().getHours()` para comparar com horários do usuário — isso usa o timezone do servidor
- Use `Intl.DateTimeFormat` com o `timezone` da organização para determinar o dia/hora local:
  ```typescript
  // ✅ Correto — usa timezone da organização
  const dayName = new Intl.DateTimeFormat("en-US", { timeZone: org.timezone, weekday: "short" }).format(new Date())

  // ❌ Errado — usa timezone do servidor (pode ser UTC ou qualquer outro)
  const day = new Date().getDay()
  ```
- `workDays` é armazenado em tabelas de join relacionais (`department_work_days`, `employee_work_days`, `health_survey_config_work_days`) — nunca como string separada por vírgula. Em TypeScript, `workDays: number[]` (0=Dom … 6=Sáb) — avaliado no timezone da organização
- `workStartTime`/`workEndTime` como `"HH:MM"` — presentes em departamentos, colaboradores e tokens de resposta; avaliados no timezone da organização. **Configurações de pesquisa não têm horário de expediente** — apenas `dispatchTime` (horário de disparo)
- `dispatchTime` em `health_survey_configurations` define **quando** a pesquisa será disparada, não uma janela de expediente. O scheduler dispara na janela de 60 minutos a partir desse horário.

**Settings:** O RH configura o fuso horário em `/settings` → campo `Fuso horário`. O valor salvo é um IANA timezone string (ex: `"America/Sao_Paulo"`).

### Organização de imports

```typescript
// 1. Node built-ins
import { randomUUID } from "crypto"

// 2. Dependências externas
import { z } from "zod"

// 3. Libs internas (@/libs/*)
import { prisma } from "@/libs/db"

// 4. Módulos internos (@/modules/*)
import { departmentRepository } from "@/modules/departments/department.repository"

// 5. Tipos
import type { Employee } from "./employee.types"
```

### Erros em pt-BR

Todas as mensagens de erro expostas ao usuário devem estar em **português do Brasil**. Códigos de erro internos podem estar em inglês (usados em código, não exibidos na UI).

### `ActionResult` — tipo padrão de retorno de Server Actions

**Nunca declare `interface ActionResult` localmente em arquivos de Server Action.** Use o tipo compartilhado:

```typescript
import type { ActionResult } from "@/libs/utils/action-result"
```

O arquivo `src/libs/utils/action-result.ts` define:

```typescript
export interface ActionResult {
  error?: string
}
```

Motivo: evitar duplicação em 20+ arquivos de actions. Se precisar de campos adicionais (ex: `data`), crie uma interface local que **estende** `ActionResult`:

```typescript
interface CreateResult extends ActionResult {
  id?: string
}
```

### `AppError` — classe padrão de erros de negócio

Use `AppError` para todos os erros de domínio esperados (regras de negócio, validações, conflitos). Erros inesperados (ex: falha de rede, erro de banco) devem ser relançados sem `AppError` — serão capturados pelo handler global.

```typescript
// Padrão de uso em services
throw new AppError("EMPLOYEE_LIMIT_REACHED", "Limite de colaboradores atingido.")
throw new AppError("ORG_NOT_FOUND", "Organização não encontrada.")
throw new AppError("INVALID_TOKEN", "Link inválido ou expirado.")

// Captura em Server Actions
try {
  await employeeService.createEmployee(...)
} catch (err) {
  if (isRedirectError(err)) throw err        // deixa o redirect do Next.js passar
  if (err instanceof AppError) {
    return { success: false, error: err.message }
  }
  throw err                                  // erros inesperados sobem
}
```

### `isRedirectError` — Server Actions com redirect

Em Server Actions que chamam `redirect()`, use `isRedirectError` para não engolir o redirect dentro de um `try/catch`:

```typescript
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { redirect } from "next/navigation"

export async function someAction() {
  try {
    // ...
    redirect("/dashboard")
  } catch (err) {
    if (isRedirectError(err)) throw err   // ✅ deixa o redirect funcionar
    return { success: false, error: "Erro inesperado." }
  }
}
```

### `revalidatePath` após mutações

Toda Server Action que altera dados exibidos em uma página deve chamar `revalidatePath` para invalidar o cache do Next.js:

```typescript
import { revalidatePath } from "next/cache"

export async function createEmployeeAction(...) {
  await employeeService.createEmployee(...)
  revalidatePath("/employees")
  return { success: true }
}
```

### UUID validation obrigatória em IDs recebidos por Server Actions

**Toda Server Action que recebe um ID como parâmetro string deve validá-lo como UUID antes de usá-lo.** IDs vindos de props de Client Components podem ser manipulados — validar com Zod garante que não cheguem valores inválidos ao banco.

```typescript
// ✅ CORRETO — validação UUID antes de usar
import { z } from "zod"

export async function deactivateEntityAction(entityId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: "Sessão expirada." }

  const parsedId = z.string().uuid().safeParse(entityId)
  if (!parsedId.success) return { error: "Registro inválido." }

  await entityService.deactivate(session.tenantId, parsedId.data)
  revalidatePath("/entities")
  return {}
}

// ❌ PROIBIDO — ID não validado
export async function deactivateEntityAction(entityId: string): Promise<ActionResult> {
  await entityService.deactivate(session.tenantId, entityId)  // vulnerável
}
```

### Campos derivados de frequência — enforcement server-side obrigatório

**Campos que dependem da frequência selecionada devem ser normalizados no servidor**, independentemente do que o cliente enviou. Nunca confiar em contrato de UI para garantir consistência de dados.

```typescript
// ✅ CORRETO — server enforces nulling scheduledDayOfMonth for non-monthly
const scheduledDayOfMonth = frequency === "monthly" ? rawScheduledDay : null

// ❌ PROIBIDO — confiar que o cliente enviou null para frequências não-mensais
const { scheduledDayOfMonth } = parsed.data  // pode vir com valor residual
```


### Regras do `yarn lint` (ESLint — `eslint.config.mjs`)

O comando `yarn lint` executa o ESLint sobre todos os arquivos `**/*.ts` e `**/*.tsx` (exceto `.next/`, `out/`, `build/`, `node_modules/`, `prisma/`, `src/cli/`). **Todo PR deve passar com zero erros e zero warnings.**

> ⚠️ **REGRA INVIOLÁVEL:** Nenhuma entrada em `eslint.config.mjs` pode ter valor `"off"`. Não existem relaxamentos por camada — as mesmas regras se aplicam a todos os arquivos, incluindo componentes UI, workers, adapters, testes e utilitários. Ver seção "Proibição absoluta de regras `'off'`" abaixo.

#### Regras gerais (todos os arquivos TS/TSX)

| Regra | Nível | Significado prático |
|---|---|---|
| `no-console` | error | Proibido `console.*` — use o logger centralizado (`src/libs/logger.ts` para app, `src/libs/utils/logger.ts` para workers) |
| `no-debugger` | error | Proibido `debugger` |
| `no-alert` | error | Proibido `alert/confirm/prompt` |
| `no-var` | error | Use `const` ou `let` |
| `prefer-const` | error | Prefira `const` quando a variável não é reatribuída |
| `eqeqeq` (always) | error | Use `===` e `!==` em todas as comparações |
| `no-implicit-coercion` | error | Proibido `!!x`, `+x`, `"" + x` — seja explícito |
| `no-throw-literal` | error | Só `throw new Error(...)` ou subclasses |
| `no-return-await` | error | Proibido `return await` fora de `try/catch` |
| `require-await` | error | Funções `async` devem ter pelo menos um `await` |
| `no-nested-ternary` | error | Proibido ternário dentro de ternário |
| `no-unneeded-ternary` | error | Proibido `x ? true : false` — simplifique |
| `object-shorthand` | error | Use `{ foo }` em vez de `{ foo: foo }` |
| `prefer-template` | error | Use template literals em vez de concatenação |
| `no-useless-concat` | error | Proibido `"a" + "b"` (literais adjacentes) |
| `no-duplicate-imports` | error | Um único `import` por módulo |
| `no-restricted-syntax` (TSEnumDeclaration) | error | Proibido `enum` — use `const` maps ou union types |
| `spaced-comment` (never) | error | Proibido qualquer comentário `//` ou `/* */` |

#### Regras TypeScript (`@typescript-eslint`)

| Regra | Nível | Significado prático |
|---|---|---|
| `no-explicit-any` | error | Proibido `any` — use interface/type |
| `explicit-function-return-type` | error | Toda função deve declarar o tipo de retorno (exceções: expressões, HOFs, arrow com `void`) |
| `no-unused-vars` | error | Variáveis/args não usados são erro (prefixe com `_` para ignorar) |
| `consistent-type-imports` | error | Use `import type` para importações de tipo puro |
| `no-non-null-assertion` | error | Proibido `!` (non-null assertion) |
| `no-floating-promises` | error | Toda Promise deve ser `await`-ada ou encadeada com `.catch` |
| `await-thenable` | error | Proibido `await` em valor não-Promise |
| `no-misused-promises` | error | Proibido passar Promise onde callback síncrono é esperado |
| `return-await` (in-try-catch) | error | Use `return await` dentro de `try/catch` |
| `no-unnecessary-type-assertion` | error | Proibido cast desnecessário (`x as string` quando já é `string`) |
| `no-unsafe-assignment/call/member-access/return/argument` | error | Proibido uso de valores inferidos como `any` |
| `prefer-nullish-coalescing` | error | Use `??` em vez de `\|\|` para valores nullable |
| `prefer-optional-chain` | error | Use `?.` em vez de `&&` encadeado |
| `no-redundant-type-constituents` | error | Proibido `string \| any`, `never \| T`, etc. |
| `no-import-type-side-effects` | error | Proibido `import type` com side-effects |
| `consistent-type-definitions` (interface) | error | Use `interface` em vez de `type` para objetos |
| `array-type` (array) | error | Use `T[]` em vez de `Array<T>` |

#### Regras de imports (`eslint-plugin-import`)

| Regra | Nível | Significado prático |
|---|---|---|
| `import/first` | error | Imports antes de qualquer outro código |
| `import/no-duplicates` | error | Sem imports duplicados do mesmo módulo |
| `import/no-cycle` (maxDepth: 3) | error | Sem dependências circulares entre módulos |
| `import/no-self-import` | error | Um arquivo não pode importar a si mesmo |
| `no-relative-import-paths` | error | Use `@/` em vez de caminhos relativos (`../`, `./`) — exceto mesmo diretório desabilitado |

#### Regras SonarJS (`eslint-plugin-sonarjs`)

| Regra | Nível | Significado prático |
|---|---|---|
| `no-duplicate-string` (threshold: 4) | error | String literal repetida ≥ 4 vezes deve virar constante |
| `no-identical-functions` | error | Proibido funções com corpo idêntico |
| `cognitive-complexity` (max: 20) | error | Complexidade cognitiva máxima por função: 20 |
| `no-redundant-boolean` | error | Proibido `if (x === true)` — use `if (x)` |
| `prefer-immediate-return` | error | Retorne diretamente em vez de atribuir para depois retornar |

#### Restrições por camada

| Camada | Restrição adicional |
|---|---|
| `src/app/**` | Proibido importar `prisma` diretamente (`@/libs/db`, `@prisma/client`) — use service |
| `src/app/**` | Proibido importar repositories diretamente — use service |
| `src/modules/**/*.service.ts` | Proibido importar `prisma` diretamente — use repository |

#### Proibição absoluta de regras `"off"` no ESLint — sem exceções

**Nenhuma regra pode ter valor `"off"` em `eslint.config.mjs` — proibição absoluta e inviolável.**

Todo o código da aplicação — incluindo componentes UI, workers, adapters de integração, arquivos de teste, utilitários e arquivos de configuração — está sujeito às mesmas regras rígidas. Não existem relaxamentos por camada.

**Consequências práticas:**

| Prática proibida (anterior) | Prática obrigatória (atual) |
|---|---|
| `no-console: "off"` em workers | Usar `process.stdout.write` / `process.stderr.write` — ou o worker logger em `src/libs/utils/logger.ts` |
| `require-await: "off"` em adapters | Remover `async` de métodos que não usam `await`; retornar `Promise.resolve(value)` explicitamente |
| `explicit-function-return-type: "off"` em UI | Anotar `: React.ReactElement` em toda declaração de função componente |
| `no-unsafe-*: "off"` em testes | Usar `expect.any(Date) as Date` e `expect.anything() as string` — nunca deixar `any` escapar para o tipo inferido |
| `no-explicit-any: "off"` em testes | Usar `as Awaited<ReturnType<typeof fn>>` nos mocks — nunca `as any` |

**Checklist obrigatório antes de qualquer PR:**
- Não existe nenhuma linha com `"off"` em `eslint.config.mjs`
- `yarn lint` retorna **zero erros e zero warnings**

---

### Logger centralizado — regra obrigatória

**`console.*` é proibido em todo o projeto.** O único local onde `console.log/warn/error` aparecem é dentro de `src/libs/utils/logger.ts` — que é a implementação do logger de workers.

#### Dois loggers, dois contextos

O projeto tem **dois loggers** com responsabilidades distintas:

| Logger | Arquivo | Biblioteca | Contexto de uso |
|---|---|---|---|
| App logger | `src/libs/logger.ts` | `pino` (JSON estruturado) | Toda a aplicação Next.js (pages, Server Actions, services) |
| Worker logger | `src/libs/utils/logger.ts` | Custom (ANSI colorido) | Workers BullMQ, scripts CLI, processos de background |

**`src/libs/logger.ts` (pino) — uso na aplicação:**

```typescript
import { logger } from "@/libs/logger"

logger.info("iniciando processo")
logger.warn("tentativa falhou, retentando...")
logger.error({ err }, "falha crítica")
logger.debug({ data }, "payload recebido")
```

O nível de log é controlado pela variável de ambiente `LOG_LEVEL` (padrão: `"info"`).

**`src/libs/utils/logger.ts` (colorido) — uso nos workers:**

```typescript
// Opção 1 — singleton genérico (origin: "app")
import { logger } from "@/libs/utils/logger"

logger.info("iniciando processo")
logger.success("operação concluída", { count: 5 })
logger.warn("tentativa falhou, retentando...")
logger.error("falha crítica", err.message)
logger.debug("payload recebido", data)

// Opção 2 — logger nomeado (recomendado para workers e scripts)
import { createLogger } from "@/libs/utils/logger"
const logger = createLogger("health-survey-dispatcher")

logger.info("verificando dispatches pendentes")
```

#### Quando usar cada nível (worker logger)

| Nível | Método | Cor | Quando usar |
|---|---|---|---|
| `success` | `logger.success` | 🟢 Verde | Operação concluída com êxito |
| `info` | `logger.info` | 🔵 Ciano | Informação geral de fluxo |
| `warn` | `logger.warn` | 🟡 Amarelo | Situação incomum mas não crítica |
| `error` | `logger.error` | 🔴 Vermelho | Falha que precisa de atenção |
| `debug` | `logger.debug` | ⚫ Cinza | Dados de depuração (dev only) |

#### Regra de naming para `createLogger`

O argumento `origin` deve identificar inequivocamente o módulo:

```typescript
// ❌ PROIBIDO — genérico
createLogger("module")
createLogger("service")

// ✅ CORRETO — específico
createLogger("health-survey-dispatcher")
createLogger("fake-billing")
createLogger("job-worker")
```

---

### Ortografia do português — regra obrigatória para todo texto gerado por IA

**Todo texto em português produzido por agentes de IA deve usar ortografia correta, incluindo acentos, til, cedilha e demais diacríticos.** Esta regra aplica-se a qualquer artefato do projeto: código-fonte, comentários (quando excepcionalmente permitidos), mensagens de erro, labels de UI, strings de validação Zod, conteúdo de e-mail, nomes de variáveis semânticas visíveis ao usuário e documentação.

#### Exemplos de grafias proibidas e corretas

| ❌ Proibido (sem acento) | ✅ Correto |
|---|---|
| nao | não |
| Configuracoes | Configurações |
| Funcionarios | Funcionários |
| Planos de Acao | Planos de Ação |
| anonimo / anonimos | anônimo / anônimos |
| Periodo | Período |
| Titulo | Título |
| Descricao | Descrição |
| Organizacao | Organização |
| situacao | situação |
| invalido | inválido |
| minimo / maximo | mínimo / máximo |
| possivel | possível |
| minusculas | minúsculas |
| numeros | números |
| revisao / revisoes | revisão / revisões |
| funcao | função |
| opcao | opção |
| relatorio | relatório |
| historico | histórico |
| automatico | automático |
| publico | público |
| tecnico | técnico |
| unico | único |
| basico | básico |
| critico | crítico |
| especifico | específico |
| saude | saúde |
| metricas | métricas |
| numero | número |
| pagina | página |
| valido | válido |
| ate | até |
| tambem | também |
| nenhum/nenhuma | nenhum / nenhuma (já correto, mas atenção ao contexto) |

#### Exceções legítimas — onde acentos são intencionalmente omitidos

| Contexto | Exemplo | Motivo |
|---|---|---|
| Endereços de e-mail (placeholders ou reais) | `voce@empresa.com` | E-mails não aceitam caracteres acentuados |
| IDs HTML / âncoras de URL | `id="solucao"`, `href="#solucao"` | IDs devem ser URL-safe; o texto do link pode (e deve) estar acentuado |
| Chaves de objetos / union types internos | `type FlowActor = "voce"` | Identificadores de código não são texto exibido ao usuário |
| Slugs de rota (URL segments) | `/action-plans`, `/employees` | Rotas devem ser em inglês (ver §9 — Rotas em inglês) |

#### Checklist de ortografia antes de gerar qualquer texto em ptBR

Antes de escrever qualquer string em português, pergunte:
- A palavra possui vogal tônica? → acente-a (á, é, í, ó, ú, â, ê, ô, ã, õ, à)
- A palavra termina em `-ção`, `-ções`, `-ção`? → sempre com cedilha e til
- A palavra contém som de "ss" antes de `a`, `o`, `u`? → verifique se precisa de cedilha (ç)
- O texto será exibido diretamente ao usuário (label, mensagem de erro, toast, e-mail)? → ortografia perfeita é obrigatória

---

## 10. Design Patterns

### Separação de responsabilidades (obrigatória)

```
Repository   → acesso ao banco exclusivamente. Sem lógica de negócio.
Service      → lógica de negócio e orquestração entre repositórios. Sem acesso direto ao DB.
Schema (Zod) → contratos de entrada e saída. Sem lógica.
Types        → tipos TypeScript derivados dos schemas e do schema do banco.
Server Action → ponto de entrada HTTP. Valida input com Zod, chama Service, retorna resultado tipado.
```

### Repository Pattern

```typescript
// modules/employees/employee.repository.ts
export const employeeRepository = {
  findById: async (tenantId: string, id: string): Promise<Employee | null> => {
    return prisma.employee.findFirst({ where: { id, tenantId } })
  },

  create: async (tenantId: string, data: CreateEmployeeInput): Promise<Employee> => {
    return prisma.employee.create({ data: { ...data, tenantId } })
  },
}
```

### Service Layer

```typescript
// modules/employees/employee.service.ts
export const employeeService = {
  createEmployee: async (tenantId: string, data: CreateEmployeeInput): Promise<Employee> => {
    const org = await organizationRepository.findById(tenantId)
    const subscription = await billingRepository.findActiveSubscription(tenantId)
    const effectiveLimit = org.maxEmployeesOverride ?? subscription?.snapshotMaxEmployees ?? null

    if (effectiveLimit !== null) {
      const count = await employeeRepository.countActive(tenantId)
      if (count >= effectiveLimit) {
        throw new AppError("EMPLOYEE_LIMIT_REACHED", "Limite de colaboradores atingido.")
      }
    }

    const employee = await employeeRepository.create(tenantId, data)

    await auditRepository.insert({
      tenantId,
      actorId: data.createdBy,
      actorType: "org_user",
      action: "employee.created",
      entityType: "employee",
      entityId: employee.id,
    })

    return employee
  },
}
```

### Adapter Pattern para integrações

O service usa a interface; nunca instancia o adapter diretamente:

```typescript
// Correto — o service não sabe qual provedor está sendo usado
const messaging = getMessagingService()
await messaging.send({ to: employee.phone, body: healthSurveyLink })
```

### Factory para integrações

```typescript
// libs/integrations/index.ts
export function getMessagingService(): IMessagingService {
  switch (env.MESSAGING_PROVIDER) {
    case "smsbarato":   return new SmsBaratoAdapter()
    default:            return new ConsoleMessageAdapter()
  }
}

export function getEmailService(): IEmailService {
  switch (env.EMAIL_PROVIDER) {
    case "resend": return new ResendAdapter()
    default:       return new ConsoleEmailAdapter()
  }
}

export function getBillingService(): IBillingService {
  switch (env.BILLING_PROVIDER) {
    case "stripe": return new StripeAdapter()
    default:       return new FakeBillingAdapter()
  }
}
```

### Server Actions

```typescript
// app/(tenant)/employees/new/actions.ts
"use server"

export async function createEmployeeAction(formData: CreateEmployeeInput): Promise<ActionResult> {
  const session = await getSession()
  if (!session) redirect("/login")

  const parsed = createEmployeeSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message }
  }

  try {
    const employee = await employeeService.createEmployee(session.tenantId, {
      ...parsed.data,
      createdBy: session.userId,
    })
    revalidatePath("/employees")
    return { success: true, data: employee }
  } catch (err) {
    if (err instanceof AppError) {
      return { success: false, error: err.message }
    }
    throw err
  }
}
```

---

## 11. Fluxo de Dados

### Leitura em página de tenant (RSC)

```
Browser → proxy.ts
  ├─ Verifica cookie de sessão
  ├─ Resolve tenantId a partir da sessão
  └─→ App Router (RSC)
        └─→ Page Component (server)
              ├─ Chama Service diretamente (sem fetch/API)
              └─ Renderiza HTML com dados + Client Components para interatividade
```

### Mutação via Server Action

```
Client Component (formulário)
  └─→ Server Action
        ├─ Extrai tenantId e userId da sessão
        ├─ Valida input com Zod schema
        ├─ Chama Service
        │    ├─ Aplica regras de negócio
        │    ├─ Chama Repository (persistência)
        │    ├─ Registra audit log
        │    └─ Aciona integração via interface
        └─ Retorna { success: true, data } ou { success: false, error }
```

### Fluxo público — Formulário de pesquisa

```
Link individual → GET /health-survey/[token]
  ├─ [GUARD 1] Token não existe → TokenInvalidPage
  ├─ [GUARD 2] used_at IS NOT NULL → AlreadyAnsweredPage
  ├─ [GUARD 3] expires_at < now() → LinkExpiredPage
  ├─ [GUARD 4] Validação de janela de trabalho:
  │    ├─ Busca organizations.timezone para o tenant
  │    ├─ Converte now() para o fuso da organização
  │    ├─ Extrai hora atual (HH:MM) no fuso local
  │    ├─ Compara com token.work_start_time e token.work_end_time
  │    │    └─ Suporta turno noturno: se work_end < work_start → cruza meia-noite
  │    └─ Se fora da janela → OutsideWorkHoursPage
  └─ [PASS] → Client Component (formulário 1–5)
        ├─ "Não quero mais participar" → Server Action: optOut(token)
        └─ Submit → Server Action:
              ├─ Re-executa todos os guards (idempotência)
              ├─ Cria health_survey_response (sem employee_id)
              ├─ Cria health_survey_response_items
              └─ Marca token: used_at = now() (atômico com INSERT acima)
```

### Fluxo de alerta automático

```
health_survey_dispatch enviado
  └─→ Job (adherence-checker, após 48h)
        ├─ Calcula taxa de adesão: soma(total_responses) / soma(total_recipients) em health_survey_dept_dispatches
        ├─ Se < 80%: cria alert (type: 'low_adherence')
        ├─ Calcula média do período por setor
        ├─ Compara com período anterior: queda > 1 ponto → alert (type: 'score_drop')
        └─ Verifica 3 períodos consecutivos abaixo da média → alert (type: 'negative_trend')
```

---

## 12. Autenticação e Sessão

### Estrutura da sessão

```typescript
type SessionPayload =
  | {
      type: "org_user"
      userId: string
      tenantId: string
      tenantSlug: string
      role: "admin" | "rh"
    }
  | {
      type: "super_admin"
      userId: string
    }
```

### Funções de sessão

```typescript
// modules/auth/session.ts
export async function getSession(): Promise<SessionPayload | null>
export async function getSuperAdminSession(): Promise<SuperAdminSessionPayload | null>
```

**Toda Server Action** deve chamar a função de sessão correspondente ao contexto e redirecionar para `/login` se não houver sessão válida.

### Proxy (proxy.ts)

O arquivo `src/proxy.ts` com export `proxy` substitui o antigo `middleware.ts` no Next.js 16. Responsabilidades:

- Verificar sessão em rotas protegidas
- Redirecionar para `/login` quando não autenticado
- Bloquear acesso de `org_user` ao `/super-admin/*`
- Bloquear acesso de `super_admin` ao `/(tenant)/*`

**Caminhos públicos** (sem autenticação): `/login`, `/forgot-password`, `/reset-password/*`, `/invite/*`, `/health-survey/*`, `/climate-survey/*`, `/report/*`, `/checkout`, `/accept-terms`, `/learn-more`, `/privacy-policy`, `/platform-terms`, `/consent-terms`, `/data-deletion`, `/api/webhooks/*`, `/api/health`, `/api/track/*`

### Fluxo de login (tenant)

```
POST /login
  ├─ Recebe: { slug, email, password }
  ├─ Busca organization WHERE slug = ? AND is_active = true
  │    └─ Se não encontrado: bcrypt.compare(password, DUMMY_HASH) → lança INVALID_CREDENTIALS
  ├─ Busca organization_users WHERE tenant_id = org.id AND email = ? AND is_active = true
  │    └─ Se não encontrado/inativo: bcrypt.compare(password, DUMMY_HASH) → lança INVALID_CREDENTIALS
  ├─ bcrypt.compare(password, user.password_hash)
  ├─ Cria session cookie (HttpOnly, Secure, SameSite=Strict)
  └─ Redireciona para /dashboard (BillingWallModal exibido se billing não ativo)
```

#### Proteção contra timing oracle — regra obrigatória

**Todo caminho de early-exit no `login()` que ocorra antes do `bcrypt.compare` real deve executar um dummy compare.** Sem isso, um atacante pode medir a diferença de tempo de resposta para enumerar slugs de organização e endereços de e-mail válidos.

```typescript
// ✅ CORRETO — dummy compare equaliza o tempo de resposta
const DUMMY_HASH = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGc.0C5EOnf2Hy4P7dymR0Y7nUi"

const org = await findOrgBySlug(input.orgSlug)
if (!org) {
    await bcrypt.compare(input.password, DUMMY_HASH)  // ~200ms de custo bcrypt
    throw new AppError("INVALID_CREDENTIALS", msg)
}

// ❌ PROIBIDO — responde em ~5ms para slug inválido, ~200ms para válido
if (!org) throw new AppError("INVALID_CREDENTIALS", msg)
```

O `DUMMY_HASH` é um hash bcrypt pré-computado com cost factor 12. O `bcrypt.compare` extrai o fator do próprio hash e executa exatamente o mesmo número de iterações — garantindo que o tempo de resposta seja idêntico independentemente de a org ou o usuário existirem.

### Reset de senha

```
/forgot-password → Server Action: requestPasswordReset(email, orgSlug)
  ├─ Cria AuthToken { type: 'password_reset', expires_at: +1h }
  └─ Envia email template 'password_reset' com link /reset-password/[token]

/reset-password/[token] → Server Action: resetPassword(token, newPassword)
  ├─ Valida token (não expirado, não usado)
  ├─ bcrypt.hash(newPassword)
  ├─ Atualiza organization_users.password_hash
  └─ Marca token.used_at = now()
```

### Proibição de impersonação

O Super Admin **não possui** mecanismo de "login como organização". Não existe rota, Server Action ou lógica que permita criar uma sessão `org_user` a partir de uma sessão `super_admin`. Esta restrição garante conformidade com a LGPD.

---

## 13. Contratos de Integrações Externas

> **Princípio:** nenhum service do domínio conhece a implementação concreta. Trocar de provedor exige apenas criar novo adapter e atualizar a variável `*_PROVIDER` no `.env`. Zero alteração em código de negócio. **Nomes de provedores externos (Stripe, Resend) nunca aparecem na UI** — apenas nos adapters e variáveis de ambiente.

### Messaging

```typescript
// libs/integrations/messaging/messaging.interface.ts
export interface HealthSurveyMessageParams {
  recipientPhone: string
  recipientName: string
  surveyLink: string
}

export interface IMessagingService {
  sendHealthSurveyDispatch(params: HealthSurveyMessageParams): Promise<SendMessageResult>
  sendHealthSurveyReminder(params: HealthSurveyMessageParams): Promise<SendMessageResult>
  sendClimateSurveyDispatch(params: ClimateSurveyMessageParams): Promise<SendMessageResult>
  sendClimateSurveyReminder(params: ClimateSurveyMessageParams): Promise<SendMessageResult>
}
```

**Design:** a interface é específica ao domínio — cada método codifica a ação de negócio. Os adapters escolhem internamente o template e constroem o texto da mensagem. O código chamador nunca passa `templateName` nem `messageText`.

**Implementação SMS Barato (SMS):** `MESSAGING_PROVIDER=smsbarato` → `SmsBaratoAdapter` ✅  
**Implementação SMS Barato (WhatsApp):** `MESSAGING_PROVIDER=smsbarato-wa` → `SmsBaratoWaAdapter` ✅  
**Desenvolvimento:** `MESSAGING_PROVIDER=console` → `ConsoleMessageAdapter` (imprime no terminal)  
**Variáveis SMS Barato (SMS):** `SMSBARATO_API_KEY`, `SMSBARATO_BASE_URL` (default `"https://sistema81.smsbarato.com.br/send"`)  
**Variáveis SMS Barato (WhatsApp):** `SMSBARATO_API_KEY` (compartilhada), `SMSBARATO_WA_BASE_URL` (default `"https://sistema81.smsbarato.com.br/sendwa"`), `SMSBARATO_WA_TEMPLATE` (dispatch — default `"pulse_survey_2"`), `SMSBARATO_WA_REMINDER_TEMPLATE` (lembrete — default `"pulse_survey_reminder_2"`)  
**Webhook de status:** `MESSAGING_WEBHOOK_SECRET` — protege `POST/GET /api/webhooks/messaging` (header `x-messaging-webhook-secret` ou query `secret`). Aceita payload plano `{ id, status, error?, timestamp? }` ou formato Meta Cloud API (`entry[].changes[].value.statuses[]`). Status mapeados: enviado/`sent`, entregue/`delivered`, lido/`read`, falhou/`failed`.  
**Fila:** cada destinatário gera um job BullMQ `send-message` com `surveyLink` único + `dispatchId`; `processOutboundSurveyMessage` grava `message_logs` e falhas temporárias disparam retentativa automática.  
**Variáveis de template SMS:** `SURVEY_MESSAGE_TEMPLATE` (template de texto do dispatch, com `{nome}` e `{link}`), `SURVEY_REMINDER_MESSAGE_TEMPLATE` (template de texto do lembrete)  
**Restrições SMS Barato (SMS):** texto máximo de 150 chars (sem contar a URL); acentos e quebras de linha removidos automaticamente pelo adapter; `dest` deve ser apenas dígitos com DDD (sem `+55`)  
**Restrições SMS Barato (WhatsApp):** usa templates pré-aprovados no painel SMS Barato; os parâmetros são enviados na ordem esperada pelo template configurado (inclui o **link único** da pesquisa); `dest` igual ao SMS (apenas dígitos com DDD)

> **Regra de terminologia:** os termos "SMS", "WhatsApp" e "CPF" **nunca devem aparecer em código, banco de dados ou UI**. Substituições obrigatórias: SMS/WhatsApp → `mensagem`/`message`; CPF → `document`/`documento`. Essa proibição se aplica a nomes de arquivos, classes, funções, variáveis, campos de banco, labels de UI e mensagens de erro.

> **Nomes de templates do provedor externo (SMS Barato)** são valores de configuração de infraestrutura — não são identificadores de domínio da aplicação. As variáveis `SMSBARATO_WA_TEMPLATE` e `SMSBARATO_WA_REMINDER_TEMPLATE` usam nomes como `"pulse_survey"` e `"pulse_survey_reminder"`, que não seguem o prefixo `health_survey_`. Isso é intencional: esses valores são definidos no painel externo do provedor, não no código.

> **Regra de prefixo em tipos de mensagem:** todo valor de `MessageLogType` e de `SendMessageJobData.type` relacionado a pesquisas **deve usar o prefixo do domínio**. Pesquisas de saúde: `'health_survey_dispatch'`, `'health_survey_reminder'`. Pesquisas de clima: `'climate_survey_dispatch'`, `'climate_survey_reminder'`. Valores genéricos como `'survey_dispatch'` são proibidos.
### Email

```typescript
// libs/integrations/email/email.interface.ts
export interface IEmailService {
  send(params: SendEmailParams): Promise<SendEmailResult>
}
```

**Implementação atual:** `EMAIL_PROVIDER=resend` → `ResendAdapter`  
**Desenvolvimento:** `EMAIL_PROVIDER=console` → `ConsoleEmailAdapter` (imprime HTML completo no terminal)  
**Variáveis necessárias:** `RESEND_API_KEY`, `EMAIL_FROM`

#### Templates de e-mail e gatilhos

| Template | Gatilho |
|---|---|
| `org_invite` | Super Admin cria organização |
| `password_reset` | Usuário solicita reset de senha |
| `plan_subscribed` | Webhook `checkout.session.completed` |
| `payment_failed` | Webhook `invoice.payment_failed` |
| `plan_cancelled` | Webhook `customer.subscription.deleted` |
| `account_deletion_confirm` | Admin solicita exclusão da conta |
| `account_deletion_scheduled` | Exclusão agendada confirmada |
| `email_verification` | Verificação de e-mail |
| `climate-survey-dispatch` | Disparo de pesquisa de clima (canal E-mail) — CTA com link de tracking + pixel de abertura |
| `climate-survey-reminder` | Lembrete de pesquisa de clima para não-respondentes (canal E-mail) |

#### Sincronização obrigatória com o Design System

> ⚠️ **REGRA INVIOLÁVEL — Templates de e-mail:** toda alteração no design system da aplicação (cores, tipografia, logo, espaçamentos, identidade visual) **deve ser refletida imediatamente em todos os templates HTML** localizados em `assets/email/template/`.

Os templates de e-mail são a extensão visual do produto. Eles devem sempre seguir o mesmo padrão da interface web:

| Elemento | Valor atual | Onde está no app |
|---|---|---|
| Cor primária (CTA, links) | `#3DB98A` | `--primary` / `brand-500` |
| Cor de fundo do header/sidebar | `#1a1a2e` | `--sidebar` / `brand-900` |
| Fundo da página | `#f1f5f9` | `--background` |
| Fundo de card / rodapé | `#f8fafc` | `--card` |
| Cor de borda | `#e5e7eb` | `--border` |
| Texto principal | `#374151` | `--foreground` |
| Texto secundário | `#6b7280` | `--muted-foreground` |
| Logo — "PULSE" | `font-weight:900`, cor `#3DB98A`, `letter-spacing:-0.02em` | `Logo` component |
| Logo — "IPS" | `font-weight:300`, cor `rgba(255,255,255,0.4)`, `letter-spacing:0.18em` | `Logo` component |

**Checklist de sincronização — obrigatório antes de marcar qualquer tarefa de UI como concluída:**

1. Foram alteradas cores do tema (`globals.css`, `tailwind.config.ts`, tokens CSS)? → Atualizar `assets/email/template/*.html`
2. Foi alterado o componente `Logo` (`src/libs/design-system/components/logo.tsx`)? → Atualizar o bloco `<!-- HEADER -->` em todos os templates
3. Foi adicionado novo fluxo de e-mail? → Criar arquivo em `assets/email/template/`, registrar em `src/libs/email-templates/index.ts` e adicionar na tabela acima
4. Foi alterada a tipografia principal da aplicação? → Verificar `font-family` declarado nos templates

**Restrições técnicas dos templates (e-mail seguro):**
- Sem flexbox ou CSS grid — usar apenas `<table>` para layout
- Sem `border-radius` — manter bordas retas, igual ao design system atual
- Sem classes CSS — todos os estilos devem ser inline
- Sem `<script>` ou recursos externos não confiáveis

### Billing

```typescript
// libs/integrations/billing/billing.interface.ts
export interface IBillingService {
  createProduct(params: CreateProductParams): Promise<CreateProductResult>
  createPrice(params: CreatePriceParams): Promise<CreatePriceResult>
  createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CreateCheckoutSessionResult>
  createBillingPortalSession(params: CreateBillingPortalSessionParams): Promise<CreateBillingPortalSessionResult>
  cancelSubscription(externalSubscriptionId: string): Promise<void>
  constructWebhookEvent(params: ConstructWebhookEventParams): Promise<BillingWebhookEvent>
}
```

**Implementação atual:** `StripeAdapter`  
**Variáveis necessárias:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

> **Regra:** os campos do banco usam `external_product_id` e `external_price_id` — o prefixo `external_` abstrai o provedor. O Stripe é mencionado apenas nos adapters e variáveis de ambiente.

### Storage

```typescript
export interface IStorageService {
  upload(params: UploadFileParams): Promise<UploadFileResult>
  download(key: string): Promise<Buffer>
  delete(key: string): Promise<void>
  getUrl(key: string): Promise<string>
}
```

### Rate Limiter

```typescript
// libs/integrations/rate-limiter/rate-limiter.interface.ts
export interface IRateLimiterService {
  check(key: string, limit: number, windowSeconds: number): Promise<RateLimitCheckResult>
}
```

**Implementação Redis:** `RATE_LIMITER_PROVIDER=redis` → `RedisRateLimiterAdapter` ✅  
**Desenvolvimento/Testes:** `RATE_LIMITER_PROVIDER=memory` → `InMemoryRateLimiterAdapter`

O adapter Redis usa `rate-limiter-flexible` (Lua atômica internamente) e mantém um cache de instâncias `RateLimiterRedis` por configuração `(limit, windowSeconds)`. O adapter in-memory usa um `Map<string, RateLimitBucket>` com expiração por timestamp — útil para testes sem Redis.

**Factory:** `getRateLimiterService()` em `src/libs/integrations/index.ts` retorna um **singleton** (a instância é cacheada no módulo), garantindo que o cache interno de instâncias do adapter Redis seja preservado entre requests.

**Camada consumidora:** `src/libs/rate-limit.ts` é o único arquivo que chama `getRateLimiterService()` — as Server Actions importam apenas `enforceRateLimit`, `checkRateLimit` e `getClientIp` de `@/libs/rate-limit`, sem nenhum acoplamento direto ao `rate-limiter-flexible`.

#### Rate limiter — princípio fail-closed obrigatório

**O rate limiter deve sempre falhar fechado (fail-closed), nunca aberto (fail-open).** Se o Redis estiver indisponível ou ocorrer qualquer erro de infraestrutura, a requisição deve ser **bloqueada**, não permitida.

Isso se aplica em duas camadas independentes:

**1. Adapter Redis (`RedisRateLimiterAdapter`):**
```typescript
} catch (err) {
    if (err instanceof RateLimiterRes) {
        return { allowed: false, retryAfterSeconds: Math.ceil(err.msBeforeNext / 1000) }
    }
    // Redis indisponível → bloquear para preservar a garantia de segurança
    return { allowed: false, retryAfterSeconds: 60 }
}
```

**2. Proxy layer (`proxy.ts` — `enforceProxyRateLimit`):**
```typescript
try {
    const response = await fetch(`${env.INTERNAL_API_URL}/api/internal/rate-limit-proxy`, ...)
    if (!response.ok) {
        // Endpoint interno retornou erro → fail-closed
        return NextResponse.json({ error: "Muitas tentativas." }, { status: 429 })
    }
    ...
} catch {
    // Fetch falhou (timeout, rede, etc.) → fail-closed
    return NextResponse.json({ error: "Muitas tentativas." }, { status: 429 })
}
```

#### Rate limiter — proxy por IP (camada de entrada)

O `proxy.ts` aplica rate limiting **antes** de qualquer código da aplicação, usando a rota interna `/api/internal/rate-limit-proxy` com timeout de 2 segundos:

| Rota | Limite | Janela |
|---|---|---|
| `/login` | 20 requisições | 15 minutos |
| `/forgot-password` | 5 requisições | 15 minutos |
| `/super-admin/login` | 10 requisições | 15 minutos |

A chave de rate limiting é o IP do cliente (extraído via `extractClientIp` de `@/libs/utils/client-ip.ts`), que verifica os headers `cf-connecting-ip` → `x-real-ip` → `x-forwarded-for` em ordem de prioridade.

**Fail-closed no proxy:** se o Redis estiver indisponível, o timeout de 2s é atingido e a requisição é bloqueada com `HTTP 429`. Isso é intencional — protege contra brute-force mesmo durante instabilidades do Redis.

#### Rate limiter — CSP e logs de violação

O proxy define um `Content-Security-Policy` strict com `nonce` único por requisição. Violações de CSP são reportadas em `POST /api/csp-report`, que é rate-limitado a 20 requisições por 60 segundos por IP para evitar abuso. As violações são logadas via pino logger mas **não persistidas no banco**.

### AI

```typescript
// libs/integrations/ai/ai.interface.ts
export interface AIToolDefinition {
  name: string
  description: string
  parameters: JsonValue
}

export interface AIToolCall {
  id: string
  name: string
  arguments: string   // JSON bruto — o tool handler faz o parse e valida com Zod
}

export interface AIGenerateParams {
  system: string
  messages: AIMessage[]
  tools?: AIToolDefinition[]
  tier?: AIModelTier   // "high" | "medium" | "low" (default: "medium")
  temperature?: number
  maxTokens?: number
}

export interface AIGenerateResult {
  text: string | null
  toolCalls: AIToolCall[]
  usage: { inputTokens: number; outputTokens: number }
}

export interface IAIService {
  generate(params: AIGenerateParams): Promise<AIGenerateResult>
}
```

**Implementação OpenAI:** `AI_PROVIDER=openai` → `OpenAIAdapter` (via `fetch`, sem SDK)  
**Implementação Claude:** `AI_PROVIDER=claude` → `ClaudeAdapter` (via `fetch`, sem SDK)  
**Implementação Gemini:** `AI_PROVIDER=gemini` → `GeminiAdapter` (via `fetch`, sem SDK)  
**Desenvolvimento:** `AI_PROVIDER=console` → `ConsoleAIService` (no-op)  
**Factory:** `getAIService()` em `src/libs/integrations/index.ts`

**Tiers de modelo e fallback:** cada adapter define **3 modelos por tier** (`high`/`medium`/`low`) e tenta em ordem até um responder (`runWithAIModelFallback`); cada falha intermediária é registrada via logger (`warn`) antes de tentar o próximo modelo. Os defaults ficam no próprio adapter; as listas podem ser sobrescritas por env (`OPENAI_MODELS_HIGH`, `ANTHROPIC_MODELS_LOW`, etc. — valores separados por vírgula). O caller escolhe o tier via `params.tier` (ex.: extração em `medium`, validação em `high`).

**Regra inviolável — o modelo nunca acessa o banco nem escreve SQL.** Ele apenas retorna `toolCalls`; o código da aplicação valida os argumentos com Zod e persiste via service/repository (tool handler). Toda chamada de IA é feita via `getAIService()`, nunca instanciando o adapter direto.

O PDF do relatório PGR é gerado **sob demanda** pela rota `GET /api/pgr/[id]/pdf`, sem armazenamento em disco/storage. A abordagem é domain-specific — não usa a interface genérica `IPDFService`.

**Adapter:** `src/libs/integrations/pdf/pgr-pdf.adapter.tsx`  
**Tipos de input:** `src/libs/integrations/pdf/pgr-pdf.types.ts`  
**Rota de geração:** `src/app/api/pgr/[id]/pdf/route.ts`  
**Botão de download:** `src/app/(tenant)/pgr/[id]/pgr-download-button.tsx`

```typescript
// Função exportada pelo adapter — chamada pela rota da API
export async function generatePgrPdf(data: PgrPdfInput): Promise<Buffer>
```

**Conteúdo do PDF:**
- Capa com índice de saúde global, métricas de participação e tabela-resumo de setores
- Uma página por setor com breakdown de perguntas e barra de progresso colorida por score
- Footer fixo em todas as páginas (nome da org, período, paginação)

**Regra de camada:** o adapter está em `libs/integrations/` e pode importar `libs/utils/`. A rota chama o adapter diretamente após buscar os dados via service (`getPgrReviewById`, `getOrganization`).

**Por que não usa `IPDFService`:** a interface genérica (`generatePGRReport(data: PGRReportData)`) é desnecessariamente abstrata — só existe um formato de PDF no produto. Criar um adapter concreto que implemente essa interface adicionaria uma camada de indireção sem nenhum benefício real.

---

## 14. Design System

### Stack visual

- **Tailwind CSS v4** — sistema de tokens e utilitários
- **shadcn/ui** — componentes acessíveis (maioria via Radix UI, `Select` via `@base-ui/react`), instalados em `src/libs/design-system/components/ui/`
- **Lucide React** — ícones
- **next-themes** — gerenciamento de tema (light/dark) SSR-safe

### Tokens (tailwind.config.ts)

```typescript
darkMode: "class",
theme: {
  extend: {
    colors: {
      brand: {
        50:  "#f0fdf9",
        100: "#d1faf0",
        500: "#3DB98A",   // ação primária
        600: "#2a9b71",   // hover
        700: "#1e7a57",
        900: "#1a1a2e",
      },
      success: { 50: "#f0fdf4", 500: "#16a34a", 700: "#15803d" },
      warning: { 50: "#fffbeb", 500: "#d97706", 700: "#b45309" },
      danger:  { 50: "#fef2f2", 500: "#CC0000", 700: "#990000" },
      neutral: {
        50: "#f8fafc", 100: "#f1f5f9", 200: "#e2e8f0",
        500: "#64748b", 700: "#334155", 900: "#1a1a2e",
      },
    },
    fontFamily: {
      sans: ["Inter", "system-ui", "sans-serif"],
    },
  },
},
```

**Regra:** nenhum componente usa cores hardcoded (`text-slate-900`, `bg-white`). Sempre usar variáveis semânticas do shadcn/ui (`bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`) para que os temas funcionem automaticamente.

### Sistema de tema (ThemeProvider + ThemeToggle)

O tema é persistido via **cookie `pulse:theme`** (lido no servidor no `layout.tsx`) e via `localStorage` (lido no cliente). Isso garante que a classe `dark` seja aplicada no `<html>` durante o SSR, sem FOUC e sem script inline.

**`src/app/layout.tsx`** — aplica a classe `dark` no `<html>` com base no cookie:
```tsx
export default async function RootLayout({ children }: { children: React.ReactNode }): Promise<React.ReactElement> {
  const cookieStore = await cookies()
  const isDark = cookieStore.get("pulse:theme")?.value === "dark"
  return (
    <html lang="pt-BR" className={`${poppins.variable} h-full antialiased${isDark ? " dark" : ""}`} suppressHydrationWarning>
      ...
    </html>
  )
}
```

**`src/components/theme-provider.tsx`** — mantém o estado no cliente e escreve `localStorage` + cookie ao mudar:
```tsx
const setTheme = useCallback((next: Theme): void => {
  setThemeState(next)
  localStorage.setItem("pulse:theme", next)
  document.cookie = `pulse:theme=${next};path=/;max-age=31536000;SameSite=Lax`
}, [])
```

**`src/components/theme-toggle.tsx`** — ambos os ícones sempre no DOM; visibilidade controlada por CSS (`dark:scale-*`), sem renderização condicional para evitar mismatch de hidratação:
```tsx
<span className="relative w-4 h-4">
  <Sun className="absolute inset-0 w-4 h-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
  <Moon className="absolute inset-0 w-4 h-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
</span>
```

**Regra:** nunca usar renderização condicional `{isDark ? <Sun /> : <Moon />}` — causa hydration mismatch. Usar sempre o padrão CSS-only acima.

```css
:root {
  --background: oklch(0.978 0.004 149);
  --foreground: oklch(0.228 0.025 249);   /* #1a1a2e — navy escuro */
  --primary: oklch(0.709 0.066 149.5);    /* #3DB98A — verde primário */
  --primary-foreground: oklch(0.228 0.025 249);  /* navy — contraste sobre verde */
  --destructive: oklch(0.531 0.211 17.6); /* #CC0000 — vermelho */
  --muted: oklch(0.955 0.005 149);
  --border: oklch(0.882 0.010 149);
}
```

**Sidebar (dark navy):**
```css
--sidebar: oklch(0.175 0.022 249);           /* #1a1a2e */
--sidebar-foreground: oklch(0.920 0.012 149); /* texto claro */
--sidebar-primary: oklch(0.709 0.066 149.5);  /* verde ativo */
```

**Regra:** nenhum componente usa cores hardcoded (`text-slate-900`, `bg-white`). Sempre usar variáveis semânticas do shadcn/ui (`bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`).

### Bordas em controles de formulário — fonte única de verdade

**Todos os controles interativos de formulário** (`Input`, `Select`/`SelectTrigger`, `Textarea`) devem ter borda claramente visível para comunicar ao usuário que o campo é interativo.

**Implementação:** a borda é controlada pela variável CSS `--input-border` em `src/app/globals.css`. Não modifique bordas diretamente nos componentes — altere apenas essa variável.

```css
/* src/app/globals.css — única fonte de verdade para bordas de form controls */
--input-border: oklch(0.740 0.018 149);   /* borda padrão — visível mas sutil */
```

Os estilos são aplicados via `data-slot` no `@layer base` de `globals.css`:

```css
[data-slot="input"]          { border-color: var(--input-border); }
[data-slot="select-trigger"] { border-color: var(--input-border); }
[data-slot="textarea"]       { border-color: var(--input-border); }
```

Focus e hover são centralizados no mesmo bloco — ao focar, a borda muda para `--primary` com shadow sutil.

**Regra:** nunca sobrescreva a borda de um Input/Select/Textarea diretamente em um componente de página. Se um campo precisa de borda especial, discuta a alteração em `globals.css`.

### Identidade visual

- **Primária:** verde corporativo `#3DB98A` — saúde, bem-estar, confiança
- **Escura:** navy `#1a1a2e` — seriedade, contraste (sidebar, destaques)
- **Tipografia:** Poppins (configurada via `next/font`)
- **Acessibilidade:** foco visível em todos os elementos interativos, contraste WCAG AA, labels em todos os inputs

### Componentes base

```
libs/design-system/components/
├── ui/              # shadcn/ui (Button, Input, Select, Dialog, Table, Badge, Tabs, Card…)
├── layout/          # Sidebar, Header, SuperAdminSidebar, PageHeader, Section
├── feedback/        # Alert, EmptyState, LoadingSpinner
└── data-display/   # StatCard, DataTable, StatusBadge, SectorHealthBar
```

### Layout padrão de páginas

Páginas do painel (`(tenant)` e `(super-admin)`) seguem o padrão:

```tsx
<div className="flex flex-col h-full">
  <PageHeader title="Título" />
  <div className="flex-1 overflow-y-auto p-4 md:p-6">
    {/* conteúdo */}
  </div>
</div>
```

### `suppressHydrationWarning`

O `<body>` em `src/app/layout.tsx` tem `suppressHydrationWarning` para evitar erros de hidratação causados por extensões de browser (ex: Grammarly) que injetam atributos no DOM.

### `color-scheme` para inputs nativos de data/hora — regra global

Inputs nativos do browser (`<input type="time">`, `<input type="date">`, `<input type="datetime-local">`) exibem ícones controlados pela propriedade CSS `color-scheme`. Sem essa propriedade no dark mode, o ícone de relógio/calendário permanece escuro mesmo com o restante da interface em dark.

**Implementação:** uma regra global em `src/app/globals.css` cobre todos os inputs nativos de data/hora:

```css
/* globals.css — regra global (não repetir em componentes individuais) */
.dark input[type="time"],
.dark input[type="date"],
.dark input[type="datetime-local"] {
  color-scheme: dark;
}
```

O componente shadcn `<Input>` já aplica `[color-scheme:light] dark:[color-scheme:dark]` via Tailwind — a regra global em globals.css cobre os inputs nativos que **não** usam o componente `<Input>` (ex: em `health-survey-config-form.tsx` e `department-controls.tsx`).

**Regra:** nunca adicione `dark:[color-scheme:dark]` inline em inputs individuais — a regra global em globals.css é a fonte única de verdade e cobre todos os casos.

---

## 15. Pagamento e Faturamento (Stripe)

### Fluxo: Super Admin cria plano

```
/super-admin/plans/new → planService.createPlan(name, description, maxEmployees)
  ├─ billing.createProduct({ name, description }) → Stripe API
  └─ Salva plans { name, description, max_employees, external_product_id }
```

### Fluxo: Super Admin adiciona preço

```
/super-admin/plans/[id]/pricing → planService.addPrice(planId, priceBrl, interval)
  ├─ billing.createPrice({ externalProductId, amountInCents, interval }) → Stripe API
  └─ Salva plan_prices { plan_id, external_price_id, interval, price_in_cents, is_active: true }
```

### Fluxo: Super Admin configura funcionalidades do plano

```
/super-admin/plans/[id]/features → planService.updatePlanFeatures(planId, features)
  ├─ Deleta todas plan_features existentes para o plano
  └─ Insere novas plan_features atomicamente (transação)
```

> Alterar `plan_features` **não afeta** clientes que já assinaram. As funcionalidades vigentes ficam em `subscription_features`, atualizado apenas quando o cliente faz upgrade/downgrade de plano via Stripe.

### Funcionalidades disponíveis por plano

| Feature | Chave | Recursos afetados |
|---|---|---|
| Planos de Ação | `action_plans` | `/action-plans`, `/action-plans/new`, `/action-plans/[id]` |
| Documentos | `documents` | `/documents` |
| Relatos Anônimos | `anonymous_reports` | `/reports` |
| PGR | `pgr` | `/pgr`, `/pgr/[id]`, alertas `pgr_review_due` |
| Mensagens | `messaging` | Disparo automático de mensagens ao criar pesquisa. Sem essa feature, o RH distribui apenas via link assinado. |
| Pesquisa de Clima | `climate_surveys` | `/climate-surveys` (Board), `/climate-surveys/adherence` (Adesão), `/climate-surveys/configure` (Banco de Perguntas), `/climate-surveys/dispatches` (Disparo & Canais), `/climate-surveys/action-plans`, `/climate-surveys/[dispatchId]`, rotas públicas `/climate-survey/*` |

**Guard de acesso em páginas tenant:** o `(tenant)/layout.tsx` carrega `getTenantPlanFeatures(tenantId)` e passa para o `Sidebar`, que filtra os itens de navegação. Cada página de funcionalidade gateada chama `hasTenantPlanFeature(tenantId, feature)` e redireciona para `/dashboard` se o tenant não possui a funcionalidade no plano adquirido.

**Guard em jobs:** antes de criar alertas relacionados a uma funcionalidade específica (ex: `pgr_review_due`), o job deve verificar `hasTenantPlanFeature(tenantId, "pgr")`. Se o tenant não tem a feature → pular.

**Guard de messaging em dispatch:** `sendDispatchTokensAndMessages` chama `hasTenantPlanFeature(tenantId, "messaging")` antes de enfileirar mensagens. Sem a feature, tokens individuais são criados normalmente (o link assinado funciona) mas nenhuma mensagem é enviada.

### Fluxo: Checkout (organização assina um plano)

```
Admin da org → /billing → escolhe plano
  └─→ billingService.startCheckout(tenantId, planPriceId)
        ├─ Busca plan_prices.external_price_id
        ├─ Guard: se external_price_id for null → erro amigável (admin deve recriar o preço)
        ├─ Busca/cria external_customer_id para a org
        ├─ billing.createCheckoutSession({ ... }) → Stripe hosted checkout
        └─ Webhook checkout.session.completed → cria organization_subscriptions com SNAPSHOT
```

### Fluxo: Atualização de preço

Stripe não permite editar `unit_amount`. Ao atualizar:
1. `billing.createPrice(...)` cria novo Price no Stripe
2. Insere novo `plan_prices` com `is_active = true`
3. Marca `plan_prices` anterior com `is_active = false`
4. Assinaturas existentes mantêm o `snapshot_external_price_id` original — não são afetadas

### Webhooks Stripe

| Evento | Ação |
|---|---|
| `checkout.session.completed` | Cria `organization_subscriptions` com snapshot; `billing_status = 'active'` |
| `customer.subscription.updated` | Atualiza `status`, `current_period_*` |
| `customer.subscription.deleted` | `status = 'cancelled'`; `billing_status = 'cancelled'` |
| `invoice.payment_failed` | `billing_status = 'past_due'` |
| `invoice.payment_succeeded` | `billing_status = 'active'` |

**Idempotência:** antes de processar, verifica se `external_event_id` já existe em `billing_webhook_events`.

### Adapter Stripe (implementação)

```typescript
// libs/integrations/billing/stripe.adapter.ts
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-04-10" })

export class StripeAdapter implements IBillingService {
  async createProduct({ name, description }: CreateStripeProductParams) {
    const product = await stripe.products.create({ name, description })
    return { stripeProductId: product.id }
  }

  async createPrice({ stripeProductId, amountBrl, interval }: CreateStripePriceParams) {
    const price = await stripe.prices.create({
      product: stripeProductId,
      currency: "brl",
      unit_amount: amountBrl,
      recurring: { interval },
    })
    return { stripePriceId: price.id }
  }

  async createCheckoutSession(params: CreateCheckoutSessionParams) {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: params.stripePriceId, quantity: 1 }],
      customer: params.stripeCustomerId,
      customer_email: params.stripeCustomerId ? undefined : params.customerEmail,
      metadata: { organizationId: params.organizationId },
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    })
    return { sessionId: session.id, url: session.url! }
  }

  async createBillingPortalSession({ stripeCustomerId, returnUrl }: CreateBillingPortalSessionParams) {
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    })
    return { url: session.url }
  }

  async constructWebhookEvent({ rawBody, signature }: ConstructWebhookEventParams) {
    return stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  }
}
```

### Billing Portal

Admin pode autogerenciar assinatura (atualizar cartão, cancelar, baixar faturas) via Stripe Billing Portal acessado em `/billing`.

### Proteção de billing status no layout do tenant

O controle de billing é feito no `(tenant)/layout.tsx`, não no `proxy.ts`. O usuário pode logar normalmente independentemente do billing status. O layout verifica o `billingStatus` da organização e, se não for `active` ou `trialing` **e** não houver trial ativo (`trialExpiresAt > now()`) **e** a exclusão da conta não estiver agendada, renderiza o `BillingWallModal` sobre o conteúdo.

```typescript
// src/app/(tenant)/layout.tsx (trecho)
const ACTIVE_BILLING_STATUSES = new Set(["active", "trialing"])

const billingStatus = org?.billingStatus ?? "pending"
const isInTrial = org?.trialExpiresAt !== null && org?.trialExpiresAt !== undefined && org.trialExpiresAt > new Date()
const hasBillingWall = !isInTrial && deletionScheduledAt === null && !ACTIVE_BILLING_STATUSES.has(billingStatus)

return (
  <div>
    {/* layout normal */}
    {hasBillingWall && <BillingWallModal billingStatus={billingStatus} />}
  </div>
)
```

> **Trial bypass:** quando o Super Admin define `trialExpiresAt` para uma organização via `/super-admin/organizations/[id]` (ou na criação via `/super-admin/organizations/new`), o `BillingWallModal` não é exibido enquanto `trialExpiresAt > now()`, independentemente do `billingStatus`. O trial não afeta o auto-dispatch — `findAllTenantsActiveHealthSurveyConfigsForAutoDispatch` ainda filtra por `billingStatus IN ("active", "trialing")` apenas.

> **Deletion grace period:** quando `deletionScheduledAt IS NOT NULL` (exclusão agendada em andamento), o `BillingWallModal` também não é exibido — o usuário mantém acesso durante os 30 dias de carência para exportar dados ou cancelar a exclusão.

**`BillingWallModal`** (`src/app/(tenant)/billing/billing-wall-modal.tsx`):
- Overlay `fixed inset-0 z-50` que bloqueia a UI
- Mensagem personalizada por status (`pending`, `past_due`, `suspended`, `cancelled`)
- Botão "Gerenciar assinatura" → `/billing`
- **Não renderiza em `/billing`** (via `usePathname`) — permite ao usuário contratar um plano

**Impacto nas pesquisas automáticas:** `findActiveConfigsForAutoDispatch` filtra organizações com `billingStatus` não-ativo, pausando a criação de novos dispatches. Dispatches já agendados continuam sendo processados pelo `runHealthSurveyDispatcher` para que pesquisas emitidas possam ser respondidas.

---

## 16. Conformidade LGPD

### Princípio

`employee_consents` é a **prova legal** de que cada colaborador teve ciência e controle sobre sua participação. Deve ser imutável.

### Regras invioláveis

1. **Append-only:** `ConsentRepository` não expõe `update()` nem `delete()`
2. **Cada evento gera linha nova** — incluindo opt-out no formulário
3. **Documento armazenado apenas como hash SHA-256** e somente no evento `accepted` (campo `documentHash`)
4. **Sem `employee_id` em `health_survey_responses`** — desvinculamento garante anonimato
5. **Mínimo de respondentes configurável** para exibir métricas (enforçado no service, nunca na UI) — health surveys usam a variável de ambiente `HEALTH_SURVEY_MINIMUM_RESPONDENTS_FOR_DISPLAY` (padrão: `5`); Pesquisa de Clima usa percentual sobre destinatários configurável por org (`organizations.climate_survey_min_respondents_percent`, padrão `40`%, piso absoluto de `3` respondentes — helpers em `src/libs/utils/anonymity.ts`)
6. **`responded_at`** armazena apenas data (sem hora) — segunda camada de proteção ao anonimato

### Eventos e semântica do TCLE

| `event` | `source` típico | Descrição |
|---|---|---|
| `accepted` | `message_link` | Aceitou inline na Consent Gate — hash do documento salvo |
| `refused` | `message_link` | Recusou explicitamente na Consent Gate |
| `revoked` | `message_link` | Revogou aceite anterior |
| `opted_out` | `health_survey_form` | Pediu não-participação dentro do formulário |

### Estado atual do colaborador

```typescript
// consent.repository.ts
async getCurrentConsent(
  tenantId: string,
  employeeId: string
): Promise<EmployeeConsent | null> {
  return prisma.employeeConsent.findFirst({
    where: { tenantId, employeeId },
    orderBy: { createdAt: "desc" },
  })
}

// Um colaborador pode ser re-convidado após opted_out ou refused.
// Basta que o RH o reative — na próxima pesquisa disparada, receberá o link e verá a Consent Gate novamente.
```

### Acesso aos dados de consentimento

| Papel | Acesso agora | Acesso futuro |
|---|---|---|
| `rh` | ❌ Sem acesso | ❌ Sem acesso planejado |
| `admin` | ❌ Sem acesso | ❌ Sem acesso planejado |
| `super_admin` | ❌ Sem acesso | ✅ Read-only (feature flag) |
| Aplicação (jobs) | ✅ Read (verificar estado) | — |
| Formulário público | ✅ Insert (opt-out) | — |

> A ausência de UI hoje é deliberada. O dado existe para **defesa legal**, não para gestão operacional.

### Fluxo de opt-out no formulário

```
Colaborador abre formulário
  └─ Clica em "Não quero mais participar"
       └─→ Server Action: consentService.optOut(token)
             1. Valida token (não expirado, não usado)
             2. Resolve employee_id a partir do token
             3. Busca consent_term_version_id da versão ativa
             4. INSERT employee_consents {
                  tenant_id, employee_id,
                  consent_term_version_id,
                  event: 'opted_out',
                  source: 'health_survey_form',
                  created_at: now()
                }
             5. UPDATE health_survey_response_tokens SET used_at = now()
             6. Retorna <OptOutConfirmedPage />
```

> Após o opt-out, o job `HealthSurveyDispatcherJob` não inclui mais este colaborador em novos disparos — verifica estado atual via `getCurrentConsent`: se último evento = `opted_out` ou `refused` → pula.

### Evidência em litígio

Se um colaborador alegar que nunca aceitou, o repositório abaixo recupera o histórico completo:

```typescript
// consent.repository.ts
async getFullHistory(tenantId: string, employeeId: string): Promise<ConsentHistoryEntry[]> {
  return prisma.employeeConsent.findMany({
    where: { tenantId, employeeId },
    include: {
      consentTermVersion: {
        select: { version: true, contentHash: true },
      },
    },
    orderBy: { createdAt: "asc" },
  })
}
```

A presença de um registro `event = 'accepted'` com `documentHash` correspondente ao documento do colaborador, em data anterior ao litígio, é prova de aceite. O `contentHash` da versão do termo prova qual texto foi aceito.

### Detecção de crise em relatos anônimos

```typescript
const CRISIS_KEYWORDS = [
  "me matar", "quero morrer", "não quero mais viver", "suicídio",
  "suicidar", "acabar com tudo", "me machucar", "tirar minha vida",
]
```

Quando detectado: (1) exibe aviso CVV (188) na tela do colaborador, (2) cria alerta `crisis_report` com `severity: 'high'` no painel do RH/Admin — sem identificar o autor, apenas o setor.

---

## 17. Documentos Legais da Plataforma

O painel do Super Admin em `/super-admin/terms` é o hub central para gerenciar três tipos de documentos legais:

| Tipo | Modelo | Aceite obrigatório |
|---|---|---|
| Termos de Uso da Plataforma | `platform_terms_versions` | Sim — por admins de organização |
| Política de Privacidade | `privacy_policy_versions` | Não — informativo público |
| TCLE dos Colaboradores | `consent_term_versions` | Sim — por cada colaborador |

### 17.1 Termos de Uso da Plataforma

Diferente do TCLE dos colaboradores (`employee_consents`), estes são os Termos de Uso da **plataforma Pulse** — aceitos pelos admins das organizações.

#### Fluxo

1. Super Admin cria nova versão em `/super-admin/terms` com conteúdo HTML e data de vigência
2. `(tenant)/layout.tsx` chama `termsService.getPendingTermsForUser(userId)` em cada request
3. Se há versão ativa sem aceite → redireciona para `/accept-terms`
4. Admin lê e aceita → `termsService.acceptTerms({ termsVersionId, userId, ipAddress, userAgent })`
5. Aceite registrado em `platform_terms_acceptances` com timestamp, IP e user-agent

#### Módulo

```
src/modules/terms/
├── terms.repository.ts   # findActiveVersion, findAcceptance, createAcceptance, createVersion
├── terms.service.ts      # getPendingTermsForUser, acceptTerms, createNewTermsVersion
└── terms.types.ts        # CreateTermsVersionInput, AcceptTermsInput
```

### 17.2 Política de Privacidade

Documento informativo público — não exige aceite de usuários da plataforma. Gerenciado pelo Super Admin em `/super-admin/terms` e exibido publicamente em `/privacy-policy`.

- Apenas uma versão ativa por vez (`is_active = true`); ativar uma nova desativa a anterior automaticamente
- Sem tabela de aceites — é informativo, não contratual
- Vinculada no footer das Landing Pages e páginas públicas

#### Módulo

```
src/modules/privacy-policy/
├── privacy-policy.repository.ts   # findAllPrivacyPolicyVersions, findActivePrivacyPolicyVersion, createPrivacyPolicyVersion
├── privacy-policy.service.ts      # getActivePrivacyPolicyVersion, createNewPrivacyPolicyVersion
├── privacy-policy.schema.ts       # Zod schemas de criação
└── privacy-policy.types.ts        # CreatePrivacyPolicyVersionInput, PrivacyPolicyVersion
```

### 17.3 TCLE dos Colaboradores

Versões do Termo de Consentimento Livre e Esclarecido enviado aos colaboradores. Gerenciado em `/super-admin/consent-terms` e exibido publicamente em `/consent-terms`.

- Campo `is_current = true` marca a versão ativa usada na Consent Gate
- Ao publicar nova versão → na próxima pesquisa recebida, o colaborador vê a Consent Gate com o novo TCLE (re-consentimento inline, sem job separado)
- Sem aceite de admin — o aceite é feito diretamente pelo colaborador ao abrir o link da pesquisa

### 17.4 Páginas públicas standalone

As três versões ativas dos documentos legais são acessíveis publicamente (sem autenticação) e estão vinculadas no footer das Landing Pages:

| Rota | Documento |
|---|---|
| `/platform-terms` | Termos de Uso da Plataforma |
| `/privacy-policy` | Política de Privacidade |
| `/consent-terms` | TCLE dos Colaboradores |

Todas renderizam o HTML do documento com `sanitizeLegalDocument` antes de `dangerouslySetInnerHTML`. A função `sanitizeLegalDocument` (em `src/libs/utils/sanitize.ts`) é mais restritiva que `sanitizeRichHtml` — não permite `div`, `span`, atributos `class` ou `style`, e remove emojis via regex `\p{Extended_Pictographic}`. Use `sanitizeLegalDocument` em páginas de documentos oficiais e `sanitizeRichHtml` em editores de rich text do admin.

---

## 18. Jobs Agendados

Processos recorrentes gerenciados pelo **BullMQ** com Redis como broker.

### Infraestrutura

| Componente | Localização | Responsabilidade |
|---|---|---|
| `libs/queue/index.ts` | Queue factory | Cria fila e worker com configuração Redis |
| `workers/job-worker.ts` | Processo separado | Worker que consome e executa jobs |
| `workers/register-schedules.ts` | Script de setup | Registra schedules recorrentes no Redis (uma vez no startup) |

### Jobs

| Job | Frequência | Responsabilidade |
|---|---|---|
| `health-survey-dispatcher` | A cada 5min | Itera configurações ativas; verifica janela de horário de trabalho e intervalo de frequência (`shouldSkipDispatch`); cria dispatch + tokens + envia mensagens |
| `health-survey-adherence-checker` | A cada hora | 48h após cada dispatch, calcula taxa de adesão e cria alertas `low_adherence` |
| `health-survey-score-alert-detector` | Diário (03:00) | Calcula quedas de score; cria alertas `low_score`, `score_drop` e `negative_trend` |
| `employee-unpause` | Diário (01:00) | Reverte `status = 'active'` para colaboradores com `pause_end_at <= today` |
| `pgr-review-reminder` | Diário (08:00) | 30 dias antes de `next_review_at`; cria alerta `pgr_review_due` |
| `stripe-webhook-retry` | A cada hora | Reprocessa `billing_webhook_events` com `error IS NOT NULL` e `processed = false` |
| `health-survey-response-token-cleanup` | Diário (02:00) | Remove `health_survey_response_tokens` expirados e não utilizados |
| `health-survey-response-reminder` | A cada hora | Envia lembrete de pesquisa para colaboradores que ainda não responderam e estão na janela de halfway |
| `action-plan-suggestion-generator` | Diário (06:00) | Gera sugestões de planos de ação com base em métricas de cada tenant |
| `organization-deletion-executor` | Diário (03:30) | Exclui permanentemente organizações com `deletionScheduledAt <= now()` |
| `climate-survey-dispatcher` | A cada 5min | Auto-scheduler + processamento de ondas manuais de clima (respeita canais e feature `climate_surveys`/`messaging`) |
| `climate-survey-response-reminder` | A cada hora | Lembrete halfway para tokens de clima não respondidos |
| `climate-survey-response-token-cleanup` | Diário (02:00) | Remove tokens de clima expirados e não utilizados |
| `data-ingestion-processor` | A cada 2min + on-demand | Processa lotes de importação com status `received`: baixa o arquivo do storage e roda extração + validação com IA |

### Nomenclatura de Jobs — regra obrigatória

**Nomes de jobs e schedules devem ser específicos e autoexplicativos. Nomes genéricos são proibidos.**

O motivo: um sistema com múltiplos domínios acumula dezenas de jobs ao longo do tempo. Um nome como `"suggestion-generator"` é ambíguo — não indica de qual entidade, fluxo ou domínio se trata. O monitoramento em `/super-admin/jobs` e os `job_logs` ficam impossíveis de triagar sem contexto.

**Padrão obrigatório:**

```
"{domínio}-{ação}-{complemento-opcional}"
```

```typescript
// ❌ PROIBIDO — nome genérico sem contexto de domínio
"suggestion-generator"
"reminder"
"cleanup"
"checker"

// ✅ CORRETO — nome completo identifica domínio, ação e alvo
"action-plan-suggestion-generator"   // gera sugestões de planos de ação
"pgr-review-reminder"                // lembra revisão do PGR
"health-survey-response-token-cleanup"      // limpa tokens de resposta de pesquisa expirados
"health-survey-adherence-checker"           // verifica adesão a dispatches de pesquisa
```

**Regras adicionais:**

- Sempre kebab-case (igual aos nomes de arquivo e rotas)
- O nome deve responder: *"o que esse job faz e em qual domínio?"* sem precisar abrir o código
- Ao registrar o schedule em `register-schedules.ts`, o nome do job no BullMQ deve ser idêntico ao nome usado em `job-worker.ts`
- O mesmo nome é usado na rota de acionamento manual `/api/jobs/[job-name]`

### Acionamento manual

```bash
curl -X POST https://app.example.com/api/jobs/health-survey-dispatcher \
  -H "x-cron-secret: $CRON_SECRET"
```

### Monitoramento de Jobs (`/super-admin/jobs`)

O Super Admin pode monitorar as filas em `/super-admin/jobs`:

**Status ao vivo** — lido diretamente do BullMQ/Redis via `queue-status.service.ts`:
- Contagem por estado: `waiting`, `active`, `delayed`, `failed`
- Lista de jobs ativos no momento (nome, payload, duração parcial)
- Schedules recorrentes registrados

**Histórico persistido** — lido do banco via `job-log.service.ts`:
- Tabela paginada com filtros por: queue, job_name, status, dateFrom, dateTo
- Exibe duração, tentativas, payload resumido, mensagem de erro

**Integração no Worker:** `job-worker.ts` registra listeners no evento `completed` e `failed` do BullMQ para inserir registros em `job_logs` via `jobLogRepository.insert()`.

```typescript
jobWorker.on("completed", async (job, result) => {
  await jobLogRepository.insert({
    queue: "jobs",
    jobName: job.name,
    jobId: job.id,
    status: "completed",
    durationMs: job.finishedOn - job.processedOn,
    payload: job.data,
    result,
    attempts: job.attemptsMade,
    startedAt: new Date(job.processedOn),
    finishedAt: new Date(job.finishedOn),
  })
})

jobWorker.on("failed", async (job, err) => {
  await jobLogRepository.insert({ ... , status: "failed", error: err.message })
})
```

---

## 19. Migrations

```bash
# Criar migration a partir de mudanças no schema (desenvolvimento)
npx prisma migrate dev --name nome-da-migration

# Aplicar migrations pendentes em produção
npx prisma migrate deploy

# Inspecionar banco via UI
npx prisma studio

# Regenerar Prisma Client após mudança no schema
npx prisma generate
```

### Regra fundamental — migrations contêm apenas o que o Prisma geraria

**As migrations devem conter exclusivamente o SQL que o Prisma gera automaticamente a partir do `schema.prisma`.** Nunca adicione SQL manual a uma migration — isso inclui:

- `CHECK` constraints de valores de enum (`CHECK (status IN (...))`)
- `TRIGGER`s, `FUNCTION`s, `VIEW`s ou qualquer outro objeto de banco
- `ALTER TABLE` para adicionar constraints que o Prisma não conhece
- Qualquer SQL que não seja consequência direta de uma mudança no `schema.prisma`

**Motivo:** migrations com SQL manual criam divergência silenciosa entre o schema Prisma e o banco. O Prisma passa a ter uma visão incorreta do banco, os diffs subsequentes ficam errados, e ninguém consegue entender o que foi adicionado manualmente versus o que o ORM declarou.

**O que o Prisma gera (e portanto é permitido nas migrations):**
- `CREATE TABLE` / `DROP TABLE`
- `ALTER TABLE ADD COLUMN` / `DROP COLUMN`
- `CREATE INDEX` / `DROP INDEX` (derivados de `@@index`, `@unique`, `@@unique`)
- `ALTER TABLE ADD CONSTRAINT ... FOREIGN KEY` (derivado de relações)
- `ALTER TABLE ADD CONSTRAINT ... PRIMARY KEY`
- `ALTER TABLE ... ADD CONSTRAINT ... UNIQUE`
- `ALTER TABLE ALTER COLUMN` (tipo, nullable, default)

**Se precisar de SQL customizado** (ex: renomear coluna sem destruir dados), use `npx prisma migrate dev --name nome` para gerar a pasta com o timestamp correto e então **substitua** o SQL gerado pelo SQL customizado — nunca adicione SQL extra por cima.

### Regra para criação de migrations — timestamp real obrigatório

**Nunca crie pastas de migration manualmente.** O timestamp do nome da pasta (`YYYYMMDDHHMMSS_nome`) é gerado automaticamente pelo Prisma e representa o instante real de criação. Criar pastas manualmente com timestamps arbitrários ou futuros quebra a auditabilidade da ordem de criação em branches paralelas e dificulta triagem de conflitos.

```bash
# ✅ CORRETO — Prisma gera o timestamp real no momento da execução
npx prisma migrate dev --name nome-descritivo

# ❌ PROIBIDO — nunca crie manualmente
mkdir prisma/migrations/20260429000000_nome
```

Se uma migration precisar de SQL customizado (ex: RENAME COLUMN), use `npx prisma migrate dev --name nome --create-only` para gerar apenas o arquivo sem aplicar, edite o SQL gerado, e então aplique com `npx prisma migrate dev`.

### Checklist de auditoria do banco — garantir que nada extra existe

Antes de qualquer PR ou após suspeita de divergência, execute:

```bash
DB="postgresql://..."

# 1. Nenhum CHECK constraint além dos NOT NULL do Prisma (resultado deve ser 0)
psql "$DB" -t -A -c "
SELECT count(*)
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.constraint_type = 'CHECK'
  AND tc.table_schema = 'public'
  AND cc.check_clause NOT LIKE '%IS NOT NULL%';
"

# 2. Nenhum trigger (resultado deve ser vazio)
psql "$DB" -t -A -c "
SELECT trigger_name || ' ON ' || event_object_table
FROM information_schema.triggers WHERE trigger_schema = 'public';
"

# 3. Nenhuma view (resultado deve ser vazio)
psql "$DB" -t -A -c "
SELECT table_name FROM information_schema.views WHERE table_schema = 'public';
"

# 4. Nenhuma função/procedure custom (resultado deve ser vazio)
psql "$DB" -t -A -c "
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_type IN ('FUNCTION', 'PROCEDURE');
"

# 5. Schema em sync com Prisma
npx prisma migrate status
```

Resultado esperado: `0` constraints extras, listas vazias de triggers/views/functions, "Database schema is up to date".

### Regra para renomear colunas

**Nunca renomear campos via Prisma Migrate automático** — o Prisma gera `DROP COLUMN + ADD COLUMN` que destrói dados. Para renomear coluna com dados existentes, escrever manualmente:

```sql
ALTER TABLE "employees" RENAME COLUMN "old_name" TO "new_name";
```

### Regras para mutação de `health_survey_questions`

`health_survey_questions` é uma tabela operacional com impacto direto na integridade histórica dos dados. As seguintes restrições são obrigatórias:

| Operação | Impacto | Regra |
|---|---|---|
| Alterar `score_direction` | Distorce o histórico — respostas antigas são recalculadas com a nova direção na próxima geração de PGR | **Proibido** em perguntas com respostas existentes em `health_survey_response_items` |
| Alterar `question_text` | O PGR exibe o texto atual para respostas antigas (vínculo é por `question_id`, não por texto) — pode confundir historicamente | Evitar após coleta de respostas; preferir criar nova pergunta |
| Desativar (`is_active = false`) | A pergunta some de pesquisas futuras; respostas antigas permanecem acessíveis no histórico do PGR | Permitido |
| Remover (`DELETE`) | Destrói o vínculo de `health_survey_response_items.question_id` — histórico de PGR quebra | **Proibido** se houver respostas vinculadas |

**Antes de alterar `score_direction` ou deletar uma pergunta**, verificar se existem respostas:

```sql
SELECT COUNT(*) FROM health_survey_response_items WHERE question_id = '<id>';
```

Se o resultado for > 0, **não altere `score_direction`** e **não delete** — desative a pergunta e crie uma nova no lugar.

---

## 20. Fluxos de Negócio Críticos

### 20.1 Primeiro acesso — Admin de organização

```
Super Admin cria org → billing_status = 'pending'
  → organization_invitations criado (token, expires_at = +72h)
  → emailService.send('org_invite')
    → Admin define senha em /invite/[token]
      → organization_users criado (role: 'admin')
      → Redireciona para /billing
        → Admin escolhe plano e paga
          → Webhook → billing_status = 'active'
```

### 20.2 Fluxo de consentimento (TCLE)

```
Employee cadastrado (sem convite separado)
  → Quando a primeira pesquisa é disparada, employee recebe link /health-survey/[token]
    → Employee abre o link
      → validateHealthSurveyToken: se consentStatus = 'needs_consent' → exibe Consent Gate
        → Employee aceita: INSERT employee_consents { event: 'accepted', source: 'message_link' }
                            → página exibe o formulário da pesquisa
        → Employee recusa: INSERT employee_consents { event: 'refused', source: 'message_link' }
                            → fluxo encerra
      → Se consentStatus = 'accepted' → vai direto ao formulário da pesquisa
```

### 20.3 Envio de pesquisa

O job `health-survey-dispatcher` (a cada 5 min) executa em paralelo **duas funções distintas**:

**Fluxo 1 — `runHealthSurveyAutoDispatchScheduler` (criação automática de dispatches):**

```
Busca todas as configurações ativas com billing ativo (findAllTenantsActiveHealthSurveyConfigsForAutoDispatch)
  → Para cada configuração:
      [GATE 1] isAtDispatchTime(dispatchTime, timezone) → skip se não estamos na janela de 60 minutos a partir do horário configurado
      [GATE 2] shouldSkipDispatch(config, timezone):
          - Para frequência 'monthly' com scheduledDayOfMonth (condições independentes — OR):
              → skip se hoje NÃO é o dia do mês configurado (getDayOfMonthInTimezone ≠ scheduledDayOfMonth)
              → skip se o último dispatch foi há menos de 25 dias (cooldown anti-duplicata)
          - Para outras frequências (condições independentes — OR):
              → skip se hoje não é um dia de trabalho da config (isWorkDay)
              → skip se o último dispatch foi há menos de FREQUENCY_INTERVAL_DAYS dias
      [PASS] → fireDispatch(config, orgSlug, departments, timezone, respectEmployeeSchedule):
          → Se respectEmployeeSchedule = false:
              → Filtra employees por dia de trabalho hoje (employee_work_days → department_work_days)
          → Se respectEmployeeSchedule = true:
              → Inclui todos os employees — sem filtro de dia de trabalho no momento do disparo
          → Se nenhum employee em nenhum setor após filtro: retorna false
          → Cria health_survey_dispatch (status='scheduled')
          → Para cada setor com employees elegíveis: sendDispatchTokensAndMessagesForDepartment
              → Filtra colaboradores elegíveis por consentimento
              → Busca tokens existentes (link assinado)
              → Se respectEmployeeSchedule = true:
                  → buildEmployeeDispatchScheduleMap: para cada employee, calcula próximo dia útil (≤7 dias)
                      e horário de início do turno → entry { expiresAt: scheduledSendAt+tokenExpiryHours, delayMs }
                  → Colaboradores sem dia útil nos próximos 7 dias → excluídos de tokens e mensagens
                  → expiresAt do token = scheduledSendAt + tokenExpiryHours (em vez de now + tokenExpiryHours)
              → Se respectEmployeeSchedule = false:
                  → expiresAt do token = now + tokenExpiryHours (valor configurado, padrão 48h)
              → Cria novos tokens para colaboradores sem token válido (shortCode = 7 dígitos)
              → upsertHealthSurveyDeptDispatch(dispatchId, deptId, totalRecipients)
              → [GATE FEATURE] hasTenantPlanFeature(tenantId, "messaging")
                  ├─ SEM feature: tokens criados, nenhuma mensagem enviada → RH usa link assinado
                  └─ COM feature: enfileira jobs BullMQ para envio
                       Se respectEmployeeSchedule = true: job recebe opts.delay (ms até início do turno)
                       Se respectEmployeeSchedule = false: delay = 0 (envio imediato)
                       URL enviada: /health-survey/[orgSlug]/[shortCode] (fallback: /health-survey/[uuid])
          → markHealthSurveyDispatchDispatched(tenantId, dispatchId) — status='available', dispatchedAt=now
```

**Pretty URL para tokens de disparo:** todo token criado por `sendDispatchTokensAndMessagesForDepartment` recebe um `short_code` de 7 dígitos numéricos gerado aleatoriamente (único por tenant). A URL enviada nas mensagens é `/health-survey/[orgSlug]/[shortCode]` — o colaborador a recebe via mensagem de texto. A rota `(public)/health-survey/[orgSlug]/[shortCode]/page.tsx` faz lookup via `resolveHealthSurveyShortCode(orgSlug, shortCode)` e redireciona para `/health-survey/[token]`. O `orgSlug` na URL não é decorativo — é usado na query para isolar o lookup ao tenant correto.

Tokens criados via link assinado (`unlockHealthSurveyViaIdentifier`) **não recebem `shortCode`** — são usados internamente e o colaborador nunca vê a UUID diretamente.

**Colisão de short code:** a unicidade é garantida pelo constraint `(tenant_id, short_code)` no banco. Com 9 milhões de valores possíveis e tokens com vida útil de 48h, a probabilidade de colisão é praticamente nula (< 0.01% com 1000 tokens ativos simultâneos). Em caso de colisão, a transação do dispatch falha.

**Fluxo 2 — `runHealthSurveyDispatcher` (processamento de dispatches manuais):**

```
Busca dispatches com status='scheduled' e scheduledAt <= now() (findAllTenantsPendingHealthSurveyDispatches)
  → Para cada dispatch:
      ⚠️ NÃO verifica isAtDispatchTime nem isWorkDay no nível da config
         (o admin escolheu explicitamente quando disparar — esses checks não se aplicam)
      → Para cada setor na config (configDepartments):
          → Filtra employees que trabalham hoje (employee_work_days → department_work_days)
          → Se nenhum employee trabalha hoje → upsertHealthSurveyDeptDispatch(dispatchId, deptId, 0)
          → Se eligibleEmployees não-vazio → sendDispatchTokensAndMessagesForDepartment
      → markHealthSurveyDispatchDispatched(tenantId, dispatchId)
```

**Frequência mensal sem `scheduledDayOfMonth`:** quando `frequency = "monthly"` e `scheduledDayOfMonth = null`, `shouldSkipDispatch` cai no path de intervalo fixo (28 dias), disparando no primeiro dia de trabalho qualificado após o cooldown. **Nota:** a UI e a Server Action (`createHealthSurveyConfigAction`) **obrigam** a seleção de um dia do mês para frequência mensal — esse path de fallback existe apenas para configs legadas criadas sem dia fixo.

**Criação de configuração para múltiplos setores (`createHealthSurveyForDepartments`):** ao criar uma config com `departmentIds: ["dept-1", "dept-2"]` ou `departmentIds: "all"`, cria-se **uma única `health_survey_configuration`** com múltiplas entradas em `health_survey_config_departments`. A função verifica via `findDepartmentIdsWithActiveHealthSurveyConfigs` quais setores já possuem config ativa e pula silenciosamente os que já têm. Se todos os setores já possuem config ativa, a função retorna sem criar nada.

### 20.3.1 Listagem de pesquisas

A listagem em `/health-surveys/configure` exibe uma linha por `health_survey_configuration`. Cada config já cobre N setores via `configDepartments`. Não há agrupamento por nome — cada config é uma entidade individual.

A coluna "Setores" exibe os departamentos ativos vinculados à config (via `health_survey_config_departments` → `departments.isActive = true`).

**Edição de config (`updateHealthSurveyConfigAction`):**

Ao salvar a edição de uma pesquisa, a Server Action em `configure/[configId]/actions.ts` atualiza a config e reconcilia os departamentos:

```
deptIds atuais (configDepartments) vs deptIds enviados pelo form
  ├─ mantidos  → sem alteração em health_survey_config_departments
  ├─ removidos → DELETE FROM health_survey_config_departments WHERE configId AND departmentId
  └─ novos     → INSERT INTO health_survey_config_departments
```

**Carregamento:** `getHealthSurveyConfigsWithDepartments` busca configs paginadas com seus departamentos via `include: { configDepartments: { include: { department: true } } }`. Não usa `$queryRaw`.

### 20.4 Resposta ao formulário (anonimato garantido)

```
GET /health-survey/[token]
  → 4 guards validados (existência, uso, expiração, janela de trabalho)
  → Submit:
      ├─ Re-executa todos os guards
      ├─ Cria health_survey_response SEM employee_id
      ├─ Cria health_survey_response_items
      └─ token.used_at = now() (atômico)
```

### 20.5 Aceite de termos da plataforma

```
Admin faz login
  → (tenant)/layout.tsx verifica termsService.getPendingTermsForUser(userId)
  → Se pendente → redirect('/accept-terms')
    → Admin lê e aceita
      → actions.ts: aceita com IP e user-agent via headers
      → platform_terms_acceptances criado
      → redirect('/dashboard')
```

### 20.6 Anonimato nas métricas (enforçado no service)

```typescript
import { MINIMUM_RESPONDENTS_FOR_DISPLAY } from "@/libs/utils/anonymity"

async getDepartmentMetrics(tenantId, departmentId, periodId) {
  const response = await healthSurveyRepository.countResponses(...)
  if (response.count < MINIMUM_RESPONDENTS_FOR_DISPLAY) {
    return { available: false, reason: "insufficient_respondents" }
  }
  return { available: true, avgScore: ..., adherenceRate: ... }
  // NUNCA: scores individuais, breakdown por data, employee_id
}
```

### 20.7 Re-consentimento por atualização de termos

```
Super Admin publica nova versão do TCLE (is_current = true)
  └─→ Na próxima pesquisa que o employee receber, validateHealthSurveyToken
        detecta que o consent aceito é de versão anterior
        → consentStatus = 'needs_consent'
        → employee vê a Consent Gate novamente com o novo TCLE
        → aceita ou recusa o novo termo
```

> Não existe job `consent-renotifier`. O re-consentimento acontece naturalmente no próximo acesso ao link da pesquisa, sem envio ativo de mensagens adicionais.

### 20.8 Lembrete para não-respondentes

O job `health-survey-response-reminder` (a cada hora) envia um lembrete automático para colaboradores que **ainda não responderam** e cujo token está na janela de halfway.

```
Job health-survey-response-reminder (a cada hora)
  └─ findAllTenantsTokensEligibleForReminderCheck()
       Filtra no banco: usedAt IS NULL, expiresAt > now, reminderSentAt IS NULL,
         shortCode IS NOT NULL, dispatch.status = 'available',
         org.billingStatus IN ('active', 'trialing')
  └─ Filtro de timing (JS-side):
       now >= expiresAt - tokenExpiryHours/2 * 3600000  (janela de halfway)
       now < expiresAt
  └─ Filtro de jornada (JS-side, apenas quando respectEmployeeSchedule = true):
       getDayOfWeekInTimezone(orgTimezone) IN workDays
       isAtWorkStartWindow(orgTimezone, workStartTime)
  └─ Agrupa por tenantId
  └─ Por tenant: hasTenantPlanFeature(tenantId, "messaging")
       SEM feature → pular
       COM feature:
         markHealthSurveyTokensReminderSent(tokenIds)  ← ANTES do enqueue (idempotência)
         messageQueue.addBulk([{ name: "send-message", data: { type: "health_survey_reminder", ... } }])
```

**Idempotência:** `reminderSentAt` é marcado **antes** de enfileirar as mensagens. Se o worker reiniciar após o mark mas antes do addBulk, o lembrete não é reenviado. Preferimos perder um lembrete a duplicar o envio.

**Timing:** o lembrete é enviado a partir do ponto médio da validade do token (`tokenExpiryHours / 2` antes do vencimento). Para um token de 48h, o lembrete é enviado entre 24h após o disparo e a expiração.

**Módulo:** `src/modules/health-surveys/health-survey-reminder.service.ts` → `runHealthSurveyResponseReminder()`

### 20.9 Acesso via Link Assinado (sem mensagem)

Quando a organização **não possui** a feature `messaging`, ou o RH/Admin deseja distribuir a pesquisa manualmente em canais externos:

```
RH acessa /health-surveys
  └─ Painel exibe o link assinado por linha de dispatch (signed_link_token)
       └─ RH distribui o link pelo canal de sua preferência (e-mail, grupo, intranet, etc.)

Colaborador acessa /health-survey/link/[signedLinkToken]
  └─ Tela de identificação: campo único aceita telefone ou documento
       ├─ Colaborador não encontrado → erro "Colaborador não encontrado"
       ├─ Colaborador pertence a setor não incluído na pesquisa → erro EMPLOYEE_NOT_IN_DEPARTMENT
       ├─ Sem consentimento aceito → exibe Consent Gate inline para o colaborador aceitar o TCLE
       ├─ Já respondeu → retorna { alreadyAnswered: true } → mensagem "Você já respondeu esta pesquisa"
       ├─ Fora da janela de trabalho → erro "Pesquisa disponível apenas entre HH:MM e HH:MM"
       └─ Token gerado → redirect para /health-survey/[token]
             └─ Resposta salva normalmente (sem employee_id) → aderência calculada corretamente
```

O `signedLinkToken` é gerado por `randomUUID()` na criação do dispatch e armazenado em `health_survey_dispatches.signed_link_token`. Um único dispatch cobre todos os setores da config (via `health_survey_config_departments`), portanto um único link serve todos os colaboradores da pesquisa.

**Guards executados em `unlockHealthSurveyViaIdentifier` (ordem):**
1. Dispatch encontrado pelo `signedLinkToken` — se não encontrado: erro
2. Dispatch com `status = 'available'` — se não disponível: `DISPATCH_NOT_AVAILABLE`
3. Colaborador encontrado por telefone ou documento no tenant — se não encontrado: `EMPLOYEE_NOT_FOUND`
4. `employee.departmentId` está entre os setores da config (`configDepartments`) — se não: `EMPLOYEE_NOT_IN_DEPARTMENT`
5. Consentimento ativo — se sem aceite: retorna `{ needsConsent: true }` → Consent Gate inline
6. Já respondeu — se `used_at IS NOT NULL`: retorna `{ alreadyAnswered: true }`
7. Janela de trabalho — fora do horário configurado: `OUTSIDE_WORK_WINDOW`

**Módulo de unlock:** `unlockHealthSurveyViaIdentifier(signedLinkToken, identifier)` em `health-survey-response.service.ts`.

 ### 20.10 Importação de colaboradores via Excel ou CSV

**Fluxo da UI:**
1. RH faz upload do arquivo → `previewImportAction` → `parseImportPreview` → preview armazenado em `sessionStorage` → redireciona para `/employees/import/preview`
2. RH revisa e confirma → `confirmImportAction(validItems)` → re-valida cada item com `importRowSchema.safeParse` → chama `createNewEmployee` para cada item válido

**Comportamento:** todo item válido sempre cria um novo colaborador via `createNewEmployee` (verifica limite do plano, audit `employee.created`). Não existe verificação de e-mail duplicado — o banco não possui constraint única em `(tenant_id, email)` para a tabela `employees`. O toast de conclusão exibe `X importado(s)` e `Y com erro`.

> **Sem unicidade de e-mail em colaboradores:** a constraint `@@unique([tenantId, email])` foi removida da tabela `employees` (migration `20260615104105_remove_employee_email_unique`). O mesmo e-mail pode ser cadastrado múltiplas vezes no mesmo tenant. Isso é intencional — e-mail é campo opcional e não é o identificador primário do colaborador.

O serviço `parseImportPreview` detecta colunas via `getCellStringValue`, com correspondência case-insensitive. Os aliases reconhecidos por campo são:

| Campo | Aliases de cabeçalho aceitos (case-insensitive) |
|---|---|
| `name` | `"nome"`, `"nome completo"`, `"name"` |
| `phone` | `"telefone"`, `"mensagem"`, `"phone"` |
| `departmentName` | `"setor"`, `"departamento"`, `"departmentname"` |
| `email` _(opcional)_ | `"email"`, `"e-mail"` |
| `workStartTime` _(opcional)_ | `"hora início"`, `"hora inicio"`, `"workstarttime"`, `"inicio"` |
| `workEndTime` _(opcional)_ | `"hora fim"`, `"workendtime"`, `"fim"` |
| `workDays` _(opcional)_ | `"dias de trabalho"`, `"dias"`, `"workdays"` |

Células de horário suportam dois formatos:
- **String**: `"09:00"`, `"9:00"` (padded para `"09:00"`), `"9h00"` (normalizado para `"09:00"`)
- **Date (ExcelJS type 4)**: valor como `Date("1899-12-30T09:00:00.000Z")` → extrai `getUTCHours()`/`getUTCMinutes()`

**Formatos suportados:** `.xlsx`, `.xls` e `.csv`. A extensão é extraída no upload e passada para `parseImportPreview` — o serviço seleciona o parser correto (`exceljs` para Excel, parser CSV nativo para `.csv`).

**Colunas opcionais de jornada individual:**

| Cabeçalho aceito | Campo | Formato |
|---|---|---|
| `Hora Início` / `Hora Inicio` | `workStartTime` | `"HH:MM"` (ex: `"08:00"`) |
| `Hora Fim` | `workEndTime` | `"HH:MM"` (ex: `"17:00"`) |
| `Dias de Trabalho` | `workDays` | Nomes PT separados por vírgula (`"Seg,Ter,Qua,Qui,Sex"`) ou numéricos (`"1,2,3,4,5"`) — 0=Dom … 6=Sáb |

Quando presentes, sobrepõem os valores do departamento para aquele colaborador. Quando ausentes, o colaborador herda horário e dias do departamento.

### 20.11 Métricas de plataforma (Super Admin Dashboard)

```typescript
// modules/platform-metrics/platform-metrics.repository.ts

async getPlatformMetrics(): Promise<PlatformMetrics> {
  const [activeOrgs, totalEmployees, messagesSent] = await Promise.all([
    prisma.organization.count({ where: { isActive: true } }),
    prisma.employee.count({ where: { status: "active" } }),
    prisma.messageLog.count({
      where: { sentAt: { gte: startOfMonth(new Date()) } },
    }),
  ])

  return {
    activeOrganizations: activeOrgs,
    activeEmployees: totalEmployees,
    messagesThisMonth: messagesSent,
  }
}
```

### 20.12 Exclusão de conta (tenant Admin)

Fluxo de exclusão voluntária de organização com período de carência.

```
Admin → /settings → "Excluir conta"
  └─→ requestAccountDeletionAction()
        ├─ Gera código de 6 dígitos (AuthToken, expires 15 min)
        └─ Envia e-mail 'account_deletion_confirm' com código

Admin insere código → confirmAccountDeletionAction(code)
  ├─ Valida código (não expirado, não usado)
  ├─ billingService.cancelSubscription(externalSubscriptionId) → cancela no Stripe
  ├─ org.deletionScheduledAt = now() + 30 dias
  ├─ org.billingStatus = 'cancelled'
  ├─ Envia e-mail 'account_deletion_scheduled' com data definitiva
  └─ Retorna { deletionScheduledAt } — sem destruir sessão

Client Component recebe resultado → exibe modal de confirmação
  └─ Admin clica "Compreendi e desejo sair" → logoutAction()

Job `organization-deletion-executor` (diário 03:30)
  └─ Busca orgs com deletionScheduledAt <= now()
     └─ Para cada org: exclui todos os dados via ON DELETE CASCADE
```

**Regra crítica:** `confirmAccountDeletionAction` **nunca** chama `destroySession()` diretamente. A sessão é destruída apenas quando o usuário clica no botão do modal de confirmação, via `logoutAction()` no Client Component. Chamar `destroySession()` na Server Action destrói o cookie antes do client processar o resultado e renderizar o modal.

**Cancelamento:** Admin ou Super Admin pode cancelar a exclusão enquanto `deletionScheduledAt > now()`. A ação `cancelScheduledOrganizationDeletion` zera `deletionScheduledAt` e `reativaCancelledAt` no Stripe (se aplicável). O `DeletionScheduledModal` exibido no `(tenant)/layout.tsx` oferece o botão de cancelamento.

### 20.13 Geração de relatório PGR com force-regenerate

```
Admin → /pgr → botão "Gerar relatório" (período selecionado)
  └─→ generatePgrReportAction(tenantId, period, forceRegenerate = false)
        ├─ Verifica se já existe PgrReview para o período
        │    └─ Se existe e forceRegenerate = false → retorna { error: code: "DUPLICATE_PGR_PERIOD" }
        └─ Se existe e forceRegenerate = true → replacePgrReviewAtomic(existingId, novosDados, deptResults, questionResults)
              └─ $transaction: DELETE pgr_reviews + DELETE pgr_dept_results + DELETE pgr_question_results
                              + INSERT pgr_reviews + INSERT pgr_dept_results + INSERT pgr_question_results

Client Component (pgr-generate-button.tsx) recebe DUPLICATE_PGR_PERIOD
  └─ Exibe confirmação "Já existe um relatório para este período. Deseja substituir?"
       └─ Admin confirma → chama novamente com forceRegenerate = true
```

**Regra de imutabilidade histórica:** o PGR usa respostas de `health_survey_response_items` referenciadas por `question_id`. Mesmo que perguntas sejam desativadas depois, o histórico é preservado porque `findDispatchesForPgr` não filtra `isActive` nas perguntas. A geração de um novo relatório para um período já existente (via `forceRegenerate`) é atômica — nunca deixa o banco em estado parcial.

### 20.14 Pesquisa de Clima Organizacional

Módulo paralelo às pesquisas de saúde (`src/modules/climate-surveys/`), gateado pela feature de plano `climate_surveys`. Colaboradores respondem **sem login**, via mensagem e/ou link assinado — mesmo padrão de anonimato (sem `employee_id` nas respostas; scores ocultos se a participação fica abaixo do percentual mínimo por org).

```
RH (feature climate_surveys) → Sidebar “Pesquisa de Clima”
 ├─ Dashboard `/climate-surveys` — KPIs + radar + evolução + eNPS + heatmap; botão "Configurações" (admin) ajusta o percentual mínimo de participação para exibir resultados
 ├─ Adesão `/climate-surveys/adherence` — tabela por área, canais, lembrete manual
 ├─ Banco de Perguntas `/climate-surveys/configure`
 ├─ Disparo & Canais `/climate-surveys/dispatches` — compositor de campanha + histórico
 └─ Plano de Ação `/climate-surveys/action-plans` (feature action_plans)
     · tópicos abaixo da meta (auto, da última onda)
     · CRUD de ações: título, descrição, responsável, prioridade, status, prazo
     · filtros por responsável/status · indicadores: concluídas / em andamento / atrasadas
RH → /climate-surveys/configure
  └─ Lista de pesquisas · Nova/Editar: banco de perguntas em accordion por tópico (checkbox)
     + seção "Perguntas personalizadas" (texto, tópico e direção do score, add/remover inline),
     botão "Gerenciar tópicos" (criar/renomear/desativar tópicos customizados; tópicos de sistema são protegidos),
     painel lateral com contadores em tempo real (perguntas, tópicos, tempo estimado ≈20s/pergunta),
     ações Salvar / Pré-visualizar; mín. 1 pergunta (catálogo + personalizadas), máx. 60 (`CLIMATE_SURVEY_MAX_QUESTIONS`); recomendado 3–5 por tópico
  └─ Agenda onda (manual) ou auto-scheduler (job climate-survey-dispatcher)
       ├─ Tokens + short_code; envio por mensagem (sendViaMessaging=true) quando feature messaging ativa
       └─ Sem e-mail/link assinado em campanhas novas: a UI de clima não expõe seleção de canal
          (compositor e config sempre enviam `sendViaMessaging=true`, `sendViaSignedLink=false`)
Colaborador → /climate-survey/[token] | /climate-survey/[orgSlug]/[shortCode] | /climate-survey/link/[linkToken]
  └─ Consent Gate (source climate_survey_form no opt-out) → formulário mobile-first
       (1 pergunta por vez com o TÓPICO exibido ao respondente, barra de progresso,
        Likert 5 pontos com labels de concordância, auto-salva e avança ao tocar,
        botão Voltar, aviso fixo de anonimato)
       → passo final opcional "Comentário" (textarea livre anônimo, máx. 1000 chars) → Enviar
       → tela de agradecimento (ícone, anonimato, resultados consolidados, Fechar)
  └─ Respostas guardam comentário livre anônimo em `climate_survey_responses.open_comment`
     (não conta para adesão/%; lido pelo Admin/RH na onda como lista sem setor/autor)
RH → /climate-surveys/[dispatchId]
  └─ Dashboard por setor/dimensão; CTA “Criar plano de ação” (feature action_plans) vincula climateSurveyDispatchId
```

**Dashboard do módulo (`getClimateSurveyModuleDashboard`):**

| Bloco | Conteúdo |
|---|---|
| KPIs | Adesão %, total de respostas, favorabilidade % (scores 4–5), eNPS |
| Radar | Tópicos usados na onda (sistema + customizados) vs meta corporativa (`CLIMATE_SURVEY_CORPORATE_GOAL_PERCENT` = 70) — score = média dos pesos Likert × 100 |
| Linha | Evolução entre ondas (clima ponderado, favorabilidade, adesão, eNPS) |
| Rosca eNPS | Promotores / Neutros / Detratores |
| Heatmap | Tópicos × departamentos (verde ≥ meta, amarelo ≥ meta−20, vermelho crítico) |

**Fórmulas de métricas (`climate-survey-metrics.ts`) — obrigatórias:**

| Métrica | Fórmula |
|---|---|
| Favorabilidade | `(Concordo + Concordo Totalmente) / total × 100` — scores normalizados ≥ 4 |
| Peso Likert | Concordo Totalmente `1.0` · Concordo `0.8` · Neutro `0.6` · Discordo `0.4` · Discordo Totalmente `0.2` |
| Score de clima | média dos pesos × 100 |
| Nota eNPS (0–10) | peso Likert × 10 (equivale a Likert × 2) |
| eNPS | `% promotores − % detratores` — promotores nota 9–10 · neutros 7–8 · detratores 0–6 |

Agregações disponíveis: **por pergunta**, **por tópico (`dimension`)**, **por departamento** e **geral da empresa/onda**. O eNPS agregado classifica a média das notas do respondente no escopo (não a resposta isolada), exceto quando o escopo já é uma única pergunta.

**Tópicos:** catálogo por tenant em `climate_survey_topics` (`key` + `label`). Os 8 tópicos de sistema (criados de forma lazy via `ensureClimateSurveySystemTopics`) são `job_satisfaction`, `internal_communication`, `relationships`, `recognition_reward`, `professional_development`, `work_life_balance`, `organizational_culture`, `leadership_trust`; o RH pode criar tópicos customizados pelo gerenciador em `/climate-surveys/configure` (tópicos de sistema não podem ser editados nem excluídos). O `dimension` das perguntas guarda o `key` do tópico e o label é resolvido via `resolveClimateSurveyTopicLabel`; `ClimateSurveyDimension` é `string` (não mais um union fixo).

**Adesão (`getClimateSurveyAdherenceOverview` / `/climate-surveys/adherence`):**

| Bloco | Conteúdo |
|---|---|
| Tabela por área | Colaboradores, respostas, % adesão, canais, status |
| Status | Excelente ≥ 90% · Boa ≥ 75% · Reforçar &lt; 75% |
| Canais | `Mensagem` (tokens com `shortCode`) · `E-mail` (link assinado; fallback = adesão geral quando os tokens já têm `shortCode`) |
| Card lembrete | Lista áreas &lt; 75%; ação “Disparar lembrete agora” → `sendClimateSurveyRemindersForDispatch` (Mensagem se feature `messaging` + canal; E-mail se canal ativo e colaborador com e-mail) |

**Disparo & Canais (`launchClimateSurveyCampaign` / `/climate-surveys/dispatches`):**

| Bloco | Conteúdo |
|---|---|
| Canais | Só Mensagem — a UI não expõe seleção de canal; campanhas novas usam `sendViaMessaging=true`, `sendViaSignedLink=false` (sem e-mail nem link assinado em campanhas novas; o backend de e-mail permanece para os demais fluxos/legado) |
| Recorrência | `once` (sem auto-scheduler) · `quarterly` (90d) · `semiannual` (180d) |
| Timing | Enviar agora · Agendar · Lembrete 48h (força `tokenExpiryHours ≥ 96`) |
| Departamentos | Incluir/excluir + canal preferencial (UI) + headcount ativo |
| Resumo | Destinatários, canais, recorrência, data/hora + prévia do template `SURVEY_MESSAGE_TEMPLATE` |

**E-mail de pesquisa (`survey-email.service` / fila `pulse-emails`):**

| Etapa | Detalhe |
|---|---|
| Envio | `processOutboundSurveyEmail` via `getEmailService()`; HTML em `assets/email/template/climate-survey-*.html` |
| Link único | Mesmo short URL da mensagem (`/climate-survey/[orgSlug]/[shortCode]`); CTA do HTML aponta para `/api/track/email/.../click` |
| Abertura | Pixel `/api/track/email/.../open` → `email_logs.status = opened` |
| Clique | Redirect tracking → `email_logs.status = clicked` (+ `openedAt` implícito se ainda nulo) |
| Reenvio | Job `climate-survey-response-reminder` e CTA de adesão enfileiram `climate_survey_reminder` por e-mail para não-respondentes |

**Analytics de funil (`climate-survey-analytics.service`):**

| Evento (valor persistido) | Quando |
|---|---|
| `pesquisa_criada` | Criação de `climate_survey_configurations` |
| `pergunta_selecionada` | Cada pergunta ativa na criação/edição da config |
| `campanha_disparada` | Após `markClimateSurveyDispatchDispatched` (auto ou manual) |
| `email_aberto` / `link_clicado` | Tracking first-party em `registerEmailOpen` / `registerEmailClick` |
| `resposta_iniciada` | Abertura do formulário público (`startClimateSurveyResponseSession`) |
| `resposta_concluida` | Submit anônimo bem-sucedido |
| `lembrete_disparado` | Após enqueue de lembrete (quantity = envios) |
| `acao_criada` / `acao_concluida` | Plano de ação de clima criado / status → `completed` |

| Métrica | Fórmula |
|---|---|
| Taxa de abertura | e-mails com abertura / e-mails enviados (não `failed`) × 100 |
| Taxa de clique | e-mails com clique / e-mails enviados × 100 |
| Taxa de início | sessões iniciadas / destinatários da onda × 100 |
| Taxa de conclusão | sessões concluídas / destinatários × 100 |
| Tempo médio de resposta | média (`completed_at − started_at`) das sessões concluídas |
| Abandono por pergunta | sessões sem `completed_at`, agrupadas por `last_question_order` (null = antes da 1ª) |

Exibido no Dashboard `/climate-surveys` (bloco Funil da onda). Falhas de insert de evento são logadas e **não** quebram o fluxo de negócio.

**Anonimato real das respostas (obrigatório):**

| Regra | Implementação |
|---|---|
| Sem usuário na resposta | `climate_survey_responses` **não** tem `employee_id`; apenas `dispatch_id` + `department_id` (setor agregado) + itens Likert |
| Token só para participação | `climate_survey_response_tokens` guarda `employee_id` + `used_at` para elegibilidade, lembretes e adesão — **nunca** vinculado à linha de resposta |
| Tabelas separadas | Participação = tokens; respostas = `climate_survey_responses` + `climate_survey_response_items` (criação atômica: marca token + INSERT anônimo) |
| Data sem horário | `created_at` da resposta usa `toAnonymousSurveyResponseDate()` (UTC meia-noite) para reduzir correlação temporal com `used_at` |
| Limiar por percentual | `canRevealClimateSurveyGroupResults` / `climateSurveyRequiredRespondents` — revela quando `respostas ≥ max(3, ceil(destinatários × organizações.climate_survey_min_respondents_percent / 100))`; scores, favorabilidade, eNPS, radar, heatmap e distribuições ocultos abaixo do limiar (por onda e por célula/setor) |
| Sem rastreamento individual no dashboard | UI/services só agregados; sem listagem de respondentes ou respostas por colaborador |
| Sem export identificável | `assertClimateSurveyIdentifiableExportForbidden()` — proibido exportar respostas com identidade |

**Jobs:** `climate-survey-dispatcher`, `climate-survey-response-reminder`, `climate-survey-response-token-cleanup`.

**Importação de perguntas de arquivo existente (IA):** em `/climate-surveys/configure`, o botão "Importar de arquivo (.xlsx/.csv)" no bloco de perguntas personalizadas chama `extractClimateSurveyQuestionsAction` (Server Action), que exige a feature `climate_surveys`, aplica rate limit por tenant (10/5min) e converte a planilha/texto em texto antes de chamar `extractClimateSurveyQuestionsFromFile(tenantId, sourceText)`. O serviço usa `getAIService()` com `tier: "medium"` e a tool `save_climate_survey_question`; cada argumento é validado com `climateSurveyQuestionImportToolSchema` (Zod). A dimensão é mapeada para um tópico ativo do tenant (fallback `organizational_culture`). As perguntas retornadas são adicionadas como rascunhos de perguntas personalizadas no formulário (o RH revisa e salva). Formatos aceitos: `.xlsx`, `.csv`, `.txt` e `.pdf` (máx. 10 MB). PDF é convertido em texto com `unpdf` (puro JS, sem dependência nativa); PDFs escaneados (imagem) não têm camada de texto e exigiriam OCR. O modelo **nunca acessa o banco** — só retorna tool calls.

**Comparativo entre ondas (ROI):** página `/climate-surveys/compare` (`getClimateSurveyWaveComparison`). Seleciona duas ondas (padrão: as duas mais recentes) e compara, via `getClimateSurveyMultipleDispatchDashboards`, adesão, favorabilidade, score de clima e eNPS (com variação em p.p./pts) e os tópicos por dimensão. Exibe ainda os planos de ação criados a partir da onda base (`countClimateSurveyActionPlansByDispatch`). Respeita o limiar de anonimato (scores ocultos quando abaixo do mínimo). Opções via `findClimateSurveyWaveOptions`.

### 20.15 Ingestão de dados com IA (Base Master Mensal)

Upload unificado de arquivos operacionais (AFD/ponto, espelho, planilha) → lote (`data_import_batches`) → pipeline de **2 passadas de IA** (sem aprovação humana por enquanto):

1. **Extração** (`processDataExtractionWithAI`): o conteúdo é dividido em chunks (`MAX_SOURCE_CHARS_PER_AI_CALL`) e enviado ao `getAIService()` com `tier: "medium"`. A IA chama a tool `save_employee_monthly`; o **tool handler** valida os argumentos com Zod e grava via repository em `employee_monthly` (com `row_hash` idempotente). A tool `flag_extraction_error` registra problemas. Status do lote → `extracted`.
2. **Validação** (`validateDataExtractionWithAI`): as linhas extraídas são enviadas à IA com `tier: "high"`, que chama `apply_employee_corrections` para pequenos consertos. Correções viram `quality_status = 'corrected'`; as demais viram `validated`. Status do lote → `validated`.

**Regras:** o modelo **nunca acessa o banco** — só retorna `toolCalls`; a aplicação valida com Zod e persiste (tool handler). Cada linha tem `row_hash` (dedup por lote) e `batch_id` (rastreabilidade). Sem aprovação humana nesta fase — a confiança vem das duas camadas de IA + validação Zod. Módulo: `src/modules/data-ingestion/`.

**Orquestração e acionamento:** `runDataIngestionWithAI(tenantId, input)` cria o lote e executa as duas passadas. O endpoint interno `POST /api/internal/data-ingestion` (protegido por `x-cron-secret`) recebe `{ tenantId, competencia, fileName, fileType, sourceText }` e retorna `{ batch, extraction, validation, rows }` — útil para testes e operação.

**Upload e job assíncrono:** a UI em `/workforce/import` envia o arquivo (`.txt`/`.csv`, máx. 20 MB) via Server Action, que faz upload no storage (`IStorageService.upload`) e chama `enqueueDataIngestionBatch` (cria o lote com status `received` e enfileira o job `data-ingestion-processor`). O worker baixa o arquivo (`IStorageService.download`) e roda extração + validação. O job também roda a cada 2 min como rede de segurança para lotes pendentes.

**Privacidade e LGPD (regra obrigatória):**

| Regra | Detalhe |
|---|---|
| CPF fora da validação | O documento (CPF) **não** é enviado à IA na passada de validação — o payload omite `document` e a tool `apply_employee_corrections` não aceita correção do campo `document`. O CPF ainda é processado na extração (a IA lê o arquivo bruto), o que exige contrato/DPA com o provedor de IA. |
| CPF em repouso | `employee_monthly.document` é armazenado como texto (usado para deduplicar colaboradores). Tratar com o mesmo cuidado de dado pessoal; hashing em repouso é uma decisão de produto pendente. |
| Erros ao usuário | `errorMessage` do lote é sempre uma mensagem genérica em pt-BR (`resolveDataIngestionErrorMessage`); o detalhe técnico (ex.: erro do provedor em inglês) vai apenas para o log. |
| Cruzamento agregado | Os insights de Workforce × Clima enviam à IA apenas dados agregados por setor (sem nome nem documento de colaborador). |

### 20.16 Indicadores de Pessoas (Headcount, Turnover e Absenteísmo)

Dashboard em `/workforce` (`getWorkforceDashboard`) que lê a Base Master Mensal (`employee_monthly`) e exibe indicadores por competência e setor.

**Métricas (`workforce.service.ts`):**

| Indicador | Fórmula |
|---|---|
| Headcount | registros ativos na competência (`terminationDate` nulo ou ≥ 1º dia da competência) |
| Admissões | registros com `admissionDate` dentro da competência |
| Desligamentos | registros com `terminationDate` dentro da competência |
| Turnover % | desligamentos / headcount × 100 |
| Absenteísmo % | (horas justificadas + injustificadas) / horas previstas × 100 |

**Deduplicação:** como o mesmo colaborador pode aparecer em lotes diferentes da mesma competência, a leitura deduplica por colaborador (chave `document` → `registration` → `employeeName`) mantendo o registro mais recente (`createdAt`). Sem isso o headcount seria contado em duplicidade.

**UI:** seletor de competência (`?competencia=AAAA-MM`), 5 KPIs, gráfico de evolução (headcount + turnover + absenteísmo) e tabela por setor. Setores sem headcount/admissões/desligamentos na competência são omitidos.

### 20.17 Cruzamento Workforce × Clima com IA

Página `/workforce/insights` (`getWorkforceInsights` / `generateWorkforceInsightsWithAI`) que cruza os indicadores de pessoas da competência selecionada com o clima da última onda e gera insights acionáveis com IA.

**Cruzamento determinístico (`getWorkforceCrossAnalysis`):**

| Etapa | Detalhe |
|---|---|
| Fontes | `getWorkforceDashboard(tenantId, competencia)` + `getLatestClimateSurveyDepartmentScores(tenantId)` (onda mais recente + scores por setor, sem recomputar radar/heatmap/evolução) |
| Junção | setores pareados por nome normalizado (`trim().toLowerCase()`) entre workforce e `departmentScores` do clima |
| Colunas | setor, headcount, absenteísmo %, turnover %, score de clima %, favorabilidade % e eNPS (nulos quando o clima está abaixo do limiar de anonimato) |
| Risco | `high` = absenteísmo ≥ 8% **e** clima < meta corporativa (`CLIMATE_SURVEY_CORPORATE_GOAL_PERCENT` = 70); `medium` = apenas uma das condições; `low` = nenhuma |
| Sem onda de clima | `climateWaveId = null`; risco calculado apenas pelo absenteísmo |

**Geração com IA (`generateWorkforceInsightsWithAI`):**

- Envia o cruzamento (competência + setores) para `getAIService()` com `tier: "high"` e a tool `save_workforce_insight`.
- O modelo **nunca acessa o banco** — retorna `toolCalls`; cada argumento é validado com `workforceInsightToolSchema` (Zod) e persistido via `replaceWorkforceInsights` (delete + createMany atômico por competência).
- `kind`: `root_cause` (causa raiz), `burnout_risk` (risco de burnout), `action_suggestion` (sugestão de ação). `severity`: `high`/`medium`/`low`. `departmentName` é opcional (nulo = insight geral).
- Sem competência selecionada ou sem setores → `AppError("WORKFORCE_NO_DATA")`.
- Tool calls inválidas ou de nome desconhecido são ignoradas (log `warn`), sem quebrar o fluxo.

**UI:** link "Análise com IA" no header de `/workforce`; back link "← Indicadores de Pessoas"; seletor de competência; matriz de risco por setor (badge de risco) e insights agrupados por tipo (badge de severidade). Botão "Gerar análise com IA" disponível para `admin` e `rh`.

### 20.18 Dashboard de Governança

Página `/governance` (`getGovernanceDashboard`) — visão macro para acompanhar clima, pessoas, alertas, planos de ação e o roadmap de ondas. Agrega serviços existentes (sem tabela própria):

| Bloco | Fonte |
|---|---|
| Clima (última onda) | `getClimateSurveyModuleDashboard` → adesão, favorabilidade, eNPS |
| Alertas | `getAlertStats` → abertos e críticos |
| Planos de ação | `countClimateSurveyActionPlanIndicators` → em andamento, concluídos, atrasados |
| Pessoas | `getWorkforceDashboard` → headcount, turnover, absenteísmo (competência mais recente) |
| Roadmap de ondas | `findClimateSurveyDispatchTimeline(tenantId, 24)` |

**Status de cada onda (`resolveGovernanceWaveStatus`):** `available` ou com `dispatchedAt` → `completed` (Concluída); `scheduled` com `scheduledAt` no passado → `late` (Atrasada); `scheduled` no futuro → `scheduled` (Agendada); `failed`/`cancelled` mapeados diretamente. O roadmap anual é representado pelas ondas agendadas/disponíveis com o respectivo status. Entrada "Governança" na Sidebar (ícone `Gauge`), disponível a todos os tenants.

---

## 21. Variáveis de Ambiente

Todas as variáveis são tipadas e validadas via `src/env.ts` com `@t3-oss/env-nextjs`. Se uma variável obrigatória estiver faltando, o build/start falha com erro explícito.

### Obrigatórias em produção

```bash
# Banco de dados
DATABASE_URL=postgresql://user:pass@host:5432/pulse

# Auth
NEXTAUTH_SECRET=...                       # segredo para assinar cookies de sessão (mín. 32 chars)

# Email
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@pulse.com

# Billing
BILLING_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Messaging
MESSAGING_PROVIDER=smsbarato                # "smsbarato" | "smsbarato-wa" | "console"
SMSBARATO_API_KEY=...                       # chave de integração fornecida pelo suporte SMS Barato
SMSBARATO_BASE_URL=https://sistema81.smsbarato.com.br/send  # SMS — endpoint da API (opcional — tem default)
SMSBARATO_WA_BASE_URL=https://sistema81.smsbarato.com.br/sendwa  # WhatsApp — endpoint (opcional — tem default)
SMSBARATO_WA_TEMPLATE=pulse_survey_2          # nome do template pré-aprovado no painel SMS Barato (opcional)
SMSBARATO_WA_REMINDER_TEMPLATE=pulse_survey_reminder_2  # nome do template de lembrete WA (opcional)
MESSAGING_WEBHOOK_SECRET=...                  # protege /api/webhooks/messaging (mín. 16 chars; opcional fora de produção)

# Mensagem de pesquisa de saúde (template com {nome} e {link}) — usado pelo SmsBaratoAdapter (SMS)
# Para smsbarato-wa, o template é definido no painel SMS Barato (SMSBARATO_WA_TEMPLATE / SMSBARATO_WA_REMINDER_TEMPLATE)
SURVEY_MESSAGE_TEMPLATE="Oi {nome}! Tem 1 minutinho? Sua pesquisa de bem-estar está aqui: {link}"
SURVEY_REMINDER_MESSAGE_TEMPLATE="Oi {nome}! Só passando para lembrar que seu link ainda está aberto: {link}"

# Storage
STORAGE_PROVIDER=s3                       # "s3" | "console" (default: "console")
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=pulse-documents
AWS_ENDPOINT_URL=...                      # endpoint customizado (ex: MinIO, Cloudflare R2) — opcional

# Jobs / Rate Limiter
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=...                        # opcional — autenticação Redis em produção
CRON_SECRET=...                           # proteção dos endpoints /api/jobs/*
RATE_LIMITER_PROVIDER=redis               # "redis" (padrão produção) | "memory" (testes sem Redis)

# IA (ingestão e análise de dados)
AI_PROVIDER=openai                        # "openai" | "claude" | "gemini" | "console" (default: "console")
OPENAI_API_KEY=sk-...                     # obrigatória se AI_PROVIDER=openai
OPENAI_MODELS_HIGH=gpt-4o,gpt-4-turbo,gpt-4o-mini        # opcional — default no adapter (fallback em ordem)
OPENAI_MODELS_MEDIUM=gpt-4o-mini,gpt-4o,gpt-3.5-turbo    # opcional
OPENAI_MODELS_LOW=gpt-4o-mini,gpt-3.5-turbo,gpt-4o       # opcional
ANTHROPIC_API_KEY=sk-ant-...              # obrigatória se AI_PROVIDER=claude
ANTHROPIC_MODELS_HIGH=claude-3-5-sonnet-latest,claude-3-opus-latest,claude-3-5-haiku-latest  # opcional
ANTHROPIC_MODELS_MEDIUM=...               # opcional
ANTHROPIC_MODELS_LOW=...                  # opcional
GEMINI_API_KEY=...                        # obrigatória se AI_PROVIDER=gemini
GEMINI_MODELS_HIGH=gemini-2.5-pro,gemini-pro-latest,gemini-3.5-flash   # opcional
GEMINI_MODELS_MEDIUM=gemini-2.5-flash,gemini-flash-latest,gemini-3.5-flash   # opcional
GEMINI_MODELS_LOW=gemini-flash-lite-latest,gemini-3.5-flash-lite,gemini-2.5-flash   # opcional
AI_MAX_TOKENS=4096                        # default
AI_TEMPERATURE=0                          # default (0 = determinístico)

# URL pública
NEXT_PUBLIC_APP_URL=https://app.pulse.com

# URL interna para chamadas server-to-server (proxy.ts → /api/internal/*)
# Em Docker deve ser http://localhost:3000 (padrão) — NUNCA usar NEXT_PUBLIC_APP_URL aqui
# pois em AWS/Docker o container não consegue alcançar a própria URL pública (hairpin NAT)
INTERNAL_API_URL=http://localhost:3000

# Versão da aplicação (opcional — exibida na UI)
NEXT_PUBLIC_APP_VERSION=1.0.0

# Número do consultor — usado no botão "Falar com consultor" quando o plano não tem preço
NEXT_PUBLIC_CONSULTANT_WHATSAPP=5511999999999  # substituir pelo número real em produção

# Endereços de e-mail públicos (exibidos em páginas, modais e templates)
NEXT_PUBLIC_EMAIL_SUPPORT=suporte@pulseips.com.br
NEXT_PUBLIC_EMAIL_PRIVACY=privacidade@pulseips.com.br
NEXT_PUBLIC_EMAIL_CONTACT=contato@pulseips.com.br
NEXT_PUBLIC_EMAIL_LEGAL=legal@pulseips.com.br
```

### Opcionais / diagnóstico

```bash
# Logging
LOG_LEVEL=info                            # nível pino: trace | debug | info | warn | error | fatal | silent (default: "info")
NODE_ENV=production                       # development | test | production

# Anonimato
HEALTH_SURVEY_MINIMUM_RESPONDENTS_FOR_DISPLAY=5        # mínimo de respondentes para exibir métricas de um setor (padrão: 5)

# Segurança (use apenas em ambientes controlados)
DISABLE_SECURITY_HEADERS=true            # desabilita headers HTTP de segurança (ex: para proxy reverso)
```

### Desenvolvimento (valores padrão)

```bash
EMAIL_PROVIDER=console          # imprime HTML completo no terminal
MESSAGING_PROVIDER=console      # imprime mensagem no terminal
DATABASE_URL=postgresql://...   # banco local
```

### Para webhooks Stripe em desenvolvimento

```bash
# Instalar Stripe CLI e rodar em terminal separado:
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
# Copiar o whsec_... gerado para STRIPE_WEBHOOK_SECRET no .env
```

---

## 22. Comandos Úteis

```bash
# Desenvolvimento
yarn dev                    # inicia Next.js em localhost:3000

# Banco de dados
npx prisma migrate dev      # cria migration a partir de mudanças no schema
npx prisma generate         # regenera Prisma Client
npx prisma studio           # abre UI de inspeção do banco
npx prisma migrate deploy   # aplica migrations pendentes (produção)

# Seed
npx ts-node src/cli/seed/index.ts   # popula banco com super admin + termos v1.0.0

# TypeScript
npx tsc --noEmit            # verifica tipagem sem compilar (deve retornar 0 erros)

# Lint
yarn lint                   # ESLint — deve retornar 0 erros e 0 warnings antes de qualquer PR

# Testes
yarn test                   # executa todos os testes unitários (Vitest)
yarn test:coverage          # executa testes com relatório de cobertura (meta: ≥ 90%)

# Build
yarn build                  # build de produção (deve ser limpo, sem warnings)

# Workers (processos separados)
npm run worker:schedules    # registra schedules recorrentes no Redis
npm run worker:dev          # inicia processo worker BullMQ

# Stripe (desenvolvimento)
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
```

---

## 23. localStorage — Padrão de Uso

### Utilitário centralizado

Todo acesso ao `localStorage` passa por `src/libs/local-storage.ts`.  
**Nunca use `window.localStorage` diretamente nos componentes.**

```typescript
// src/libs/local-storage.ts
import { storage } from "@/libs/local-storage"

storage.get(storage.KEYS.lastOrgSlug)        // lê
storage.set(storage.KEYS.lastOrgSlug, slug)  // escreve
storage.remove(storage.KEYS.lastOrgSlug)     // apaga
```

### Chaves disponíveis (`storage.KEYS`)

| Chave | Valor no localStorage | Descrição |
|---|---|---|
| `lastOrgSlug` | `pulse:last-org-slug` | Último slug de organização usado no login |
| `surveyIdentifier` | `pulse:survey-identifier` | Identificador (telefone ou documento) usado no último acesso via link assinado de pesquisa |

### sessionStorage — rascunho de pesquisa de clima

Rascunhos do formulário público usam **sessionStorage** (escopo da aba) via os helpers `storage.getSession` / `setSession` / `removeSession`:

| Prefixo | Chave completa | Descrição |
|---|---|---|
| `SESSION_KEY_PREFIXES.climateSurveyDraft` | `pulse:climate-survey-draft:{token}` | Scores Likert + índice da pergunta em andamento — restaurado no refresh; limpo no submit/opt-out |

```typescript
storage.setSession(storage.climateSurveyDraftKey(token), JSON.stringify({ scores, currentIndex }))
storage.getSession(storage.climateSurveyDraftKey(token))
storage.removeSession(storage.climateSurveyDraftKey(token))
```

### Regras obrigatórias

1. **Prefixo `pulse:`** — todas as chaves usam o prefixo `pulse:` para evitar colisão com outras libs.
2. **SSR-safe** — o utilitário guarda com `typeof window === "undefined"`. Nunca lança exceção em SSR/RSC.
3. **try/catch silencioso** — falhas de storage (private browsing, storage cheio) são ignoradas silenciosamente.
4. **Somente em Client Components** — importar `@/libs/local-storage` apenas em arquivos com `"use client"`.
5. **Sem lógica de negócio** — o utilitário é apenas I/O. Decisões sobre o que salvar ficam no componente.
6. **Nunca `window.sessionStorage` direto** — use `storage.getSession` / `setSession` / `removeSession`.

### Adicionar nova chave

1. Adicione a entrada em `KEYS` em `src/libs/local-storage.ts`
2. Documente na tabela acima
3. Use apenas `storage.KEYS.nomeDaChave` — nunca escreva a string literal fora do utilitário

```typescript
// Correto
storage.set(storage.KEYS.lastOrgSlug, slug)

// ERRADO — nunca faça isso
localStorage.setItem("pulse:last-org-slug", slug)
```

### Onde está implementado hoje

| Componente | Evento | Operação |
|---|---|---|
| `src/app/(auth)/login/login-form.tsx` | `useEffect` (mount) | Lê `lastOrgSlug` → preenche campo "Organização" via `form.setValue` |
| `src/app/(auth)/login/login-form.tsx` | Login bem-sucedido | Salva `lastOrgSlug` com o slug digitado |
| `src/app/(auth)/checkout/checkout-form.tsx` | Submit bem-sucedido (antes do redirect Stripe) | Salva `lastOrgSlug` com o slug cadastrado |
| `src/app/(public)/health-survey/link/[linkToken]/health-survey-unlock-form.tsx` | Mount (via `useSyncExternalStore`) | Lê `surveyIdentifier` → pré-preenche campo "Telefone ou documento" |
| `src/app/(public)/health-survey/link/[linkToken]/health-survey-unlock-form.tsx` | Acesso bem-sucedido (sem erro) | Salva `surveyIdentifier` com o identificador validado |
| `src/app/(public)/climate-survey/[token]/climate-survey-form.tsx` | Resposta Likert / Voltar | Salva rascunho em `sessionStorage` (`pulse:climate-survey-draft:{token}`) |
| `src/app/(public)/climate-survey/[token]/climate-survey-form.tsx` | Mount (via `useSyncExternalStore`) | Restaura scores e índice após refresh |
| `src/app/(public)/climate-survey/[token]/climate-survey-form.tsx` | Submit / opt-out bem-sucedido | Remove o rascunho |

### Padrão para leitura de localStorage em Client Components

**Use `useSyncExternalStore` para leitura de localStorage que inicializa estado de input.** Esta é a abordagem correta para evitar dois problemas simultaneamente:

1. **Hydration mismatch** — o `getServerSnapshot` retorna `""` no SSR; o `getSnapshot` retorna o valor real no cliente
2. **`react-hooks/set-state-in-effect`** — a regra ESLint proíbe chamar `setState` dentro de `useEffect`/`useLayoutEffect`

```typescript
function subscribeToSomeKey(_callback: () => void): () => void {
  return () => {}  // no-op — localStorage não emite eventos observáveis no mesmo contexto
}

function getSomeKeySnapshot(): string {
  return storage.get(storage.KEYS.someKey) ?? ""
}

function getSomeKeyServerSnapshot(): string {
  return ""
}

// No componente:
const savedValue = useSyncExternalStore(
  subscribeToSomeKey,
  getSomeKeySnapshot,
  getSomeKeyServerSnapshot,
)
```

**Para combinar com input controlado** (o usuário pode sobrescrever o valor salvo):

```typescript
const [typedValue, setTypedValue] = useState<string | null>(null)
const savedValue = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

const identifier = typedValue ?? savedValue  // null = usuário não digitou ainda → usa o salvo

// Input:
<Input value={identifier} onChange={(e) => { setTypedValue(e.target.value) }} />
```

`typedValue = null` → exibe o salvo; `typedValue = ""` → usuário limpou deliberadamente; `typedValue = "algum texto"` → usuário digitou.

> **Exceção:** `login-form.tsx` usa `form.setValue` do react-hook-form dentro de `useEffect`, pois `form.setValue` não é um setter React (`setState`) e não dispara a regra ESLint. Para componentes sem react-hook-form, use sempre o padrão `useSyncExternalStore` acima.

---

*Pulse — AGENTS.md | Documento interno | Maio de 2026*

## 24. Labels e Badges — Valores de Enum na UI

**Regra:** Nunca exibir valores de enum/banco de dados diretamente na interface (`score_drop`, `pgr_review_due`, `WARNING`, etc.).  
Todo valor técnico deve ter um label em **português** definido explicitamente antes de ser renderizado.

### Padrão obrigatório

```tsx
// ✅ CORRETO — label explícito em ptBR
const TYPE_LABELS: Record<string, string> = {
  score_drop:      "Queda de score",
  pgr_review_due:  "Revisão PGR pendente",
  low_adherence:   "Adesão baixa",
  negative_trend:  "Tendência negativa",
  // ...
}
// Uso:
{TYPE_LABELS[item.type] ?? item.type}

// ❌ ERRADO — jamais renderize o valor bruto diretamente
{item.type}              // mostra "score_drop"
{item.severity}          // mostra "warning"
```

### Fallback

O fallback `?? item.type` é permitido apenas como segurança (para tipos futuros não mapeados). Sempre adicione o label correspondente ao Record quando um novo tipo for criado.

### Tipos de alerta mapeados (`alerts`)

| Valor no banco | Label exibido |
|---|---|
| `score_drop` | Queda de score |
| `low_score` | Score baixo |
| `pgr_review_due` | Revisão PGR pendente |
| `negative_trend` | Tendência negativa |
| `low_adherence` | Adesão baixa |
| `no_response` | Sem resposta |
| `billing` | Cobrança |
| `system` | Sistema |

### Severidades mapeadas (`alerts`)

| Valor no banco | Label exibido |
|---|---|
| `info` | Informativo |
| `warning` | Atenção |
| `critical` | Crítico |

### Cores de badges

**Nunca use classes Tailwind hardcoded de cor** (`bg-red-100 text-red-800`, etc.) — use as utilitárias semânticas de badge definidas em `src/app/globals.css` e os constants de `src/libs/design-system/alert-labels.ts`.

```tsx
// ✅ CORRETO — constants centralizados
import { BADGE_BASE, BADGE_RED, BADGE_GREEN, BADGE_AMBER, BADGE_BLUE } from "@/libs/design-system/alert-labels"

<span className={`${BADGE_BASE} ${BADGE_GREEN}`}>Resolvido</span>
<span className={`${BADGE_BASE} ${BADGE_RED}`}>Falhou</span>
```

| Constant | Classe CSS gerada | Semântica |
|---|---|---|
| `BADGE_GREEN` | `badge-success` | Sucesso / resolvido / ativo |
| `BADGE_RED` | `badge-danger` | Erro / crítico / falhou |
| `BADGE_AMBER` | `badge-warning` | Atenção / queda / pendente |
| `BADGE_BLUE` | `badge-info` | Informativo / agendado |
| `BADGE_DEFAULT` | `bg-muted text-muted-foreground border-border` | Neutro / sem status |

As classes `badge-*` são utilitárias definidas em `@layer utilities` em `globals.css` e usam as variáveis `--status-*` — adaptam-se automaticamente ao tema dark/light sem precisar de prefixo `dark:`.

**Não use inline `style={{ color, backgroundColor }}`** para badges — usar className garante consistência com o tema e o Tailwind JIT/oxide inclui as classes por serem literais no fonte.

---

## 25. Padrão de Navegação em Listagens

### Link de voltar em páginas de detalhe — padrão obrigatório

**Toda página de detalhe (subpágina de uma seção) deve ter um link de voltar no topo do cabeçalho.** O padrão é um `Link` com seta unicode `←` seguida do nome da seção pai.

#### Implementação obrigatória

```tsx
<div className="border-b border-border bg-card px-6 py-4 shrink-0">
  <Link href="/secao" className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Nome da Seção</Link>
  <div className="mt-2">
    <h1 className="text-sm font-bold uppercase tracking-widest">Título da Página</h1>
    <p className="text-xs text-muted-foreground mt-0.5">Subtítulo opcional</p>
  </div>
</div>
```

Quando o header contém ações (botões, badges) ao lado do título, use `flex items-start justify-between` no `div` interno:

```tsx
<div className="border-b border-border bg-card px-6 py-4 shrink-0">
  <Link href="/secao" className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Nome da Seção</Link>
  <div className="flex items-start justify-between mt-2">
    <div>
      <h1 className="text-sm font-bold uppercase tracking-widest">Título</h1>
      <p className="text-xs text-muted-foreground mt-0.5">Subtítulo</p>
    </div>
    <div className="flex items-center gap-2">
      {/* ações: botões, badges */}
    </div>
  </div>
</div>
```

#### Regras

| Regra | Detalhe |
|---|---|
| Sempre `← Nome da Seção` | Use seta unicode `←`, não ícone (`ChevronLeft`, `ArrowLeft`) |
| `text-xs text-muted-foreground hover:text-foreground transition-colors` | Classe CSS exata — não varie |
| Link acima do título | O link fica na linha de cima; o título vem abaixo com `mt-2` |
| Sem separador `/` ou breadcrumb multilevel | Use apenas um nível de volta — nunca encadeie "Seção / Subseção" |
| Sem botão "Voltar" com ícone inline | Nunca use `ChevronLeft`/`ArrowLeft` + texto "Voltar" lado a lado com divisor |
| Sem `flex items-center gap-3` com separador `div w-px` | Padrão antigo proibido |

### Botão de seta (ChevronRight) — obrigatório em listagens

**Toda tabela de listagem que possui página de detalhe deve usar um `ChevronRight` como ação de navegação na última coluna da linha.** Nunca use texto "Visualizar", links no título/nome, ou qualquer outro padrão.

#### Implementação obrigatória

```tsx
import { ChevronRight } from "lucide-react"
import Link from "next/link"

// Cabeçalho da coluna — sem texto, apenas reserva espaço
<th className="px-4 py-2.5 w-8" />

// A <tr> DEVE ter a classe `group` para o efeito hover funcionar
<tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors group">
  {/* demais células */}
  <td className="px-3 py-3 text-right">
    <Link href={`/rota/${item.id}`} className="block">
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors ml-auto" />
    </Link>
  </td>
</tr>
```

#### Regras

| Regra | Detalhe |
|---|---|
| Coluna de seta sempre por último | A coluna `<th className="w-8" />` é a última de toda tabela com detalhe |
| `group` na `<tr>` | Obrigatório — sem ele, `group-hover:text-foreground` não funciona |
| Título/nome da linha: texto puro | Não transforme o título ou nome em link clicável para navegação |
| Sem botão "Visualizar" | Texto de ação de navegação é proibido — use apenas o ícone |
| Tabelas sem página de detalhe | Não adicione a coluna de seta (ex: documentos, alertas, relatos anônimos) |

#### Exceções — tabelas com ações inline mas SEM página de detalhe

Tabelas como `documents`, `alerts` e `reports` gerenciam tudo inline (upload, status, resolução). **Não** adicionam coluna de seta.

### Botões de ação inline (Editar / Excluir) — padrão obrigatório

**Nenhum botão de ação destrutiva usa classes hardcoded `destructive/*` ou `hover:text-destructive`.** Todo botão de excluir/cancelar/desativar usa as CSS vars centralizadas `status-danger-*` definidas em `globals.css` (ver §32). Isso garante consistência visual automática entre temas dark/light.

#### Padrão: icon-only (dentro de tabelas)

```tsx
import { Pencil, Trash2 } from "lucide-react"

// Editar — icon-only
<button
  onClick={() => openEdit(item)}
  style={{ borderRadius: 0 }}
  className="flex items-center gap-1 px-2 py-1 border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
  title="Editar"
>
  <Pencil size={12} />
</button>

// Excluir — icon-only
<button
  onClick={() => setDeleteTarget(item)}
  style={{ borderRadius: 0 }}
  className="flex items-center gap-1 px-2 py-1 border border-status-danger-border text-status-danger hover:bg-status-danger-subtle transition-colors"
  title="Excluir"
>
  <Trash2 size={12} />
</button>
```

Quando o botão de editar é um `Link` de navegação (não um `onClick`), use o mesmo padrão mas com `<Link>`:

```tsx
<Link
  href={`/rota/${item.id}`}
  className="flex items-center gap-1 px-2 py-1 border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
  style={{ borderRadius: 0 }}
  title="Editar"
>
  <Pencil size={12} />
</Link>
```

#### Padrão: hover-only (ícone destrutivo sem borda permanente)

Para ícones de remoção discretos (ex: remover item de lista dentro de form):

```tsx
<button
  className="shrink-0 p-1 text-muted-foreground hover:text-status-danger transition-colors"
  style={{ borderRadius: 0 }}
  type="button"
>
  <Trash2 className="h-3.5 w-3.5" />
</button>
```

#### Padrão: botão de confirmação destrutiva em modal (único caso com `bg-destructive` sólido)

O botão final de confirmação dentro de um modal de exclusão usa background sólido. **Esta é a única exceção** — é intencional para comunicar o peso da ação:

```tsx
<button
  className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 transition-colors"
  style={{ borderRadius: 0 }}
>
  Excluir
</button>
```

#### Regras

| Regra | Detalhe |
|---|---|
| **Sempre icon-only** | Nunca use texto "Editar" ou "Excluir" como label visível em botões de ação de tabela/listagem |
| `Pencil` para editar | Sempre o ícone de lápis do lucide-react |
| `Trash2` para excluir/remover | Sempre o ícone de lixeira do lucide-react |
| `title="Editar"` / `title="Excluir"` | Sempre adicionar `title` para acessibilidade |
| Nunca `border-destructive/40 text-destructive hover:bg-destructive/10` | Padrão antigo proibido — usa hardcoded Tailwind |
| Nunca `hover:text-destructive` | Substituir por `hover:text-status-danger` |
| `border-status-danger-border text-status-danger hover:bg-status-danger-subtle` | Padrão correto para botões de ação destrutiva com borda |
| `bg-destructive text-destructive-foreground` | Permitido apenas no botão final de confirmação dentro de modal |
| `transition-colors` obrigatório | Todo botão de ação deve ter `transition-colors` |
| `disabled:opacity-50 disabled:cursor-not-allowed` | Obrigatório quando o botão pode ser desabilitado |
| `style={{ borderRadius: 0 }}` | Sempre nos botões de ação inline (sem border-radius) |

---

## 26. Fronteiras de Camada

Esta é a regra de importação mais importante do projeto. **Cada camada só pode importar as camadas abaixo dela.** Violar essa hierarquia quebra o isolamento e cria acoplamento oculto.

### Hierarquia de dependências

```
app/ (pages, Server Actions, layouts)
  ↓ importa apenas
modules/*/service.ts
  ↓ importa apenas
modules/*/repository.ts
  ↓ importa apenas
libs/db/index.ts (Prisma client)
```

Adicionalmente:

```
libs/integrations/*        ← services podem importar via factory (getEmailService(), etc.)
libs/auth/permissions.ts   ← services e Server Actions podem importar
libs/utils/*               ← qualquer camada pode importar
modules/*/schema.ts        ← qualquer camada pode importar (validação pura)
modules/*/types.ts         ← qualquer camada pode importar (tipos puros)
```

### Regras por camada

| Camada | Pode importar | Proibido |
|---|---|---|
| `src/app/**` | services, schemas, types, libs/utils, libs/auth | Prisma diretamente, repositories, SDKs externos |
| `src/modules/*/service.ts` | repositories, libs/integrations (via factory), libs/auth, libs/utils, types, schemas | Prisma diretamente, SDKs externos diretamente |
| `src/modules/*/repository.ts` | libs/db (Prisma), libs/utils, types | services, SDKs externos que não sejam o ORM |
| `src/libs/integrations/**` | SDKs externos (Resend, Stripe), libs/utils | Prisma, modules |
| `src/modules/*/types.ts` | libs/utils/json, outros types | `@prisma/client`, SDKs externos |

### Exemplos práticos

```typescript
// ❌ PROIBIDO — app layer acessando prisma diretamente
// src/app/(tenant)/employees/page.tsx
import { prisma } from "@/libs/db"
const employees = await prisma.employee.findMany(...)

// ✅ CORRETO — app layer chama service
import { listEmployees } from "@/modules/employees/employee.service"
const employees = await listEmployees(tenantId)

// ❌ PROIBIDO — service acessando prisma diretamente
// src/modules/employees/employee.service.ts
import { prisma } from "@/libs/db"
const emp = await prisma.employee.findFirst(...)

// ✅ CORRETO — service chama repository
import { findEmployeeById } from "@/modules/employees/employee.repository"
const emp = await findEmployeeById(tenantId, id)

// ❌ PROIBIDO — types file expondo tipo do Prisma
// src/modules/billing/billing.types.ts
import type { Prisma } from "@prisma/client"
export interface WebhookEventInput { payload?: Prisma.InputJsonValue }

// ✅ CORRETO — types file usa tipo próprio
import type { JsonValue } from "@/libs/utils/json"
export interface WebhookEventInput { payload?: JsonValue }
```

### Interfaces de domínio em types.ts — proibido importar de @prisma/client

**Arquivos `*.types.ts` nunca importam nem re-exportam tipos de `@prisma/client`.** Cada entidade de domínio deve ter sua própria interface TypeScript, definida manualmente e independente do ORM.

```typescript
// ❌ PROIBIDO — re-exportar tipo do Prisma
export type { Employee } from "@prisma/client"

// ❌ PROIBIDO — importar tipo do Prisma como base
import type { Employee } from "@prisma/client"
export interface EmployeeWithDept extends Employee { ... }

// ✅ CORRETO — interface própria, sem dependência de ORM
export interface Employee {
  id: string
  tenantId: string
  name: string
  email: string | null
  phone: string
  status: "active" | "inactive" | "paused"
  createdAt: Date
  updatedAt: Date
}
```

**Motivo:** as interfaces de domínio são contratos do negócio — devem existir independentemente do ORM utilizado. Se o Prisma for trocado por outro ORM, apenas `repository.ts` deve mudar. `types.ts`, `service.ts` e toda a camada de app devem permanecer intactos.

**Como lidar com campos extras do Prisma:** os modelos Prisma geralmente têm mais campos que as interfaces de domínio precisam. Isso é intencional — a interface de domínio expõe apenas o contrato necessário. O TypeScript structural typing garante que o retorno do repository (Prisma type, que é um superset) seja compatível com a interface de domínio.

---

## 27. Abstração de SDKs e ORM

O código de domínio (services, types, schemas) deve ser completamente agnóstico ao provedor. Stripe, Resend e Prisma são detalhes de infraestrutura — **nenhum tipo, constante ou referência desses SDKs pode aparecer fora da camada de adaptação**.

### Regras

| Artefato | Onde fica | Proibido fora |
|---|---|---|
| `Prisma.*` (InputJsonValue, JsonValue, etc.) | `*.repository.ts` | Qualquer outro arquivo |
| `Stripe.*` (Event, Subscription, Invoice, etc.) | `libs/integrations/billing/stripe.adapter.ts` | Qualquer outro arquivo |
| `Resend.*` | `libs/integrations/email/resend.adapter.ts` | Qualquer outro arquivo |
| Constantes de URL/versão de SDK | `src/env.ts` ou o adapter correspondente | Qualquer outro arquivo |

### Padrão de abstração

Quando um adapter precisa retornar dados de um SDK, **sempre converte para tipo próprio** antes de retornar:

```typescript
// ❌ PROIBIDO — retornar tipo do SDK para fora do adapter
async createCheckoutSession(...): Promise<Stripe.Checkout.Session> { ... }

// ✅ CORRETO — converter para tipo da aplicação
async createCheckoutSession(...): Promise<CreateCheckoutSessionResult> {
  const session = await stripe.checkout.sessions.create(...)
  return { sessionId: session.id, url: session.url! }
}
```

### Constantes de SDK no `.env`

Toda configuração de SDK (API version, base URL, region) vem do `.env` via `src/env.ts`. **Nunca hardcode** strings de configuração de provedores no código:

```typescript
// ❌ PROIBIDO — hardcoded no adapter
const SMSBARATO_BASE_URL = "https://sistema81.smsbarato.com.br/send"

// ✅ CORRETO — via env
const baseUrl = env.SMSBARATO_BASE_URL
```

---

## 28. Queries Cross-tenant — Convenção de Naming para Jobs

Jobs (BullMQ) precisam processar dados de **todos os tenants** de uma vez. Isso é uma **exceção intencional** ao tenant guard — não um bug. Para distinguir, é obrigatório usar o prefixo `findAllTenants` em qualquer função de repositório que omita o `tenantId` em tabelas que normalmente exigem esse filtro.

### Regra

```typescript
// ❌ PROIBIDO — nome ambíguo, parece estar faltando tenantId
async function findPendingDispatches(): Promise<HealthSurveyDispatch[]> {
  return prisma.healthSurveyDispatch.findMany({ where: { status: "scheduled" } })
}

// ✅ CORRETO — nome deixa explícito que é cross-tenant intencional
async function findAllTenantsPendingDispatches(): Promise<HealthSurveyDispatch[]> {
  return prisma.healthSurveyDispatch.findMany({ where: { status: "scheduled" } })
}
```

### Quando usar

| Cenário | Naming obrigatório |
|---|---|
| Job que processa todos os tenants (health-survey-dispatcher, adherence-checker, etc.) | `findAllTenants*` |
| Métricas de plataforma para Super Admin | `findAllTenants*` ou `getPlatform*` |
| Manutenção / cleanup (token-cleanup, employee-unpause) | `findAllTenants*` |

### Onde NÃO usar

Toda query em contexto de tenant (Server Action, service chamado por Server Action, page RSC) **deve** ter `tenantId`. O prefixo `findAllTenants*` é exclusivo para jobs e agregações de plataforma.

---

## 29. Checklist de Conformidade Pré-PR

Antes de considerar qualquer tarefa concluída, execute **todos** os itens abaixo. Zero tolerância para warnings.

### Verificações automáticas (obrigatórias)

```bash
npx tsc --noEmit   # deve retornar 0 erros
yarn lint          # deve retornar 0 erros e 0 warnings
```

### Verificações manuais (obrigatórias)

Execute `grep` para confirmar cada item:

| # | Verificação | Comando de grep |
|---|---|---|
| 1 | Nenhum `@prisma/client` importado em `src/app/**` | `grep -r "from \"@prisma/client\"" src/app/` |
| 2 | Nenhum `@prisma/client` importado em `modules/*/types.ts` ou `modules/*/service.ts` | `grep -r "@prisma/client" src/modules/` |
| 3 | Nenhum `prisma` importado em `service.ts` | `grep -rn "from \"@/libs/db\"" src/modules/ \| grep service` |
| 4 | Nenhum `$queryRaw` / `$executeRaw` em qualquer arquivo | `grep -r "\$queryRaw\|\$executeRaw" src/` |
| 5 | Todas as queries em tabelas com `tenant_id` incluem `tenantId` no `where` | Revisar manualmente qualquer novo repository |
| 6 | Mensagens de erro em pt-BR | `grep -rn '"[A-Z].*[a-z]"' src/modules/ \| grep "throw\|AppError"` |
| 7 | Nenhum `console.*` em nenhum arquivo (exceto `src/libs/utils/logger.ts` e `src/libs/logger.ts`) | `grep -rn "console\." src/ --include="*.ts" --include="*.tsx" \| grep -v "src/libs/utils/logger.ts" \| grep -v "src/libs/logger.ts"` |
| 8 | Queries cross-tenant de jobs nomeadas com `findAllTenants*` | Revisar `src/workers/` e jobs que chamam repositories sem `tenantId` |
| 9 | Nenhum `enum` TypeScript (use union types ou const maps) | `grep -rn "^enum \|  enum " src/` |
| 10 | `JsonValue` de `@/libs/utils/json` — nunca `Prisma.InputJsonValue` fora de repository | `grep -rn "Prisma\.InputJsonValue\|Prisma\.JsonValue" src/modules/ src/app/` |
| 11 | Nenhum `<select>` nativo fora de `native-select.tsx` — usar sempre `NativeSelect` (§35) | `grep -rn "<select" src --include="*.tsx" \| grep -v "native-select.tsx"` |
| 12 | Nenhum `?? ""` ou `: ""` em campos que serão persistidos no banco | `grep -rn '?? ""\|: ""' src/modules/ src/workers/ src/app/\(auth\)/ \| grep -v ".test.\|placeholder\|className"` |

### Verificações de domínio (obrigatórias para funcionalidades novas)

| # | Verificação |
|---|---|
| 13 | Nova tabela com `tenant_id`? Todos os repositórios recebem `tenantId` como 1º parâmetro |
| 14 | Nova integração externa? Existe interface em `libs/integrations/*/interface.ts` e adapter separado |
| 15 | Novos tipos JSON? Usam `JsonValue` de `@/libs/utils/json`, não tipos do ORM |
| 16 | Novo evento de billing? Mapeado em `webhook.handler.ts` e na tabela de eventos da §15 |
| 17 | Novos valores de enum no banco? Mapeados em `LABELS` Record antes de renderizar na UI (§24) |
| 18 | Nova rota com dados sensíveis? Tenant guard ativo no `proxy.ts` ou no layout |
| 19 | Novo módulo? Segue estrutura `repository + service + schema + types` (§10) |
| 20 | Novos erros de negócio? Usam `AppError` com mensagem em pt-BR |
| 21 | Server Action nova? Chama `getSession()`, valida com Zod, chama `revalidatePath` após mutação |
| 22 | `employee_consents` modificado? `ConsentRepository` ainda é append-only (sem `update`/`delete`) |
| 23 | **Todo identificador novo passa na pergunta de validação de nomenclatura?** Função, tipo, componente, job, constante, arquivo — o nome carrega domínio + entidade + ação sem precisar abrir o arquivo? (§9) |

### Quando o PR pode ser considerado pronto

- `tsc --noEmit` → **0 erros**
- `yarn lint` → **0 erros, 0 warnings**
- `yarn test:coverage` → **cobertura ≥ 90%** nos arquivos em escopo (ver `vitest.config.ts`)
- Todos os itens manuais acima verificados
- Sem `TODO`, `FIXME` ou `@ts-ignore` introduzidos

*Pulse — AGENTS.md | Documento interno | Maio de 2026*

---

## 30. Testes Unitários

### Regra obrigatória — todo service novo exige teste

**Sempre que um novo `*.service.ts` for criado ou um service existente receber novos comportamentos, o arquivo de teste correspondente deve ser criado ou atualizado na mesma sessão de trabalho.** Nenhuma tarefa que envolva service é considerada concluída sem testes unitários cobrindo ao menos os cenários abaixo:

- Happy path — retorno correto e chamadas corretas aos repositórios
- Todos os `AppError` que o service pode lançar
- Guards de validação (token expirado, não encontrado, estado inválido)
- Toda lógica de negócio condicional (limites, regras de estado, fluxos alternativos)

**Adicionalmente:**

1. Criar `src/modules/{dominio}/{nome}.service.test.ts` ao lado do service
2. Adicionar o caminho em `vitest.config.ts` → `coverage.include`
3. Rodar `yarn test:coverage` e garantir ≥ 90% nas linhas do arquivo antes de considerar a tarefa concluída

Não é aceitável criar um service sem testes com a intenção de "adicionar depois" — testes fazem parte da entrega, não são etapa opcional.

---

### Framework

**Vitest** (`yarn test` / `yarn test:coverage`) com ambiente `node`. Sem DOM — os testes cobrem exclusivamente a camada de service e utilitários.

```bash
yarn test                  # executa todos os testes
yarn test:coverage         # relatório de cobertura (meta: ≥ 90%)
```

### Escopo de cobertura

Os arquivos em escopo estão declarados em `vitest.config.ts` na chave `coverage.include`. A meta de cobertura é **≥ 90%** em todos eles. Para adicionar cobertura de um novo service, basta incluí-lo nessa lista.

**Em escopo (serviços de domínio + utilitários):**
- `src/libs/utils/*.ts` — slug, pagination, date, health-index, cron-auth
- `src/modules/*/service.ts` — toda a lógica de negócio dos módulos
- `src/modules/action-plans/suggestions/*.ts` — geração de sugestões

**Fora do escopo (intencionalmente):**
- Repositories — testam o ORM, não lógica de negócio; exigem banco real
- Server Actions e páginas — testadas via E2E ou manualmente
- Adapters de integração — testados por contrato/smoke test manual
- Workers — testados via execução manual

### Localização dos arquivos de teste

Todo arquivo de teste fica **ao lado do arquivo testado**, com sufixo `.test.ts`:

```
src/modules/employees/
├── employee.service.ts
├── employee.service.test.ts   ← testa employee.service.ts
├── employee.repository.ts     ← não tem teste unitário
└── ...
```

### Estrutura obrigatória

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"

// 1. Mock de todos os repositórios e dependências externas
vi.mock("@/modules/employees/employee.repository")
vi.mock("@/env", () => ({ env: { NEXT_PUBLIC_APP_URL: "http://localhost:3000" } }))

// 2. Referências tipadas aos mocks (vi.mocked garante tipos corretos)
const mockCreateEmployee = vi.mocked(createEmployee)

// 3. Constantes de fixtures no topo (sem factories desnecessárias)
const TENANT_ID = "tenant-1"
const EMPLOYEE_INPUT = { name: "Ana Silva", phone: "+5511999999999", departmentId: "dept-1" }

// 4. Reset dos mocks antes de cada teste
beforeEach(() => {
  vi.clearAllMocks()
  // Setup dos happy-path defaults
  mockCreateEmployee.mockResolvedValue(CREATED_EMPLOYEE as Awaited<ReturnType<typeof createEmployee>>)
})

// 5. describe por comportamento testado, it com frase em português
describe("createNewEmployee — limite do plano", () => {
  it("lança AppError quando limite do override é atingido", async () => {
    mockFindOrganizationById.mockResolvedValue({ maxEmployeesOverride: 5 } as ...)
    mockCountEmployees.mockResolvedValue(5)

    await expect(createNewEmployee(TENANT_ID, EMPLOYEE_INPUT))
      .rejects.toMatchObject({ code: "EMPLOYEE_LIMIT_REACHED" })
  })
})
```

### Regras de mocking

| O que mockar | Como |
|---|---|
| Repositories | `vi.mock("@/modules/x/x.repository")` — auto-mock de todas as funções |
| Módulos com factory (`queue`, `integrations`) | `vi.mock("@/libs/queue", () => ({ getMessageQueue: vi.fn(() => ({ add: vi.fn() })) }))` |
| Módulo `@/env` | `vi.mock("@/env", () => ({ env: { NEXT_PUBLIC_APP_URL: "..." } }))` sempre |
| Prisma | Nunca — use repository mocks |
| Funções do mesmo módulo | Use o import real, não mock — se precisar, é sinal de acoplamento |

### Cast de tipo nos mocks

`vi.mocked()` garante que o mock tem o tipo correto. Use `as Awaited<ReturnType<typeof fn>>` para casts de retorno:

```typescript
// ✅ Correto — cast preciso sem `any`
mockFindEmployee.mockResolvedValue(
  { id: "emp-1", name: "Ana" } as Awaited<ReturnType<typeof findEmployeeById>>
)

// ❌ Proibido — perde tipagem
mockFindEmployee.mockResolvedValue({ id: "emp-1" } as any)
```

### Proibição de `as unknown as` em testes

**`as unknown as X` é proibido em qualquer arquivo de teste.** Essa construção é um double cast que burla completamente o sistema de tipos — equivalente a `as any`. O TypeScript não valida nada entre o valor original e o tipo final.

**Os dois erros que causam `as unknown as`:**

**1. Fixture incompleta** — objeto sem os campos obrigatórios do tipo de destino:
```typescript
// ❌ PROIBIDO — faltam campos obrigatórios, por isso precisa do double cast
mockCreate.mockResolvedValue({ id: "dept-1" } as unknown as DepartmentWithWorkDays)

// ✅ CORRETO — fixture completa, single as funciona
mockCreate.mockResolvedValue({
  id: "dept-1", tenantId: "tenant-1", name: "Engenharia",
  isActive: true, workStartTime: "09:00", workEndTime: "18:00",
  createdAt: new Date(), updatedAt: new Date(), workDays: [],
} as Awaited<ReturnType<typeof createDepartment>>)
```

**2. Mock parcial de interface** — objeto com apenas alguns métodos da interface completa:
```typescript
// ❌ PROIBIDO — mock parcial força double cast
mockGetBillingService.mockReturnValue({ createCheckoutSession: vi.fn() } as unknown as IBillingService)

// ✅ CORRETO — objeto completo com todos os métodos, single as funciona
const mockCreateCheckoutSession = vi.fn().mockResolvedValue({ url: "" })
const MOCK_BILLING_SERVICE = {
  createProduct: vi.fn().mockResolvedValue({ id: "" }),
  createPrice: vi.fn().mockResolvedValue({ id: "" }),
  createCheckoutSession: mockCreateCheckoutSession,
  createBillingPortalSession: vi.fn().mockResolvedValue({ url: "" }),
  createCustomer: vi.fn().mockResolvedValue({ id: "" }),
  cancelSubscription: vi.fn().mockResolvedValue(undefined),
  constructWebhookEvent: vi.fn().mockReturnValue({ id: "", type: "", data: { object: {} } }),
} as IBillingService

// Em beforeEach:
mockGetBillingService.mockReturnValue(MOCK_BILLING_SERVICE)

// Por teste, override apenas o necessário:
mockCreateCheckoutSession.mockResolvedValueOnce({ url: "https://custom.com" })
```

**Padrão para factory functions de fixture:**
```typescript
// ❌ PROIBIDO — retorno Record<string, unknown> força double cast em toda chamada
function makePendingDispatch(): Record<string, unknown> { return { ... } }
mockFindDispatches.mockResolvedValue([makePendingDispatch()] as unknown as Awaited<...>)

// ✅ CORRETO — tipagem explícita na factory elimina o cast
type PendingDispatch = Awaited<ReturnType<typeof findAllTenantsPendingDispatches>>[number]
function makePendingDispatch(): PendingDispatch { return { ... } as PendingDispatch }
mockFindDispatches.mockResolvedValue([makePendingDispatch()])  // sem cast
```

### Nomenclatura dos testes

- `describe` → nome do service/função + contexto (`"createNewEmployee — limite do plano"`)
- `it` → frase completa em português que descreve o comportamento esperado (`"lança AppError quando limite é atingido"`)
- Sem `should`, `when`, `given` — frases diretas

### O que testar em cada service

| Cenário | Obrigatório |
|---|---|
| Happy path — retorno correto e chamadas corretas | ✅ |
| Casos de erro esperados (`AppError`) | ✅ |
| Guards/validações (token expirado, não encontrado, etc.) | ✅ |
| Lógica de negócio condicional (limites, regras de estado) | ✅ |
| Chamadas a repositórios dependentes foram feitas | ✅ com `toHaveBeenCalledWith` |
| Chamadas que NÃO devem ocorrer em caso de erro | ✅ com `expect(mock).not.toHaveBeenCalled()` |
| Detalhes de implementação de repositório | ❌ |
| Comportamento de libs externas (bcrypt, jose, etc.) | ❌ |

### Proibições em testes

```typescript
// ❌ Proibido — any em mocks
mockFn.mockResolvedValue({} as any)

// ❌ Proibido — teste sem assertion
it("cria funcionário", async () => {
  await createNewEmployee(TENANT_ID, EMPLOYEE_INPUT)  // sem expect
})

// ❌ Proibido — múltiplos comportamentos num único it
it("cria e verifica limite e auditoria", async () => { ... })  // 3 casos = 3 its

// ❌ Proibido — string literal de erro duplicada no teste (use AppError.code)
await expect(fn()).rejects.toThrow("Limite de colaboradores atingido.")  // frágil
// ✅ Prefira:
await expect(fn()).rejects.toMatchObject({ code: "EMPLOYEE_LIMIT_REACHED" })
```

### Adicionando cobertura para um novo service

Os 3 passos abaixo são **obrigatórios** — não opcionais:

1. Criar `src/modules/{dominio}/{nome}.service.test.ts`
2. Adicionar o caminho em `vitest.config.ts` → `coverage.include`
3. Rodar `yarn test:coverage` e garantir ≥ 90% nas linhas do arquivo

---

## 31. Paginação — Padrão Obrigatório

**Toda listagem de dados no sistema usa paginação real no banco de dados.** Fake pagination (carregar todos os registros e fatiar em memória) é explicitamente proibido.

### Regra principal

> **Qualquer página que exibe uma tabela ou lista de itens DEVE ter paginação real via `skip`/`take` no Prisma, usar `buildPaginationParams` para parsear os parâmetros da URL, e renderizar `<TablePagination total={total} />`.**

Isso se aplica a todas as áreas: painel tenant (admin/RH), painel super-admin, e qualquer nova tela adicionada ao projeto.

### Utilitários centralizados

```typescript
// src/libs/utils/pagination.ts — ÚNICA fonte de verdade para lógica de paginação
buildPaginationParams(rawPage, rawPageSize)  // parseia e valida page/pageSize da URL
buildSkipTake(params)                         // converte para skip/take do Prisma
buildPaginatedResult(items, total, params)    // monta PaginatedResult<T> completo
```

**Default:** `pageSize = 10` (bate com o `TablePagination` component).  
**Máximo:** `pageSize = 100` (cap de segurança no `buildPaginationParams`).

**Nunca** duplique a lógica de parsear `page`/`pageSize` da URL. Não crie funções `parseFilters()` locais que reinventam `buildPaginationParams`.

### Componente de paginação

```typescript
// src/libs/design-system/components/data-display/TablePagination.tsx
// Lê page/pageSize diretamente dos searchParams da URL — é um Client Component
<TablePagination total={total} />
// Opcionalmente:
<TablePagination total={total} defaultPageSize={20} pageSizeOptions={[10, 20, 50]} />
```

**O `TablePagination` lê a URL internamente via `useSearchParams()`.** Não passe `page`, `totalPages` ou `pageSize` como props — esses campos não existem mais na interface.

### Fluxo padrão completo — página de listagem

```typescript
// 1. Page component (RSC) — recebe searchParams como prop
interface Props {
  searchParams: Promise<Record<string, string | undefined>>
}

export default async function EntityListPage({ searchParams }: Props): Promise<React.ReactElement> {
  const session = await getSession()
  if (!session) redirect("/login")

  const params = await searchParams

  // 2. Parsear page/pageSize centralizados
  const { page, pageSize } = buildPaginationParams(params["page"], params["pageSize"])

  // 3. Montar filtros com exactOptionalPropertyTypes (sem undefined inline)
  const query: EntityListingQuery = { page, pageSize }
  if (params["status"] !== undefined) query.status = params["status"]
  if (params["q"] !== undefined) query.q = params["q"]

  // 4. Chamar service — retorna { items, total }
  const { items, total } = await entityService.listEntities(session.tenantId, query)

  return (
    <DataTable
      columns={[...]}
      total={total}
      pagination={<TablePagination total={total} />}
    >
      {items.map((item) => (...))}
    </DataTable>
  )
}
```

### Fluxo no service

```typescript
// src/modules/entity/entity.service.ts
export interface EntityListingQuery {
  q?: string
  status?: string
  page: number
  pageSize: number
}

export async function listEntities(
  tenantId: string,
  query: EntityListingQuery,
): Promise<{ items: Entity[]; total: number }> {
  const skip = (query.page - 1) * query.pageSize
  const take = query.pageSize

  const filters: EntityListingFilters = {}
  if (query.q !== undefined) filters.q = query.q
  if (query.status !== undefined) filters.status = query.status

  return entityRepository.findEntitiesPaginated(tenantId, filters, skip, take)
}
```

### Fluxo no repository

```typescript
// src/modules/entity/entity.repository.ts
export interface EntityListingFilters {
  q?: string
  status?: string
}

export async function findEntitiesPaginated(
  tenantId: string,
  filters: EntityListingFilters,
  skip: number,
  take: number,
): Promise<{ items: Entity[]; total: number }> {
  const where: Prisma.EntityWhereInput = { tenantId }
  if (filters.q !== undefined) {
    where.name = { contains: filters.q, mode: "insensitive" }
  }
  if (filters.status !== undefined) where.status = filters.status

  const [items, total] = await prisma.$transaction([
    prisma.entity.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
    prisma.entity.count({ where }),
  ])
  return { items, total }
}
```

**Sempre use `prisma.$transaction([findMany, count])`** para buscar itens e total em um único round-trip ao banco.

### Padrão com filtros com datas (conversão de string → Date)

Filtros de data recebem strings da URL e precisam ser convertidos para `Date`:

```typescript
// No page.tsx — converta para Date no ponto de entrada
if (params["dateFrom"] !== undefined) {
  const d = new Date(`${params["dateFrom"]}T00:00:00`)
  if (!isNaN(d.getTime())) filters.dateFrom = d
}
if (params["dateTo"] !== undefined) {
  const d = new Date(`${params["dateTo"]}T23:59:59`)
  if (!isNaN(d.getTime())) filters.dateTo = d
}
```

Valide `isNaN(d.getTime())` antes de atribuir — strings inválidas na URL não devem causar erro.

### `exactOptionalPropertyTypes` — regra obrigatória

Com `exactOptionalPropertyTypes: true` no `tsconfig.json`, é proibido passar `string | undefined` onde a interface espera `string?`. Construa objetos condicionalmente:

```typescript
// ❌ PROIBIDO — undefined vazando para dentro do objeto
const query: EntityListingQuery = {
  q: params["q"],           // pode ser undefined — ERRO de tipo
  status: params["status"], // idem
  page,
  pageSize,
}

// ✅ CORRETO — construção condicional
const query: EntityListingQuery = { page, pageSize }
if (params["q"] !== undefined) query.q = params["q"]
if (params["status"] !== undefined) query.status = params["status"]
```

A mesma regra vale para props de componentes de filtro:

```typescript
// ❌ PROIBIDO
<EntityFilters filters={{ status: params["status"], q: params["q"] }} />

// ✅ CORRETO — spread condicional
<EntityFilters filters={{
  ...(params["status"] !== undefined && { status: params["status"] }),
  ...(params["q"] !== undefined && { q: params["q"] }),
}} />
```

### Páginas com agrupamento — exceção documentada

A listagem de pesquisas (`/health-surveys`) exibe dispatches agrupados por data. Como o Prisma não suporta `DISTINCT ON` ou `DATE_TRUNC` sem `$queryRaw` (que é proibido), o padrão de paginação é híbrido:

1. **Query leve**: busca apenas `scheduledAt` (sem includes) — filtra e deduplicata datas no app layer
2. **Query pesada**: busca dados completos **apenas para as datas da página atual** (via `OR` com date ranges)

Este é o único caso aceitável de paginação parcialmente em app layer. O `total` reflete o número real de datas distintas. A query pesada é sempre limitada à página atual.

```typescript
// ✅ Exceção documentada — agrupamento por data sem $queryRaw
const { dates, total } = await findDispatchDaysPaginated(tenantId, filters, skip, take)
const dispatches = await findDispatchesForDates(tenantId, dates, filters)
```

### Listagens que NÃO precisam de paginação

Conjuntos de dados genuinamente pequenos e com crescimento finito:

| Listagem | Motivo |
|---|---|
| Versões de Termos de Uso | < 10 registros no lifetime do produto |
| Versões de Política de Privacidade | < 10 registros no lifetime do produto |
| Versões de TCLE | < 10 registros no lifetime do produto |
| Planos de billing | Geralmente < 5 planos ativos |

Mesmo nesses casos, se a lista ultrapassar 20 itens, adicione paginação.

### Checklist ao criar nova listagem

| # | Item |
|---|---|
| 1 | Page component tem `searchParams: Promise<Record<string, string \| undefined>>` como prop |
| 2 | Chama `buildPaginationParams(params["page"], params["pageSize"])` |
| 3 | Monta query object condicionalmente (sem `undefined` inline) |
| 4 | Service recebe `page` e `pageSize` na interface de query |
| 5 | Repository usa `skip`/`take` do Prisma + `$transaction([findMany, count])` |
| 6 | Retorna `{ items, total }` do service |
| 7 | Página renderiza `<TablePagination total={total} />` dentro do `DataTable` |
| 8 | Tenant guard: toda query inclui `tenantId` no `where` |

---

## 32. Centralização de Cores — CSS Variables

### Princípio

**Nenhum componente usa classes de cor Tailwind hardcoded** (`text-green-600`, `bg-red-100`, `text-amber-800`, etc.) para representar estados de status (sucesso, erro, atenção, informação). Todas as cores semânticas vivem em variáveis CSS centralizadas em `src/app/globals.css` e se adaptam automaticamente ao tema dark/light sem nenhum prefixo `dark:`.

### Variáveis disponíveis

Definidas em `:root` (light) e `.dark` em `src/app/globals.css`:

| Variável | Semântica | Uso |
|---|---|---|
| `--status-success` | Verde — saúde, sucesso, ativo | texto, SVG fill |
| `--status-success-subtle` | Verde claro — fundo de badge/card | background |
| `--status-success-border` | Verde médio — borda de badge | border |
| `--status-warning` | Âmbar — atenção, queda, pendente | texto, SVG fill |
| `--status-warning-subtle` | Âmbar claro — fundo de badge/card | background |
| `--status-warning-border` | Âmbar médio — borda de badge | border |
| `--status-warning-foreground` | Branco (light) / escuro (dark) — texto sobre fundo warning | texto em botões com `bg-status-warning` |
| `--status-danger` | Vermelho — erro, crítico, falhou | texto, SVG fill |
| `--status-danger-subtle` | Vermelho claro — fundo de badge/card | background |
| `--status-danger-border` | Vermelho médio — borda de badge | border |
| `--status-danger-foreground` | Branco (light) / escuro (dark) — texto sobre fundo danger | texto em botões com `bg-status-danger` |
| `--status-info` | Azul — informativo, agendado | texto, SVG fill |
| `--status-info-subtle` | Azul claro — fundo de badge/card | background |
| `--status-info-border` | Azul médio — borda de badge | border |
| `--score-label` | Branco — rótulo sobre barras de score (1–5) | texto em segmentos de distribuição |

### Classes Tailwind geradas (`@theme inline`)

As variáveis são registradas em `@theme inline` no `globals.css`, gerando utilitárias Tailwind automáticas:

```
text-status-success      bg-status-success      border-status-success
text-status-warning      bg-status-warning      border-status-warning
text-status-danger       bg-status-danger       border-status-danger
text-status-info         bg-status-info         border-status-info
text-status-warning-foreground  text-status-danger-foreground  text-score-label
(idem para -subtle e -border)
```

Suporte a modificador de opacidade Tailwind v4: `bg-status-danger-subtle/50`, `text-status-success/70`.

### Utilitárias de badge (`.badge-*`)

Definidas em `@layer utilities` em `globals.css`. Aplicam background, color e border-color via CSS vars num único token:

| Classe | Semântica |
|---|---|
| `badge-success` | Verde — sucesso, ativo, concluído |
| `badge-warning` | Âmbar — atenção, em andamento, média prioridade |
| `badge-danger` | Vermelho — erro, crítico, alta prioridade |
| `badge-info` | Azul — informativo, agendado |

### Fontes únicas de verdade

| Artefato | Localização | O que centraliza |
|---|---|---|
| Variáveis CSS + badge utilities | `src/app/globals.css` | Valores OKLCH por tema |
| Constants de badge | `src/libs/design-system/alert-labels.ts` | `BADGE_BASE`, `BADGE_RED/GREEN/AMBER/BLUE/DEFAULT` |
| Cores de saúde/aderência/tendência | `src/libs/utils/health-index.ts` | `healthIndexAccent`, `healthIndexBarColor`, `healthIndexChartColor`, `adherenceRateTextColor`, `adherenceRateBarClass`, `trendDirectionTextColor` |

### Regras obrigatórias

```tsx
// ❌ PROIBIDO — hardcoded Tailwind color para status
<span className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400">Ativo</span>
const color = score >= 70 ? "text-green-600" : "text-red-600"
fill="#16a34a"

// ✅ CORRETO — classes semânticas centralizadas
import { BADGE_BASE, BADGE_GREEN } from "@/libs/design-system/alert-labels"
import { healthIndexAccent } from "@/libs/utils/health-index"

<span className={`${BADGE_BASE} ${BADGE_GREEN}`}>Ativo</span>
const color = healthIndexAccent(score)
fill="var(--status-success)"
// ou via health-index:
fill={healthIndexChartColor(score)}  // retorna "var(--status-success/warning/danger)"
```

### Padrão para stat-cards coloridos (verde/âmbar/vermelho)

```tsx
// ❌ PROIBIDO
<div className="border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900/50">
  <p className="text-green-700 dark:text-green-500">Saudáveis</p>

// ✅ CORRETO
<div className="border border-status-success-border bg-status-success-subtle">
  <p className="text-status-success">Saudáveis</p>
```

### Padrão para caixas de aviso/info

```tsx
// ❌ PROIBIDO
<div className="bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
  <p className="text-amber-800 dark:text-amber-400">

// ✅ CORRETO
<div className="bg-status-warning-subtle border border-status-warning-border">
  <p className="text-status-warning">
```

### Exceções intencionais

| Exceção | Justificativa |
|---|---|
| `bg-primary hover:bg-primary/90` em botões sólidos de ação | Cor de identidade visual (brand), não status. Usa `--primary` que já é variável CSS. |
| `BADGE_PURPLE` em `alert-labels.ts` | Não há semântica purple no domínio. Mantido com classes Tailwind `dark:` explícitas até surgir necessidade. |
| Cores da sidebar (`--sidebar*`) | Já centralizadas em suas próprias variáveis CSS — não são status, são layout. |

### Ao adicionar nova cor de status

1. Adicione as variáveis em `:root` e `.dark` em `globals.css` (main + subtle + border; `foreground` se precisar de texto sobre fundo colorido)
2. Registre as variantes em `@theme inline`
3. Adicione a utilitária `.badge-novoStatus` em `@layer utilities`
4. Se for cor de saúde/aderência/tendência: adicione a função em `health-index.ts`
5. Se for cor de badge: adicione a constant em `alert-labels.ts`
6. Atualize esta seção do AGENTS.md

---

## 33. Endereços de E-mail — Variáveis de Ambiente

**Nenhum endereço de e-mail pode ser hardcoded em qualquer parte do código.** Todo e-mail de contato, suporte, privacidade (DPO) ou qualquer outra finalidade deve vir das variáveis de ambiente definidas em `src/env.ts`.

### Variáveis disponíveis

| Variável | Padrão | Uso |
|---|---|---|
| `NEXT_PUBLIC_EMAIL_SUPPORT` | `suporte@pulseips.com.br` | E-mail de suporte técnico — exibido em páginas de ajuda, modais de erro, convites |
| `NEXT_PUBLIC_EMAIL_PRIVACY` | `privacidade@pulseips.com.br` | E-mail do DPO / privacidade — exibido em páginas legais, TCLE, política de privacidade |
| `NEXT_PUBLIC_EMAIL_CONTACT` | `contato@pulseips.com.br` | E-mail de contato comercial — exibido no footer das landing pages |
| `NEXT_PUBLIC_EMAIL_LEGAL` | `legal@pulseips.com.br` | E-mail jurídico/contratual — exibido em termos de uso e documentos legais |

> Todas as três são `NEXT_PUBLIC_` para serem acessíveis tanto em Server Components (RSC) quanto em Client Components sem necessidade de prop drilling.

### Padrão de uso

```typescript
// ✅ Client Component
import { env } from "@/env"
<a href={`mailto:${env.NEXT_PUBLIC_EMAIL_SUPPORT}`}>{env.NEXT_PUBLIC_EMAIL_SUPPORT}</a>

// ✅ Server Component (RSC) — defina constante no topo do arquivo
import { env } from "@/env"
const PRIVACY_EMAIL = env.NEXT_PUBLIC_EMAIL_PRIVACY
// ... uso no JSX:
<a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>

// ✅ Service (servidor)
import { env } from "@/env"
const supportEmail = env.NEXT_PUBLIC_EMAIL_SUPPORT

// ✅ Seed (src/cli/seed/*.ts) — usa process.env diretamente com fallback
const EMAIL_SUPPORT = process.env["NEXT_PUBLIC_EMAIL_SUPPORT"] ?? "suporte@pulseips.com.br"
```

```typescript
// ❌ PROIBIDO — e-mail hardcoded em qualquer lugar
const SUPPORT_EMAIL = "suporte@pulseips.com.br"
href="mailto:privacidade@pulseips.com.br"
```

### Adicionar novo e-mail de contato

1. Adicione a variável em `src/env.ts` (seções `client` e `runtimeEnv`)
2. Adicione o valor padrão com `.default(...)` no schema Zod
3. Adicione ao `.env.local` com o valor real de produção
4. Documente na tabela acima
5. Use **sempre** via `env.NEXT_PUBLIC_EMAIL_*` — nunca como string literal

*Pulse — AGENTS.md | Documento interno | Maio de 2026*

---

## 34. Variáveis de Ambiente — Acesso Centralizado

### Regra obrigatória

**`process.env` é proibido em todo o código da aplicação.** O único lugar onde `process.env.*` pode aparecer é em `src/env.ts` — dentro do objeto `runtimeEnv` do `createEnv`.

Todo o restante do código lê variáveis de ambiente **exclusivamente** através do objeto `env` importado de `@/env`:

```typescript
// ❌ PROIBIDO em qualquer arquivo fora de src/env.ts
const isDev = process.env.NODE_ENV === "development"
const db    = process.env.DATABASE_URL!
const key   = process.env["NEXT_PUBLIC_EMAIL_SUPPORT"] ?? "fallback"

// ✅ CORRETO — via objeto centralizado
import { env } from "@/env"

const isDev = env.NODE_ENV === "development"
const db    = env.DATABASE_URL
const key   = env.NEXT_PUBLIC_EMAIL_SUPPORT
```

### Exceção — `prisma.config.ts`

`prisma.config.ts` é o único arquivo que usa `process.env` diretamente. **Razão técnica:** o Prisma CLI carrega esse arquivo via `require()` nativo do Node.js, sem resolver aliases de tsconfig. O alias `@/` não é suportado nesse contexto — a importação `@/env` falha com `Cannot find module '@/env'` em tempo de execução do CLI.

`next.config.ts` não tem essa limitação porque o Next.js usa seu próprio bundler (com suporte a tsconfig paths) ao carregar o arquivo de configuração.

**Regra:** qualquer nova variável adicionada em `prisma.config.ts` deve estar declarada em `src/env.ts` — a leitura direta via `process.env` é por limitação técnica do Prisma CLI, não por conveniência.

### Sem outras exceções

Todos os demais arquivos — incluindo `next.config.ts` e qualquer arquivo de configuração de framework — devem usar `import { env } from "@/env"`.

### Como adicionar nova variável

1. Declare o schema Zod na seção correta (`server` ou `client`) em `src/env.ts`
2. Adicione a entrada correspondente em `runtimeEnv`: `NOME: process.env.NOME`
3. Use via `env.NOME` em qualquer arquivo
4. Documente na seção 21 (Variáveis de Ambiente)

### Checklist do full-scan

Antes de qualquer PR, verificar que não existem `process.env` fora de `src/env.ts`:

```bash
grep -rn "process\.env\." \
  --include="*.ts" --include="*.tsx" \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=coverage \
  | grep -v "src/env.ts" \
  | grep -v "prisma.config.ts" \
  | grep -v "\.test\." | grep -v "\.spec\."
# Resultado esperado: nenhuma linha
```

*Pulse — AGENTS.md | Documento interno | Maio de 2026*

---

## 35. Selects — Componente Padrão Obrigatório

**`<select>` nativo é proibido em toda a aplicação.** Todo campo de seleção deve usar `NativeSelect` de `@/components/ui/native-select`.

### Razão

O `<select>` nativo do HTML não aplica o design system — borda, fundo, cor, chevron e focus ring precisariam ser replicados manualmente em cada uso, criando inconsistência visual e risco de divergência ao alterar o tema.

### Padrão obrigatório

```tsx
// ❌ PROIBIDO — select HTML nativo com classes manuais
<select
  value={value}
  onChange={(e) => setValue(e.target.value)}
  className="w-full bg-input border border-input-border text-foreground ..."
  style={{ borderRadius: 0 }}
>
  <option value="a">Opção A</option>
</select>

// ✅ CORRETO — NativeSelect do design system
import { NativeSelect } from "@/components/ui/native-select"

<NativeSelect value={value} onChange={(e) => setValue(e.target.value)}>
  <option value="a">Opção A</option>
</NativeSelect>
```

### O que `NativeSelect` aplica automaticamente

- `bg-input` + `border border-border` — borda e fundo consistentes com o tema
- `text-foreground` — cor de texto correta em light/dark
- `focus:border-primary focus:ring-1 focus:ring-primary` — focus ring padronizado
- `appearance-none` + `ChevronDown` posicionado — ícone de seta sempre visível
- `border-radius: 0` — sem borda arredondada (padrão visual do produto)

### Quando usar `NativeSelect` vs `Select` (shadcn/Base UI)

| Situação | Componente |
|---|---|
| Filtros de listagem, selects em modais, campos de formulário simples | `NativeSelect` |
| Selects com opções customizadas (ícones, grupos, busca) — casos raros | `Select` (shadcn/Base UI) |

### `FilterBar` — usa `NativeSelect` internamente

O componente `FilterBar` (`src/libs/design-system/components/data-display/FilterBar.tsx`) é o padrão para filtros de listagem em todo o painel. Internamente, seus campos do tipo `"select"` usam `NativeSelect` — nunca shadcn `Select`, Radix `Select` ou `<select>` nativo.

**Nunca adicione imports de `@/components/ui/select` ao `FilterBar.tsx`.** Se precisar de um comportamento de seleção diferente (pesquisa, multi-seleção, ícones), crie um novo tipo de campo ou um componente separado — não quebre a padronização do `FilterBar`.

```tsx
// ❌ PROIBIDO em FilterBar.tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// ✅ CORRETO em FilterBar.tsx
import { NativeSelect } from "@/components/ui/native-select"
```

### `NativeSelect` — largura controlada por `containerClassName`

O wrapper `<div>` do `NativeSelect` aplica `w-full` **apenas quando `containerClassName` não é passado**. Para controlar a largura, use `containerClassName`:

```tsx
// Em filtros inline (lado a lado) — usar containerClassName para largura
<NativeSelect containerClassName="w-auto min-w-[160px]" ...>

// Em formulários (campo ocupa toda a largura disponível) — omitir containerClassName
<NativeSelect ...>  {/* w-full aplicado automaticamente */}
```

### Checklist do full-scan — adicionar ao item 29

Antes de qualquer PR, verificar que não há `<select>` nativo fora de `native-select.tsx` e que `FilterBar.tsx` não importa shadcn `Select`:

```bash
# Nenhum <select> nativo fora do componente
grep -rn "<select" src --include="*.tsx" | grep -v "native-select.tsx"
# Resultado esperado: nenhuma linha

# FilterBar não usa shadcn Select
grep -n "from.*components/ui/select" src/libs/design-system/components/data-display/FilterBar.tsx
# Resultado esperado: nenhuma linha
```

---

## 36. Confirmações Destrutivas — Modal Obrigatório

**Toda ação destrutiva ou irreversível deve sempre exibir um modal de confirmação.** É absolutamente proibido usar qualquer outro padrão de confirmação (inline toggle de botões na linha, `window.confirm`, toast com undo, etc.).

### Regra

> **Toda ação que exclui, desativa, remove ou altera permanentemente um dado deve obrigatoriamente abrir um `ConfirmActionModal` antes de executar a ação.** O usuário deve confirmar explicitamente em um modal separado.

### Padrão obrigatório

```tsx
// ✅ CORRETO — modal de confirmação
import { ConfirmActionModal } from "@/components/confirm-action-modal"

const [showModal, setShowModal] = useState(false)

function handleConfirm(): void {
  startTransition(async () => {
    const result = await someDestructiveAction(id)
    if (result.error) {
      toast.error(result.error)
    } else {
      setShowModal(false)
      toast.success("Operação concluída.")
      router.refresh()
    }
  })
}

return (
  <>
    <button onClick={() => setShowModal(true)}>Excluir</button>

    <ConfirmActionModal
      open={showModal}
      onClose={() => setShowModal(false)}
      onConfirm={handleConfirm}
      loading={isPending}
      title="Excluir item"
      description={`Tem certeza que deseja excluir "${name}"? Esta ação não pode ser desfeita.`}
      confirmLabel="Excluir"
      variant="destructive"
    />
  </>
)
```

```tsx
// ❌ PROIBIDO — confirmação inline na linha da tabela
if (showConfirm) {
  return (
    <div>
      <span>Tem certeza?</span>
      <button onClick={handleAction}>Confirmar</button>
      <button onClick={() => setShowConfirm(false)}>Cancelar</button>
    </div>
  )
}

// ❌ PROIBIDO — ação destrutiva sem confirmação alguma
<button onClick={handleDeactivate}>Desativar</button>

// ❌ PROIBIDO — window.confirm
if (window.confirm("Tem certeza?")) handleDelete()
```

### Componente `ConfirmActionModal`

**Localização:** `src/components/confirm-action-modal.tsx`

```typescript
interface Props {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  loading?: boolean
  title: string
  description: string
  confirmLabel?: string          // padrão: "Confirmar"
  variant?: "destructive" | "warning"  // padrão: "destructive"
}
```

| `variant` | Quando usar |
|---|---|
| `"destructive"` | Excluir, desativar, remover permanentemente |
| `"warning"` | Ativar, reativar, ações reversíveis mas com impacto |

### `ConfirmDeleteModal` — wrapper para exclusões

Para exclusões simples, o `ConfirmDeleteModal` (`src/components/confirm-delete-modal.tsx`) é um wrapper de `ConfirmActionModal` com defaults para "Excluir". Aceita os mesmos props sem `confirmLabel` e `variant`.

### Ações que sempre exigem modal

| Ação | Descrição |
|---|---|
| Excluir qualquer registro | Departamento, colaborador, plano, documento, relato, etc. |
| Desativar colaborador | Zona de perigo em `/employees/[id]` |
| Desativar pesquisa de saúde | Botão em `/health-surveys/configure` |
| Desativar pesquisa de clima | Botão em `/climate-surveys/configure` |
| Desativar/ativar plano | Botão Power em `/super-admin/plans` |
| Remover preço de plano | Botão Trash em `/super-admin/plans/[id]/pricing` |
| Excluir conta da organização | `/settings` — fluxo com código de confirmação por e-mail |

### Checklist ao implementar ação destrutiva

| # | Item |
|---|---|
| 1 | Há um estado `useState<boolean>(false)` para controlar abertura do modal |
| 2 | O botão de ação abre o modal (`onClick={() => setShowModal(true)}`) — nunca executa diretamente |
| 3 | `ConfirmActionModal` está renderizado no JSX com `open`, `onClose`, `onConfirm`, `title`, `description`, `confirmLabel` |
| 4 | O `onConfirm` fecha o modal (`setShowModal(false)`) **após** a ação concluir com sucesso |
| 5 | O `loading` é passado corretamente para desabilitar o botão durante a execução |

---

## 37. Histórico de Decisões Arquiteturais

### 37.1 Modelo de Pesquisas de Saúde — Refatoração para N Setores por Config

**Contexto:** a arquitetura anterior tinha `department_id` diretamente em `health_survey_configurations` (1 configuração por setor). Perguntas eram duplicadas em cada configuração, e dispatches de setores diferentes do mesmo run eram ligados por um `group_token` como patch.

**Modelo implementado (atual):**

```
health_survey_configurations      → 1 configuração cobre N setores
  └─ health_survey_config_departments  → join: quais setores participam (sem departmentId na config)
health_survey_dispatches          → 1 dispatch por run de configuração (sem total_recipients / group_token)
  └─ health_survey_dept_dispatches     → por setor: total_recipients, total_responses
health_survey_responses           → sem employee_id + department_id nullable (setor inferido via token)
```

**Benefícios:**
- Perguntas definidas uma única vez por configuração — sem duplicação entre setores
- Totais por setor rastreados em `health_survey_dept_dispatches` sem agregar múltiplos dispatches
- `group_token` removido — não é mais necessário para agrupar dispatches do mesmo run
- 1 `signed_link_token` por dispatch — o link público serve para todos os setores cobertos pela config

### 37.2 Módulo Pesquisa de Clima Organizacional

**Contexto:** demanda de pesquisas de clima distintas das pesquisas de saúde ocupacional, com dimensões (liderança, comunicação, etc.) e canais configuráveis por config.

**Modelo implementado:** tabelas `climate_survey_*` espelhando o pipeline de health surveys, sem reutilizar as mesmas tabelas. Feature de plano `climate_surveys` (health surveys permanecem sempre habilitadas). Ondas = dispatches; CTA para plano de ação via `action_plans.climate_survey_dispatch_id`.

**Decisão deliberada — não criar `clima_*` duplicadas:** um modelo conceitual com `clima_surveys` / `clima_topics` / `clima_campaigns` / `clima_answers.token` foi rejeitado em favor do schema já em produção (`climate_survey_*`), por (1) nomes em inglês + `tenant_id` (convenções do Pulse), (2) anonimato real (respostas sem `token`/`employee_id`), (3) paralelismo com health surveys. Tópicos = `dimension` na pergunta; campanha = dispatch; destinatário = response token; respostas = response + response_items.

---

## 38. Segurança — Decisões e Limitações Conhecidas

### 38.1 `style-src 'unsafe-inline'` — limitação conhecida

A diretiva CSP `style-src 'unsafe-inline'` está presente intencionalmente e **não pode ser removida** sem uma refatoração massiva da UI. O React renderiza `style={{}}` como atributos HTML `style="..."` que são bloqueados por CSP sem `unsafe-inline` — não existe alternativa via nonce para atributos inline (nonces funcionam apenas para elementos `<style>`, não para atributos).

**Mitigação aplicada:** a diretiva `img-src` foi restrita a `'self' data: blob:` (sem `https:` wildcard), eliminando o principal canal de exfiltração via CSS injection. Qualquer tentativa de CSS keylogging via `background: url(https://...)` é bloqueada.

**Para remover `unsafe-inline` no futuro:** converter todos os `style={{}}` para Tailwind classes ou CSS modules. Estimativa: 360+ componentes.

### 38.2 `script-src 'unsafe-eval'` — apenas em development

Em `NODE_ENV=development`, o CSP inclui `'unsafe-eval'` em `script-src` e amplia `connect-src` com `ws:` / `wss:` / `http://localhost:*`. O React (Flight / Turbopack) usa `eval()` no modo de desenvolvimento para reconstruir call stacks e hot reload; sem isso a app quebra no browser.

**Produção:** `'unsafe-eval'` **não** é incluído. Em produção o React nunca usa `eval()`.

### 38.3 `CF-Connecting-IP` — requer proteção a nível de infraestrutura

O código confia em `CF-Connecting-IP` como IP autoritativo do cliente (arquivo `src/libs/utils/client-ip.ts`). O Cloudflare bloqueia clientes que tentam forjar esse header — **mas apenas quando as requisições chegam via Cloudflare**. Se o origin IP for descoberto e acessado diretamente, o atacante pode fornecer qualquer `CF-Connecting-IP` e burlar o rate limiting por IP.

**Mitigação obrigatória a nível de infraestrutura (fora do codebase):**
- Configurar o security group / firewall do servidor de origem para aceitar conexões **apenas dos IPs publicados pelo Cloudflare**: https://www.cloudflare.com/ips-v4 e https://www.cloudflare.com/ips-v6
- Bloquear todo tráfego direto ao origin IP (portas 80 e 443) de IPs não-Cloudflare

Sem essa configuração de infraestrutura, o rate limiting por IP pode ser contornado por qualquer atacante que descubra o IP de origem (via certificate transparency logs, Shodan, DNS histórico, etc.).

### 38.4 Multipart/form-data em rotas de página — proteção no proxy

O `proxy.ts` rejeita com HTTP 415 qualquer POST com `Content-Type: multipart/form-data` para as rotas de autenticação (`/login`, `/forgot-password`, `/super-admin/login`) quando o header `next-action` não está presente. Isso previne que ferramentas de fuzzing causem HTTP 500 nessas rotas via payloads multipart inválidos.

Requisições legítimas do React Server Actions incluem sempre o header `next-action` — esse check não afeta o fluxo normal da aplicação.
