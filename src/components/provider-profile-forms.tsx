"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  FolderOpen,
  Plus,
  Trash2,
  Wrench,
} from "lucide-react";
import {
  saveAvailabilityAction,
  savePortfolioAction,
  saveServicesAction,
  type ProfileState,
} from "@/server/actions/provider-profile";
import { WEEKDAYS } from "@/lib/utils";

/** Cabeçalho de seção: ícone + título + descrição à esquerda, card de Dica à direita. */
function SectionHeader({
  icon,
  title,
  description,
  tip,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  tip: string;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px] lg:items-center">
      <div className="flex items-start gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
          {icon}
        </span>
        <div>
          <h2 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">{title}</h2>
          <p className="mt-1 text-sm leading-snug text-slate-500">{description}</p>
        </div>
      </div>
      <div className="rounded-2xl border border-[var(--primary)]/15 bg-[var(--primary-soft)]/60 p-4">
        <p className="flex items-center gap-1.5 text-xs font-bold text-[var(--primary-dark)]">
          💡 Dica
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">{tip}</p>
      </div>
    </div>
  );
}

/** Barra de ações: Salvar alterações + Visualizar meu perfil. */
function ProfileActionBar({
  slug,
  onSave,
  pending,
  disabled,
  saveLabel = "Salvar alterações",
}: {
  slug: string;
  onSave: () => void;
  pending: boolean;
  disabled?: boolean;
  saveLabel?: string;
}) {
  return (
    <div className="card flex flex-wrap items-center gap-3 bg-slate-50/60 p-4">
      <button onClick={onSave} disabled={pending || disabled} className="btn-gradient px-8 py-3 text-[15px]">
        <Check size={17} className="mr-1" />
        {pending ? "Salvando..." : saveLabel}
      </button>
      <Link href={`/p/${slug}`} target="_blank" className="btn-outline px-6 py-3 text-[15px]">
        Visualizar meu perfil <ExternalLink size={15} />
      </Link>
    </div>
  );
}

function Feedback({ state }: { state?: ProfileState }) {
  if (state?.error) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-[var(--danger)]">
        <AlertCircle size={15} /> {state.error}
      </p>
    );
  }
  if (state?.success) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-emerald-600">
        <CheckCircle2 size={15} /> {state.success}
      </p>
    );
  }
  return null;
}

// ─────────────────────────── DISPONIBILIDADE ───────────────────────────

interface RuleRow {
  weekday: number;
  enabled: boolean;
  startTime: string;
  endTime: string;
  slotMinutes: number;
}

const SLOT_OPTIONS = [30, 60, 90, 120, 180, 240];

/** Campo compacto — não usa `.input` (que força w-full e vence utilitários de largura). */
const boxInput =
  "rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 placeholder:text-slate-400";

function fmt(v: string | null | undefined, fallback: string) {
  return v && /^\d{2}:\d{2}$/.test(v) ? v : fallback;
}

