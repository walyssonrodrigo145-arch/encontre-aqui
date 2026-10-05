# 💰 PLANO DE IMPLEMENTAÇÃO — ASAAS (Encontre Aqui)

**Versão:** 1.0 · **Status:** Aguardando aprovação
**Pré-requisito:** infraestrutura de pagamentos já blindada (transações, idempotência, `PAYMENTS_MODE=demo|live`, cron horário agendado)

---

## 1. DIAGNÓSTICO ATUAL (onde estamos)

| Componente | Estado |
|---|---|
| `PaymentGateway` (payments.ts) | Stub demo — gera `gatewayPaymentId` fake + PIX "DEMO" |
| `PAYMENTS_MODE=demo ou live` | Gate já existe (`isDemoPayments()`) — demo confirma na hora; live não confirma nada |
| Webhook `/api/webhooks/payments` | Token timing-safe · valida valor (tolerância 1 cent) · idempotente · erro devolve 500 (retry do gateway) |
| `confirmPayment` | Transacional, idempotente, valida `expectedAmountCents` |
| Assinatura | `createSubscriptionWithPayment` transacional + `cancelAtPeriodEnd` + período inicia na confirmação |
| Cron horário | Expira assinaturas (limpa `planId`), boosts e solicitações antigas |
| O que falta | **Conexão real com a API Asaas** (clientes, cobranças, PIX, recorrência) + fluxo "aguardando pagamento" na UI |

---

## 2. ARQUITETURA PROPOSTA

Fluxo: prestador assina → transação local cria subscription PENDING_PAYMENT + payment PENDING → `AsaasGateway` cria customer (idempotente por CPF/CNPJ) e cobrança/assinatura no Asaas com `externalReference` = id local → UI mostra QR PIX (prazo 3 dias) → cliente paga → Asaas dispara webhook → rota valida token + valor + referência → `confirmPayment` ativa tudo → renovações chegam como novas cobranças do ciclo via webhook.

`externalReference` = `gatewayPaymentId` local é a **chave da integração**: impossível confirmar cobrança de outro sistema.

---

## 3. VARIÁVEIS DE AMBIENTE (Fase 0)

- `ASAAS_API_KEY` — server-side ONLY (nunca NEXT_PUBLIC)
- `ASAAS_ENV` — `sandbox` ou `production`
- `ASAAS_WEBHOOK_TOKEN` — pode reaproveitar `PAYMENT_WEBHOOK_TOKEN` (alias)
- `PAYMENTS_MODE=live` — já existe
- `TRIAL_DAYS=30` — opcional (regra de trial)

Base URLs: sandbox `https://api-sandbox.asaas.com/v3` · produção `https://api.asaas.com/v3`
Autenticação: header `access_token: $ASAAS_API_KEY`
API key nunca vai para o client, logs ou repositório.

---

## 4. FASES DE IMPLEMENTAÇÃO

### FASE 1 — Cliente Asaas
- Novo serviço `src/server/services/asaas.ts`:
  - `asaasFetch(path, init)` — wrapper com auth, base URL por env, timeout 15s, retry com backoff em HTTP 429/5xx
  - `upsertCustomer({ name, cpfCnpj, email, phone })`: GET `/v3/customers?cpfCnpj=...` → reutiliza `id` existente; senão POST `/v3/customers`
- Anti-duplicidade: nova coluna `providers.asaas_customer_id` (índice único) + guarda local antes de chamar a API
- Migração aditiva (push seguro)

### FASE 2 — Cobrança PIX única (boosts e assinatura avulsa)
- `POST /v3/payments`: customer, `billingType: "PIX"`, `value` (reais, 2 casas), `dueDate` = hoje + 3 dias (yyyy-mm-dd, BRT), `externalReference` = id local
- `GET /v3/payments/{asaasId}/pixQrCode` → EMV copia-e-cola
- **Regra dos 3 dias:** não pago em 3 dias → cron cancela no Asaas (`DELETE /v3/payments/{id}`) e marca CANCELED local (boost volta a permitir novo)

### FASE 3 — Assinatura recorrente
- `POST /v3/subscriptions`: cycle MONTHLY, `nextDueDate` conforme trial
- Salvar `gatewaySubscriptionId` (coluna já existe)
- **Renovação automática é do Asaas:** cada ciclo gera PAYMENT_CREATED → criamos payment local PENDING → confirmação estende `currentPeriodEnd` +1 mês (já implementado no `confirmPayment`)

### FASE 4 — Webhooks (eventos reais Asaas)

