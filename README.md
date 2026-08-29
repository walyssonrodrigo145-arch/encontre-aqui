# EncontreAqui — Marketplace de Serviços Locais

Plataforma que conecta **clientes** a **prestadores de serviços verificados**, com busca geolocalizada, orçamentos, agendamentos, avaliações, assinaturas e painel administrativo.

## 🚀 Como rodar

```bash
npm install
npm run db:push    # cria as tabelas (SQLite local em ./data/local.db)
npm run seed       # popula dados de demonstração
npm run dev        # http://localhost:3000
```

## 🔑 Contas de demonstração (senha: `123456`)

| Perfil | E-mail |
|---|---|
| Admin | admin@encontreaqui.com |
| Cliente | cliente@email.com |
| Prestador (Premium) | joao@demo.com |
| Prestador (Profissional) | carlos@demo.com |

## 🧭 Fluxo principal

**Cliente:** Buscar → Comparar → Solicitar orçamento → Agendar → Acompanhar status → Avaliar
**Prestador:** Cadastrar (8 etapas) → Ser aprovado → Assinar plano → Receber solicitações → Responder orçamentos → Gerenciar agenda → Impulsionar

## 🏗️ Stack

- **Next.js 16** (App Router, Server Actions, Turbopack) + TypeScript
- **TailwindCSS v4** (design system próprio, mobile-first, PWA)
- **SQLite (libsql) + Drizzle ORM** — portável para Postgres/PostGIS
- **Auth JWT própria** (jose + bcryptjs) com roles CUSTOMER / PROVIDER / ADMIN
- **Pagamentos:** adapter `PaymentGateway` (`src/server/services/payments.ts`) com modo demo (confirma na hora). Para produção, implemente `AsaasGateway` e aponte o webhook para `/api/webhooks/payments`.

## 📂 Estrutura

```
src/
├── app/                  # rotas (público, /app cliente, /prestador, /admin)
├── components/           # design system + formulários client
├── lib/                  # db, schema (26 tabelas), auth, utils, validações (zod)
├── server/
│   ├── actions/          # server actions por domínio (auth, quotes, appointments...)
│   ├── services/         # regras de negócio (ranking, agenda, notificações, pagamentos)
│   └── rate-limit.ts
└── db/seed.ts            # dados demo (12 prestadores em Teófilo Otoni/MG)
```

## ⚙️ Regras de negócio implementadas

- **Ranking ponderado** (serviço 30% · distância 25% · avaliações 20% · resposta 10% · perfil 10% · plano 5%) com impulsionamento limitado a +30% — pesos editáveis na tabela `ranking_config`
- **Máquina de estados** de agendamento com transições validadas e trava de slot (sem duplo agendamento)
- **Avaliações** permitidas apenas após agendamento `COMPLETED` real (UNIQUE por agendamento)
- **Isolamento de dados** por sessão em todas as server actions + rate limiting
- **Assinatura** controla limites do plano; inadimplência → `PAST_DUE`; impulsão expira via `/api/cron?token=CRON_SECRET`
- **LGPD**: consentimento no cadastro, termos/privacidade, dados sensíveis nunca públicos

## 🗺️ Roadmap pós-MVP

WhatsApp API · Push (FCM) · upload real de mídias (R2) · comissão por serviço · IA para matching · apps nativos · migração Postgres+PostGIS (queries já isoladas em `src/server/services`).
