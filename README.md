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

O job `alert-detector` (diariamente às 03:00) analisa respostas das últimas 48 horas:

1. Busca `SurveyResponse` das últimas 48 horas com os itens e a direção de cada questão (`scoreDirection`).
2. Para cada resposta, normaliza os scores: questões com `scoreDirection = "lower_is_better"` têm score invertido (`6 - raw`) antes de calcular a média. Isso garante que a escala seja sempre "maior = melhor bem-estar".
3. Agrupa médias normalizadas por departamento.
4. Para cada departamento com score médio normalizado abaixo de **3,0**, cria um `Alert` com:
   - `type = "low_score"`
   - `severity = "critical"` se score < 2,0, caso contrário `severity = "warning"`
   - Mensagem em português descrevendo o índice de bem-estar ocupacional do setor.
5. Alertas são exibidos na tela `/alerts` para o admin/RH.
6. Admin pode marcar alertas como lidos ou resolvidos.

**Tipos de alerta disponíveis:**

| Tipo | Gerado por | Significado |
|---|---|---|
| `low_score` | `alert-detector` (job) | Score de bem-estar normalizado abaixo de 3,0 |
| `low_adherence` | `adherence-checker` (job) | Menos de 80% de respostas em 48h após disparo |
| `score_drop` | Manual/futuro job | Queda no índice de bem-estar em relação ao período anterior |
| `negative_trend` | Manual/futuro job | 3 períodos consecutivos abaixo da média histórica |
| `pgr_review_due` | `pgr-review-reminder` (job) | Revisão PGR vence em até 30 dias |
| `crisis_report` | Detecção de palavras-chave | Relato anônimo com indicadores de crise |
| `no_response` | Futuro job | Nenhuma resposta recebida no ciclo |
| `consent_expired` | Futuro job | TCLE expirado ou pendente |
| `billing` | Webhook Stripe | Pendência de pagamento |
| `system` | Sistema interno | Notificações operacionais |

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
- Cada evento é salvo em `stripe_webhook_events` pelo `stripe_event_id`.
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