| Evento | Ação no sistema |
|---|---|
| PAYMENT_CREATED | Cria payment local PENDING (renovação: localizar subscription por gatewaySubscriptionId) |
| PAYMENT_RECEIVED / PAYMENT_CONFIRMED | `confirmPayment(id, valor)` — idempotente |
| PAYMENT_OVERDUE | payment FAILED · sub PAST_DUE · planId null · notifica (cron já cobre como fallback) |
| PAYMENT_DELETED | payment CANCELED |
| PAYMENT_REFUNDED | fase futura: estorno + rebaixar plano |

### FASE 5 — UI "aguardando pagamento"
- Modo live: actions retornam `pixQrCode` + status PENDING (sem confirmar)
- Novo `PendingPaymentCard`: QR + copia-e-cola + botão "Já paguei" (router.refresh — webhook atualiza em segundos)
- Banner de pendente em /prestador/assinatura e /prestador/impulsionar (padrão do banner PAST_DUE)

### FASE 6 — Cartão de crédito (opcional, pós-PIX)
- Tokenização `POST /v3/creditCard/tokenize` → `creditCardToken`
- PCI: número do cartão nunca armazenado local; chamada server-side direta ao Asaas

---

## 5. MAPEAMENTO DE STATUS

| Asaas | Sistema | Efeito |
|---|---|---|
| Cobrança PENDING | payments PENDING · sub PENDING_PAYMENT | Aguardando pagamento |
| RECEIVED / CONFIRMED | payments CONFIRMED · sub ACTIVE · planId set | Acesso liberado |
| OVERDUE | payments FAILED · sub PAST_DUE · planId null | Acesso removido + notificação |
| DELETED | payments CANCELED | Cobrança ignorada |
| REFUNDED | fase futura | Rebaixar plano |

---

## 6. SEGURANÇA E INTEGRIDADE

- API key apenas em server-side (`services/asaas.ts`)
- `externalReference` = id local → cobrança de terceiros nunca confirma nada aqui
- Validação de valor no webhook (tolerância 1 centavo) — já implementada
- Idempotência total: webhook duplicado ignorado (transação)
- Cliente Asaas sem duplicidade: busca por cpfCnpj + coluna local única
- Logs de webhook sem dados sensíveis (evento + resultado apenas)

---

## 7. CRONOGRAMA SUGERIDO

| Fase | Entrega | Estimativa |
|---|---|---|
| 0 | Conta Asaas + env + coluna asaas_customer_id | 0,5 dia |
| 1 | asaas.ts (clientes + PIX) | 1 dia |
| 2 | Boost PIX end-to-end no sandbox | 0,5 dia |
| 3 | Assinatura recorrente + renovação via webhook | 1 dia |
| 4 | Eventos OVERDUE/DELETED/CREATED | 0,5 dia |
| 5 | UI pendente (QR, banner, copia-e-cola) | 1 dia |
| 6 | Homologação sandbox ponta a ponta | 0,5 dia |
| 7 | Produção (env prod + webhook no painel Asaas) | 0,5 dia |
| Total | | ~5,5 dias |

---

## 8. CHECKLIST DE ACEITE (sandbox)

- Cliente Asaas sem duplicidade (mesmo prestador = 1 customer)
- PIX gerado com QR + EMV e vencimento em 3 dias
- Pagamento confirmado via webhook ativa plano/boost uma única vez
- Webhook duplicado não cria efeito colateral
- Valor divergente é rejeitado com HTTP 400
- Não pagar em 3 dias → cobrança cancelada e boost volta a liberar novo
- Assinatura: renovação do ciclo 2 chega como PAYMENT_CREATED e estende o período
- Cancelamento: prestador mantém acesso até o fim do período pago, depois perde
- OVERDUE remove o planId e notifica o prestador
- Nenhuma API key aparece no bundle client, logs ou repositório

---

## 9. RISCOS E DEPENDÊNCIAS

- **Dependências:** conta Asaas aprovada (pessoa jurídica), API key de produção, URL pública estável para o webhook, GitHub secrets (APP_URL, CRON_SECRET)
- **Risco 1 — modo demo chegar à produção:** mitigado por PAYMENTS_MODE obrigatório (documentado no deploy)
- **Risco 2 — webhook fora do ar:** Asaas repete; cron cobre expiração como fallback
- **Risco 3 — timezone:** datas de vencimento sempre yyyy-mm-dd em BRT (lib/tz padronizado)
- **Risco 4 — concorrência de webhook + cron:** ambos passam por transações idempotentes