export function AvailabilityEditor({
  initialRules,
  initialEmergency,
  initialRadius,
  slug,
}: {
  initialRules: { weekday: number; startTime: string; endTime: string; slotMinutes: number }[];
  initialEmergency: boolean;
  initialRadius: number;
  slug: string;
}) {
  const [rows, setRows] = useState<RuleRow[]>(() =>
    WEEKDAYS.map((_, weekday) => {
      const rule = initialRules.find((r) => r.weekday === weekday);
      return {
        weekday,
        enabled: !!rule,
        startTime: fmt(rule?.startTime, "08:00"),
        endTime: fmt(rule?.endTime, "18:00"),
        slotMinutes: rule?.slotMinutes ?? 120,
      };
    }),
  );
  const [emergency, setEmergency] = useState(initialEmergency);
  const [radius, setRadius] = useState(initialRadius);
  const [state, setState] = useState<ProfileState>();
  const [pending, startTransition] = useTransition();

  const enabledCount = rows.filter((r) => r.enabled).length;

  const setRow = (weekday: number, patch: Partial<RuleRow>) =>
    setRows((prev) => prev.map((r) => (r.weekday === weekday ? { ...r, ...patch } : r)));

  /** Copia o horário do primeiro dia ativo para todos os outros dias ativos. */
  const copyHours = () => {
    const source = rows.find((r) => r.enabled);
    if (!source) return;
    setRows((prev) =>
      prev.map((r) =>
        r.enabled
          ? { ...r, startTime: source.startTime, endTime: source.endTime, slotMinutes: source.slotMinutes }
          : r,
      ),
    );
  };

  const save = () =>
    startTransition(async () => {
      const payload = rows
        .filter((r) => r.enabled)
        .map((r) => ({ weekday: r.weekday, startTime: r.startTime, endTime: r.endTime, slotMinutes: r.slotMinutes }));
      const res = await saveAvailabilityAction(payload, emergency, radius);
      setState(res);
    });

  return (
    <div className="space-y-5">
      <SectionHeader
        icon={<CalendarClock size={26} />}
        title="Configure sua disponibilidade"
        description="Defina quando e por quanto tempo você atende seus clientes."
        tip="Manter sua agenda atualizada aumenta suas chances de receber mais solicitações."
      />

      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-bold text-slate-900">Gerencie seus dias e horários</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Selecione os dias da semana em que você atende e defina os horários disponíveis.
            </p>
          </div>
          <button onClick={copyHours} disabled={enabledCount === 0} className="btn-outline px-4 py-2 text-xs">
            <Copy size={13} /> Copiar horários
          </button>
        </div>

        <ul className="mt-4 space-y-2.5">
          {rows.map((row) => (
            <li
              key={row.weekday}
              className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border p-3 transition ${
                row.enabled ? "border-[var(--primary)]/20 bg-[var(--primary-soft)]/30" : "border-[var(--border)]"
              }`}
            >
              <label className="flex w-44 shrink-0 cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={row.enabled}
                  onChange={(e) => setRow(row.weekday, { enabled: e.target.checked })}
                  className="h-4 w-4 accent-[var(--primary)]"
                  aria-label={WEEKDAYS[row.weekday]}
                />
                <span className={`text-sm font-bold ${row.enabled ? "text-slate-800" : "text-slate-400"}`}>
                  {WEEKDAYS[row.weekday]}
                </span>
              </label>

              {row.enabled ? (
                <>
                  <div className="flex flex-wrap items-center gap-2 sm:flex-1">
                    <span className="text-xs font-medium text-slate-400">Das</span>
                    <div className="relative">
                      <input
                        type="time"
                        value={row.startTime}
                        onChange={(e) => setRow(row.weekday, { startTime: e.target.value })}
                        className="time-input input w-32 py-2 text-sm font-semibold"
                        aria-label={`Início em ${WEEKDAYS[row.weekday]}`}
                      />
                      <Clock size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--primary)]" />
                    </div>
                    <span className="text-xs font-medium text-slate-400">Até</span>
                    <div className="relative">
                      <input
                        type="time"
                        value={row.endTime}
                        onChange={(e) => setRow(row.weekday, { endTime: e.target.value })}
                        className="time-input input w-32 py-2 text-sm font-semibold"
                        aria-label={`Fim em ${WEEKDAYS[row.weekday]}`}
                      />
                      <Clock size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--primary)]" />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-slate-400">Duração do atendimento</span>
                    <select
                      value={row.slotMinutes}
                      onChange={(e) => setRow(row.weekday, { slotMinutes: Number(e.target.value) })}
                      className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                      aria-label={`Duração em ${WEEKDAYS[row.weekday]}`}
                    >
                      {SLOT_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o} min/slot
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => setRow(row.weekday, { enabled: false })}
                    className="ml-auto text-[var(--danger)] transition hover:opacity-70"
                    aria-label={`Desativar ${WEEKDAYS[row.weekday]}`}
                    title="Desativar este dia"
                  >
                    <Trash2 size={17} />
                  </button>
                </>
              ) : (
                <span className="badge rounded-full bg-slate-100 text-slate-400">Indisponível</span>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] p-3 text-sm">
            <input
              type="checkbox"
              checked={emergency}
              onChange={(e) => setEmergency(e.target.checked)}
              className="h-4 w-4 accent-[var(--primary)]"
            />
            <span className="font-medium text-slate-700">🚨 Atendo emergências</span>
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-[var(--border)] p-3 text-sm">
            <span className="whitespace-nowrap font-medium text-slate-700">Raio de atendimento:</span>
            <input
              type="number"
              min={1}
              max={200}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className={`${boxInput} w-24 py-2`}
            />
            <span className="text-slate-400">km</span>
          </label>
        </div>

        <div className="mt-4">
          <Feedback state={state} />
        </div>
      </div>

      <ProfileActionBar slug={slug} onSave={save} pending={pending} disabled={enabledCount === 0} />
    </div>
  );
}

// ─────────────────────────── SERVIÇOS & PREÇOS ───────────────────────────

export interface CatalogService {
  id: number;
  name: string;
  subName: string;
  catName: string;
}

export interface ServiceLinkRow {
  serviceId: number;
  priceType: "FIXED" | "RANGE" | "ON_QUOTE";
  priceMin: number | null;
  priceMax: number | null;
}

function centsToInput(cents: number | null | undefined) {
  return cents != null ? (cents / 100).toFixed(2).replace(".", ",") : "";
}

function inputToCents(v: string): number | null {
  const s = v.replace(/\./g, "").replace(",", ".").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}

export function ServicesManager({
  catalog,
  initialLinks,
  slug,
}: {
  catalog: CatalogService[];
  initialLinks: ServiceLinkRow[];
  slug: string;
}) {
  const [links, setLinks] = useState<ServiceLinkRow[]>(initialLinks);
  const [addId, setAddId] = useState("");
  const [priceStr, setPriceStr] = useState<Record<number, { min: string; max: string }>>(() => {
    const map: Record<number, { min: string; max: string }> = {};
    for (const l of initialLinks) {
      map[l.serviceId] = { min: centsToInput(l.priceMin), max: centsToInput(l.priceMax) };
    }
    return map;
  });
  const [state, setState] = useState<ProfileState>();
  const [pending, startTransition] = useTransition();

  const selectedIds = new Set(links.map((l) => l.serviceId));
  const available = catalog.filter((c) => !selectedIds.has(c.id));
  const byCat = new Map<string, CatalogService[]>();
  for (const c of available) {
    const list = byCat.get(c.catName) ?? [];
    list.push(c);
    byCat.set(c.catName, list);
  }

  const nameOf = (id: number) => catalog.find((c) => c.id === id)?.name ?? `#${id}`;

  const add = () => {
    const id = Number(addId);
    if (!id || selectedIds.has(id)) return;
    setLinks((prev) => [...prev, { serviceId: id, priceType: "ON_QUOTE", priceMin: null, priceMax: null }]);
    setPriceStr((prev) => ({ ...prev, [id]: { min: "", max: "" } }));
    setAddId("");
  };

  const save = () =>
    startTransition(async () => {
      const payload = links.map((l) => {
        const strs = priceStr[l.serviceId] ?? { min: "", max: "" };
        return {
          serviceId: l.serviceId,
          priceType: l.priceType,
          priceMin: l.priceType === "ON_QUOTE" ? null : inputToCents(strs.min),
          priceMax: l.priceType === "RANGE" ? inputToCents(strs.max) : null,
        };
      });
      const res = await saveServicesAction(payload);
      setState(res);
    });

  return (
    <div className="space-y-5">
      <SectionHeader
        icon={<Wrench size={26} />}
        title="Gerencie serviços e preços"
        description="Escolha o que você oferece e defina os valores de cada serviço."
        tip="Serviços com preços claros convertem mais clientes do que “sob orçamento”."
      />

      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={addId}
            onChange={(e) => setAddId(e.target.value)}
            className="input min-w-56 flex-1"
            aria-label="Adicionar serviço"
          >
            <option value="">+ Adicionar serviço do catálogo…</option>
            {[...byCat.entries()].map(([cat, list]) => (
              <optgroup key={cat} label={cat}>
                {list.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.subName} › {c.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <button onClick={add} disabled={!addId} className="btn-outline shrink-0">
            <Plus size={15} /> Adicionar
          </button>
        </div>

        {links.length === 0 ? (
          <p className="mt-4 rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-400">
            Nenhum serviço selecionado. Adicione acima o que você oferece.
          </p>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {links.map((l) => {
              const strs = priceStr[l.serviceId] ?? { min: "", max: "" };
              const setStr = (patch: Partial<{ min: string; max: string }>) =>
                setPriceStr((prev) => ({ ...prev, [l.serviceId]: { ...strs, ...patch } }));
              return (
                <li key={l.serviceId} className="rounded-xl border border-[var(--border)] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-800">{nameOf(l.serviceId)}</p>
                    <button
                      onClick={() => setLinks((prev) => prev.filter((x) => x.serviceId !== l.serviceId))}
                      className="text-xs font-medium text-[var(--danger)]"
                      aria-label={`Remover ${nameOf(l.serviceId)}`}
                    >
                      <Trash2 size={14} /> Remover
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <select
                      value={l.priceType}
                      onChange={(e) =>
                        setLinks((prev) =>
                          prev.map((x) =>
                            x.serviceId === l.serviceId
                              ? { ...x, priceType: e.target.value as ServiceLinkRow["priceType"] }
                              : x,
                          ),
                        )
                      }
                      className="rounded-xl border border-[var(--border)] bg-white px-2.5 py-1.5 text-sm"
                      aria-label="Tipo de preço"
                    >
                      <option value="ON_QUOTE">Sob orçamento</option>
                      <option value="FIXED">Preço fixo</option>
                      <option value="RANGE">Faixa de preço</option>
                    </select>
                    {l.priceType === "FIXED" && (
                      <input
                        className={`${boxInput} w-36 py-2`}
                        placeholder="Preço (R$)"
                        inputMode="decimal"
                        value={strs.min}
                        onChange={(e) => setStr({ min: e.target.value })}
                      />
                    )}
                    {l.priceType === "RANGE" && (
                      <>
                        <input
                          className={`${boxInput} w-32 py-2`}
                          placeholder="Mín (R$)"
                          inputMode="decimal"
                          value={strs.min}
                          onChange={(e) => setStr({ min: e.target.value })}
                        />
                        <span className="text-xs text-slate-400">até</span>
                        <input
                          className={`${boxInput} w-32 py-2`}
                          placeholder="Máx (R$)"
                          inputMode="decimal"
                          value={strs.max}
                          onChange={(e) => setStr({ max: e.target.value })}
                        />
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-4">
          <Feedback state={state} />
        </div>
      </div>

      <ProfileActionBar
        slug={slug}
        onSave={save}
        pending={pending}
        disabled={links.length === 0}
        saveLabel="Salvar serviços"
      />
    </div>
  );
}

// ─────────────────────────── PORTFÓLIO ───────────────────────────

async function fileToResizedDataUrl(file: File, maxDim = 900, quality = 0.82): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no-canvas");
    ctx.drawImage(bitmap, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    bitmap.close?.();
  }
}

export interface PortfolioRow {
  id: number;
  mediaUrl: string;
  mediaType: "IMAGE" | "VIDEO";
  description: string | null;
}

export function PortfolioManager({
  initialItems,
  limit,
  planName,
  slug,
}: {
  initialItems: PortfolioRow[];
  limit: number;
  planName: string | null;
  slug: string;
}) {
  const [items, setItems] = useState(
    initialItems.map((it) => ({ mediaUrl: it.mediaUrl, mediaType: it.mediaType, description: it.description ?? "" })),
  );
  const [state, setState] = useState<ProfileState>();
  const [pending, startTransition] = useTransition();
  const [resizing, setResizing] = useState(false);

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setResizing(true);
    setState(undefined);
    const next = [...items];
    for (const file of Array.from(files)) {
      if (next.length >= limit) {
        setState({ error: `Limite de ${limit} trabalhos do seu plano atingido.` });
        break;
      }
      if (file.size > 10 * 1024 * 1024) {
        setState({ error: `"${file.name}" passa de 10MB. Escolha uma imagem menor.` });
        continue;
      }
      try {
        const dataUrl = await fileToResizedDataUrl(file);
        next.push({ mediaUrl: dataUrl, mediaType: "IMAGE", description: "" });
      } catch {
        setState({ error: `Não foi possível processar "${file.name}".` });
      }
    }
    setItems(next);
    setResizing(false);
  };

  const save = () =>
    startTransition(async () => {
      const res = await savePortfolioAction(items);
      setState(res);
    });

  return (
    <div className="space-y-5">
      <SectionHeader
        icon={<FolderOpen size={26} />}
        title="Seu portfólio de trabalhos"
        description="Mostre fotos reais dos serviços que você já realizou."
        tip="Portfólio com boas fotos transmite confiança e atrai mais clientes."
      />

      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-500">
            <b className="text-slate-700">{items.length}</b> de <b className="text-slate-700">{limit}</b> trabalhos
            {planName ? ` · plano ${planName}` : " · sem plano ativo"}
          </p>
          <label className={`btn-outline cursor-pointer px-4 py-2 text-xs ${items.length >= limit ? "pointer-events-none opacity-50" : ""}`}>
            <Plus size={14} /> {resizing ? "Processando..." : "Adicionar fotos"}
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                void onFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        </div>

        {items.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-slate-400">
            Adicione fotos dos seus melhores trabalhos — a primeira foto tem mais destaque no seu perfil.
          </p>
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((item, i) => (
              <li key={i} className="overflow-hidden rounded-xl border border-[var(--border)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.mediaUrl} alt={item.description || "Trabalho"} className="h-28 w-full object-cover" />
              <div className="space-y-1.5 p-2">
                <input
                  className={`${boxInput} w-full py-1.5 text-xs`}
                  maxLength={300}
                  placeholder="Descrição (opcional)"
                  value={item.description}
                  onChange={(e) =>
                    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, description: e.target.value } : it)))
                  }
                />
                  <button
                    onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-[11px] font-medium text-[var(--danger)]"
                  >
                    <Trash2 size={12} className="mr-0.5 inline" /> Remover
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4">
          <Feedback state={state} />
        </div>
      </div>

      <ProfileActionBar slug={slug} onSave={save} pending={pending} disabled={false} saveLabel="Salvar portfólio" />
    </div>
  );
}
