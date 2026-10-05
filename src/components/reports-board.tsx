"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  CloudDownload,
  FileText,
  Inbox,
  Percent,
  Rocket,
  SlidersHorizontal,
  Wallet,
} from "lucide-react";

export interface ReportsBoardProps {
  title: string;
  subtitle: string;
  monthRange: string;
  generatedAt: string;
  days: string[]; // rótulos dd/mm dos últimos 14 dias
  series: {
    clientesNovos: number[];
    prestadoresNovos: number[];
    assinaturasNovas: number[];
    receitaPagamentos: number[]; // centavos/dia
    receitaImpulsoes: number[]; // centavos/dia
    solicitacoes: number[];
    agendamentos: number[];
    cancelamentos: number[];
  };
  totais: {
    clientesAtivos: number;
    prestadoresAtivos: number;
    assinaturasAtivas: number;
    agendamentosGeral: number;
    agendamentosConcluidos: number;
    receitaMes: number; // centavos
    solicitacoesMes: number;
    cancelPct: number; // % histórico
  };
  topProviders: { name: string; completed: number; rating: number }[];
  cities: { name: string | null; c: number }[];
}

type Period = "7" | "14";

/** Sparkline SVG minimalista com cor própria por card. */
function Spark({ data, color }: { data: number[]; color: string }) {
  const w = 220;
  const h = 34;
  const max = Math.max(...data, 1);
  const pts = data
    .map((v, i) => `${((i / Math.max(data.length - 1, 1)) * w).toFixed(1)},${(h - 4 - (v / max) * (h - 8)).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-full" preserveAspectRatio="none" aria-hidden>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const sum = (arr: number[], from: number, to: number) => arr.slice(from, to + 1).reduce((a, b) => a + b, 0);

export function ReportsBoard(props: ReportsBoardProps) {
  const [period, setPeriod] = useState<Period>("14");
  const [showFilters, setShowFilters] = useState(false);

  const win = Number(period);
  const from = 14 - win;
  const prevFrom = Math.max(0, from - win);

  const delta = (arr: number[], invert = false) => {
    const cur = sum(arr, from, 13);
    const prev = sum(arr, prevFrom, from - 1);
    if (prev === 0) return cur > 0 ? { label: "novo", tone: "up" as const } : null;
    const pct = Math.round(((cur - prev) / prev) * 100);
    const dir = pct > 0 ? "up" : pct < 0 ? "down" : "flat";
    return { label: `${pct > 0 ? "▲" : pct < 0 ? "▼" : "▬"} ${Math.abs(pct)}%`, tone: (invert ? (dir === "up" ? "down" : dir === "down" ? "up" : "flat") : dir) };
  };

  const cur = (arr: number[]) => sum(arr, from, 13);

  const badge = (d: ReturnType<typeof delta>) => {
    if (!d) return null;
    const cls =
      d.tone === "up"
        ? "bg-emerald-50 text-emerald-600"
        : d.tone === "down"
          ? "bg-red-50 text-red-500"
          : "bg-slate-100 text-slate-500";
    return <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${cls}`}>{d.label}</span>;
  };

  const receitaWin = cur(props.series.receitaPagamentos);
  const impulsoesWin = cur(props.series.receitaImpulsoes);
  const cancelWin = cur(props.series.cancelamentos);
  const apptsWin = cur(props.series.agendamentos);
  const cancelPctWin = apptsWin > 0 ? Math.round((cancelWin / apptsWin) * 100) : 0;

  const cards = [
    {
      label: "Clientes ativos",
      value: String(props.totais.clientesAtivos),
      sub: `${cur(props.series.clientesNovos)} novos na janela`,
      icon: <Inbox size={18} />,
      tile: "bg-violet-50 text-violet-600",
      spark: props.series.clientesNovos,
      color: "#16a34a",
      d: delta(props.series.clientesNovos),
    },
    {
      label: "Assinaturas ativas",
      value: String(props.totais.assinaturasAtivas),
      sub: "MRR em evolução",
      icon: <FileText size={18} />,
      tile: "bg-sky-50 text-sky-600",
      spark: props.series.assinaturasNovas,
      color: "#2f80ed",
      d: delta(props.series.assinaturasNovas),
    },
    {
      label: "Receita de impulsões",
      value: props.totais.receitaMes ? `R$ ${(impulsoesWin / 100).toFixed(2).replace(".", ",")}` : "R$ 0,00",
      sub: "na janela selecionada",
      icon: <CircleDollarSign size={18} />,
      tile: "bg-amber-50 text-amber-600",
      spark: props.series.receitaImpulsoes,
      color: "#f59e0b",
      d: delta(props.series.receitaImpulsoes),
    },
    {
      label: "Taxa de cancelamento",
      value: `${cancelPctWin}%`,
      sub: "da janela selecionada",
      icon: <Percent size={18} />,
      tile: "bg-red-50 text-red-500",
      spark: props.series.cancelamentos,
      color: "#ef4444",
      d: delta(props.series.cancelamentos, true),
    },
    {
      label: "Prestadores ativos",
      value: String(props.totais.prestadoresAtivos),
      sub: `${cur(props.series.prestadoresNovos)} novos na janela`,
      icon: <Wallet size={18} />,
      tile: "bg-emerald-50 text-emerald-600",
      spark: props.series.prestadoresNovos,
      color: "#16a34a",
      d: delta(props.series.prestadoresNovos),
    },
    {
      label: "Receita total",
      value: `R$ ${(receitaWin / 100).toFixed(2).replace(".", ",")}`,
      sub: "pagamentos confirmados",
      icon: <Wallet size={18} />,
      tile: "bg-violet-50 text-violet-600",
      spark: props.series.receitaPagamentos,
      color: "#7c3aed",
      d: delta(props.series.receitaPagamentos),
    },
    {
      label: "Solicitações",
      value: String(cur(props.series.solicitacoes)),
      sub: "na janela selecionada",
      icon: <Inbox size={18} />,
      tile: "bg-sky-50 text-sky-600",
      spark: props.series.solicitacoes,
      color: "#0ea5e9",
      d: delta(props.series.solicitacoes),
    },
    {
      label: "Agendamentos",
      value: String(apptsWin),
      sub: `${props.totais.agendamentosConcluidos} concluídos (histórico)`,
      icon: <CalendarDays size={18} />,
      tile: "bg-orange-50 text-orange-500",
      spark: props.series.agendamentos,
      color: "#f97316",
      d: delta(props.series.agendamentos),
    },
  ];

  const maxCompleted = Math.max(...props.topProviders.map((p) => p.completed), 1);
  const cityTotal = props.cities.reduce((a, c) => a + c.c, 0) || 1;
  const cityShades = ["#8b7cf6", "#a78bfa", "#c4b5fd", "#ddd6fe", "#ede9fe"];

  const quickLinks = [
    { title: "Relatório de receitas", sub: "Veja detalhes de faturamento", href: "/admin/assinaturas", icon: <FileText size={18} />, tile: "bg-violet-50 text-violet-600" },
    { title: "Relatório de prestadores", sub: "Desempenho dos prestadores", href: "/admin/prestadores", icon: <Wallet size={18} />, tile: "bg-emerald-50 text-emerald-600" },
    { title: "Relatório de avaliações", sub: "Avaliações e feedbacks", href: "/admin/avaliacoes", icon: <Percent size={18} />, tile: "bg-amber-50 text-amber-600" },
    { title: "Relatório de impulsões", sub: "Campanhas e resultados", href: "/admin/impulsionamentos", icon: <Rocket size={18} />, tile: "bg-sky-50 text-sky-600" },
  ];

  return (
    <div className="space-y-6">
      {/* ── Cabeçalho com controles ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900">{props.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{props.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-xs font-semibold text-slate-600">
            <CalendarDays size={14} className="text-[var(--primary)]" />
            {props.monthRange}
          </span>
          <div className="relative">
            <button
              onClick={() => setShowFilters((v) => !v)}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-[var(--primary)]/40"
            >
              <SlidersHorizontal size={14} /> Filtros
            </button>
            {showFilters && (
              <div className="absolute right-0 top-full z-20 mt-1.5 w-44 rounded-xl border border-[var(--border)] bg-white p-1.5 shadow-xl">
                {(
                  [
                    { v: "7", label: "Últimos 7 dias" },
                    { v: "14", label: "Últimos 14 dias" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.v}
                    onClick={() => {
                      setPeriod(opt.v);
                      setShowFilters(false);
                    }}
                    className={`block w-full rounded-lg px-3 py-2 text-left text-xs font-medium transition ${
                      period === opt.v ? "bg-[var(--primary-soft)] text-[var(--primary)]" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => window.print()} className="btn-outline px-4 py-2.5 text-xs">
            <CloudDownload size={14} /> Exportar relatório
          </button>
        </div>
      </div>

      {/* ── 8 cards com sparklines ── */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[var(--primary)]/10">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-slate-500">{c.label}</p>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${c.tile}`}>{c.icon}</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <p className="font-display truncate text-2xl font-extrabold text-slate-900">{c.value}</p>
              {badge(c.d)}
            </div>
            <p className="text-[11px] text-slate-400">{c.sub}</p>
            <Spark data={c.spark.slice(-7)} color={c.color} />
          </div>
        ))}
      </div>

      {/* ── Banner receita do mês ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--primary)]/15 bg-[var(--primary-soft)]/60 px-5 py-4">
        <p className="flex items-center gap-2.5 text-sm font-bold text-slate-800">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/70 text-[var(--primary)]">
            <CircleDollarSign size={17} />
          </span>
          Receita neste mês: {`R$ ${(props.totais.receitaMes / 100).toFixed(2).replace(".", ",")}`}
        </p>
        <Link href="/admin/assinaturas" className="inline-flex items-center gap-1 text-xs font-bold text-[var(--primary)] hover:underline">
          Ver detalhamento financeiro <ArrowRight size={13} />
        </Link>
      </div>

      {/* ── Rankings ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-slate-900">Prestadores com mais serviços</h3>
            <Link href="/admin/prestadores" className="rounded-full border border-[var(--primary)]/30 px-3 py-1 text-[11px] font-bold text-[var(--primary)] transition hover:bg-[var(--primary-soft)]">
              Ver ranking completo
            </Link>
          </div>
          {props.topProviders.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Nenhum prestador aprovado ainda.</p>
          ) : (
            <ul className="space-y-3">
              {props.topProviders.map((p, i) => (
                <li key={p.name} className="flex items-center gap-3">
                  <span className="w-4 text-center text-xs font-bold text-slate-400">{i + 1}</span>
                  <span className="font-display flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary-light)] text-xs font-bold text-[var(--primary-dark)]">
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-slate-700">{p.name}</span>
                      <span className="shrink-0 text-[11px] text-slate-400">{p.completed} serviços</span>
                    </span>
                    <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <span
                        className="block h-full rounded-full bg-brand-gradient"
                        style={{ width: `${Math.round((p.completed / maxCompleted) * 100)}%` }}
                      />
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-slate-600">
                    <span className="text-[var(--accent)]">★</span> {p.rating.toFixed(1).replace(".", ",")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-slate-900">Cidades com mais clientes</h3>
            <Link href="/admin/usuarios?role=CUSTOMER" className="rounded-full border border-[var(--primary)]/30 px-3 py-1 text-[11px] font-bold text-[var(--primary)] transition hover:bg-[var(--primary-soft)]">
              Ver todas
            </Link>
          </div>
          {props.cities.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Nenhum cliente com cidade informada ainda.</p>
          ) : (
            <div className="donut-wrap flex flex-wrap items-center justify-center gap-6 lg:justify-between">
              <div className="min-w-[220px] flex-1">
                <ul className="space-y-2.5">
                  {props.cities.map((c, i) => (
                    <li key={c.name ?? i} className="flex items-center gap-2.5 text-sm">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: cityShades[i % cityShades.length] }} />
                      <span className="flex-1 truncate font-medium text-slate-700">{c.name ?? "Sem cidade"}</span>
                      <span className="text-slate-400">
                        {c.c} cliente(s) · <b className="text-slate-600">{Math.round((c.c / cityTotal) * 100)}%</b>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <Donut cities={props.cities} shades={cityShades} total={cityTotal} />
            </div>
          )}
        </div>
      </div>

      {/* ── Atalhos de relatórios ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {quickLinks.map((q) => (
          <Link
            key={q.href + q.title}
            href={q.href}
            className="card group flex items-center gap-3 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[var(--primary)]/10"
          >
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${q.tile}`}>{q.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-slate-800">{q.title}</span>
              <span className="block truncate text-xs text-slate-400">{q.sub}</span>
            </span>
            <ArrowRight size={16} className="shrink-0 text-slate-300 transition-all duration-200 group-hover:translate-x-1 group-hover:text-[var(--primary)]" />
          </Link>
        ))}
      </div>

      <p className="text-center text-xs text-slate-400">
        Gerado em {props.generatedAt} · dados consolidados em tempo real
      </p>
    </div>
  );
}

/** Donut local (roxo) para cidades — evita conflito de paleta com o DonutChart padrão. */
function Donut({
  cities,
  shades,
  total,
}: {
  cities: { name: string | null; c: number }[];
  shades: string[];
  total: number;
}) {
  const size = 150;
  const thickness = 24;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const dasharrays = cities.map((city) => (city.c / total) * c);
  const offsets = dasharrays.map((_, i) => dasharrays.slice(0, i).reduce((a, b) => a + b, 0));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Distribuição por cidade">
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eeedf7" strokeWidth={thickness} />
        {cities.map((_, i) => (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={shades[i % shades.length]}
            strokeWidth={thickness}
            strokeDasharray={`${dasharrays[i]} ${c - dasharrays[i]!}`}
            strokeDashoffset={-offsets[i]!}
          />
        ))}
        <text x={size / 2} y={size / 2 - 2} textAnchor="middle" fontSize="22" fontWeight="800" fill="#14121f" fontFamily="var(--font-outfit)">
          {total}
        </text>
        <text x={size / 2} y={size / 2 + 16} textAnchor="middle" fontSize="10" fill="#9a97ad">
          total
        </text>
      </g>
    </svg>
  );
}
