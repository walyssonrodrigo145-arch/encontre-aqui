# 🔍 AUDITORIA PRÉ-DEPLOY — Encontre Aqui (Marketplace)

**Data:** 31/08/2026 · **Escopo:** 100% do sistema — Cliente (/app), Prestador (/prestador), Admin (/admin), Landing e Autenticação
**Método:** 3 inspeções paralelas arquivo a arquivo + varredura de padrões (text-5xl/6xl, shadow-md, bg-gray, tiles, grids) contra o padrão de referência aprovado

**Padrão de referência (ouro):** `admin/planos/page.tsx` + `admin-plans-manager.tsx` + `admin-ui.tsx` · `prestador/agenda` (workspace) · `prestador/perfil` (tabs) · landing premium

---

## 🔴 P0 — CRÍTICOS (corrigir antes de qualquer deploy)

| # | Área | Falha | Local | Causa raiz |
|---|---|---|---|---|
| P0-1 | Cliente | **Navbar+Footer duplicados** dentro do layout /app (chrome duplo empilhado) | `orcamentos/[id]:49,152` · `avaliar/[id]:44,54` | Páginas criadas fora do padrão do layout (as demais não fazem) |
| P0-2 | Cliente | **BUG: proposta REJECTED ainda pode ser "aceita"** — botões dependem só do status do quote, não da resposta | `orcamentos/[id]:112-131` | Falta de gate por status da resposta |
| P0-3 | Cliente | **Status enum cru no detalhe** — usuário vê "OPEN"/"ANSWERED" na tela e texto PT-BR na lista | `orcamentos/[id]:58` | 3 maps paralelos de label (solicitacoes/page:14-19, app/page:166, [id]) — nenhuma fonte única |
| P0-4 | Admin | **Prestadores sem paginação e sem limite na query** — a página de maior crescimento renderiza tudo para sempre | `prestadores/page.tsx:27-38` | Único CRUD sem o padrão PlansManager |
| P0-5 | Prestador | **Dois sistemas de stat card na mesma área** — impulsionar usa `StatCard` legado (sem hover, sem font-display, tile errado, `bg-purple-100`) | `impulsionar:55-65` + `ui.tsx:149-176` | Componente legado nunca migrado |
| P0-6 | Prestador | **h1 duplicado no desktop** (shell injeta `<h1>Dashboard` + página tem o seu) e **painel sem h1 próprio** | `dash-shell.tsx:98` vs páginas | Shell com h1 estático |
| P0-7 | Cliente | **Zero loading.tsx/error.tsx** em toda a área /app + `return null` = tela branca em FK órfã (4 páginas) | `src/app/app/**` | Nunca criados (prestador já tem) |

## 🟠 P1 — ALTOS

| # | Área | Falha | Local |
|---|---|---|---|
| P1-1 | Admin | Truncamento **silencioso** `limit(200/100/50)` sem "Mostrando X de Y" nem paginação (usuarios, assinaturas, impulsionamentos, avaliacoes) | `usuarios:41`, `assinaturas:32`, `impulsionamentos:34`, `avaliacoes:25` |
| P1-2 | Admin | **`window.confirm()`** nas ações destrutivas (3 padrões de confirmação distintos no painel) | `admin-actions.tsx:73,87,154,208` |
| P1-3 | Admin | **Glifos de texto como ícones** (✓ ⏳ ⚠ Σ 🚩 ✕ ★ Ø R$) nos stat cards — mistura com lucide na mesma fileira | `prestadores:113-116`, `categorias:26-29`, `assinaturas:53-56`, `impulsionamentos:57-59`, `avaliacoes:45-48` |
| P1-4 | Admin | Resumo + Relatórios **duplicam o markup do AdminStat** inline (grid de 5 breakpoints no Resumo, tile h-8, 3 tamanhos de valor) | `admin/page.tsx:163-178`, `relatorios` |
| P1-5 | Auth | **Cadastro espremido**: wrapper `max-w-md` anula o `max-w-xl` do RegisterForm (cards PF/PJ comprimidos) | `cadastro/page.tsx:21` vs `auth-forms:73` |
| P1-6 | Cliente | Matriz de headers: 8 páginas, 5 combinações diferentes de h1/h2/tamanho/font-display (única conforme: perfil/editar) | ver matriz §Cliente-8 |
| P1-7 | Prestador | Assinatura sem estado "sem plano ativo" (pula direto para os planos) · card-resumo zerado renderiza com 0 avaliações | `assinatura:70`, `avaliacoes:45-67` |
| P1-8 | Admin | Busca ausente em prestadores/assinaturas/impulsionamentos/avaliacoes · select nativo no Planos vs FilterChip no resto | vários |

