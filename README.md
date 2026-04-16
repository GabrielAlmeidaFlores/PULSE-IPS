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
  - [Consentimento LGPD](#10-consentimento-lgpd)
  - [Denúncias anônimas](#11-denúncias-anônimas)
  - [Documentos](#12-documentos)
  - [PGR](#13-pgr)
  - [Faturamento e assinatura (Stripe)](#14-faturamento-e-assinatura-stripe)
  - [Super Admin](#15-super-admin)
  - [Convite de usuários](#16-convite-de-usuários)
  - [Timezone e expediente](#17-timezone-e-expediente)

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
| `survey-dispatcher` | Dispara pesquisas para funcionários ativos |
| `adherence-checker` | Verifica aderência de dispatches com 48h |
| `alert-detector` | Detecta scores baixos e gera alertas |
| `employee-unpause` | Despausa funcionários após o período de pausa |
| `pgr-review-reminder` | Envia lembrete de revisão do PGR por e-mail |
| `stripe-webhook-retry` | Reprocessa webhooks do Stripe que falharam |
| `token-cleanup` | Remove tokens de resposta expirados |

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

| Job | Cron |
|---|---|
| `survey-dispatcher` | A cada 15 minutos |
| `adherence-checker` | A cada hora |
| `alert-detector` | Diariamente às 03:00 |
| `employee-unpause` | Diariamente às 01:00 |
| `pgr-review-reminder` | Diariamente às 08:00 |
| `stripe-webhook-retry` | A cada hora |
| `token-cleanup` | Diariamente às 02:00 |

---

## Jobs agendados (Cron)

Os endpoints abaixo são chamados pelo próprio scheduler interno (via BullMQ). Em produção, os schedules são registrados no Redis e o worker os consome. Em ambientes sem worker, eles também podem ser chamados diretamente por um agendador externo (GitHub Actions, etc.) com o header de autenticação.

Todos os endpoints exigem o header `x-cron-secret: <CRON_SECRET>`.

| Endpoint | Método | Descrição |
|---|---|---|
| `/api/jobs/survey-dispatcher` | POST | Dispara pesquisas agendadas |
| `/api/jobs/adherence-checker` | POST | Verifica aderência de respostas |
| `/api/jobs/alert-detector` | POST | Gera alertas de scores baixos |
| `/api/jobs/employee-unpause` | POST | Despausa funcionários com data vencida |
| `/api/jobs/pgr-review-reminder` | POST | Envia lembretes de revisão do PGR |
| `/api/jobs/stripe-webhook-retry` | POST | Reprocessa webhooks Stripe com falha |
| `/api/jobs/token-cleanup` | POST | Remove tokens expirados do banco |

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
TWILIO_PHONE_NUMBER="+5511999999999"

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
│   ├── (auth)/                 # Login, logout, senha, checkout, termos
│   ├── (onboarding)/           # Aceitar convite
│   ├── (public)/               # Survey, consent, report anônimo (sem auth)
│   ├── (tenant)/               # Área logada da organização
│   ├── (super-admin)/          # Área logada do super admin
│   ├── (super-admin-public)/   # Login do super admin
│   └── api/
│       ├── jobs/               # Endpoints dos cron jobs
│       └── webhooks/stripe/    # Webhook de pagamento
│
├── modules/                    # Lógica de negócio por domínio
│   ├── auth/                   # Autenticação, sessão, convites
│   ├── billing/                # Assinaturas, planos, webhooks Stripe
│   ├── employees/              # Funcionários, importação CSV
│   ├── surveys/                # Configuração, disparo, respostas
│   ├── alerts/                 # Detecção e gestão de alertas
│   ├── action-plans/           # Planos de ação e tarefas
│   ├── documents/              # Documentos e versões
│   ├── pgr/                    # Revisões do PGR
│   ├── consent/                # Consentimento LGPD
│   ├── anonymous-reports/      # Denúncias anônimas
│   ├── organizations/          # Dados e configurações da organização
│   ├── departments/            # Departamentos
│   ├── plans/                  # Planos de assinatura
│   ├── terms/                  # Termos da plataforma
│   └── audit/                  # Logs de auditoria
│
├── libs/
│   ├── db/                     # Instância singleton do Prisma
│   ├── auth/                   # Permissões e roles
│   ├── queue/                  # BullMQ: criação de filas e workers
│   ├── integrations/           # Adapters: email, messaging, billing, pdf
│   ├── email-templates/        # Templates React Email
│   ├── design-system/          # Componentes, tokens de design
│   ├── errors/                 # AppError
│   └── utils/                  # date, slug, pagination, action-result
│
├── components/ui/              # Componentes shadcn/ui
├── workers/                    # job-worker.ts e register-schedules.ts
├── cli/seed/                   # Seed do banco
├── env.ts                      # Validação de variáveis de ambiente (t3-env)
└── proxy.ts                    # Middleware de autenticação (Next.js)
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

**Checkout (nova organização):**
1. Usuário acessa `/checkout` e preenche nome da empresa, nome pessoal, e-mail, senha e seleciona um plano.
2. A action `checkoutAction` verifica se o e-mail já está em uso.
3. Cria a `Organization` (com slug gerado a partir do nome), o `OrganizationUser` como `admin` e uma sessão JWT.
4. Se `BILLING_PROVIDER=stripe`, cria um customer no Stripe e inicia o fluxo de checkout (Stripe Checkout Session).
5. Se `BILLING_PROVIDER=fake`, marca a organização como `active` diretamente.
6. Após pagamento confirmado (webhook Stripe `checkout.session.completed`), a organização é ativada.

**Aceitar Termos:**
1. Na primeira vez que o usuário faz login, é redirecionado para `/accept-terms`.
2. Exibe a versão ativa dos Termos de Uso (tabela `platform_terms_versions`).
3. Ao aceitar, registra `PlatformTermsAcceptance` com `userId`, `termsVersionId`, IP e User-Agent.
4. Redireciona para `/dashboard`.

---

### 3. Gestão de funcionários

**Cadastro manual:**
1. Usuário preenche nome, telefone, e-mail (opcional), departamento e horário de trabalho (`workStartTime`, `workEndTime`).
2. A action `createEmployeeAction` lê `tenantId` da sessão e cria o funcionário no banco.
3. Dispara a action de consentimento: cria um `EmployeeConsent` com `event = "invite_sent"` e um token temporário.
4. Envia SMS/WhatsApp para o funcionário com o link de consentimento `/consent/[token]`.

**Importação CSV:**
1. Usuário faz upload de um arquivo `.csv` com as colunas: `name`, `email`, `phone`, `department`, `work_start_time`, `work_end_time`.
2. A action `importEmployeesAction` lê `tenantId` da sessão (nunca do cliente).
3. Para cada linha válida: busca ou cria o departamento, cria o funcionário.
4. Retorna um relatório com linhas importadas, ignoradas e erros.

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
   - **Dias de trabalho**: números de 0 (domingo) a 6 (sábado), separados por vírgula (ex: `1,2,3,4,5`)
   - **Perguntas**: lista de questões com score de 1 a 5
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
  │           ├── Cria SurveyResponseToken por funcionário (expira em 24h)
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
```
Pulse: Seu check-in diário está pronto. Por favor, responda em 2 minutos:
https://app.usepulse.com.br/survey/[token]
```

---

### 6. Resposta à pesquisa (funcionário)

1. Funcionário recebe o link `/survey/[token]` por SMS/WhatsApp.
2. A página valida o token: verifica existência, `usedAt = null`, `expiresAt > now()`.
3. Verifica se o funcionário está dentro do horário de expediente configurado (usando `workStartTime`/`workEndTime` salvos no token no momento do disparo).
4. Exibe as perguntas da pesquisa (scores de 1 a 5).
5. Ao submeter, a action:
   - Cria `SurveyResponse` com os itens.
   - Marca o token como usado (`usedAt = now()`).
   - Atualiza `SurveyDispatch.totalResponses++`.
6. O funcionário vê uma tela de agradecimento.

> O horário verificado no momento da resposta usa o `workStartTime`/`workEndTime` **snapshot** salvo no token, não a configuração atual. Isso garante consistência mesmo que a config seja alterada após o disparo.

---

### 7. Verificação de aderência

O job `adherence-checker` (a cada hora) verifica dispatches com mais de 48 horas:

1. Busca `SurveyDispatch` com `adherenceCheckedAt = null` e `dispatchedAt < now() - 48h`.
2. Para cada dispatch, conta as respostas recebidas.
3. Calcula: `adherenceRate = totalResponses / totalRecipients`.
4. Se `adherenceRate < 0.5` (menos de 50% de respostas), cria um `Alert` do tipo `low_adherence` para o departamento.
5. Marca o dispatch com `adherenceCheckedAt = now()` e `totalResponses` atualizado.

---

### 8. Detecção de alertas

O job `alert-detector` (diariamente às 03:00) analisa respostas recentes:

1. Busca `SurveyResponse` das últimas 48 horas com scores baixos (média ≤ 2).
2. Agrupa por departamento.
3. Para cada departamento com score médio abaixo do threshold, cria um `Alert` com `severity = "high"` ou `severity = "medium"`.
4. Alertas são exibidos na tela `/alerts` para o admin.
5. Admin pode marcar alertas como lidos ou resolvidos.

---

### 9. Planos de ação

1. Admin cria um plano de ação em `/action-plans/new` com título, descrição, prioridade (`low`, `medium`, `high`) e data limite.
2. Dentro do plano, cria tarefas individuais com responsável e prazo.
3. Status do plano: `open` → `in_progress` → `completed`.
4. Ao marcar como concluído, `completedAt` é registrado automaticamente.
5. Planos de ação costumam ser criados em resposta a alertas de saúde ou ao PGR.

---

### 10. Consentimento LGPD

O fluxo de consentimento garante que a coleta de dados de saúde dos funcionários seja juridicamente válida:

1. Ao cadastrar um funcionário, um registro de `EmployeeConsent` é criado com `event = "invite_sent"` e um token temporário.
2. O funcionário recebe um link `/consent/[token]` por SMS/WhatsApp.
3. Ao acessar, vê o texto dos Termos de Consentimento (versão ativa de `consent_term_versions`).
4. Pode aceitar ou recusar:
   - **Aceitar**: cria um novo `EmployeeConsent` com `event = "accepted"`, registra hash do CPF (opcional) e fonte.
   - **Recusar**: cria um registro com `event = "refused"`.
5. O token é inativado após o uso.
6. O histórico de consentimentos é imutável e auditável.

---

### 11. Denúncias anônimas

1. Qualquer pessoa com o slug da organização pode acessar `/report/[orgSlug]`.
2. Preenche um formulário com categoria e descrição da denúncia.
3. A action cria um `AnonymousReport` **sem qualquer vínculo com usuário ou funcionário**.
4. Admin visualiza as denúncias em `/reports`, pode alterar o status (`open` → `analyzing` → `resolved` → `archived`) e registrar resolução.

---

### 12. Documentos

1. Admin faz upload de documentos (SST, PPRA, PCMSO, etc.) em `/documents`.
2. Cada documento tem um tipo e pode ter múltiplas versões (`DocumentVersion`).
3. Ao subir uma nova versão, a anterior é mantida no histórico.
4. Documentos com `isActive = false` são arquivados mas não excluídos.

---

### 13. PGR

1. Admin acessa `/pgr` para gerenciar as revisões do Programa de Gerenciamento de Riscos.
2. Cada `PgrReview` tem um período, URL do arquivo, status (`pending` → `generated` → `reviewed`) e data da próxima revisão.
3. O job `pgr-review-reminder` (diariamente às 08:00) verifica reviews com `nextReviewAt <= now()` e envia e-mail de lembrete para os admins da organização.
4. A geração do documento PDF é feita via `@react-pdf/renderer`.

---

### 14. Faturamento e assinatura (Stripe)

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
| `customer.subscription.deleted` | Marca como `canceled` |
| `invoice.payment_failed` | Marca como `past_due`, envia e-mail |
| `invoice.payment_succeeded` | Atualiza período atual |

**Idempotência dos webhooks:**
- Cada evento é salvo em `billing_webhook_events` pelo `externalEventId`.
- Ao processar, verifica se o evento já foi processado. Se sim, ignora.
- O job `stripe-webhook-retry` (a cada hora) reprocessa eventos com `error != null` e `processedAt = null`.

**Snapshot de plano:**
- Ao criar a assinatura, os dados do plano (nome, max employees, preço, intervalo) são copiados (snapshot) para `OrganizationSubscription`.
- Isso garante que mudanças futuras de plano não afetam assinaturas existentes até o próximo ciclo.

---

### 15. Super Admin

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

### 16. Convite de usuários

1. Admin acessa `/settings` → Gerenciamento de equipe.
2. Informa o e-mail e role (`admin` ou `rh`) do novo usuário.
3. A action cria um `OrganizationInvitation` com token único (expira em 7 dias) e envia e-mail com o link `/invite/[token]`.
4. O convidado acessa o link, define sua senha e aceita os termos.
5. A action cria o `OrganizationUser`, marca o convite como usado (`usedAt = now()`) e cria a sessão.

---

### 17. Timezone e expediente

**Princípio:**
- Todas as datas e horas são armazenadas no banco em **UTC+0**.
- O frontend e o worker convertem para o timezone da organização na hora de exibir ou de tomar decisões.

**Timezone da organização:**
- Armazenado em `organizations.timezone` (ex: `"America/Sao_Paulo"`).
- Padrão: `"America/Sao_Paulo"` (UTC-3).
- Configurável em `/settings`.

**Horário de expediente:**
- Configurado por departamento em `SurveyConfiguration` (`workStartTime`, `workEndTime`, `workDays`).
- Pode ser sobrescrito por funcionário (`Employee.workStartTime`, `Employee.workEndTime`).
- O horário do funcionário tem precedência sobre o do departamento.

**No disparo de pesquisas:**
1. O worker verifica se o dia atual (no timezone da organização) é um dia de trabalho (`workDays`).
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

## Fluxogramas

Cole o bloco abaixo no [Mermaid Live Editor](https://mermaid.live) para visualizar o diagrama completo de todos os fluxos.

```mermaid
flowchart TD

%% ══════════════════════════════════════════════════════════════════
%% ATORES
%% ══════════════════════════════════════════════════════════════════

    ACTOR_SA(["👤 Super Admin"])
    ACTOR_ADM(["👤 Admin da Org"])
    ACTOR_RH(["👤 RH"])
    ACTOR_EMP(["👤 Funcionário"])
    ACTOR_PUB(["👤 Público"])

%% ══════════════════════════════════════════════════════════════════
%% MIDDLEWARE — PROTEÇÃO DE ROTAS
%% ══════════════════════════════════════════════════════════════════

    subgraph PROXY["Middleware — proxy.ts"]
        PX_REQ{"Rota pública?\n/login /survey /consent\n/report /checkout /invite\n/accept-terms /learn-more\n/api/webhooks /api/jobs"}
        PX_SA_CHECK{"Rota\n/super-admin?"}
        PX_SA_COOKIE{"Cookie\npulse_super_admin_session\npresente?"}
        PX_SA_JWT{"JWT\nválido?"}
        PX_ORG_COOKIE{"Cookie\npulse_session\npresente?"}
        PX_ORG_JWT{"JWT\nválido?"}
        PX_OK["Passa — injeta\nx-tenant-id no header"]
        PX_REDIR_SA["Redirect\n/super-admin/login"]
        PX_REDIR_ORG["Redirect /login"]
        PX_FREE["Passa sem\nverificação"]
    end

    PX_REQ -- Sim --> PX_FREE
    PX_REQ -- Não --> PX_SA_CHECK
    PX_SA_CHECK -- Sim --> PX_SA_COOKIE
    PX_SA_COOKIE -- Não --> PX_REDIR_SA
    PX_SA_COOKIE -- Sim --> PX_SA_JWT
    PX_SA_JWT -- Não --> PX_REDIR_SA
    PX_SA_JWT -- Sim --> PX_OK
    PX_SA_CHECK -- Não --> PX_ORG_COOKIE
    PX_ORG_COOKIE -- Não --> PX_REDIR_ORG
    PX_ORG_COOKIE -- Sim --> PX_ORG_JWT
    PX_ORG_JWT -- Não --> PX_REDIR_ORG
    PX_ORG_JWT -- Sim --> PX_OK

%% ══════════════════════════════════════════════════════════════════
%% SUPER ADMIN
%% ══════════════════════════════════════════════════════════════════

    subgraph SA_FLOW["Super Admin"]
        SA_LOGIN["/super-admin/login\ne-mail + senha"]
        SA_BCRYPT{"bcrypt\nválido?"}
        SA_JWT["Cria JWT adminId\nCookie pulse_super_admin_session 7d"]
        SA_DASH["/super-admin/dashboard\nMétricas gerais da plataforma"]

        subgraph SA_PLANS["Planos e Preços"]
            SAP_LIST["/super-admin/plans\nListar todos os planos"]
            SAP_NEW["/super-admin/plans/new"]
            SAP_CREATE["Cria Plan\nnome, descrição, maxEmployees"]
            SAP_PRICE["Cria PlanPrice\npriceInCents, interval\nexternalPriceId Stripe"]
            SAP_TOGGLE["Ativar / Desativar plano\nisActive toggle"]
        end

        subgraph SA_ORGS["Organizações"]
            SAO_LIST["/super-admin/organizations\nListar todas as orgs"]
            SAO_DETAIL["/super-admin/organizations/id\nFuncionários, dispatches, alertas"]
            SAO_OVERRIDE["Override maxEmployees\nmaxEmployeesOverride"]
            SAO_BILLING["/organizations/id/billing\nHistórico de assinatura e webhooks"]
        end

        subgraph SA_TERMS["Termos de Uso da Plataforma"]
            SAT_LIST["/super-admin/terms\nListar versões"]
            SAT_NEW["Criar nova versão\nversion + title + content HTML"]
            SAT_ACTIVATE["Ativa nova versão\nDesativa versão anterior automaticamente"]
            SAT_NOTE["Usuários existentes devem aceitar\nna próxima sessão"]
        end

        SA_EXPORT["/api/super-admin/export\nGera Excel com métricas\nde todas as organizações"]
    end

    ACTOR_SA --> SA_LOGIN --> SA_BCRYPT
    SA_BCRYPT -- Não --> SA_LOGIN
    SA_BCRYPT -- Sim --> SA_JWT --> SA_DASH
    SA_DASH --> SAP_LIST & SAO_LIST & SAT_LIST & SA_EXPORT
    SAP_LIST --> SAP_NEW --> SAP_CREATE --> SAP_PRICE
    SAP_LIST --> SAP_TOGGLE
    SAO_LIST --> SAO_DETAIL --> SAO_OVERRIDE & SAO_BILLING
    SAT_LIST --> SAT_NEW --> SAT_ACTIVATE --> SAT_NOTE

%% ══════════════════════════════════════════════════════════════════
%% AUTENTICAÇÃO E ONBOARDING DA ORGANIZAÇÃO
%% ══════════════════════════════════════════════════════════════════

    subgraph AUTH_FLOW["Autenticação e Onboarding da Organização"]

        subgraph CHECKOUT_FLOW["Checkout — Nova Organização"]
            CO_PG["/checkout"]
            CO_FILL["Nome org, nome, e-mail, senha\nSeleciona plano"]
            CO_EMAIL{"E-mail já\ncadastrado?"}
            CO_ERR_EMAIL["Erro: e-mail em uso"]
            CO_ORG["Cria Organization + slug único"]
            CO_USER["Cria OrganizationUser\nrole=admin"]
            CO_BILLING{"BILLING_PROVIDER?"}
            CO_STRIPE_CS["Stripe: createCustomer()\nCria Checkout Session"]
            CO_STRIPE_REDIRECT["Redirect Stripe Checkout"]
            CO_STRIPE_PAID["Pagamento confirmado pelo usuário"]
            CO_FAKE["Fake: billingStatus=active direto"]
        end

        subgraph LOGIN_FLOW["Login"]
            LG_PG["/login\ne-mail + senha"]
            LG_BCRYPT{"bcrypt\nválido?"}
            LG_ERR["Erro: credenciais inválidas"]
            LG_TERMS{"Termos da plataforma\nacceitos?"}
            LG_JWT["Cria JWT HS256\nuserId + tenantId + role\nExpira em 7 dias"]
            LG_COOKIE["Cookie pulse_session\nHttpOnly, SameSite=Lax, Secure prod"]
        end

        subgraph TERMS_FLOW["Aceitar Termos da Plataforma"]
            AT_PG["/accept-terms"]
            AT_SHOW["Exibe versão ativa\nPlatformTermsVersion"]
            AT_ACCEPT["Registra PlatformTermsAcceptance\nuserId + termsVersionId + IP + UserAgent"]
        end

        subgraph FORGOT_FLOW["Recuperação de Senha"]
            FP_PG["/forgot-password\nInforma e-mail"]
            FP_TOKEN["Gera AuthToken\ntype=password_reset, expira 1h"]
            FP_EMAIL_SEND["Envia e-mail com link\n/reset-password/token"]
            FP_NEW_PG["/reset-password/token\nInforma nova senha"]
            FP_VALID{"Token válido?\nnão expirado?\nnão usado?"}
            FP_UPDATE["Atualiza passwordHash\nusedAt=now()"]
            FP_ERR["Erro: token inválido"]
        end

        subgraph INVITE_FLOW["Convite de Equipe (Admin)"]
            INV_FORM["Admin informa e-mail + role\nadmin | rh"]
            INV_CREATE_REC["Cria OrganizationInvitation\ntoken UUID, expira 7d"]
            INV_EMAIL_SEND["Envia e-mail\ncom link /invite/token"]
            INV_PG["/invite/token\nConvidado acessa link"]
            INV_VALID{"Token válido?\nnão expirado?\nnão usado?"}
            INV_ERR["Erro: convite inválido ou expirado"]
            INV_PWD["Define senha"]
            INV_USER["Cria OrganizationUser\nMarca convite usedAt=now()"]
        end

        AUTH_LOGOUT["Logout\nApaga cookie pulse_session\nRedirect /login"]
        AUTH_DASH["/dashboard"]
    end

    ACTOR_ADM --> CO_PG --> CO_FILL --> CO_EMAIL
    CO_EMAIL -- Sim --> CO_ERR_EMAIL
    CO_EMAIL -- Não --> CO_ORG --> CO_USER --> CO_BILLING
    CO_BILLING -- stripe --> CO_STRIPE_CS --> CO_STRIPE_REDIRECT --> CO_STRIPE_PAID --> AT_PG
    CO_BILLING -- fake --> CO_FAKE --> AT_PG
    AT_PG --> AT_SHOW --> AT_ACCEPT --> AUTH_DASH

    ACTOR_ADM --> LG_PG
    ACTOR_RH --> LG_PG
    LG_PG --> LG_BCRYPT
    LG_BCRYPT -- Não --> LG_ERR
    LG_BCRYPT -- Sim --> LG_TERMS
    LG_TERMS -- Não --> AT_PG
    LG_TERMS -- Sim --> LG_JWT --> LG_COOKIE --> AUTH_DASH

    AUTH_DASH --> AUTH_LOGOUT

    FP_PG --> FP_TOKEN --> FP_EMAIL_SEND --> FP_NEW_PG --> FP_VALID
    FP_VALID -- Não --> FP_ERR
    FP_VALID -- Sim --> FP_UPDATE --> LG_PG

    INV_FORM --> INV_CREATE_REC --> INV_EMAIL_SEND --> INV_PG --> INV_VALID
    INV_VALID -- Não --> INV_ERR
    INV_VALID -- Sim --> INV_PWD --> INV_USER --> AT_PG

%% ══════════════════════════════════════════════════════════════════
%% GESTÃO DE FUNCIONÁRIOS
%% ══════════════════════════════════════════════════════════════════

    subgraph EMP_FLOW["Gestão de Funcionários"]
        EMP_LIST["/employees\nListar funcionários ativos"]

        subgraph EMP_CREATE["Cadastro Manual"]
            EC_PG["/employees/new"]
            EC_FILL["nome, telefone, e-mail opcional\ndepartamento\nworkStartTime, workEndTime"]
            EC_ACTION["createEmployeeAction()\nLê tenantId da sessão JWT"]
            EC_DB["Cria Employee status=active"]
            EC_CONSENT_INIT["Cria EmployeeConsent\nevent=invite_sent + token temporário"]
            EC_MSG_Q["Enfileira SMS/WhatsApp\n→ /consent/token"]
        end

        subgraph EMP_IMPORT["Importação em Lote (CSV)"]
            IM_PG["/employees/import"]
            IM_UPLOAD["Upload .csv\ncolunas: name, email, phone\ndepartment, work_start_time, work_end_time"]
            IM_ACTION["importEmployeesAction()\nLê tenantId da sessão JWT"]
            IM_LOOP["Processa linha a linha"]
            IM_DEPT{"Departamento\nexiste?"}
            IM_DEPT_CREATE["Cria Department"]
            IM_EMP_CREATE["Cria Employee"]
            IM_REPORT["Retorna relatório:\nimportados / ignorados / erros"]
        end

        subgraph EMP_DETAIL["Perfil do Funcionário"]
            ED_PG["/employees/id"]
            ED_EDIT["Editar nome, telefone, e-mail\nhorário, departamento"]
            ED_PAUSE_SET["Definir pauseStartAt + pauseEndAt\nstatus → paused"]
            ED_SURVEY_HIST["Ver histórico de pesquisas"]
            ED_CONSENT_HIST["Ver histórico de consentimentos"]
        end

        subgraph EMP_UNPAUSE["Reativação Automática"]
            EU_CRON["Cron: employee-unpause\ndiariamente 01:00"]
            EU_QUERY["Busca employees\npauseEndAt <= now() AND status=paused"]
            EU_REACTIVATE["status → active"]
        end
    end

    AUTH_DASH --> EMP_LIST
    EMP_LIST --> EC_PG & IM_PG & ED_PG
    EC_PG --> EC_FILL --> EC_ACTION --> EC_DB --> EC_CONSENT_INIT --> EC_MSG_Q
    IM_PG --> IM_UPLOAD --> IM_ACTION --> IM_LOOP --> IM_DEPT
    IM_DEPT -- Não --> IM_DEPT_CREATE --> IM_EMP_CREATE
    IM_DEPT -- Sim --> IM_EMP_CREATE --> IM_REPORT
    ED_PG --> ED_EDIT & ED_PAUSE_SET & ED_SURVEY_HIST & ED_CONSENT_HIST
    EU_CRON --> EU_QUERY --> EU_REACTIVATE

%% ══════════════════════════════════════════════════════════════════
%% CONSENTIMENTO LGPD
%% ══════════════════════════════════════════════════════════════════

    subgraph CONSENT_FLOW["Consentimento LGPD (Funcionário)"]
        CN_RECEIVE["Funcionário recebe SMS/WhatsApp\ncom link /consent/token"]
        CN_PG["/consent/token"]
        CN_VALID{"Token existe?\nnão expirado?"}
        CN_ERR["Erro: link inválido ou expirado"]
        CN_SHOW["Exibe texto da ConsentTermVersion ativa\nversão vigente dos termos de coleta"]
        CN_DECISION{"Funcionário\ndecide?"}
        CN_ACCEPT["Cria EmployeeConsent\nevent=accepted\ncpfHash opcional + fonte"]
        CN_REFUSE["Cria EmployeeConsent\nevent=refused"]
        CN_INVALIDATE["Inativa token de consentimento"]
        CN_AUDIT["Histórico imutável e auditável\n(base legal LGPD)"]
    end

    EC_MSG_Q --> CN_RECEIVE
    CN_RECEIVE --> CN_PG --> CN_VALID
    CN_VALID -- Não --> CN_ERR
    CN_VALID -- Sim --> CN_SHOW --> CN_DECISION
    CN_DECISION -- Aceitar --> CN_ACCEPT --> CN_INVALIDATE
    CN_DECISION -- Recusar --> CN_REFUSE --> CN_INVALIDATE
    CN_INVALIDATE --> CN_AUDIT

%% ══════════════════════════════════════════════════════════════════
%% CONFIGURAÇÃO DE PESQUISA
%% ══════════════════════════════════════════════════════════════════

    subgraph SURVEY_CFG["Configuração de Pesquisa (Admin/RH)"]
        SV_LIST["/surveys\nHistórico de dispatches"]
        SV_CFG_PG["/surveys/configure"]
        SV_CFG_DEPT["Seleciona departamento"]
        SV_CFG_FREQ["Define frequência:\ndaily / twice_weekly / weekly\nbiweekly / monthly"]
        SV_CFG_HOURS["Define expediente:\nworkStartTime HH:mm\nworkEndTime HH:mm"]
        SV_CFG_DAYS["Define dias de trabalho:\nworkDays ex: 1,2,3,4,5\n0=Dom 1=Seg … 6=Sáb"]
        SV_CFG_QS["Adiciona perguntas\ncom texto e ordem"]
        SV_CFG_SAVE["Salva SurveyConfiguration\nUNIQUE por tenantId + departmentId"]
        SV_MANUAL["Disparo manual\nCria SurveyDispatch\nstatus=scheduled, scheduledAt=now()"]
    end

    AUTH_DASH --> SV_LIST & SV_CFG_PG
    SV_CFG_PG --> SV_CFG_DEPT --> SV_CFG_FREQ --> SV_CFG_HOURS --> SV_CFG_DAYS --> SV_CFG_QS --> SV_CFG_SAVE
    SV_LIST --> SV_MANUAL

%% ══════════════════════════════════════════════════════════════════
%% DISPARO AUTOMÁTICO (CRON + FILA)
%% ══════════════════════════════════════════════════════════════════

    subgraph DISPATCH_FLOW["Disparo de Pesquisas — Cron + BullMQ"]

        subgraph SCHEDULES["register-schedules.ts (executa uma vez ao iniciar)"]
            SCH_CONNECT["Conecta ao Redis"]
            SCH_CLEAR["Remove schedules existentes"]
            SCH_REG["Registra jobs na fila pulse:jobs\ncom padrão cron"]
        end

        subgraph CRON_JOB["Cron: survey-dispatcher (a cada 15 min)"]
            CR_TRIGGER["BullMQ dispara job survey-dispatcher"]
            CR_AUTO["runAutoDispatchScheduler()\nBusca SurveyConfigurations ativas\ncom employees ativos"]
            CR_WORKDAY{"Hoje é dia de trabalho?\n(verifica workDays no timezone da org)"}
            CR_SKIP_DAY["Pula esta execução"]
            CR_INTERVAL{"Dias desde último dispatch\n>= intervalo da frequência?"}
            CR_SKIP_FREQ["Pula — ainda não é hora"]
            CR_MANUAL_FETCH["runSurveyDispatcher()\nBusca SurveyDispatch status=scheduled"]
            CR_FIRE["fireDispatch()"]
            CR_DISPATCH_DB["Cria SurveyDispatch\nstatus=sent, dispatchedAt=now()"]
            CR_TOKENS_DB["Cria SurveyResponseToken por employee\ntoken UUID, expira em 24h\nSnapshot workStartTime/workEndTime do token"]
            CR_MARK_SENT["markDispatchSent(totalRecipients)"]
            CR_ENQUEUE_MSG["Enfileira job send-message\nna fila pulse:messages\n(1 job por funcionário)"]
        end

        subgraph MSG_WORKER["Worker: pulse:messages"]
            MW_PROC["processMessageJob(data)"]
            MW_PROVIDER{"MESSAGING_PROVIDER?"}
            MW_TWILIO["TwilioSMS.send(to, body)"]
            MW_WA["WhatsAppCloud.send(to, body)"]
            MW_CONSOLE["Console: log no terminal\n(modo dev)"]
            MW_LOG["Registra MessageLog\ntenant + employee + type + status"]
            MW_CONTENT["SMS/WhatsApp enviado:\nPulse: Seu check-in está pronto.\nhttps://app.usepulse.com.br/survey/TOKEN"]
        end
    end

    SCH_CONNECT --> SCH_CLEAR --> SCH_REG --> CR_TRIGGER
    SV_CFG_SAVE --> CR_TRIGGER
    SV_MANUAL --> CR_MANUAL_FETCH

    CR_TRIGGER --> CR_AUTO --> CR_WORKDAY
    CR_WORKDAY -- Não --> CR_SKIP_DAY
    CR_WORKDAY -- Sim --> CR_INTERVAL
    CR_INTERVAL -- Não --> CR_SKIP_FREQ
    CR_INTERVAL -- Sim --> CR_FIRE
    CR_MANUAL_FETCH --> CR_FIRE
    CR_FIRE --> CR_DISPATCH_DB --> CR_TOKENS_DB --> CR_MARK_SENT --> CR_ENQUEUE_MSG

    CR_ENQUEUE_MSG --> MW_PROC --> MW_PROVIDER
    MW_PROVIDER -- twilio_sms --> MW_TWILIO --> MW_CONTENT --> MW_LOG
    MW_PROVIDER -- whatsapp_cloud --> MW_WA --> MW_CONTENT
    MW_PROVIDER -- console --> MW_CONSOLE --> MW_LOG

%% ══════════════════════════════════════════════════════════════════
%% RESPOSTA À PESQUISA (FUNCIONÁRIO)
%% ══════════════════════════════════════════════════════════════════

    subgraph RESP_FLOW["Resposta à Pesquisa — Funcionário"]
        RESP_RECEIVE["Funcionário recebe SMS/WhatsApp\ncom link único"]
        RESP_PG["/survey/token"]
        RESP_TOKEN_V{"Token existe?\nexpiresAt > now?\nusedAt = null?"}
        RESP_TOKEN_ERR["Página de erro:\nlink inválido ou expirado"]
        RESP_HOURS_V{"Hora atual está dentro\ndo expediente?\n(workStartTime/workEndTime do token\nno timezone da org)"}
        RESP_HOURS_ERR["Fora do expediente:\nexibe horário disponível"]
        RESP_FORM["Exibe perguntas da pesquisa\nScore 1–5 por pergunta"]
        RESP_SUBMIT["Funcionário responde e envia"]
        RESP_RESPONSE["Cria SurveyResponse\n+ SurveyResponseItem por pergunta"]
        RESP_TOKEN_USED["Marca token usedAt=now()"]
        RESP_DISPATCH_INC["SurveyDispatch.totalResponses++"]
        RESP_THANKS["Tela de agradecimento"]
    end

    MW_CONTENT --> RESP_RECEIVE --> RESP_PG --> RESP_TOKEN_V
    RESP_TOKEN_V -- Não --> RESP_TOKEN_ERR
    RESP_TOKEN_V -- Sim --> RESP_HOURS_V
    RESP_HOURS_V -- Não --> RESP_HOURS_ERR
    RESP_HOURS_V -- Sim --> RESP_FORM --> RESP_SUBMIT --> RESP_RESPONSE --> RESP_TOKEN_USED --> RESP_DISPATCH_INC --> RESP_THANKS

%% ══════════════════════════════════════════════════════════════════
%% VERIFICAÇÃO DE ADERÊNCIA
%% ══════════════════════════════════════════════════════════════════

    subgraph ADH_FLOW["Cron: adherence-checker (a cada hora)"]
        ADH_QUERY["Busca SurveyDispatch\nadherenceCheckedAt = null\ndispatchedAt < now - 48h"]
        ADH_COUNT["Conta respostas recebidas\npor dispatch"]
        ADH_RATE["adherenceRate =\ntotalResponses / totalRecipients"]
        ADH_CHECK{"adherenceRate\n< 50%?"}
        ADH_ALERT_CREATE["Cria Alert\ntipo: low_adherence\nseverity: medium\npara o departamento"]
        ADH_MARK["Atualiza adherenceCheckedAt=now()\ntotalResponses"]
    end

    CR_MARK_SENT -->|"48h depois"| ADH_QUERY
    ADH_QUERY --> ADH_COUNT --> ADH_RATE --> ADH_CHECK
    ADH_CHECK -- Sim --> ADH_ALERT_CREATE --> ADH_MARK
    ADH_CHECK -- Não --> ADH_MARK

%% ══════════════════════════════════════════════════════════════════
%% DETECÇÃO DE ALERTAS DE SCORE
%% ══════════════════════════════════════════════════════════════════

    subgraph ALERT_DETECT["Cron: alert-detector (03:00 diário)"]
        AL_QUERY["Busca SurveyResponseItems\ndas últimas 48h"]
        AL_AVG["Calcula score médio\npor departamento"]
        AL_CHECK{"Score médio\n<= threshold critico?"}
        AL_HIGH["Cria Alert severity=high"]
        AL_MED_CHECK{"Score médio\n<= threshold moderado?"}
        AL_MED["Cria Alert severity=medium"]
        AL_OK["Nenhum alerta necessário"]
    end

    subgraph ALERT_MGMT["Gestão de Alertas (Admin/RH)"]
        ALM_LIST["/alerts\nListar alertas ativos"]
        ALM_READ["Marcar como lido\nisRead=true"]
        ALM_RESOLVE["Marcar como resolvido\nresolvedAt=now()"]
        ALM_FILTER["Filtrar por severity\ntipo e status"]
        ALM_AP["Criar Plano de Ação\na partir do alerta"]
    end

    RESP_RESPONSE -->|"diariamente 03h"| AL_QUERY
    AL_QUERY --> AL_AVG --> AL_CHECK
    AL_CHECK -- Sim --> AL_HIGH
    AL_CHECK -- Não --> AL_MED_CHECK
    AL_MED_CHECK -- Sim --> AL_MED
    AL_MED_CHECK -- Não --> AL_OK

    AL_HIGH & AL_MED & ADH_ALERT_CREATE --> ALM_LIST
    AUTH_DASH --> ALM_LIST
    ALM_LIST --> ALM_READ & ALM_RESOLVE & ALM_FILTER
    ALM_RESOLVE --> ALM_AP

%% ══════════════════════════════════════════════════════════════════
%% PLANOS DE AÇÃO
%% ══════════════════════════════════════════════════════════════════

    subgraph AP_FLOW["Planos de Ação (Admin/RH)"]
        AP_LIST["/action-plans\nListar planos"]
        AP_NEW["/action-plans/new"]
        AP_FILL["título, descrição\nprioridade: low | medium | high\ndata limite opcional"]
        AP_SAVE["Cria ActionPlan status=open"]
        AP_TASKS["Adiciona ActionPlanTask\nresponsável + prazo"]
        AP_DETAIL["/action-plans/id"]
        AP_STATUS_IP["Atualiza status → in_progress"]
        AP_TASK_DONE["Tarefa concluída\ncompletedAt=now()"]
        AP_COMPLETE["Plano concluído\nstatus=completed, completedAt=now()"]
    end

    AUTH_DASH --> AP_LIST
    ALM_AP --> AP_NEW
    AP_LIST --> AP_NEW --> AP_FILL --> AP_SAVE --> AP_TASKS
    AP_LIST --> AP_DETAIL
    AP_DETAIL --> AP_STATUS_IP --> AP_TASK_DONE --> AP_COMPLETE

%% ══════════════════════════════════════════════════════════════════
%% DOCUMENTOS
%% ══════════════════════════════════════════════════════════════════

    subgraph DOC_FLOW["Documentos (Admin/RH)"]
        DC_LIST["/documents\nListar documentos"]
        DC_ADD["Criar Document\ntítulo + tipo (SST, PPRA, PCMSO…)"]
        DC_VERSION["Upload DocumentVersion\nfileUrl + uploadedBy"]
        DC_HISTORY["Ver histórico de versões"]
        DC_NEW_VER["Adicionar nova versão\nversão anterior mantida no histórico"]
        DC_ARCHIVE["Arquivar documento\nisActive=false"]
    end

    AUTH_DASH --> DC_LIST
    DC_LIST --> DC_ADD --> DC_VERSION --> DC_HISTORY
    DC_HISTORY --> DC_NEW_VER
    DC_LIST --> DC_ARCHIVE

%% ══════════════════════════════════════════════════════════════════
%% PGR — PROGRAMA DE GERENCIAMENTO DE RISCOS
%% ══════════════════════════════════════════════════════════════════

    subgraph PGR_FLOW["PGR (Admin/RH)"]
        PG_LIST["/pgr\nListar revisões do PGR"]
        PG_CREATE["Criar PgrReview\nperíodo + arquivo PDF"]
        PG_STATUS["Atualizar status:\npending → generated → reviewed"]
        PG_NEXT["Definir nextReviewAt\ndata da próxima revisão obrigatória"]
        PG_REMINDER_CRON["Cron: pgr-review-reminder\ndiariamente 08:00\nnextReviewAt <= hoje"]
        PG_REMINDER_EMAIL["Envia e-mail de lembrete\npara todos os admins da organização"]
    end

    AUTH_DASH --> PG_LIST
    PG_LIST --> PG_CREATE --> PG_STATUS --> PG_NEXT --> PG_REMINDER_CRON --> PG_REMINDER_EMAIL

%% ══════════════════════════════════════════════════════════════════
%% DENÚNCIAS ANÔNIMAS
%% ══════════════════════════════════════════════════════════════════

    subgraph REPORT_FLOW["Denúncias Anônimas"]
        RP_PG["/report/orgSlug\nAcesso público — sem autenticação"]
        RP_FILL["Preenche: categoria + descrição da denúncia"]
        RP_CREATE["Cria AnonymousReport\nSEM vínculo com usuário ou funcionário\nAnonimato garantido"]
        RP_LIST["/reports\nAdmin/RH visualiza denúncias"]
        RP_STATUS["Atualiza status:\nopen → analyzing → resolved → archived"]
    end

    ACTOR_PUB --> RP_PG --> RP_FILL --> RP_CREATE --> RP_LIST
    AUTH_DASH --> RP_LIST
    RP_LIST --> RP_STATUS

%% ══════════════════════════════════════════════════════════════════
%% CONFIGURAÇÕES DA ORGANIZAÇÃO (ADMIN ONLY)
%% ══════════════════════════════════════════════════════════════════

    subgraph SETTINGS_FLOW["Configurações (Admin only)"]
        ST_PG["/settings"]
        ST_ORG["Editar organização:\nnome, timezone"]
        ST_PWD["Alterar senha do usuário logado"]
        ST_TEAM["Gerenciar equipe\nListar usuários ativos"]
        ST_INVITE["Convidar Admin ou RH\npor e-mail"]
        ST_REVOKE["Revogar acesso\nisActive=false"]
    end

    AUTH_DASH -->|"Admin only"| ST_PG
    ST_PG --> ST_ORG & ST_PWD & ST_TEAM
    ST_TEAM --> ST_INVITE & ST_REVOKE
    ST_INVITE --> INV_FORM

%% ══════════════════════════════════════════════════════════════════
%% FATURAMENTO E STRIPE
%% ══════════════════════════════════════════════════════════════════

    subgraph BILLING_FLOW["Faturamento e Stripe (Admin only)"]
        BL_PG["/billing"]
        BL_VIEW["Ver plano atual\nstatus + período + próxima cobrança"]
        BL_CANCEL["Cancelar ao fim do período\ncancelAtPeriodEnd=true"]
        BL_UPGRADE["Fazer upgrade de plano\nNova Checkout Session Stripe"]

        subgraph WEBHOOK_FLOW["Webhook POST /api/webhooks/stripe"]
            WH_RECEIVE["Recebe evento Stripe"]
            WH_IDEMPOTENT{"externalEventId\njá existe em\nBillingWebhookEvent?"}
            WH_IGNORE["Ignora — idempotência\nevento já processado"]
            WH_SAVE["Salva BillingWebhookEvent\nexternalEventId + type + payload"]
            WH_TYPE{"Tipo do evento?"}
            WH_CHECKOUT_EV["checkout.session.completed\nAtiva assinatura"]
            WH_UPDATED_EV["customer.subscription.updated\nAtualiza status e período"]
            WH_DELETED_EV["customer.subscription.deleted\nstatus → canceled"]
            WH_FAILED_EV["invoice.payment_failed\nstatus → past_due\nEnvia e-mail ao admin"]
            WH_PAID_EV["invoice.payment_succeeded\nAtualiza currentPeriodEnd"]
            WH_UPSERT["Cria/Atualiza OrganizationSubscription\nSnapshot: planName, maxEmployees\npriceInCents, interval"]
            WH_ORG_STATUS["Atualiza Organization.billingStatus"]
            WH_DONE["Marca processedAt=now()"]
        end

        subgraph WEBHOOK_RETRY["Cron: stripe-webhook-retry (a cada hora)"]
            WR_QUERY["Busca BillingWebhookEvent\nerror != null AND processedAt = null"]
            WR_RETRY["Reprocessa evento"]
            WR_OK{"Sucesso?"}
            WR_DONE2["Marca processedAt=now()"]
            WR_FAIL["Atualiza campo error\nincrementa tentativas"]
        end
    end

    AUTH_DASH -->|"Admin only"| BL_PG
    BL_PG --> BL_VIEW & BL_CANCEL & BL_UPGRADE
    BL_UPGRADE --> CO_STRIPE_CS

    CO_STRIPE_PAID -->|"Stripe envia webhook"| WH_RECEIVE
    WH_RECEIVE --> WH_IDEMPOTENT
    WH_IDEMPOTENT -- Sim --> WH_IGNORE
    WH_IDEMPOTENT -- Não --> WH_SAVE --> WH_TYPE
    WH_TYPE --> WH_CHECKOUT_EV & WH_UPDATED_EV & WH_DELETED_EV & WH_FAILED_EV & WH_PAID_EV
    WH_CHECKOUT_EV & WH_UPDATED_EV --> WH_UPSERT --> WH_ORG_STATUS --> WH_DONE
    WH_DELETED_EV & WH_FAILED_EV & WH_PAID_EV --> WH_ORG_STATUS

    WR_QUERY --> WR_RETRY --> WR_OK
    WR_OK -- Sim --> WR_DONE2
    WR_OK -- Não --> WR_FAIL

%% ══════════════════════════════════════════════════════════════════
%% JOBS RESTANTES (TOKEN CLEANUP)
%% ══════════════════════════════════════════════════════════════════

    subgraph OTHER_JOBS["Outros Jobs Agendados"]
        TK_CRON["Cron: token-cleanup\ndiariamente 02:00"]
        TK_DELETE["Remove SurveyResponseToken\nexpiresAt <= now() AND usedAt = null\nEvita acúmulo de tokens obsoletos"]
    end

    TK_CRON --> TK_DELETE
```
