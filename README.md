# Pulse — Plataforma NR-1 de Saúde Ocupacional

Plataforma SaaS multi-tenant de gestão de saúde e bem-estar ocupacional voltada à conformidade com a **NR-1** (Gerenciamento de Riscos Ocupacionais) e **LGPD**. Permite que empresas cadastrem colaboradores, apliquem pesquisas de saúde/clima com envio automático por SMS ou WhatsApp, monitorem alertas, criem planos de ação e gerem o PGR.

---

## Sumário

- [Stack tecnológica](#stack-tecnológica)
- [Requisitos](#requisitos)
- [Setup local](#setup-local)
- [Rodando com Docker](#rodando-com-docker)
- [Comandos do banco de dados](#comandos-do-banco-de-dados)
- [Seed](#seed)
- [Workers e filas](#workers-e-filas)
- [Jobs agendados (Cron)](#jobs-agendados-cron)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Provedores de integração](#provedores-de-integração)
- [Arquitetura do projeto](#arquitetura-do-projeto)
- [Papéis e permissões](#papéis-e-permissões)
- [Índice de Saúde Ocupacional](#índice-de-saúde-ocupacional)
- [Fluxos da plataforma](#fluxos-da-plataforma)
  - [Autenticação](#1-autenticação)
  - [Onboarding de organização](#2-onboarding-de-organização)
  - [Gestão de funcionários](#3-gestão-de-funcionários)
  - [Configuração de pesquisa](#4-configuração-de-pesquisa)
  - [Disparo e envio de pesquisas](#5-disparo-e-envio-de-pesquisas)
  - [Resposta à pesquisa (funcionário)](#6-resposta-à-pesquisa-funcionário)
  - [Verificação de aderência](#7-verificação-de-aderência)
  - [Detecção de alertas](#8-detecção-de-alertas)
  - [Planos de ação](#9-planos-de-ação)
  - [Sugestões de plano de ação](#10-sugestões-de-plano-de-ação)
  - [Consentimento LGPD](#11-consentimento-lgpd)
  - [Denúncias anônimas](#12-denúncias-anônimas)
  - [Documentos](#13-documentos)
  - [PGR](#14-pgr)
  - [Faturamento e assinatura (Stripe)](#15-faturamento-e-assinatura-stripe)
  - [Super Admin](#16-super-admin)
  - [Convite de usuários](#17-convite-de-usuários)
  - [Timezone e expediente](#18-timezone-e-expediente)

---

## Stack tecnológica

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions) |
| Banco de dados | PostgreSQL 16 |
| ORM | Prisma 7 com `@prisma/adapter-pg` |
| Linguagem | TypeScript 5 (strict) |
| Fila de mensagens | BullMQ + Redis 7 |
| Estilo | Tailwind CSS v4 + shadcn/ui |
| Formulários | React Hook Form + Zod |
| Sessão | JWT via `jose` (cookie `HttpOnly`) |
| E-mail | Resend + React Email (templates) |
| SMS/WhatsApp | Twilio SMS / WhatsApp Cloud API |
| Pagamentos | Stripe (webhooks + Checkout) |
| PDF | `@react-pdf/renderer` |
| Deploy | Docker multi-stage |

---

## Requisitos

| Ferramenta | Versão mínima |
|---|---|
| Node.js | 22 |
| Yarn | 1.22 |
| Docker + Docker Compose | qualquer versão recente |
| PostgreSQL | 16 (via Docker ou externo) |
| Redis | 7 (via Docker ou externo) |

---

## Setup local

**1. Instale as dependências:**

```bash
yarn install
```

**2. Crie o arquivo `.env`** com base na seção [Variáveis de ambiente](#variáveis-de-ambiente).

**3. Suba o banco e o Redis via Docker:**

```bash
docker compose up db redis -d
```

**4. Aplique as migrations:**

```bash
yarn prisma migrate deploy
```

**5. Rode o seed** (cria o super admin e os termos iniciais):

```bash
yarn seed
```

**6. Inicie a aplicação em modo de desenvolvimento:**

```bash
yarn dev
```

A aplicação estará disponível em **http://localhost:3000**.

**7. (Opcional) Inicie os workers em terminais separados:**

```bash
yarn worker:dev
yarn worker:schedules
```

---

## Rodando com Docker

O `docker-compose.yml` sobe os seguintes serviços:

| Serviço | Função |
|---|---|
| `db` | PostgreSQL 16 |
| `redis` | Redis 7 (fila de mensagens) |
| `migrate` | Executa `prisma migrate deploy` e encerra |
| `app` | Next.js em modo produção (porta 3000) |
| `worker` | Job worker (BullMQ) |
| `schedule-register` | Registra os crons no Redis e encerra |

```bash
docker compose up --build
```

Para rodar em background:

```bash
docker compose up --build -d
```

Para ver logs:

```bash
docker compose logs -f app
docker compose logs -f worker
```

Para parar e remover os volumes (apaga todos os dados):

```bash
docker compose down -v
```

---

## Comandos do banco de dados

```bash
# Criar uma nova migration após alterar o schema.prisma
yarn prisma migrate dev --name nome-da-migration

# Aplicar migrations pendentes (produção)
yarn prisma migrate deploy

# Visualizar o banco no Prisma Studio (browser)
yarn prisma studio

# Resetar o banco completamente (dev only — apaga tudo)
yarn prisma migrate reset

# Gerar o Prisma Client manualmente
yarn prisma generate

# Validar o schema sem criar migration
yarn prisma validate
```

---

## Seed

O seed cria os dados iniciais obrigatórios para a plataforma funcionar:

```bash
yarn seed
```

O que é criado:

| Item | Valor padrão |
|---|---|
| Super Admin | `admin@admin.com` / `Testando123!` |
| Termos de uso | Versão `1.0.0` (ativa) |

O seed é idempotente: se os dados já existirem, nada é duplicado.

> Troque a senha do super admin imediatamente após o primeiro login em produção.

---

## Workers e filas

A plataforma usa **BullMQ** com Redis para processar jobs assíncronos. Existem duas filas:

### Fila de jobs (`pulse:jobs`)

Processa os jobs agendados pelo cron. Cada job é identificado por nome:

| Job | Descrição |
|---|---|
| `survey-dispatcher` | Dispara pesquisas para funcionários ativos (automático e manual) |
| `survey-adherence-checker` | Verifica aderência de dispatches com mais de 48h |
| `survey-score-alert-detector` | Detecta scores baixos e gera alertas de bem-estar |
| `employee-unpause` | Despausa funcionários após o período de pausa expirar |
| `pgr-review-reminder` | Cria alerta de revisão do PGR quando vence em até 30 dias |
| `stripe-webhook-retry` | Reprocessa webhooks do Stripe que falharam |
| `survey-response-token-cleanup` | Remove tokens de resposta expirados e não utilizados |
| `action-plan-suggestion-generator` | Gera sugestões de plano de ação com base em alertas ativos e dados da plataforma |

### Fila de mensagens (`pulse:messages`)

Processa o envio de cada mensagem individualmente para o funcionário. Cada item da fila contém: `to` (telefone), `body` (texto), `tenantId`, `employeeId`, `provider` e `type`.

### Iniciando os workers

```bash
# Worker principal (processa ambas as filas)
yarn worker:dev

# Registrar os schedules no Redis (executar uma vez ao iniciar)
yarn worker:schedules
```

### Schedules (frequência dos jobs)

| Job | Cron | Frequência |
|---|---|---|
| `survey-dispatcher` | `*/15 * * * *` | A cada 15 minutos |
| `survey-adherence-checker` | `0 * * * *` | A cada hora |
| `survey-score-alert-detector` | `0 3 * * *` | Diariamente às 03:00 |
| `employee-unpause` | `0 1 * * *` | Diariamente às 01:00 |
| `pgr-review-reminder` | `0 8 * * *` | Diariamente às 08:00 |
| `stripe-webhook-retry` | `0 * * * *` | A cada hora |
| `survey-response-token-cleanup` | `0 2 * * *` | Diariamente às 02:00 |
| `action-plan-suggestion-generator` | `0 6 * * *` | Diariamente às 06:00 |

---

## Jobs agendados (Cron)

Os endpoints abaixo são chamados pelo próprio scheduler interno (via BullMQ). Em produção, os schedules são registrados no Redis e o worker os consome. Em ambientes sem worker, eles também podem ser chamados diretamente por um agendador externo (GitHub Actions, etc.) com o header de autenticação.

Todos os endpoints exigem o header `x-cron-secret: <CRON_SECRET>`.

| Endpoint | Método | Descrição |
|---|---|---|
| `/api/jobs/survey-dispatcher` | POST | Dispara pesquisas agendadas |
| `/api/jobs/survey-adherence-checker` | POST | Verifica aderência de respostas |
| `/api/jobs/survey-score-alert-detector` | POST | Gera alertas de scores baixos |
| `/api/jobs/employee-unpause` | POST | Despausa funcionários com data vencida |
| `/api/jobs/pgr-review-reminder` | POST | Cria alerta de revisão do PGR |
| `/api/jobs/stripe-webhook-retry` | POST | Reprocessa webhooks Stripe com falha |
| `/api/jobs/survey-response-token-cleanup` | POST | Remove tokens expirados do banco |
| `/api/jobs/action-plan-suggestion-generator` | POST | Gera sugestões de plano de ação |

**Exemplo de chamada manual:**

```bash
curl -X POST http://localhost:3000/api/jobs/survey-dispatcher \
  -H "x-cron-secret: seu-cron-secret"
```

---

## Variáveis de ambiente

```env
# ─── Banco de dados ────────────────────────────────────────────────
DATABASE_URL="postgresql://pulse:pulse@localhost:5432/pulse"

# ─── Sessão (JWT) ──────────────────────────────────────────────────
# Mínimo 32 caracteres. Gere com: openssl rand -base64 32
NEXTAUTH_SECRET="coloque-aqui-um-segredo-longo-e-aleatorio"

# ─── URL pública ───────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# ─── Redis (BullMQ) ────────────────────────────────────────────────
REDIS_HOST="localhost"
REDIS_PORT="6379"
# REDIS_PASSWORD=""   # opcional, para Redis com autenticação

# ─── Cron secret ───────────────────────────────────────────────────
# Mínimo 16 caracteres
CRON_SECRET="coloque-aqui-um-segredo-para-os-crons"

# ─── Provedor de mensagens ─────────────────────────────────────────
# Opções: console | twilio_sms | whatsapp_cloud
MESSAGING_PROVIDER="console"
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_FROM_NUMBER="+5511999999999"

# Template da mensagem enviada ao funcionário com o link da pesquisa
# {nome} é substituído pelo primeiro nome do colaborador; {link} pelo link único da pesquisa
SURVEY_MESSAGE_TEMPLATE="Oi, {nome}! 👋 Tudo bem por aí? Sua opinião faz a diferença para a gente 🌱 Quando tiver um momento, aqui está o seu formulário de bem-estar: {link}"

# ─── Provedor de e-mail ────────────────────────────────────────────
# Opções: console | resend
EMAIL_PROVIDER="console"
EMAIL_FROM="noreply@suaempresa.com"
RESEND_API_KEY="re_..."

# ─── Faturamento (Stripe) ──────────────────────────────────────────
# Opções: stripe | fake
BILLING_PROVIDER="stripe"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# ─── WhatsApp do consultor (exibido na landing page) ───────────────
NEXT_PUBLIC_CONSULTANT_WHATSAPP="5511999999999"
```

> Com `MESSAGING_PROVIDER=console` e `EMAIL_PROVIDER=console`, todas as mensagens são impressas no terminal. Nenhuma integração externa é necessária para desenvolvimento local.

> Para testar webhooks do Stripe localmente:
> ```bash
> stripe listen --forward-to localhost:3000/api/webhooks/stripe
> ```

---

## Provedores de integração

### Mensagens

| `MESSAGING_PROVIDER` | Descrição |
|---|---|
| `console` | Imprime no terminal (dev) |
| `twilio_sms` | Envia SMS via Twilio |
| `whatsapp_cloud` | Envia via WhatsApp Cloud API |

### E-mail

| `EMAIL_PROVIDER` | Descrição |
|---|---|
| `console` | Imprime no terminal (dev) |
| `resend` | Envia via [Resend](https://resend.com) |

Templates disponíveis (React Email): verificação de e-mail, convite de organização, reset de senha, pagamento falhou, plano assinado, plano cancelado.

### Faturamento

| `BILLING_PROVIDER` | Descrição |
|---|---|
| `fake` | Simula cobranças sem integração real (dev) |
| `stripe` | Integração real com Stripe |

---

## Arquitetura do projeto

```
src/
├── app/                        # Rotas Next.js (App Router)
│   ├── (auth)/                 # Login, logout, senha, accept-terms
│   ├── (onboarding)/           # Aceitar convite (/invite/[token])
│   ├── (public)/               # Survey, consent, report anônimo (sem auth)
│   ├── (tenant)/               # Área logada da organização (admin + rh)
│   ├── (super-admin)/          # Área logada do super admin
│   └── api/
│       ├── jobs/               # Endpoints dos cron jobs
│       └── webhooks/stripe/    # Webhook de pagamento
│
├── modules/                    # Lógica de negócio por domínio
│   ├── auth/                   # Autenticação, sessão, convites
│   ├── billing/                # Assinaturas, planos, webhooks Stripe
│   ├── employees/              # Funcionários, importação Excel
│   ├── surveys/                # Configuração, disparo, respostas
│   ├── alerts/                 # Detecção e gestão de alertas
│   ├── action-plans/           # Planos de ação e tarefas
│   ├── documents/              # Documentos e versões
│   ├── pgr/                    # Revisões do PGR
│   ├── consent/                # Consentimento LGPD (append-only)
│   ├── anonymous-reports/      # Denúncias anônimas
│   ├── organizations/          # Dados e configurações da organização
│   ├── departments/            # Departamentos
│   ├── plans/                  # Planos de assinatura
│   ├── terms/                  # Termos da plataforma
│   ├── platform-metrics/       # KPIs do Super Admin dashboard
│   └── audit/                  # Logs de auditoria (append-only)
│
├── libs/
│   ├── db/                     # Instância singleton do Prisma (com PG adapter)
│   ├── auth/                   # Permissões e roles
│   ├── queue/                  # BullMQ: criação de filas e workers
│   ├── integrations/           # Adapters: email, messaging, billing, pdf, storage
│   ├── email-templates/        # Templates React Email
│   ├── design-system/          # Componentes, tokens de design, alert-labels
│   ├── errors/                 # AppError
│   └── utils/                  # date, slug, pagination, action-result, health-index
│
├── components/                 # Componentes globais (PageHelp, AlertTypeInfo, ChartCard…)
│   └── ui/                     # Componentes shadcn/ui
├── workers/                    # job-worker.ts e register-schedules.ts
├── cli/seed/                   # Seed do banco
├── env.ts                      # Validação de variáveis de ambiente (t3-env)
└── proxy.ts                    # Proxy de autenticação (Next.js 16 — substitui middleware.ts)
```

### Padrão de camadas

```
Route (page.tsx / actions.ts)
  └── Service (*.service.ts)       ← lógica de negócio
        └── Repository (*.repository.ts)  ← queries Prisma
              └── @/libs/db        ← instância Prisma
```

- **Actions** leem `tenantId` sempre da sessão (nunca de parâmetros do cliente).
- **Repositories** não conhecem o domínio HTTP; recebem apenas tipos simples.
- **Services** encapsulam regras de negócio e lançam `AppError` em caso de falha.
- **App layer** (`src/app/`) não importa repositórios diretamente — apenas serviços.

---

## Papéis e permissões

A plataforma possui três níveis de acesso completamente isolados:

### Super Admin

- Acessa via `/super-admin`
- Sessão armazenada no cookie `pulse_super_admin_session`
- Responsabilidades: criar planos/preços, gerenciar organizações, publicar termos de uso, exportar dados da plataforma

### Admin (organização)

- Role: `admin`
- Controle total da organização: funcionários, pesquisas, alertas, planos de ação, documentos, PGR, configurações, faturamento, convite de usuários

### RH (organização)

- Role: `rh`
- Mesmo acesso do Admin, exceto faturamento e configurações gerais da organização

### Middleware de autenticação

O arquivo `src/proxy.ts` intercepta todas as requisições:

1. Caminhos públicos (login, survey, consent, report, checkout, etc.) passam sem verificação.
2. Caminhos `/super-admin/*` verificam o cookie `pulse_super_admin_session`.
3. Todos os demais caminhos verificam o cookie `pulse_session`.
4. Se o JWT estiver ausente ou inválido, redireciona para `/login` ou `/super-admin/login`.

---

## Índice de Saúde Ocupacional

O **Índice de Saúde** é a métrica central do Pulse. Representa o bem-estar de um setor em uma escala de 0 a 100%, calculada a partir das respostas das pesquisas.

### Fórmula

```
Índice de Saúde = round(((média_normalizada - 1) / 4) × 100)
```

A média normalizada é calculada sobre os scores individuais após aplicação da normalização de direção.

### Normalização de direção (`scoreDirection`)

Cada pergunta tem uma direção configurada:

| `scoreDirection` | Significado | Normalização |
|---|---|---|
| `higher_is_better` | Nota alta = bem-estar alto (ex: "satisfação geral") | Score é usado diretamente |
| `lower_is_better` | Nota alta = bem-estar baixo (ex: "nível de estresse") | Score invertido: `6 - score` |

Exemplos:
- Pergunta "Como está seu estresse?" com `lower_is_better`: nota 1 (ótimo) → normalizado como 5 → Índice de Saúde alto
- Pergunta "Satisfação geral" com `higher_is_better`: nota 5 (ótimo) → normalizado como 5 → Índice de Saúde alto

### Faixas de classificação

| Faixa | Classificação | Cor |
|---|---|---|
| ≥ 62% | Saudável | Verde |
| 37% – 61% | Atenção | Amarelo/Âmbar |
| < 37% | Crítico | Vermelho |

### Requisito mínimo de respondentes

Métricas são exibidas apenas quando há **mínimo de 5 respondentes** no período. Abaixo desse limiar, o sistema retorna `{ available: false, reason: "insufficient_respondents" }` para proteger o anonimato individual.

### Fonte única de verdade

Todos os cálculos de Índice de Saúde passam pela função `toHealthIndex` em `src/libs/utils/health-index.ts`. **Nunca calcule o índice manualmente em outros arquivos** — importe sempre essa função.

```typescript
import { toHealthIndex, healthIndexLabel, healthIndexAccent } from "@/libs/utils/health-index"

const hi = toHealthIndex(mediaNormalizada)   // → número 0–100
const label = healthIndexLabel(hi)           // → "Saudável" | "Atenção" | "Crítico"
const color = healthIndexAccent(hi)          // → classe CSS de cor
```

---

## Fluxos da plataforma

### 1. Autenticação

**Login:**
1. Usuário submete e-mail e senha no formulário `/login`.
2. A action `loginAction` busca o usuário pelo e-mail + `tenantId` (extraído do host/slug ou da sessão atual).
3. Verifica o hash bcrypt da senha.
4. Cria um JWT com `{ userId, tenantId, role }` assinado com `NEXTAUTH_SECRET` e expira em 7 dias.
5. Salva o JWT no cookie `pulse_session` (HttpOnly, SameSite=Lax, Secure em produção).
6. Redireciona para `/dashboard`.

**Logout:**
1. Action `logoutAction` apaga o cookie `pulse_session`.
2. Redireciona para `/login`.

**Esqueci a senha:**
1. Usuário informa o e-mail.
2. A action gera um token único com validade de 1 hora, salva em `auth_tokens` com `type = "password_reset"`.
3. Envia e-mail com o link `/reset-password/[token]`.
4. Ao acessar o link, o usuário informa a nova senha.
5. A action valida o token (existência, tipo, expiração, `usedAt = null`), atualiza o `passwordHash` e marca o token como usado.

---

### 2. Onboarding de organização

**Criação de organização (pelo Super Admin):**
1. Super Admin acessa `/super-admin/organizations` e cria a organização informando nome, slug, plano, e-mail do admin e CNPJ (opcional).
2. Um `OrganizationInvitation` é criado e um e-mail de convite é enviado para o admin principal.
3. O admin acessa `/invite/[token]`, define sua senha e é redirecionado para `/billing`.

**Checkout (assinatura do plano):**
1. Admin acessa `/billing`, escolhe um plano disponível e clica em "Assinar".
2. A action `startCheckoutAction` busca o `external_price_id` do plano e cria uma Stripe Checkout Session.
3. O admin é redirecionado para a página de pagamento do Stripe.
4. Após pagamento confirmado (webhook `checkout.session.completed`), cria `OrganizationSubscription` com snapshot do plano e atualiza `billing_status = "active"`.

**Aceitar Termos:**
1. Na primeira vez que o usuário faz login (e sempre que uma nova versão for publicada), é redirecionado para `/accept-terms`.
2. Exibe a versão ativa dos Termos de Uso (tabela `platform_terms_versions`).
3. Ao aceitar, registra `PlatformTermsAcceptance` com `userId`, `termsVersionId`, IP e User-Agent.
4. Redireciona para `/dashboard`.

---

### 3. Gestão de funcionários

**Cadastro manual:**
1. Usuário preenche nome, telefone, e-mail (opcional), departamento e horário de trabalho (`workStartTime`, `workEndTime`).
2. A action `createEmployeeAction` lê `tenantId` da sessão e cria o funcionário no banco.
3. Dispara a action de consentimento: cria um `EmployeeConsent` com `event = "invited"` e um token temporário.
4. Envia SMS/WhatsApp para o funcionário com o link de consentimento `/consent/[token]`.

**Importação por planilha Excel:**
1. Usuário faz upload de um arquivo `.xlsx` em `/employees/import`.
2. O serviço detecta automaticamente os cabeçalhos da planilha (case-insensitive, suporta variações em português: "nome", "telefone", "whatsapp", "setor", etc.).
3. Cada linha é validada via Zod. O resultado é exibido em `/employees/import/preview` com duas listas: linhas válidas e inválidas (com motivo do erro).
4. O usuário confirma o import. A action `importEmployeesAction` lê `tenantId` da sessão (nunca do cliente).
5. Para cada linha válida: vincula ao departamento informado (por nome, case-insensitive) e cria o funcionário. Duplicatas de e-mail no mesmo tenant são ignoradas silenciosamente.
6. Retorna um relatório com total importado e erros.

**Pausa de funcionário:**
1. Admin define `pauseStartAt` e `pauseEndAt` no perfil do funcionário.
2. O status muda para `paused`.
3. O job `employee-unpause` (diariamente às 01:00) consulta funcionários com `pauseEndAt <= now()` e reverte o status para `active`.
4. Funcionários pausados são excluídos dos disparos de pesquisa.

---

### 4. Configuração de pesquisa

1. Usuário acessa `/surveys/configure` e seleciona um departamento.
2. Define:
   - **Frequência**: `daily`, `twice_weekly`, `weekly`, `biweekly`, `monthly`
   - **Horário de expediente**: `workStartTime` e `workEndTime` (formato `HH:mm`)
   - **Dias de trabalho**: seleção de dias da semana (0=Dom … 6=Sáb), armazenados na tabela relacional `survey_config_work_days` — nunca como string separada por vírgula
   - **Perguntas**: lista de questões com score de 1 a 5, cada uma com `scoreDirection` (`higher_is_better` ou `lower_is_better`). Perguntas de estresse e carga de trabalho usam `lower_is_better` (1 = ótimo). O sistema normaliza automaticamente antes de calcular métricas e gerar alertas.
3. A action salva a `SurveyConfiguration` com `@@unique([tenantId, departmentId])` — só existe uma configuração ativa por departamento.

---

### 5. Disparo e envio de pesquisas

Este é o fluxo central da plataforma. Ocorre de duas formas:

**Auto-disparo (automático via cron):**

```
A cada 15 min → job survey-dispatcher
  ├── runAutoDispatchScheduler()
  │     ├── Busca configs ativas com employees
  │     ├── Verifica se hoje é dia de trabalho (timezone da org)
  │     ├── Verifica intervalo desde o último disparo
  │     └── Para cada config elegível:
  │           ├── Cria SurveyDispatch (status: sent)
  │           ├── Cria SurveyResponseToken por funcionário (expira em 48h)
  │           └── Enfileira mensagem na fila pulse:messages
  │
  └── runSurveyDispatcher()
        ├── Busca dispatches agendados manualmente (status: scheduled)
        └── Mesmo fluxo acima para cada dispatch pendente
```

**Disparo manual:**
1. Usuário clica em "Disparar agora" na tela `/surveys`.
2. A action cria um `SurveyDispatch` com `status = "scheduled"` e `scheduledAt = now()`.
3. O job `survey-dispatcher` (próxima execução em até 15 min) o processa.

**Envio das mensagens (BullMQ):**

```
Fila pulse:messages
  └── Worker processMessageJob()
        ├── Chama getMessagingService().send({ to, body })
        │     ├── TwilioSMS: POST Twilio API
        │     ├── WhatsApp: POST Meta API
        │     └── Console: console.log (dev)
        └── Registra MessageLog (status: sent | failed)
```

**Conteúdo da mensagem:**

O texto da mensagem é configurado via `SURVEY_MESSAGE_TEMPLATE` no `.env`. Os placeholders `{nome}` e `{link}` são substituídos automaticamente antes do envio:

```
Oi, {nome}! 👋 Tudo bem por aí? Sua opinião faz a diferença para a gente 🌱 Quando tiver um momento, aqui está o seu formulário de bem-estar: {link}
```

O link aponta para `/survey/[token]`, que também serve como ponto de entrada para o consentimento (ver seção 6).

---

### 6. Resposta à pesquisa (funcionário)

1. Funcionário recebe o link `/survey/[token]` por SMS/WhatsApp.
2. A página valida o token: verifica existência, `usedAt = null`, `expiresAt > now()`.
3. Verifica se o funcionário está dentro do horário de expediente configurado (usando `workStartTime`/`workEndTime` salvos no token no momento do disparo).
4. **Consent gate:** se o funcionário ainda não aceitou os termos de consentimento (TCLE), exibe o texto dos termos inline para aceite antes de mostrar o formulário. Ao aceitar, cria um `EmployeeConsent` com `event = "accepted"`. Ao recusar, cria `event = "refused"` e encerra o fluxo.
5. Exibe as perguntas da pesquisa (scores de 1 a 5).
6. O funcionário pode clicar em **"Não quero mais participar"** (opt-out) a qualquer momento antes de submeter. Isso:
   - Cria um `EmployeeConsent` com `event = "opt_out"` e `source = "survey_form"`.
   - Marca o token como usado.
   - O job `survey-dispatcher` passa a excluir este funcionário de novos disparos até que seja re-convidado.
7. Ao submeter, a action:
   - Cria `SurveyResponse` **sem `employee_id`** — o desvinculamento garante anonimato completo.
   - Cria `SurveyResponseItem` por questão com o score informado.
   - Marca o token como usado (`usedAt = now()`).
   - Atualiza `SurveyDispatch.totalResponses++`.
8. O funcionário vê uma tela de agradecimento.

> O horário verificado no momento da resposta usa o `workStartTime`/`workEndTime` **snapshot** salvo no token, não a configuração atual. Isso garante consistência mesmo que a config seja alterada após o disparo.

---

### 7. Verificação de aderência

O job `adherence-checker` (a cada hora) verifica dispatches com mais de 48 horas:

1. Busca `SurveyDispatch` com `adherenceCheckedAt = null` e `dispatchedAt < now() - 48h`.
2. Para cada dispatch, conta as respostas recebidas.
3. Calcula: `adherenceRate = totalResponses / totalRecipients`.
4. Se `adherenceRate < 0.8` (menos de 80% de respostas), cria um `Alert` do tipo `low_adherence` para o departamento.
5. Marca o dispatch com `adherenceCheckedAt = now()` e `totalResponses` atualizado.

---

### 8. Detecção de alertas

Alertas são criados automaticamente por jobs agendados e exibidos na tela `/alerts`. Admin pode marcar como resolvido.

**Faixas do Índice de Saúde:** ≥ 62% Saudável · 37–61% Atenção · < 37% Crítico  
**Severidades:** `critical` = ação imediata · `warning` = atenção recomendada

---

### 9. Planos de ação

1. Admin cria um plano de ação em `/action-plans/new` com título, descrição, prioridade (`low`, `medium`, `high`) e data limite.
2. Dentro do plano, cria tarefas individuais com responsável e prazo.
3. Status do plano: `open` → `in_progress` → `completed`.
4. Ao marcar como concluído, `completedAt` é registrado automaticamente.
5. Planos de ação costumam ser criados em resposta a alertas de saúde, sugestões automáticas ou ao PGR.

---

### 10. Alertas e sugestões — referência completa

Referência de tudo que o usuário vê na tela para cada alerta (`/alerts`) e sugestão de plano de ação (`/action-plans`).

**Faixas do Índice de Saúde (HI):** ≥ 62% Saudável · 37–61% Atenção · < 37% Crítico  
**Severidades de alerta:** `critical` = ação imediata · `warning` = atenção recomendada  
**Sugestões:** geradas pelo job `action-plan-suggestion-generator` · 06:00 diário · apenas tenants com `billing_status = "active"`  
**Deduplicação de sugestões:** (1) `suggestionKey` já existente em `action_plan_suggestions`; (2) título idêntico a um plano de ação criado nos últimos 30 dias  
**`description` nunca inclui nomes de fatores ou perguntas** — apenas HI%, contagens e datas

| Tipo / Título | Campo | Conteúdo |
|---|---|---|
| **`low_score`** *(Alerta — gerado automaticamente)* | Condição | Score médio normalizado < 3,0 (HI < 50%) nas últimas 48h |
| | Job | `survey-score-alert-detector` · 03:00 diário |
| | Severidade | `critical` se HI < 25% · `warning` se 25–50% |
| | Mensagem | `O índice de saúde do setor {X} está abaixo do esperado: {HI}% ({label}).` |
| | Tooltip — label | Bem-estar abaixo do esperado |
| | Tooltip — descrição | O índice de saúde do setor está abaixo do limiar de atenção (índice < 37%). |
| | Tooltip — ação | Investigue a causa raiz, converse com a equipe e elabore um plano de ação para melhorar o clima ocupacional. |
| **`score_drop`** *(Alerta — gerado automaticamente)* | Condição | Queda > 1 ponto no score médio comparando janela atual (0–48h) com janela anterior (48–96h) |
| | Job | `survey-score-alert-detector` · 03:00 diário |
| | Severidade | `critical` se queda > 2 pontos · `warning` se queda > 1 ponto |
| | Mensagem | `Queda de {N} pontos no índice de saúde do setor {X}: de {HI_ant}% para {HI_atual}% nas últimas 48h.` |
| | Tooltip — label | Queda no bem-estar |
| | Tooltip — descrição | O índice de saúde do setor caiu mais de 1 ponto em relação ao período anterior. |
| | Tooltip — ação | Revise as respostas das pesquisas, identifique qual fator piorou e crie um plano de ação para endereçar a causa. |
| **`negative_trend`** *(Alerta — gerado automaticamente)* | Condição | Últimos 3 dispatches com respostas todos abaixo da média histórica do setor |
| | Job | `survey-score-alert-detector` · 03:00 diário |
| | Severidade | `warning` |
| | Mensagem | `O setor {X} apresenta tendência negativa por 3 períodos consecutivos abaixo da média histórica. Índice atual: {HI}%.` |
| | Tooltip — label | Tendência de piora persistente |
| | Tooltip — descrição | O índice de saúde do setor ficou abaixo da média histórica por 3 períodos consecutivos — sinal de problema persistente. |
| | Tooltip — ação | Situação requer atenção urgente. Revise o contexto da equipe, aplique pesquisas qualitativas e implemente planos de ação estruturados. |
| **`low_adherence`** *(Alerta — gerado automaticamente)* | Condição | Adesão entre 50% e 80% em dispatch enviado há ≥ 48h |
| | Job | `survey-adherence-checker` · a cada hora |
| | Severidade | `warning` |
| | Mensagem | `Taxa de adesão: {pct}% ({respostas}/{total})` |
| | Tooltip — label | Adesão baixa |
| | Tooltip — descrição | Menos de 80% dos colaboradores responderam à pesquisa dentro de 48 horas após o disparo. |
| | Tooltip — ação | Reforce junto aos gestores a importância de responder e verifique se todos os colaboradores do setor têm dados de contato cadastrados. |
| **`no_response`** *(Alerta — gerado automaticamente)* | Condição | Adesão < 50% em dispatch enviado há ≥ 48h |
| | Job | `survey-adherence-checker` · a cada hora |
| | Severidade | `critical` se adesão < 25% · `warning` se 25–50% |
| | Mensagem | `Taxa de adesão: {pct}% ({respostas}/{total})` |
| | Tooltip — label | Sem resposta |
| | Tooltip — descrição | Nenhuma resposta foi recebida neste ciclo de pesquisa. |
| | Tooltip — ação | Verifique se o disparo foi concluído sem erros nos logs de jobs e se os colaboradores do setor têm dados de contato cadastrados. |
| **`consent_expired`** *(Alerta — gerado automaticamente)* | Condição | Colaborador ativo com último evento `invited` e `tokenExpiresAt < now()`, agrupado por setor |
| | Job | `survey-score-alert-detector` · 03:00 diário |
| | Severidade | `warning` |
| | Mensagem | `{N} colaborador(es) do setor {X} com convite de consentimento expirado. Reenvie o convite para retomar a participação.` |
| | Tooltip — label | Consentimento expirado |
| | Tooltip — descrição | O termo de consentimento (TCLE) de um ou mais colaboradores está expirado ou ainda pendente de aceite. |
| | Tooltip — ação | Reenvie o convite de consentimento para os colaboradores pendentes para que possam voltar a participar das pesquisas. |
| **`pgr_review_due`** *(Alerta — gerado automaticamente)* | Condição | `nextReviewAt` nos próximos 30 dias e sem alerta aberto do mesmo tipo |
| | Job | `pgr-review-reminder` · 08:00 diário |
| | Severidade | `warning` |
| | Mensagem | `Revisão PGR prevista para {data}.` |
| | Tooltip — label | Revisão PGR pendente |
| | Tooltip — descrição | A revisão obrigatória do PGR vence em até 30 dias. A NR-1 exige documentação periódica dos riscos psicossociais — ausência de registro expõe a empresa a multas. |
| | Tooltip — ação + passos | 1. Acesse PGR no menu lateral. 2. Clique em Gerar relatório e selecione o mês/ano — faça isso apenas quando o mês estiver encerrado. 3. Revise os indicadores: índice de saúde, alertas ativos e planos de ação. 4. Se houver setores críticos, crie Planos de Ação antes de concluir. 5. Clique em Marcar como revisado para gerar a evidência legal. |
| **"Índice de bem-estar abaixo do esperado — {setor}"** *(Sugestão)* | Condição | Alerta `low_score` sem resolução |
| | Prioridade | `high` |
| | Chave de dedup | `alert-low_score-{departmentId}` |
| | Título | `Índice de bem-estar abaixo do esperado — {setor}` |
| | Motivo *(card colapsado)* | `Score abaixo do esperado — setor {X}: O índice de saúde do setor {X} está abaixo do esperado: {HI}% ({label}).` |
| | Descrição *(card expandido)* | `Alerta gerado em {data} ({há N dias}) — setor: {X}, severidade: {sev}. Dado registrado pelo sistema: "O índice de saúde do setor {X} está abaixo do esperado: {HI}% ({label}).". Scores persistentemente baixos estão associados a burnout, queda de produtividade e aumento de turnover. É necessário investigar as causas e implementar ações estruturadas.` |
| | Tarefa 1 | Reunião de diagnóstico com liderança do setor |
| | Tarefa 2 | Levantamento dos principais fatores de risco relatados |
| | Tarefa 3 | Definir medidas corretivas e responsáveis |
| | Tarefa 4 | Monitorar evolução nas próximas pesquisas |
| **"Intervenção de bem-estar — {setor}"** *(Sugestão)* | Condição | Alerta `score_drop` sem resolução |
| | Prioridade | `high` |
| | Chave de dedup | `alert-score_drop-{departmentId}` |
| | Título | `Intervenção de bem-estar — {setor}` |
| | Motivo *(card colapsado)* | `Queda de score no setor {X} — alerta ativo {há N dias}` |
| | Descrição *(card expandido)* | `Alerta gerado em {data} ({há N dias}) — setor: {X}, severidade: {sev}. Dado registrado pelo sistema: "{alert.message}". Quedas de score costumam indicar aumento de pressão, sobrecarga ou conflitos não endereçados. Agir rapidamente reduz o risco de agravamento e demonstra comprometimento com a NR-1.` |
| | Tarefa 1 | Reunião de diagnóstico com liderança do setor |
| | Tarefa 2 | Levantamento dos principais fatores de risco relatados |
| | Tarefa 3 | Definir medidas corretivas e responsáveis |
| | Tarefa 4 | Monitorar evolução nas próximas pesquisas |
| **"Plano de melhoria contínua — {setor}"** *(Sugestão)* | Condição | Alerta `negative_trend` sem resolução |
| | Prioridade | `high` |
| | Chave de dedup | `alert-negative_trend-{departmentId}` |
| | Título | `Plano de melhoria contínua — {setor}` |
| | Motivo *(card colapsado)* | `Tendência negativa no setor {X} — ativo {há N dias}` |
| | Descrição *(card expandido)* | `Alerta gerado em {data} ({há N dias}) — setor: {X}, severidade: {sev}. Dado registrado pelo sistema: "{alert.message}". Tendências negativas prolongadas aumentam o risco de burnout e comprometem o cumprimento da NR-1. O problema se agrava a cada ciclo sem intervenção.` |
| | Tarefa 1 | Análise detalhada das respostas dos últimos períodos |
| | Tarefa 2 | Reunião com liderança para identificar causas raiz |
| | Tarefa 3 | Definir metas de melhoria e prazo de reavaliação |
| | Tarefa 4 | Revisão do processo de trabalho no setor |
| **"Engajamento nas pesquisas — {setor}"** *(Sugestão)* | Condição | Alerta `low_adherence` sem resolução |
| | Prioridade | `medium` |
| | Chave de dedup | `alert-low_adherence-{departmentId}` |
| | Título | `Engajamento nas pesquisas — {setor}` |
| | Motivo *(card colapsado)* | `Baixa adesão no setor {X}: {alert.message}` |
| | Descrição *(card expandido)* | `Alerta gerado em {data} ({há N dias}) — setor: {X}, severidade: {sev}. Dado registrado pelo sistema: "{alert.message}". Baixa participação compromete a representatividade dos dados e pode mascarar problemas reais de saúde no time. Dados insuficientes impedem a detecção precoce de riscos.` |
| | Tarefa 1 | Comunicado interno sobre a importância das pesquisas |
| | Tarefa 2 | Alinhamento com gestores e lideranças do setor |
| | Tarefa 3 | Revisar horário e frequência de envio das pesquisas |
| | Tarefa 4 | Identificar e remover barreiras à participação |
| **"Pesquisa sem respostas registradas — {setor}"** *(Sugestão)* | Condição | Alerta `no_response` sem resolução |
| | Prioridade | `medium` |
| | Chave de dedup | `alert-no_response-{departmentId}` |
| | Título | `Pesquisa sem respostas registradas — {setor}` |
| | Motivo *(card colapsado)* | `Pesquisa sem resposta no setor {X}: Taxa de adesão: {pct}% ({r}/{total})` |
| | Descrição *(card expandido)* | `Alerta gerado em {data} ({há N dias}) — setor: {X}, severidade: {sev}. Dado registrado pelo sistema: "Taxa de adesão: {pct}% ({r}/{total})". Sem respostas, não é possível monitorar o bem-estar do setor. A ausência de dados compromete tanto a gestão interna quanto a documentação de conformidade com a NR-1.` |
| | Tarefa 1 | Verificar se os links de pesquisa chegaram corretamente |
| | Tarefa 2 | Comunicado interno reforçando a importância das pesquisas |
| | Tarefa 3 | Alinhar com gestores a divulgação interna do programa |
| | Tarefa 4 | Revisar janela de horário configurada para o setor |
| **"Tratamento de relatos anônimos pendentes"** *(Sugestão)* | Condição | ≥ 3 relatos com status `open` ou `analyzing` |
| | Prioridade | `medium` |
| | Chave de dedup | `open-reports` |
| | Título | `Tratamento de relatos anônimos pendentes` |
| | Motivo *(card colapsado)* | `{N} relatos em aberto ou análise — mais antigo {há N dias}` |
| | Descrição *(card expandido)* | `Há {N} relatos anônimos pendentes ({X} sem triagem, {Y} em análise). O mais antigo foi registrado {há N dias}. Categorias identificadas: {cat1} ({n}), {cat2} ({n}). Cada relato representa um colaborador que buscou ajuda — a resposta ágil demonstra comprometimento e é exigida indiretamente pela NR-1.` |
| | Tarefa 1 | Triagem e categorização dos relatos recebidos |
| | Tarefa 2 | Definir responsável por cada categoria de relato |
| | Tarefa 3 | Elaborar plano de resposta e comunicação interna |
| | Tarefa 4 | Registrar ações tomadas para evidência no PGR |
| **"Aumentar adesão às pesquisas — {setor}"** *(Sugestão)* | Condição | Dispatch dos últimos 30 dias com adesão < 80% (`totalResponses / totalRecipients`) |
| | Prioridade | `medium` |
| | Chave de dedup | `dispatch-low-adherence-{dispatchId}` |
| | Título | `Aumentar adesão às pesquisas — {setor}` |
| | Motivo *(card colapsado)* | `Pesquisa enviada em {data} no setor {X}: {pct}% de adesão ({r}/{total})` |
| | Descrição *(card expandido)* | `Na pesquisa enviada em {data} ao setor {X}: {r} de {total} colaboradores responderam ({pct}% de adesão — meta: ≥80%). {N} respostas não foram recebidas. Dados desrepresentativos comprometem a detecção precoce de riscos psicossociais e a evidência documental exigida pela NR-1.` |
| | Tarefa 1 | Informar colaboradores sobre a importância das pesquisas de bem-estar |
| | Tarefa 2 | Verificar se os links chegaram corretamente (checar registros de envio) |
| | Tarefa 3 | Alinhar com gestores a divulgação interna do programa |
| | Tarefa 4 | Revisar janela de horário configurada para o setor |
| **"Engajamento no TCLE — colaboradores sem aceite"** *(Sugestão)* | Condição | ≥ 1 colaborador ativo sem `event = "accepted"` em `employee_consents` |
| | Prioridade | `medium` |
| | Chave de dedup | `consent-pending` |
| | Título | `Engajamento no TCLE — colaboradores sem aceite` |
| | Motivo *(card colapsado)* | `{N} colaborador(es) sem TCLE aceito — {setor1} ({n}), {setor2} ({n})` |
| | Descrição *(card expandido)* | `{N} colaboradores ativos não aceitaram o Termo de Consentimento — distribuídos em: {setor1} ({n}), {setor2} ({n}). Sem o aceite, esses colaboradores ficam excluídos das pesquisas e das métricas de saúde ocupacional, reduzindo a representatividade dos dados e comprometendo a documentação de conformidade com a NR-1.` |
| | Tarefa 1 | Identificar colaboradores com aceite pendente por setor |
| | Tarefa 2 | Reenviar o convite de aceite do TCLE para esses colaboradores |
| | Tarefa 3 | Comunicar gestores sobre a importância do aceite nos seus setores |
| | Tarefa 4 | Registrar colaboradores que recusaram explicitamente |
| **"Geração do relatório PGR do mês"** *(Sugestão)* | Condição | Nenhum `pgr_reviews` com `createdAt` no mês corrente |
| | Prioridade | `low` |
| | Chave de dedup | `pgr-missing` |
| | Título | `Geração do relatório PGR do mês` |
| | Motivo *(card colapsado)* | `Relatório PGR pendente para {mês/ano} — último: {período}` · ou `Nenhum relatório PGR registrado ({mês/ano})` se nunca houve |
| | Descrição *(card expandido)* | `Nenhum relatório PGR foi gerado para {mês/ano}. O último relatório foi gerado em {data} (período: {período}).` · ou `Nenhum relatório PGR foi gerado até o momento.` · `A NR-1 exige que as empresas documentem e revisem periodicamente os riscos psicossociais — o relatório mensal é a principal evidência de conformidade.` |
| | Tarefa 1 | Acessar o módulo PGR e gerar o relatório do período |
| | Tarefa 2 | Revisar os indicadores de saúde por setor |
| | Tarefa 3 | Registrar observações e planos de melhoria |
| | Tarefa 4 | Armazenar o relatório na documentação da empresa |

---

### 11. Consentimento LGPD

O fluxo de consentimento garante que a coleta de dados de saúde dos funcionários seja juridicamente válida:

1. Ao cadastrar um funcionário, um registro de `EmployeeConsent` é criado com `event = "invited"` e um token temporário.
2. O funcionário recebe um link `/consent/[token]` por SMS/WhatsApp.
3. Ao acessar, vê o texto dos Termos de Consentimento (versão ativa de `consent_term_versions`).
4. Pode aceitar ou recusar:
   - **Aceitar**: cria um novo `EmployeeConsent` com `event = "accepted"`, registra hash do CPF (opcional) e fonte.
   - **Recusar**: cria um registro com `event = "refused"`.
5. O token é inativado após o uso.
6. O histórico de consentimentos é imutável e auditável.

---

### 12. Denúncias anônimas

1. Qualquer pessoa com o slug da organização pode acessar `/report/[orgSlug]`.
2. Preenche um formulário com categoria e descrição da denúncia.
3. A action cria um `AnonymousReport` **sem qualquer vínculo com usuário ou funcionário**.
4. Admin visualiza as denúncias em `/reports`, pode alterar o status (`open` → `analyzing` → `resolved` → `archived`) e registrar resolução.

---

### 13. Documentos

1. Admin faz upload de documentos (SST, PPRA, PCMSO, etc.) em `/documents`.
2. Cada documento tem um tipo e pode ter múltiplas versões (`DocumentVersion`).
3. Ao subir uma nova versão, a anterior é mantida no histórico.
4. Documentos com `isActive = false` são arquivados mas não excluídos.

---

### 14. PGR

1. Admin acessa `/pgr` para gerenciar as revisões do Programa de Gerenciamento de Riscos.
2. Cada `PgrReview` tem um período, URL do arquivo, status (`pending` → `generated` → `reviewed`) e data da próxima revisão.
3. O job `pgr-review-reminder` (diariamente às 08:00) verifica reviews com `nextReviewAt <= now()` e envia e-mail de lembrete para os admins da organização.
4. A geração do documento PDF é feita via `@react-pdf/renderer`.

---

### 15. Faturamento e assinatura (Stripe)

**Fluxo de assinatura:**

```
Checkout → Stripe Checkout Session
  └── Pagamento confirmado → Webhook stripe:checkout.session.completed
        ├── Busca organization pelo externalCustomerId
        ├── Cria/atualiza OrganizationSubscription
        └── Atualiza billingStatus = "active"
```

**Webhooks processados:**

| Evento Stripe | Ação |
|---|---|
| `checkout.session.completed` | Ativa a assinatura |
| `customer.subscription.updated` | Atualiza status e período |
| `customer.subscription.deleted` | Marca como `cancelled` |
| `invoice.payment_failed` | Marca como `past_due`, envia e-mail |
| `invoice.payment_succeeded` | Atualiza período atual |

**Idempotência dos webhooks:**
- Cada evento é salvo em `stripe_webhook_events` pelo `stripe_event_id`.
- Ao processar, verifica se o evento já foi processado. Se sim, ignora.
- O job `stripe-webhook-retry` (a cada hora) reprocessa eventos com `error != null` e `processedAt = null`.

**Snapshot de plano:**
- Ao criar a assinatura, os dados do plano (nome, max employees, preço, intervalo) são copiados (snapshot) para `OrganizationSubscription`.
- Isso garante que mudanças futuras de plano não afetam assinaturas existentes até o próximo ciclo.

---

### 16. Super Admin

O super admin acessa `/super-admin` com credenciais separadas e tem controle total da plataforma:

**Planos:**
- Cria planos com nome, descrição e limite de funcionários.
- Adiciona preços (mensal/anual) vinculados a um produto no Stripe.
- Ativa/desativa planos.

**Organizações:**
- Visualiza todas as organizações com status de faturamento.
- Acessa detalhes de qualquer organização (funcionários, dispatches, etc.).
- Visualiza histórico de faturamento de cada organização.
- Pode aplicar override de limite de funcionários (`maxEmployeesOverride`).

**Termos de uso:**
- Publica novas versões dos Termos de Uso da plataforma.
- A versão ativa é exibida no checkout e no `/accept-terms`.
- Versões anteriores ficam no histórico.

**Exportação de dados:**
- Endpoint `/api/super-admin/export` gera um Excel com métricas de todas as organizações.

---

### 17. Convite de usuários

1. Admin acessa `/settings` → Gerenciamento de equipe.
2. Informa o e-mail e role (`admin` ou `rh`) do novo usuário.
3. A action cria um `OrganizationInvitation` com token único (expira em 7 dias) e envia e-mail com o link `/invite/[token]`.
4. O convidado acessa o link, define sua senha e aceita os termos.
5. A action cria o `OrganizationUser`, marca o convite como usado (`usedAt = now()`) e cria a sessão.

---

### 18. Timezone e expediente

**Princípio:**
- Todas as datas e horas são armazenadas no banco em **UTC+0**.
- O frontend e o worker convertem para o timezone da organização na hora de exibir ou de tomar decisões.

**Timezone da organização:**
- Armazenado em `organizations.timezone` (ex: `"America/Sao_Paulo"`).
- Padrão: `"America/Sao_Paulo"` (UTC-3).
- Configurável em `/settings`.

**Horário de expediente:**
- Configurado em 3 níveis com herança:
  1. `SurveyConfiguration` — janela de disparo da pesquisa (`workStartTime`, `workEndTime`, `survey_config_work_days`)
  2. `Department` — expediente padrão do setor (`workStartTime`, `workEndTime`, `department_work_days`) — fallback do colaborador
  3. `Employee` — override individual (`workStartTime`, `workEndTime`, `employee_work_days`) — tem **precedência** sobre o departamento
- **Cadeia de herança para horários**: `employee → department → surveyConfig`
- **Cadeia de herança para dias de trabalho**: `employee_work_days` (se preenchido) → `department_work_days`
- O horário do colaborador tem precedência sobre o departamento; o departamento tem precedência sobre a config da pesquisa.

**No disparo de pesquisas:**
1. O worker verifica se o dia atual (no timezone da organização) está nos dias configurados em `survey_config_work_days`.
2. Verifica se a hora atual (no timezone da organização) está dentro do expediente (`workStartTime` ≤ agora ≤ `workEndTime`).
3. Se fora do expediente, o disparo é adiado para a próxima execução do job (a cada 15 min).

**Na resposta do formulário:**
- O token de resposta armazena o snapshot de `workStartTime`/`workEndTime` no momento do disparo.
- O formulário `/survey/[token]` verifica se a hora atual (timezone da organização) está dentro do expediente salvo no token.
- Fora do expediente, o formulário exibe uma mensagem informando o horário disponível.

**Justificativa legal:**
- Enviar pesquisas apenas durante o expediente é exigência implícita da NR-1 e das boas práticas da LGPD.
- Respeita o direito ao descanso dos trabalhadores (CLT).
- Aumenta a taxa de resposta ao enviar no momento de maior engajamento.

---

## Lint e build

```bash
# Verificar erros e warnings de lint
yarn lint

# Build de produção
yarn build

# Iniciar em modo produção (após build)
yarn start
```

> O projeto segue as regras definidas em `eslint.config.mjs`: TypeScript strict, import order, sonarjs, unicorn e regras customizadas documentadas em `AGENTS.md`.


---

## Fluxograma

Cole o bloco abaixo no [Mermaid Live Editor](https://mermaid.live) para visualizar como o Pulse funciona.

```mermaid
flowchart TD

%% ════════════════════════════════════════════════
%% ÁREA DO SUPER ADMIN (gestão da plataforma)
%% ════════════════════════════════════════════════

    SA(["👤 Super Admin"])

    SA --> SA_PLANS["Cria e gerencia os\nplanos disponíveis para compra"]
    SA --> SA_TERMS["Publica os Termos\nde Uso da plataforma"]
    SA --> SA_ORGS["Monitora todas as\nempresas cadastradas"]

%% ════════════════════════════════════════════════
%% ÁREA DO ADMIN DA EMPRESA
%% ════════════════════════════════════════════════

    ADMIN(["👤 Admin da empresa"])

    ADMIN --> CHECKOUT["Escolhe um plano\ne realiza o pagamento"]
    CHECKOUT --> ACCEPT_TERMS["Aceita os Termos de Uso"]
    ACCEPT_TERMS --> DASH["🏠 Dashboard da empresa"]

    DASH -->|"Convida por e-mail"| INVITE_RH["RH recebe convite\ne cria sua senha"]

    DASH --> DEPTS["Cria departamentos\n(ex: TI, Vendas, RH)"]
    DASH --> EMPLOYEES["Cadastra funcionários\ncom telefone e horário de trabalho"]
    DASH -->|"somente Admin"| BILLING["Gerencia assinatura:\nplano, pagamento e cancelamento"]

%% ════════════════════════════════════════════════
%% ÁREA DO RH (compartilhada com o Admin)
%% ════════════════════════════════════════════════

    RH(["👤 RH"])

    INVITE_RH --> RH_DASH["🏠 Dashboard da empresa\n(mesma visão do Admin,\nsem acesso ao faturamento)"]
    RH --> RH_DASH

    RH_DASH --> SURVEY_CFG["Configura pesquisa\npor departamento:\nperguntas, frequência\ne horário de envio"]
    RH_DASH --> ALERT_VIEW["Visualiza alertas\nde saúde gerados\npelo sistema"]
    RH_DASH --> AP_CREATE["Cria Planos de Ação\ncom tarefas e responsáveis"]
    RH_DASH --> DOCS["Gerencia documentos\nda empresa (PPRA, PCMSO…)"]
    RH_DASH --> PGR["Gerencia o PGR\n(revisões periódicas — NR-1)"]
    RH_DASH --> REPORTS["Acompanha\ndenúncias anônimas"]

    DASH --> SURVEY_CFG
    DASH --> ALERT_VIEW
    DASH --> AP_CREATE
    DASH --> DOCS
    DASH --> PGR
    DASH --> REPORTS

%% ════════════════════════════════════════════════
%% FLUXO DE CONSENTIMENTO (Funcionário)
%% ════════════════════════════════════════════════

    FUNC(["👤 Funcionário"])

    EMPLOYEES --> CONSENT_LINK["Funcionário recebe link\npara autorizar coleta de dados"]
    CONSENT_LINK --> FUNC_DECISION{"Funcionário\ndecide"}
    FUNC_DECISION -->|"Autoriza"| CONSENT_OK["Consentimento\nregistrado ✅"]
    FUNC_DECISION -->|"Recusa"| CONSENT_NO["Recusa\nregistrada 🚫"]
    CONSENT_OK & CONSENT_NO --> CONSENT_AUDIT["Histórico salvo\npara fins legais — LGPD"]
    FUNC --> CONSENT_LINK

%% ════════════════════════════════════════════════
%% FLUXO DE PESQUISA (envio → resposta → alerta)
%% ════════════════════════════════════════════════

    SURVEY_CFG --> AUTO_SEND["⏰ Sistema envia automaticamente\nno dia e horário do expediente"]
    AUTO_SEND --> FUNC_MSG["Funcionário recebe\nSMS ou WhatsApp\ncom link da pesquisa"]
    FUNC --> FUNC_MSG

    FUNC_MSG --> ANSWERED{"Funcionário\nresponde?"}
    ANSWERED -->|"Sim"| SURVEY_DONE["Responde as perguntas\ncom nota de 1 a 5"]
    ANSWERED -->|"Não responde\nem 48h"| LOW_ADH["⚠️ Alerta de\nbaixa participação"]

    SURVEY_DONE --> SCORE{"Notas\nbaixas?"}
    SCORE -->|"Sim"| HEALTH_ALERT["⚠️ Alerta de\nsaúde gerado"]
    SCORE -->|"Não"| NEXT_CYCLE["Aguarda o próximo\nenvio automático"]
    NEXT_CYCLE --> AUTO_SEND

    HEALTH_ALERT & LOW_ADH --> ALERT_VIEW

%% ════════════════════════════════════════════════
%% PLANO DE AÇÃO
%% ════════════════════════════════════════════════

    ALERT_VIEW --> AP_CREATE
    AP_CREATE --> AP_TASKS["Define tarefas,\nresponsáveis e prazos"]
    AP_TASKS --> AP_DONE["Plano concluído ✅"]

%% ════════════════════════════════════════════════
%% PGR — LEMBRETE AUTOMÁTICO
%% ════════════════════════════════════════════════

    PGR --> PGR_REMINDER["📧 Sistema envia lembrete\nautomaticamente quando\na revisão estiver vencendo"]

%% ════════════════════════════════════════════════
%% DENÚNCIAS ANÔNIMAS (acesso público)
%% ════════════════════════════════════════════════

    PUB(["👤 Qualquer pessoa"])

    PUB --> ANON["Faz uma denúncia anônima\npelo link público da empresa"]
    ANON --> REPORTS
```

## Fluxo de Pesquisas

Cole o bloco abaixo no [Mermaid Live Editor](https://mermaid.live) para visualizar o ciclo de pesquisas do Pulse.

```mermaid
flowchart LR

subgraph RH ["👤 RH / Admin"]
    direction TB
    SETUP["Configura a pesquisa\nde cada departamento:\nperguntas, frequência\ne horário de envio"]
    SCHEDULE["Agenda o disparo\npara todos os departamentos"]
    ALERT["⚠️ Recebe alerta no painel\nquando algo não vai bem"]
    ACTION["Cria um Plano de Ação\ncom tarefas e responsáveis"]
    SETUP --> SCHEDULE
    SCHEDULE --> ALERT
    ALERT --> ACTION
end

subgraph PULSE ["⚙️ Pulse — automático"]
    direction TB
    SEND["Envia SMS ou WhatsApp\npara os funcionários de\ncada departamento configurado"]
    WAIT["Aguarda as respostas\npor até 48 horas"]
    ANALYZE["Analisa os resultados:\nparticipação e notas do período"]
    SEND --> WAIT --> ANALYZE
end

subgraph FUNC ["👤 Funcionário"]
    direction TB
    RECEIVE["Recebe o link\nno celular"]
    CONSENT{"Primeira vez?\nPrecisa aceitar\nos termos"}
    FORM["Responde as perguntas\ncom nota de 1 a 5\n(100% anônimo)"]
    OPTOUT["Pede para não\nreceber mais pesquisas"]
    RECEIVE --> CONSENT
    CONSENT -->|"Aceita"| FORM
    CONSENT -->|"Não aceita"| OPTOUT
end

SCHEDULE -->|"disparo agendado"| SEND
SEND -->|"link no celular"| RECEIVE
ANALYZE -->|"queda de notas\nou baixa participação"| ALERT
ACTION -->|"próximo ciclo"| SCHEDULE
```