## 🟡 P2 — POLIMENTO (seleção)

- `hover:shadow-md` puro em `solicitacoes:57` (padrão proíbe) · hover `/10` vs `/5` coexistindo (painel vs avaliacoes)
- Setas textuais "→"/"←" e emojis 📍/🚨 misturados com lucide (orcamentos, agendamentos, solicitacoes)
- Ícones duplicados no menu admin: `CreditCard` em Planos **e** Assinaturas; `Star` em Categorias **e** Avaliações
- `AdminPageHeader` sem `font-display` (componente "padrão" é o outlier tipográfico)
- space-y-5 (usuarios) vs space-y-6 (resto) · `space-y-3` tabs desktop do cliente sem estado ativo (sem `usePathname`)
- Star picker sem hover scale (avaliar) · radios sr-only sem focus-visible (boost)
- Botões touch < 42px fora do `.btn`: "Denunciar" (~20px), duração de boost (~36px), "Remover" foto (~18px)
- Favoritos: card paralelo ao ProviderCard (duas anatomias para o mesmo item) · FavoriteHeart dentro do Link (interativo aninhado)
- Sem "esqueci minha senha" no login · logo mobile do auth-shell hardcoded em vez de BrandLogo
- `orcamentos/[id]`: h1 text-lg · proposta aceita sem font-display · CLOSED sem banner explicativo

---

## ✅ CONFORME (não tocar)

Admin: menu agrupado com badges reais · modal de usuários 100% no padrão · AdminStat/FilterChip reutilizáveis · Planos/Relatórios/Assinaturas/Impulsionamentos/Categorias com stat cards · MRR real · hover lift · audit log
Prestador: agenda-workspace (referência ouro) · Meu perfil com tabs · stat cards premium do painel · formulários com error+pending · loading.tsx/error.tsx · banners amber consistentes
Cliente: EmptyStates completos em todas as listas · ProviderCard conforme · perfil/editar é o benchmark de header · busca mobile-safe · LGPD com consentimento
Global: zero `bg-gray-100` · zero `text-5xl/6xl` fora da landing · zero `dangerouslySetInnerHTML` · `.env`/`data/` nunca commitados

---

## 📋 PLANO DE CORREÇÃO (ordem de execução)

**Onda 1 — Estruturais (P0):**
1. Remover Navbar/Footer de `orcamentos/[id]` e `avaliar/[id]` + gate de proposta rejeitada + labels PT-BR únicos (extrair `QUOTE_STATUS_LABEL` para `lib/utils`)
2. Paginação + busca em `admin/prestadores` (replicar PlansManager) + indicador "Mostrando X de Y" nas demais listas
3. Migrar `impulsionar` para stat cards premium (aposentar `StatCard` legado)
4. Resolver h1: dash-shell topbar muda `<h1>` → `<p>`; adicionar header padrão no painel
5. `loading.tsx` + `error.tsx` para `/app` + tela de FK órfã

**Onda 2 — Consistência (P1):**
6. Indicador de truncamento + busca nas listas do admin
7. Substituir `window.confirm()` por modal padrão em admin-actions
8. Tiles lucide nos stat cards (eliminar glifos)
9. Migrar Resumo/Relatórios para `AdminStat` · `AdminPageHeader` ganha `font-display`
10. `cadastro/page.tsx`: remover wrapper `max-w-md` · estado "sem plano" na assinatura · esconder resumo zerado de avaliações

**Onda 3 — Polimento (P2):** setas/emojis → lucide, ícones únicos no menu, hover /5 unificado, touch targets ≥42px, star picker vivo, favoritos reusa ProviderCard, esqueci minha senha.

**Validação por onda:** tsc + lint + build + varredura de padrão (grep) + comparação lado a lado com as referências.
