# Pulse — AGENTS.md

> **Para agentes de IA:** este documento é a fonte única de verdade sobre o produto, a arquitetura, os padrões de código e as regras que devem ser seguidas ao contribuir com o projeto Pulse. Leia-o inteiro antes de fazer qualquer alteração.

**Versão da stack implementada:** Next.js 16 (App Router) + PostgreSQL + Prisma v7 + TypeScript strict  
**Última revisão:** Abril de 2026

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
26. [Fronteiras de Camada](#26-fronteiras-de-camada)
27. [Abstração de SDKs e ORM](#27-abstração-de-sdks-e-orm)
28. [Queries Cross-tenant — Convenção de Naming para Jobs](#28-queries-cross-tenant--convenção-de-naming-para-jobs)
29. [Checklist de Conformidade Pré-PR](#29-checklist-de-conformidade-pré-pr)

---

## 1. O que é o Pulse

O **Pulse** é um software SaaS de monitoramento de saúde ocupacional que ajuda empresas a cumprir as exigências da NR-1 (vigentes a partir de maio de 2026). O sistema:

1. Envia pesquisas rápidas e anônimas para colaboradores via SMS/WhatsApp automaticamente por setor
2. Agrupa resultados por setor e emite alertas automáticos quando detecta queda de indicadores
3. Oferece canal permanente de relato anônimo
4. Gera relatórios de evidência em PDF para o PGR (Programa de Gerenciamento de Riscos)

**Fluxo resumido:**

```
RH cadastra colaboradores → sistema envia TCLE → colaborador aceita
  → sistema envia pesquisas periodicamente → RH acompanha métricas e alertas
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

A atualização da NR-1 exige que empresas monitorem fatores de risco psicossocial (estresse, sobrecarga, clima) e produzam documentação comprobatória. O Pulse atende essa exigência com:

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
| Plano atribuído | Sim |
| E-mail do Admin principal | Sim — recebe convite de primeiro acesso |
| CNPJ | Não |

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
| survey_configurations | — | CRUD | CRUD | |
| survey_dispatches | — | CR | CR | |
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

Toda integração (email, SMS, storage, billing) é acessada via interface. O service nunca instancia o adapter diretamente — usa a factory em `src/libs/integrations/index.ts`. Trocar de provedor exige apenas criar novo adapter e atualizar a variável `*_PROVIDER` no `.env`.

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
| `twilio` | SDK Twilio (SMS) |
| `bullmq` + `ioredis` | Fila de jobs com Redis |
| `@base-ui/react` | Componentes primitivos de UI (Select usa Base UI, não Radix) |

---

## 7. Estrutura de Pastas

```
src/
├── app/                                    # Next.js App Router
│   ├── (public)/                           # Rotas públicas (sem autenticação)
│   │   ├── consent/[token]/page.tsx        # Fluxo de aceite do TCLE
│   │   ├── survey/[token]/page.tsx         # Formulário de pesquisa (sem login)
│   │   └── report/[orgSlug]/page.tsx       # Canal de relato anônimo
│   │
│   ├── (auth)/                             # Rotas de autenticação
│   │   ├── login/page.tsx
│   │   ├── forgot-password/
│   │   │   ├── page.tsx
│   │   │   ├── forgot-password-form.tsx    # Client Component
│   │   │   └── actions.ts                  # Server Action
│   │   ├── reset-password/[token]/
│   │   │   ├── page.tsx
│   │   │   ├── reset-password-form.tsx     # Client Component
│   │   │   └── actions.ts                  # Server Action
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
│   │   │   │   ├── page.tsx                # Lista organizações (Super Admin não cria mais)
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx
│   │   │   │       └── billing/page.tsx    # Status de assinatura + override de limite
│   │   │   ├── plans/
│   │   │   │   ├── page.tsx                # Lista planos + ações (editar, desativar, excluir)
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/pricing/page.tsx   # Gerencia preços (plan_prices) do plano
│   │   │   ├── terms/
│   │   │   │   ├── page.tsx                # Lista versões de termos + criar nova
│   │   │   │   ├── new-terms-version-form.tsx
│   │   │   │   └── actions.ts
│   │   │   ├── admins/page.tsx
│   │   │   ├── jobs/page.tsx               # Monitoramento de filas BullMQ (live + histórico)
│   │   │   └── logs/page.tsx               # Logs de requests HTTP
│   │
│   ├── (tenant)/                           # Painel da empresa (Admin + RH)
│   │   ├── layout.tsx                      # Guard: verifica termos pendentes → /accept-terms
│   │   ├── dashboard/page.tsx
│   │   ├── employees/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   ├── import/page.tsx             # Upload Excel
│   │   │   ├── import/preview/page.tsx     # Preview válidos/erros antes de confirmar
│   │   │   └── [id]/page.tsx
│   │   ├── departments/
│   │   ├── surveys/
│   │   ├── reports/
│   │   ├── action-plans/
│   │   ├── documents/
│   │   ├── alerts/
│   │   ├── pgr/
│   │   ├── settings/
│   │   └── billing/page.tsx               # Admin acessa Stripe Billing Portal
│   │
│   └── api/
│       ├── webhooks/stripe/route.ts        # POST — recebe eventos Stripe (assinado)
│       └── jobs/[job-name]/route.ts        # Manual trigger de jobs (x-cron-secret)
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
│   │   ├── employee-import.service.ts      # Importação via Excel (header detection)
│   │   └── employee-import.types.ts
│   ├── departments/
│   ├── consent/
│   │   ├── consent.repository.ts           # Append-only — sem update/delete
│   │   ├── consent.service.ts
│   │   ├── consent.schema.ts
│   │   └── consent.types.ts
│   ├── surveys/
│   │   └── survey-dispatch.service.ts      # Agendamento e disparo
│   ├── anonymous-reports/
│   ├── action-plans/
│   ├── documents/
│   ├── alerts/
│   ├── pgr/
│   ├── terms/
│   │   ├── terms.repository.ts             # CRUD de PlatformTermsVersion e PlatformTermsAcceptance
│   │   ├── terms.service.ts                # getPendingTermsForUser, acceptTerms, createNewTermsVersion
│   │   └── terms.types.ts                  # CreateTermsVersionInput, AcceptTermsInput
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
│   └── audit/
│       ├── audit.repository.ts             # Apenas INSERT — sem update/delete
│       └── audit.types.ts
│
├── libs/
│   ├── db/index.ts                         # Prisma client singleton (com PG adapter)
│   ├── local-storage.ts                    # Utilitário SSR-safe para localStorage (ver seção 23)
│   ├── design-system/
│   │   ├── index.ts
│   │   └── components/
│   │       ├── layout/                     # Sidebar, Header, SuperAdminSidebar, PageHeader
│   │       ├── feedback/                   # Alert, EmptyState, LoadingSpinner
│   │       └── data-display/              # StatCard, DataTable, StatusBadge, SectorHealthBar
│   ├── integrations/
│   │   ├── messaging/
│   │   │   ├── messaging.interface.ts      # IMessagingService
│   │   │   ├── twilio-sms.adapter.ts       # ✅ Implementação Twilio SMS
│   │   │   ├── whatsapp.adapter.ts         # ✅ Implementação WhatsApp Cloud API
│   │   │   └── console-sms.adapter.ts      # Desenvolvimento local
│   │   ├── email/
│   │   │   ├── email.interface.ts          # IEmailService
│   │   │   ├── resend.adapter.ts           # ✅ Implementação atual
│   │   │   └── console-email.adapter.ts    # Desenvolvimento local (imprime HTML completo)
│   │   ├── storage/
│   │   │   └── storage.interface.ts        # IStorageService
│   │   ├── pdf/
│   │   │   └── pdf.interface.ts            # IPDFService
│   │   ├── billing/
│   │   │   ├── billing.interface.ts        # IBillingService
│   │   │   └── stripe.adapter.ts           # ✅ Implementação atual
│   │   └── index.ts                        # Factories: getEmailService(), getBillingService()…
│   ├── email-templates/
│   │   ├── index.ts                        # getTemplate(name, vars) → { subject, Component }
│   │   ├── org-invite.tsx
│   │   ├── password-reset.tsx
│   │   ├── plan-subscribed.tsx
│   │   ├── payment-failed.tsx
│   │   └── plan-cancelled.tsx
│   ├── auth/
│   │   └── permissions.ts                 # isOrgAdmin, isOrgRh, assertOrgAdmin, assertOrgMember
│   └── utils/
│       ├── action-result.ts               # ActionResult interface
│       ├── json.ts                        # JsonValue — tipo JSON próprio da aplicação (não usa Prisma)
│       ├── pagination.ts
│       ├── date.ts
│       └── slug.ts
│
├── components/
│   ├── ui/                                 # shadcn/ui (Button, Input, Select, Dialog, Table…)
│   │                                       # Instalados em src/components/ui/ pelo CLI do shadcn
│   └── animate-in.tsx                      # Wrapper de animação de entrada via IntersectionObserver
├── proxy.ts                                # Next.js 16 proxy (auth + tenant resolution)
│                                           # ⚠️ Não é middleware.ts — Next.js 16 usa proxy.ts
├── env.ts                                  # Variáveis de ambiente tipadas (@t3-oss/env-nextjs + Zod)
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
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

> Nota de implementação: no código, o campo é `externalProductId` (camelCase). O prefixo `external_` é intencional — abstrai o provedor de billing.

#### `plan_prices`

Cada plano pode ter múltiplas variantes (mensal, anual). Preços antigos nunca são deletados — assinaturas existentes os referenciam.

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| plan_id | uuid | NOT NULL, FK → plans.id |
| external_price_id | varchar(255) | UNIQUE — ID do Price no Stripe |
| interval | varchar(10) | NOT NULL — `'monthly'` \| `'annual'` |
| price_in_cents | integer | NOT NULL |
| is_active | boolean | NOT NULL, default true |
| created_at | timestamptz | NOT NULL |

> Quando o Super Admin atualiza um preço, é criado **novo `plan_prices`** e o anterior é desativado. O Stripe não permite editar `unit_amount` — um novo Price é criado no Stripe também.

#### `super_admin_users`

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| email | varchar(255) | NOT NULL, UNIQUE |
| password_hash | varchar(255) | NOT NULL |
| name | varchar(255) | NOT NULL |
| is_active | boolean | NOT NULL, default true |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

#### `platform_terms_versions`

Versões dos Termos de Uso da plataforma Pulse. Quando uma nova versão é publicada, todos os admins de organizações devem aceitar novamente.

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| version | varchar(20) | NOT NULL, UNIQUE |
| content | text | NOT NULL — HTML completo dos termos |
| is_active | boolean | NOT NULL, default true |
| effective_date | date | NOT NULL |
| created_at | timestamptz | NOT NULL |

#### `platform_terms_acceptances`

Registro imutável de cada aceite de termos por usuário admin de organização.

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| terms_version_id | uuid | NOT NULL, FK → platform_terms_versions.id |
| user_id | uuid | NOT NULL, FK → organization_users.id |
| accepted_at | timestamptz | NOT NULL |
| ip_address | varchar(45) | |
| user_agent | text | |
| created_at | timestamptz | NOT NULL |

#### `consent_term_versions`

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| version | varchar(20) | NOT NULL, UNIQUE |
| content | text | NOT NULL |
| is_current | boolean | NOT NULL, default false |
| published_at | timestamptz | NOT NULL |
| created_at | timestamptz | NOT NULL |

#### `report_categories`

Valores iniciais: `harassment`, `overload`, `conflict`, `physical_environment`, `other`.

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
| cnpj | varchar(18) | |
| timezone | varchar(50) | NOT NULL, default `'America/Sao_Paulo'` |
| stripe_customer_id | varchar(255) | UNIQUE |
| billing_status | varchar(20) | `'pending'` \| `'active'` \| `'past_due'` \| `'suspended'` \| `'cancelled'` |
| max_employees_override | integer | NULL = usa limite do plano |
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
| plan_price_id | uuid | NOT NULL, FK → plan_prices.id |
| stripe_subscription_id | varchar(255) | NOT NULL, UNIQUE |
| status | varchar(20) | `'trialing'` \| `'active'` \| `'past_due'` \| `'unpaid'` \| `'cancelled'` |
| current_period_start | timestamptz | NOT NULL |
| current_period_end | timestamptz | NOT NULL |
| cancelled_at | timestamptz | |
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
| external_event_id | varchar(255) | NOT NULL, UNIQUE — ID do evento no provedor de billing |
| type | varchar(100) | NOT NULL |
| processed | boolean | NOT NULL, default false |
| processed_at | timestamptz | |
| error | text | |
| payload | jsonb | NOT NULL |
| created_at | timestamptz | NOT NULL |

#### `auth_tokens`

Tokens de uso único para reset de senha e fluxos de autenticação stateless.

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | NOT NULL |
| user_type | varchar(20) | `'org_user'` \| `'super_admin'` |
| type | varchar(30) | `'password_reset'` \| `'email_verification'` |
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
| work_start_time | varchar(5) | `"HH:MM"` — horário de início do turno (ex: `"09:00"`). NULL = usa config do setor |
| work_end_time | varchar(5) | `"HH:MM"` — horário de fim do turno. NULL = usa config do setor |
| status | varchar(20) | `'active'` \| `'inactive'` \| `'paused'` |
| pause_start_at | date | |
| pause_end_at | date | |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |
| UNIQUE | (tenant_id, email) | |

> `work_start_time` e `work_end_time` do colaborador sobrepõem os valores do departamento quando preenchidos (cadeia: `employee → department → surveyConfig`). Dias de trabalho opcionais em `employee_work_days` (join table — ver abaixo); quando vazio, herda de `department_work_days`. Todos avaliados no `organizations.timezone` no momento do dispatch.

#### `employee_consents`

**Tabela append-only — nenhuma linha é jamais atualizada ou deletada.** O estado atual do colaborador é determinado pelo registro mais recente (`ORDER BY created_at DESC LIMIT 1`).

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL |
| employee_id | uuid | NOT NULL, FK → employees.id |
| consent_term_version_id | uuid | NOT NULL, FK → consent_term_versions.id |
| event | varchar(20) | `'invited'` \| `'accepted'` \| `'refused'` \| `'revoked'` \| `'opt_out'` |
| source | varchar(20) | `'whatsapp_link'` \| `'sms_link'` \| `'survey_form'` \| `'system'` |
| cpf_hash | varchar(255) | SHA-256 do CPF — apenas no evento `accepted` |
| token | varchar(255) | UNIQUE |
| token_expires_at | timestamptz | |
| created_at | timestamptz | NOT NULL |

> CPF nunca armazenado em texto puro. `ConsentRepository` não expõe `update()` nem `delete()`.

#### `survey_configurations`

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL |
| department_id | uuid | NOT NULL, FK → departments.id |
| frequency | varchar(20) | `'daily'` \| `'twice_weekly'` \| `'weekly'` \| `'biweekly'` \| `'monthly'` |
| work_start_time | varchar(5) | `"HH:MM"` — início do expediente configurado para esta pesquisa (ex: `"09:00"`) |
| work_end_time | varchar(5) | `"HH:MM"` — fim do expediente configurado para esta pesquisa (ex: `"18:00"`) |
| is_active | boolean | NOT NULL |
| UNIQUE | (tenant_id, department_id) | |

Dias de trabalho da pesquisa em `survey_config_work_days` (join table — ver abaixo). Armazenados como `day_of_week INT` (0=Dom … 6=Sáb).

> `work_start_time`, `work_end_time` e `work_days` (via join table) definem a janela de disparo da pesquisa. **Cadeia de herança no disparo:** `employee.workStartTime/workEndTime → department.workStartTime/workEndTime → surveyConfig.workStartTime/workEndTime`. Para dias de trabalho por funcionário: `employee_work_days` (se não vazio) → `department_work_days`. Todos avaliados no `organizations.timezone`.

> Não existe mais `send_days` (jsonb) nem `send_time` (time) separados — o disparo ocorre automaticamente pelo scheduler ao detectar que estamos dentro do expediente configurado.

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

#### `survey_config_work_days`

Dias de trabalho configurados para uma pesquisa. Define em quais dias o scheduler dispara essa configuração.

| Coluna | Tipo | Constraints |
|---|---|---|
| survey_configuration_id | uuid | NOT NULL, FK → survey_configurations.id ON DELETE CASCADE |
| day_of_week | integer | NOT NULL — 0=Dom … 6=Sáb |
| PK | (survey_configuration_id, day_of_week) | |

#### `survey_questions`

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL |
| department_id | uuid | FK → departments.id — NULL = padrão da organização |
| factor | varchar(100) | NOT NULL |
| question_text | text | NOT NULL |
| sort_order | integer | NOT NULL, default 0 |
| is_active | boolean | NOT NULL, default true |
| created_at | timestamptz | NOT NULL |

#### `survey_dispatches`

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL |
| department_id | uuid | NOT NULL, FK → departments.id |
| scheduled_at | timestamptz | NOT NULL |
| sent_at | timestamptz | |
| status | varchar(20) | `'scheduled'` \| `'sent'` \| `'failed'` \| `'cancelled'` |
| total_recipients | integer | |
| total_responses | integer | NOT NULL, default 0 |
| created_at | timestamptz | NOT NULL |

**Índice:** `(tenant_id, department_id, scheduled_at DESC)`

#### `survey_response_tokens`

Token de uso único por colaborador/dispatch com snapshot do horário de trabalho. **Duas camadas de proteção contra fraude:**
1. **Expiração em 48h** — link inativo após 2 dias do disparo
2. **Janela de horário de trabalho** — válido apenas dentro do `work_start_time`–`work_end_time`, avaliado no fuso da organização. Mudanças posteriores na configuração do setor não afetam tokens já emitidos.

Após o uso, `used_at` é preenchido, mas **nenhum vínculo** é criado entre token/employee e a resposta.

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL |
| dispatch_id | uuid | NOT NULL, FK → survey_dispatches.id |
| employee_id | uuid | NOT NULL, FK → employees.id |
| token | varchar(255) | NOT NULL, UNIQUE |
| used_at | timestamptz | |
| expires_at | timestamptz | NOT NULL — `dispatched_at + 48h` |
| work_start_time | varchar(5) | NOT NULL — snapshot `"HH:MM"` no momento do disparo |
| work_end_time | varchar(5) | NOT NULL — snapshot `"HH:MM"` no momento do disparo |
| created_at | timestamptz | NOT NULL |

#### `survey_responses`

**Sem `employee_id`** — desvinculamento garante anonimato completo. O desvinculamento ocorre no momento do uso do token.

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL |
| dispatch_id | uuid | NOT NULL |
| department_id | uuid | NOT NULL |
| responded_at | date | NOT NULL — apenas data, sem hora (segunda camada de proteção ao anonimato) |
| created_at | timestamptz | NOT NULL |

#### `survey_response_items`

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL |
| response_id | uuid | NOT NULL, FK → survey_responses.id ON DELETE CASCADE |
| question_id | uuid | NOT NULL, FK → survey_questions.id |
| score | smallint | NOT NULL, CHECK (score BETWEEN 1 AND 5) |

#### `anonymous_reports`

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL |
| department_id | uuid | NOT NULL |
| category_id | uuid | NOT NULL, FK → report_categories.id |
| description | text | NOT NULL |
| is_crisis | boolean | NOT NULL, default false |
| status | varchar(20) | `'open'` \| `'analyzing'` \| `'resolved'` \| `'archived'` |
| linked_document_id | uuid | FK → documents.id — vínculo manual com documento |
| deleted_at | timestamptz | |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

**Índice:** `(tenant_id, is_crisis, status)` — para consulta de alertas de crise ativos

#### `action_plans`

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL |
| department_id | uuid | NOT NULL |
| title | varchar(255) | NOT NULL |
| origin | varchar(30) | NOT NULL — `'metric_alert'` \| `'anonymous_report'` \| `'periodic_review'` |
| description | text | NOT NULL |
| status | varchar(20) | `'open'` \| `'in_progress'` \| `'completed'` |
| alert_id | uuid | FK → alerts.id |
| report_id | uuid | FK → anonymous_reports.id |
| deleted_at | timestamptz | |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

#### `action_tasks`

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL |
| plan_id | uuid | NOT NULL, FK → action_plans.id ON DELETE CASCADE |
| description | text | NOT NULL |
| responsible | varchar(255) | NOT NULL |
| due_date | date | NOT NULL |
| status | varchar(20) | `'pending'` \| `'in_progress'` \| `'completed'` |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

#### `documents`

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL |
| department_id | uuid | NOT NULL |
| title | varchar(255) | NOT NULL |
| description | text | NOT NULL |
| storage_key | varchar(500) | NOT NULL — chave no bucket de storage |
| reference_date | date | NOT NULL |
| created_by | uuid | NOT NULL, FK → organization_users.id |
| deleted_at | timestamptz | |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

#### `document_versions`

Preservação de versões anteriores de documentos editados pelo Admin. Toda edição cria um registro aqui antes de aplicar as mudanças. O `audit_log` referencia `document_versions.id` para ações `'document.edited'`.

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL |
| document_id | uuid | NOT NULL, FK → documents.id ON DELETE CASCADE |
| version_number | integer | NOT NULL |
| title | varchar(255) | NOT NULL |
| description | text | NOT NULL |
| storage_key | varchar(500) | NOT NULL |
| edited_by | uuid | NOT NULL, FK → organization_users.id |
| created_at | timestamptz | NOT NULL |

#### `pgr_reviews`

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL |
| reviewed_at | date | NOT NULL |
| next_review_at | date | NOT NULL |
| notes | text | |
| registered_by | uuid | NOT NULL, FK → organization_users.id |
| created_at | timestamptz | NOT NULL |

#### `alerts`

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL |
| department_id | uuid | NOT NULL |
| type | varchar(30) | `'score_drop'` \| `'negative_trend'` \| `'low_adherence'` \| `'crisis_report'` \| `'pgr_review_due'` |
| severity | varchar(10) | `'high'` \| `'medium'` \| `'low'` |
| message | text | NOT NULL |
| is_resolved | boolean | NOT NULL, default false |
| resolved_at | timestamptz | |
| resolved_by | uuid | FK → organization_users.id |
| linked_document_id | uuid | FK → documents.id — segunda forma de fechar o alerta |
| dispatch_id | uuid | FK → survey_dispatches.id |
| report_id | uuid | FK → anonymous_reports.id |
| created_at | timestamptz | NOT NULL |

**Índice:** `(tenant_id, is_resolved, severity)`

| Tipo | Quando dispara |
|---|---|
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
| tenant_id | uuid | FK → organizations.id — NULL para ações do super admin |
| actor_id | uuid | NOT NULL |
| actor_type | varchar(20) | `'org_user'` \| `'super_admin'` |
| action | varchar(100) | NOT NULL — ex: `'document.deleted'`, `'report.exported'` |
| entity_type | varchar(100) | NOT NULL |
| entity_id | uuid | |
| metadata | jsonb | — valores anterior/posterior, contexto adicional |
| created_at | timestamptz | NOT NULL |

**Índices:** `(tenant_id, created_at DESC)`, `(actor_id, created_at DESC)`

#### `message_logs`

Registro de todas as mensagens enviadas. Fonte dos dados de métricas do Super Admin.

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | FK → organizations.id — NULL para mensagens da plataforma |
| recipient_phone | varchar(20) | NOT NULL |
| type | varchar(30) | `'consent_invite'` \| `'survey_dispatch'` \| `'survey_resend'` |
| dispatch_id | uuid | FK → survey_dispatches.id |
| status | varchar(20) | `'sent'` \| `'failed'` |
| external_id | varchar(255) | — ID retornado pelo provedor |
| sent_at | timestamptz | NOT NULL |

**Índices:** `(tenant_id, sent_at DESC)`, `(sent_at DESC)` — para contagem global no Super Admin

#### `job_logs`

Registro persistido de todas as execuções de jobs (completed/failed). **Append-only — sem update/delete.** Inserido pelos event listeners do BullMQ Worker no evento `completed` ou `failed`.

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| queue | varchar(50) | NOT NULL — `'jobs'` \| `'messages'` |
| job_name | varchar(100) | NOT NULL — ex: `'survey-dispatcher'`, `'send-message'` |
| job_id | varchar(255) | NOT NULL — ID do job no BullMQ |
| status | varchar(20) | NOT NULL — `'completed'` \| `'failed'` |
| duration_ms | integer | Duração da execução em ms |
| payload | jsonb | Payload do job (input) |
| result | jsonb | Resultado do job (output) |
| error | text | Mensagem de erro (apenas `status = 'failed'`) |
| attempts | integer | NOT NULL, default 1 |
| started_at | timestamptz | NOT NULL |
| finished_at | timestamptz | NOT NULL |
| created_at | timestamptz | NOT NULL |

**Índices:** `(queue, job_name, started_at DESC)`, `(status, started_at DESC)`

#### `request_logs`

Registro de requests HTTP recebidos pela aplicação. **Append-only — sem update/delete.** Inserido pelo proxy (`proxy.ts`) ou middleware de logging.

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| method | varchar(10) | NOT NULL — `'GET'`, `'POST'`, etc. |
| path | varchar(500) | NOT NULL |
| status_code | integer | NOT NULL |
| duration_ms | integer | Duração total da request |
| ip_address | varchar(45) | IP do cliente |
| user_agent | text | |
| tenant_id | uuid | FK → organizations.id — NULL para requests do super admin ou públicas |
| user_id | uuid | ID do usuário autenticado (se houver) |
| user_type | varchar(20) | `'org_user'` \| `'super_admin'` — NULL para requests públicas |
| created_at | timestamptz | NOT NULL |

**Índices:** `(tenant_id, created_at DESC)`, `(created_at DESC)` — para listagem no Super Admin

#### `pgr_dept_results`

Resultado por departamento gerado na revisão PGR. Normalizado para permitir queries por setor.

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL, FK → organizations.id |
| pgr_review_id | uuid | NOT NULL, FK → pgr_reviews.id ON DELETE CASCADE |
| department_id | uuid | NOT NULL, FK → departments.id |
| avg_score | float | NOT NULL |
| response_count | integer | NOT NULL |
| alert_count | integer | NOT NULL, default 0 |
| created_at | timestamptz | NOT NULL |

#### `pgr_question_results`

Resultado por pergunta gerado na revisão PGR. Permite análise de tendência por fator de risco.

| Coluna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL, FK → organizations.id |
| pgr_review_id | uuid | NOT NULL, FK → pgr_reviews.id ON DELETE CASCADE |
| department_id | uuid | NOT NULL, FK → departments.id |
| question_id | uuid | NOT NULL, FK → survey_questions.id |
| avg_score | float | NOT NULL |
| response_count | integer | NOT NULL |
| created_at | timestamptz | NOT NULL |

---

### Resumo: Tabelas por Grupo

| Grupo | Tabelas |
|---|---|
| **Sistêmicas** (sem tenant_id) | `plans`, `plan_prices`, `super_admin_users`, `consent_term_versions`, `report_categories`, `platform_terms_versions` |
| **Auth / Onboarding** | `organization_invitations`, `auth_tokens` |
| **Billing** | `billing_webhook_events` |
| **Termos da plataforma** | `platform_terms_versions`, `platform_terms_acceptances` |
| **Tenant — estrutura** | `organizations`, `organization_subscriptions`, `organization_users`, `departments` |
| **Tenant — colaboradores** | `employees`, `employee_consents` |
| **Tenant — pesquisas** | `survey_configurations`, `survey_questions`, `survey_dispatches`, `survey_response_tokens`, `survey_responses`, `survey_response_items` |
| **Tenant — ocorrências** | `anonymous_reports`, `action_plans`, `action_tasks` |
| **Tenant — documentos e PGR** | `documents`, `document_versions`, `pgr_reviews`, `pgr_dept_results`, `pgr_question_results` |
| **Tenant — operacional** | `alerts`, `audit_logs` |
| **Plataforma** | `message_logs`, `job_logs`, `request_logs` |

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
  interval: "monthly" | "annual"
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
surveyResponseTokenCleanup()
pgrReviewDueReminder()
surveyAdherenceChecker()
interface ActionPlanSuggestionWithTasks { ... }
interface CreateActionPlanSuggestionInput { ... }
<ActionPlanSuggestionCard />
<ActionPlanSuggestionList />
"action-plan-suggestion-generator"
"survey-response-token-cleanup"
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
- `workDays` é armazenado em tabelas de join relacionais (`department_work_days`, `employee_work_days`, `survey_config_work_days`) — nunca como string separada por vírgula. Em TypeScript, `workDays: number[]` (0=Dom … 6=Sáb) — avaliado no timezone da organização
- `workStartTime`/`workEndTime` como `"HH:MM"` — avaliados no timezone da organização no momento do dispatch

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
throw new AppError("EMAIL_CONFLICT", "E-mail já cadastrado nesta organização.")
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

### Regras do `yarn lint` (ESLint — `eslint.config.mjs`)

O comando `yarn lint` executa o ESLint sobre todos os arquivos `**/*.ts` e `**/*.tsx` (exceto `.next/`, `out/`, `build/`, `node_modules/`, `prisma/`, `src/cli/`). **Todo PR deve passar com zero erros e zero warnings.**

#### Regras gerais (todos os arquivos TS/TSX)

| Regra | Nível | Significado prático |
|---|---|---|
| `no-console` | error | Proibido `console.*` — use o logger (`pino`) |
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

#### Relaxamentos por camada

| Padrão de arquivo | Regras desativadas |
|---|---|
| `src/components/ui/**` | `explicit-function-return-type`, `no-unsafe-*`, `consistent-type-definitions` |
| `src/workers/**`, `src/libs/integrations/**` | `no-console`, `require-await`, `explicit-function-return-type` |
| `src/lib/**`, `src/libs/db/**` | `explicit-function-return-type` |
| `**/*.test.ts`, `**/*.spec.ts` | `no-explicit-any`, `no-unsafe-*` |
| Arquivos de config/rota/action/page/layout | `import/no-default-export` desativado |

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

    const existing = await employeeRepository.findByEmail(tenantId, data.email)
    if (existing) throw new AppError("EMAIL_CONFLICT", "E-mail já cadastrado nesta organização.")

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
await messaging.send({ to: employee.phone, body: surveyLink })
```

### Factory para integrações

```typescript
// libs/integrations/index.ts
export function getMessagingService(): IMessagingService {
  switch (env.MESSAGING_PROVIDER) {
    case "whatsapp_cloud": return new WhatsAppAdapter()
    case "twilio_sms":     return new TwilioSmsAdapter()
    default:               return new ConsoleSmsAdapter()
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
Link SMS → GET /survey/[token]
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
              ├─ Cria survey_response (sem employee_id)
              ├─ Cria survey_response_items
              └─ Marca token: used_at = now() (atômico com INSERT acima)
```

### Fluxo de alerta automático

```
survey_dispatch enviado
  └─→ Job (adherence-checker, após 48h)
        ├─ Calcula taxa de adesão: total_responses / total_recipients
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
- Verificar `billing_status` (suspender acesso se `cancelled`/`suspended`)
- Adicionar header `x-billing-warning` se `past_due`

**Caminhos públicos** (sem autenticação): `/login`, `/forgot-password`, `/reset-password/*`, `/invite/*`, `/consent/*`, `/survey/*`, `/report/*`, `/accept-terms`, `/api/webhooks/*`

### Fluxo de login (tenant)

```
POST /login
  ├─ Recebe: { slug, email, password }
  ├─ Busca organization WHERE slug = ? AND is_active = true AND billing_status = 'active'
  ├─ Busca organization_users WHERE tenant_id = org.id AND email = ? AND is_active = true
  ├─ bcrypt.compare(password, user.password_hash)
  ├─ Cria session cookie (HttpOnly, Secure, SameSite=Strict)
  └─ Redireciona para /dashboard
```

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

> **Princípio:** nenhum service do domínio conhece a implementação concreta. Trocar de provedor exige apenas criar novo adapter e atualizar a variável `*_PROVIDER` no `.env`. Zero alteração em código de negócio. **Nomes de provedores externos (Stripe, Twilio, Resend) nunca aparecem na UI** — apenas nos adapters e variáveis de ambiente.

### Messaging (SMS / WhatsApp)

```typescript
// libs/integrations/messaging/messaging.interface.ts
export interface IMessagingService {
  send(params: SendMessageParams): Promise<SendMessageResult>
  sendBulk(params: BulkMessageParams): Promise<BulkMessageResult>
}
```

**Implementação Twilio SMS:** `MESSAGING_PROVIDER=twilio_sms` → `TwilioSmsAdapter`  
**Implementação WhatsApp Cloud:** `MESSAGING_PROVIDER=whatsapp_cloud` → `WhatsAppAdapter` ✅  
**Desenvolvimento:** `MESSAGING_PROVIDER=console` → `ConsoleSmsAdapter` (imprime no terminal)  
**Variáveis Twilio:** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`  
**Variáveis WhatsApp:** `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_API_VERSION` (default `"v20.0"`), `WHATSAPP_API_BASE_URL` (default `"https://graph.facebook.com"`)

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

### Billing

```typescript
// libs/integrations/billing/billing.interface.ts
export interface IBillingService {
  createProduct(params: CreateProductParams): Promise<CreateProductResult>
  createPrice(params: CreatePriceParams): Promise<CreatePriceResult>
  createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CreateCheckoutSessionResult>
  createBillingPortalSession(params: CreateBillingPortalSessionParams): Promise<CreateBillingPortalSessionResult>
  constructWebhookEvent(params: ConstructWebhookEventParams): Promise<BillingWebhookEvent>
}
```

**Implementação atual:** `StripeAdapter`  
**Variáveis necessárias:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

> **Regra:** os campos do banco usam `external_product_id` e `external_price_id` — o prefixo `external_` abstrai o provedor. O Stripe é mencionado apenas nos adapters e variáveis de ambiente.

### Storage

```typescript
export interface IStorageService {
  upload(params: UploadFileParams): Promise<UploadFileResult>
  getSignedUrl(params: GetSignedUrlParams): Promise<string>
  delete(key: string): Promise<void>
}
```

### PDF

```typescript
export interface IPDFService {
  generatePGRReport(data: PGRReportData): Promise<GeneratePDFResult>
}
```

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
        50:  "#f0f7ff",
        100: "#dbeafe",
        500: "#2563eb",   // ação primária (light)
        600: "#1d4ed8",   // hover
        700: "#1e40af",
        900: "#1e3a5f",
      },
      success: { 50: "#f0fdf4", 500: "#16a34a", 700: "#15803d" },
      warning: { 50: "#fffbeb", 500: "#d97706", 700: "#b45309" },
      danger:  { 50: "#fef2f2", 500: "#dc2626", 700: "#b91c1c" },
      neutral: {
        50: "#f8fafc", 100: "#f1f5f9", 200: "#e2e8f0",
        500: "#64748b", 700: "#334155", 900: "#0f172a",
      },
    },
    fontFamily: {
      sans: ["Inter", "system-ui", "sans-serif"],
    },
  },
},
```

**Regra:** nenhum componente usa cores hardcoded (`text-slate-900`, `bg-white`). Sempre usar variáveis semânticas do shadcn/ui (`bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`) para que os temas funcionem automaticamente.

### Seletor de tema (ThemeToggle)

```tsx
"use client"
import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/libs/design-system/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  )
}
```

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222 47% 11%;
  --primary: 221 83% 53%;      /* brand-500 #2563eb */
  --muted: 210 40% 96%;
  --border: 214 32% 91%;
}

.dark {
  --background: 0 0% 7%;
  --foreground: 210 40% 98%;
  --primary: 217 91% 60%;
  --muted: 217 33% 17%;
  --border: 217 33% 17%;
}
```

**Regra:** nenhum componente usa cores hardcoded (`text-slate-900`, `bg-white`). Sempre usar variáveis semânticas do shadcn/ui (`bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`).

### Bordas em controles de formulário — fonte única de verdade

**Todos os controles interativos de formulário** (`Input`, `Select`/`SelectTrigger`, `Textarea`) devem ter borda claramente visível para comunicar ao usuário que o campo é interativo.

**Implementação:** a borda é controlada pela variável CSS `--input-border` em `src/app/globals.css`. Não modifique bordas diretamente nos componentes — altere apenas essa variável.

```css
/* src/app/globals.css — única fonte de verdade para bordas de form controls */
--input-border: oklch(0.74 0.022 258);   /* borda padrão — visível mas sutil */
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

- **Primária:** azul corporativo `#2563eb` — confiança, seriedade
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

### Fluxo: Checkout (organização assina um plano)

```
Admin da org → /billing → escolhe plano
  └─→ billingService.startCheckout(tenantId, planPriceId)
        ├─ Busca plan_prices.external_price_id
        ├─ Guard: se external_price_id for null → erro amigável (admin deve recriar o preço)
        ├─ Busca/cria stripe_customer_id para a org
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

### Proteção no proxy (billing status)

```typescript
// src/proxy.ts (trecho)
const org = await organizationRepository.findBySlug(slug)

if (org.billingStatus === "past_due") {
  headers.set("x-billing-warning", "past_due")
}
if (org.billingStatus === "suspended" || org.billingStatus === "cancelled") {
  return NextResponse.redirect(new URL(`/billing-suspended`, request.url))
}
```

---

## 16. Conformidade LGPD

### Princípio

`employee_consents` é a **prova legal** de que cada colaborador teve ciência e controle sobre sua participação. Deve ser imutável.

### Regras invioláveis

1. **Append-only:** `ConsentRepository` não expõe `update()` nem `delete()`
2. **Cada evento gera linha nova** — incluindo opt-out no formulário
3. **CPF armazenado apenas como hash SHA-256** e somente no evento `accepted`
4. **Sem `employee_id` em `survey_responses`** — desvinculamento garante anonimato
5. **Mínimo de 5 respondentes** para exibir métricas (enforçado no service, nunca na UI)
6. **`responded_at`** armazena apenas data (sem hora) — segunda camada de proteção ao anonimato

### Eventos e semântica do TCLE

| `event` | `source` típico | Descrição |
|---|---|---|
| `invited` | `system` | Colaborador recebeu link de TCLE |
| `accepted` | `sms_link` | Aceitou — CPF hasheado salvo |
| `refused` | `sms_link` | Recusou explicitamente |
| `revoked` | `sms_link` | Revogou aceite anterior |
| `opt_out` | `survey_form` | Pediu não-participação dentro do formulário |

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

// Um colaborador PODE ser re-convidado após opt_out ou refused.
// Basta que o RH envie novo link de TCLE — novo ciclo, nova linha 'invited'.
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
                  event: 'opt_out',
                  source: 'survey_form',
                  created_at: now()
                }
             5. UPDATE survey_response_tokens SET used_at = now()
             6. Retorna <OptOutConfirmedPage />
```

> Após o opt-out, o job `SurveyDispatcherJob` não inclui mais este colaborador em novos disparos — verifica estado atual via `getCurrentConsent`: se último evento = `opt_out` ou `refused` → pula.

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

A presença de um registro `event = 'accepted'` com `cpfHash` correspondente ao CPF do colaborador, em data anterior ao litígio, é prova de aceite. O `contentHash` da versão do termo prova qual texto foi aceito.

### Detecção de crise em relatos anônimos

```typescript
const CRISIS_KEYWORDS = [
  "me matar", "quero morrer", "não quero mais viver", "suicídio",
  "suicidar", "acabar com tudo", "me machucar", "tirar minha vida",
]
```

Quando detectado: (1) exibe aviso CVV (188) na tela do colaborador, (2) cria alerta `crisis_report` com `severity: 'high'` no painel do RH/Admin — sem identificar o autor, apenas o setor.

---

## 17. Termos de Uso da Plataforma

Diferente do TCLE dos colaboradores (`employee_consents`), estes são os Termos de Uso da **plataforma Pulse** — aceitos pelos admins das organizações.

### Fluxo

1. Super Admin cria nova versão em `/super-admin/terms` com conteúdo HTML e data de vigência
2. `(tenant)/layout.tsx` chama `termsService.getPendingTermsForUser(userId)` em cada request
3. Se há versão ativa sem aceite → redireciona para `/accept-terms`
4. Admin lê e aceita → `termsService.acceptTerms({ termsVersionId, userId, ipAddress, userAgent })`
5. Aceite registrado em `platform_terms_acceptances` com timestamp, IP e user-agent

### Módulo

```
src/modules/terms/
├── terms.repository.ts   # findActiveVersion, findAcceptance, createAcceptance, createVersion
├── terms.service.ts      # getPendingTermsForUser, acceptTerms, createNewTermsVersion
└── terms.types.ts        # CreateTermsVersionInput, AcceptTermsInput
```

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
| `survey-dispatcher` | A cada 15min | Verifica dispatches `scheduled` com `scheduled_at <= now()`, gera tokens, envia via messaging |
| `survey-adherence-checker` | A cada hora | 48h após cada dispatch, calcula taxa de adesão e cria alertas `low_adherence` |
| `survey-score-alert-detector` | Diário (03:00) | Calcula quedas de score; cria alertas `score_drop` e `negative_trend` |
| `employee-unpause` | Diário (01:00) | Reverte `status = 'active'` para colaboradores com `pause_end_at <= today` |
| `pgr-review-reminder` | Diário (08:00) | 30 dias antes de `next_review_at`; cria alerta `pgr_review_due` |
| `stripe-webhook-retry` | A cada hora | Reprocessa `billing_webhook_events` com `error IS NOT NULL` e `processed = false` |
| `survey-response-token-cleanup` | Diário (02:00) | Remove `survey_response_tokens` expirados e não utilizados |
| `action-plan-suggestion-generator` | Diário (06:00) | Gera sugestões de planos de ação com base em métricas de cada tenant |

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
"survey-response-token-cleanup"      // limpa tokens de resposta de pesquisa expirados
"survey-adherence-checker"           // verifica adesão a dispatches de pesquisa
```

**Regras adicionais:**

- Sempre kebab-case (igual aos nomes de arquivo e rotas)
- O nome deve responder: *"o que esse job faz e em qual domínio?"* sem precisar abrir o código
- Ao registrar o schedule em `register-schedules.ts`, o nome do job no BullMQ deve ser idêntico ao nome usado em `job-worker.ts`
- O mesmo nome é usado na rota de acionamento manual `/api/jobs/[job-name]`

### Acionamento manual

```bash
curl -X POST https://app.example.com/api/jobs/survey-dispatcher \
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

### Regra para renomear colunas

**Nunca renomear campos via Prisma Migrate automático** — o Prisma gera `DROP COLUMN + ADD COLUMN` que destrói dados. Para renomear coluna com dados existentes, escrever manualmente:

```sql
ALTER TABLE "employees" RENAME COLUMN "old_name" TO "new_name";
```

### Regras para mutação de `survey_questions`

`survey_questions` é uma tabela operacional com impacto direto na integridade histórica dos dados. As seguintes restrições são obrigatórias:

| Operação | Impacto | Regra |
|---|---|---|
| Alterar `score_direction` | Distorce o histórico — respostas antigas são recalculadas com a nova direção na próxima geração de PGR | **Proibido** em perguntas com respostas existentes em `survey_response_items` |
| Alterar `question_text` | O PGR exibe o texto atual para respostas antigas (vínculo é por `question_id`, não por texto) — pode confundir historicamente | Evitar após coleta de respostas; preferir criar nova pergunta |
| Desativar (`is_active = false`) | A pergunta some de pesquisas futuras; respostas antigas permanecem acessíveis no histórico do PGR | Permitido |
| Remover (`DELETE`) | Destrói o vínculo de `survey_response_items.question_id` — histórico de PGR quebra | **Proibido** se houver respostas vinculadas |

**Antes de alterar `score_direction` ou deletar uma pergunta**, verificar se existem respostas:

```sql
SELECT COUNT(*) FROM survey_response_items WHERE question_id = '<id>';
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
Employee cadastrado
  → consent.service.ts cria employee_consents (event: 'invited', token gerado)
  → getMessageQueue().add("send-message", { type: "consent_invite", phone, link })
    → Job Worker consome e chama getMessagingService().send(...)
      → Employee aceita: informa CPF → cpf_hash = SHA-256(cpf), event: 'accepted'
      → Employee recusa: event: 'refused' (registrado para auditoria)
```

> **Nota:** o convite passa pela fila BullMQ (não chamada direta) para garantir retry em caso de falha, logging em `job_logs` e monitoramento no painel `/super-admin/jobs`.

### 20.3 Envio de pesquisa

```
Job survey-dispatcher (a cada 15min)
  → Busca dispatches status='scheduled' e scheduled_at <= now()
    → Filtra employees: status='active', consent='accepted'
    → Gera survey_response_token por employee (expires_at = +48h, snapshot do horário)
    → messagingService.sendBulk
    → Registra em message_logs
    → Atualiza dispatch: status='sent', sent_at, total_recipients
```

### 20.4 Resposta ao formulário (anonimato garantido)

```
GET /survey/[token]
  → 4 guards validados (existência, uso, expiração, janela de trabalho)
  → Submit:
      ├─ Re-executa todos os guards
      ├─ Cria survey_response SEM employee_id
      ├─ Cria survey_response_items
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
const MINIMUM_RESPONDENTS_FOR_DISPLAY = 5

async getDepartmentMetrics(tenantId, departmentId, periodId) {
  const response = await surveyRepository.countResponses(...)
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
  └─→ Job consent-renotifier executado
        ├─ Busca todos employees com consent status = 'accepted' para versão anterior
        └─→ Para cada um: cria novo employee_consents (status: 'pending', novo token)
              └─→ Envia WhatsApp com novo link de consentimento
```

### 20.8 Reenvio para não-respondentes

```
RH aciona "Reenviar" em setor com adesão crítica (<60%)
  └─→ Server Action: surveyService.resendToNonRespondents(tenantId, dispatchId)
        ├─ Busca survey_response_tokens onde used_at IS NULL e expires_at > now()
        ├─ Para cada token não usado: gera novo token (expires_at = +48h), invalida o anterior
        ├─ Chama messagingService.sendBulk
        ├─ Registra em message_logs com type='survey_resend'
        └─ Cria novo dispatch com status='sent' vinculado ao original
```

### 20.9 Importação de colaboradores via Excel

```typescript
// modules/employees/employee-import.service.ts

const HEADER_MAP: Record<string, keyof ImportRow> = {
  "nome":          "name",
  "nome completo": "name",
  "e-mail":        "email",
  "email":         "email",
  "telefone":      "phone",
  "whatsapp":      "phone",
  "setor":         "departmentName",
}

// Fluxo:
// 1. parse(buffer) → detecta headers → mapeia colunas (case-insensitive, acentuação tolerada)
// 2. validate(rows) → Zod schema por linha → separa válidos/inválidos
// 3. Retorna ImportPreview { valid: Row[], invalid: { row, errors }[] }
// 4. Após confirmação do RH → importEmployees(tenantId, preview.valid)
//    ├─ Ignora duplicatas (mesmo email no tenant)
//    └─ Cria todos os válidos em batch
```

### 20.10 Métricas de plataforma (Super Admin Dashboard)

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
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Messaging
MESSAGING_PROVIDER=twilio_sms
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+55...

# WhatsApp Cloud API (quando MESSAGING_PROVIDER=whatsapp_cloud)
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_API_VERSION=v20.0
WHATSAPP_API_BASE_URL=https://graph.facebook.com

# Jobs
REDIS_HOST=localhost
REDIS_PORT=6379
CRON_SECRET=...                           # proteção dos endpoints /api/jobs/*

# URL pública
NEXT_PUBLIC_APP_URL=https://app.pulse.com
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

### Regras obrigatórias

1. **Prefixo `pulse:`** — todas as chaves usam o prefixo `pulse:` para evitar colisão com outras libs.
2. **SSR-safe** — o utilitário guarda com `typeof window === "undefined"`. Nunca lança exceção em SSR/RSC.
3. **try/catch silencioso** — falhas de storage (private browsing, storage cheio) são ignoradas silenciosamente.
4. **Somente em Client Components** — importar `@/libs/local-storage` apenas em arquivos com `"use client"`.
5. **Sem lógica de negócio** — o utilitário é apenas I/O. Decisões sobre o que salvar ficam no componente.

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
| `src/app/(auth)/login/login-form.tsx` | `useEffect` (mount) | Lê `lastOrgSlug` → preenche campo "Organização" |
| `src/app/(auth)/login/login-form.tsx` | Login bem-sucedido | Salva `lastOrgSlug` com o slug digitado |
| `src/app/(auth)/checkout/checkout-form.tsx` | Submit bem-sucedido (antes do redirect Stripe) | Salva `lastOrgSlug` com o slug cadastrado |

---

*Pulse — AGENTS.md | Documento interno | Abril de 2026*

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
| `consent_expired` | Consentimento expirado |
| `billing` | Cobrança |
| `system` | Sistema |

### Severidades mapeadas (`alerts`)

| Valor no banco | Label exibido |
|---|---|
| `info` | Informativo |
| `warning` | Atenção |
| `critical` | Crítico |

### Cores de badges

Use classes Tailwind com shades `-100` (fundo) / `-800` (texto) / `-300` (borda). Essas shades são visíveis e já existem no CSS gerado pelo projeto.

```tsx
// Padrão visual de badge
const BADGE_DEFAULT = "bg-muted text-muted-foreground border-border"  // neutro/cinza

// Cores semânticas
"bg-red-100 text-red-800 border-red-300"      // erro / crítico
"bg-amber-100 text-amber-800 border-amber-300" // atenção / queda
"bg-yellow-100 text-yellow-800 border-yellow-300" // aviso leve
"bg-blue-100 text-blue-800 border-blue-300"   // informativo
"bg-green-100 text-green-800 border-green-300" // sucesso / resolvido
```

**Não use inline `style={{ color, backgroundColor }}`** para badges — usar className garante consistência com o tema e o Tailwind JIT/oxide inclui as classes por serem literais no fonte.

---

## 25. Padrão de Navegação em Listagens

### Botão de seta (ChevronRight) — obrigatório

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
| `src/libs/integrations/**` | SDKs externos (Twilio, Resend, Stripe), libs/utils | Prisma, modules |
| `src/modules/*/types.ts` | libs/utils/json, outros types | `@prisma/client` (exceto re-export de entidade), SDKs externos |

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

### Re-export de entidades Prisma em types.ts — regra

O único uso aceitável de `@prisma/client` em arquivos `types.ts` é **re-exportar entidades** para que o app layer não precise importar diretamente:

```typescript
// src/modules/employees/employee.types.ts
export type { Employee } from "@prisma/client"  // ✅ re-export aceitável

// app layer usa:
import type { Employee } from "@/modules/employees/employee.types"  // ✅ correto
```

---

## 27. Abstração de SDKs e ORM

O código de domínio (services, types, schemas) deve ser completamente agnóstico ao provedor. Stripe, Twilio, Resend e Prisma são detalhes de infraestrutura — **nenhum tipo, constante ou referência desses SDKs pode aparecer fora da camada de adaptação**.

### Regras

| Artefato | Onde fica | Proibido fora |
|---|---|---|
| `Prisma.*` (InputJsonValue, JsonValue, etc.) | `*.repository.ts` | Qualquer outro arquivo |
| `Stripe.*` (Event, Subscription, Invoice, etc.) | `libs/integrations/billing/stripe.adapter.ts` | Qualquer outro arquivo |
| `Twilio.*` | `libs/integrations/messaging/twilio-sms.adapter.ts` | Qualquer outro arquivo |
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
const WHATSAPP_API_VERSION = "v20.0"
const WHATSAPP_API_BASE = "https://graph.facebook.com"

// ✅ CORRETO — via env
const apiVersion = env.WHATSAPP_API_VERSION
const apiBase = env.WHATSAPP_API_BASE_URL
```

---

## 28. Queries Cross-tenant — Convenção de Naming para Jobs

Jobs (BullMQ) precisam processar dados de **todos os tenants** de uma vez. Isso é uma **exceção intencional** ao tenant guard — não um bug. Para distinguir, é obrigatório usar o prefixo `findAllTenants` em qualquer função de repositório que omita o `tenantId` em tabelas que normalmente exigem esse filtro.

### Regra

```typescript
// ❌ PROIBIDO — nome ambíguo, parece estar faltando tenantId
async function findPendingDispatches(): Promise<SurveyDispatch[]> {
  return prisma.surveyDispatch.findMany({ where: { status: "scheduled" } })
}

// ✅ CORRETO — nome deixa explícito que é cross-tenant intencional
async function findAllTenantsPendingDispatches(): Promise<SurveyDispatch[]> {
  return prisma.surveyDispatch.findMany({ where: { status: "scheduled" } })
}
```

### Quando usar

| Cenário | Naming obrigatório |
|---|---|
| Job que processa todos os tenants (survey-dispatcher, adherence-checker, etc.) | `findAllTenants*` |
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
| 2 | Nenhum `@prisma/client` importado em `modules/*/types.ts` (exceto re-exports de entidade) | `grep -r "Prisma\." src/modules/` |
| 3 | Nenhum `prisma` importado em `service.ts` | `grep -rn "from \"@/libs/db\"" src/modules/ \| grep service` |
| 4 | Nenhum `$queryRaw` / `$executeRaw` em qualquer arquivo | `grep -r "\$queryRaw\|\$executeRaw" src/` |
| 5 | Todas as queries em tabelas com `tenant_id` incluem `tenantId` no `where` | Revisar manualmente qualquer novo repository |
| 6 | Mensagens de erro em pt-BR | `grep -rn '"[A-Z].*[a-z]"' src/modules/ \| grep "throw\|AppError"` |
| 7 | Nenhum `console.*` fora de workers/integrations | `grep -rn "console\." src/app/ src/modules/` |
| 8 | Queries cross-tenant de jobs nomeadas com `findAllTenants*` | Revisar `src/workers/` e jobs que chamam repositories sem `tenantId` |
| 9 | Nenhum `enum` TypeScript (use union types ou const maps) | `grep -rn "^enum \|  enum " src/` |
| 10 | `JsonValue` de `@/libs/utils/json` — nunca `Prisma.InputJsonValue` fora de repository | `grep -rn "Prisma\.InputJsonValue\|Prisma\.JsonValue" src/modules/ src/app/` |

### Verificações de domínio (obrigatórias para funcionalidades novas)

| # | Verificação |
|---|---|
| 11 | Nova tabela com `tenant_id`? Todos os repositórios recebem `tenantId` como 1º parâmetro |
| 12 | Nova integração externa? Existe interface em `libs/integrations/*/interface.ts` e adapter separado |
| 13 | Novos tipos JSON? Usam `JsonValue` de `@/libs/utils/json`, não tipos do ORM |
| 14 | Novo evento de billing? Mapeado em `webhook.handler.ts` e na tabela de eventos da §15 |
| 15 | Novos valores de enum no banco? Mapeados em `LABELS` Record antes de renderizar na UI (§24) |
| 16 | Nova rota com dados sensíveis? Tenant guard ativo no `proxy.ts` ou no layout |
| 17 | Novo módulo? Segue estrutura `repository + service + schema + types` (§10) |
| 18 | Novos erros de negócio? Usam `AppError` com mensagem em pt-BR |
| 19 | Server Action nova? Chama `getSession()`, valida com Zod, chama `revalidatePath` após mutação |
| 20 | `employee_consents` modificado? `ConsentRepository` ainda é append-only (sem `update`/`delete`) |
| 21 | **Todo identificador novo passa na pergunta de validação de nomenclatura?** Função, tipo, componente, job, constante, arquivo — o nome carrega domínio + entidade + ação sem precisar abrir o arquivo? (§9) |

### Quando o PR pode ser considerado pronto

- `tsc --noEmit` → **0 erros**
- `yarn lint` → **0 erros, 0 warnings**
- Todos os itens manuais acima verificados
- Sem `TODO`, `FIXME` ou `@ts-ignore` introduzidos

*Pulse — AGENTS.md | Documento interno | Abril de 2026*
