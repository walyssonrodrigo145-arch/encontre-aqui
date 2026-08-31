import { Star, BadgeCheck, MapPin, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Nota ${rating} de 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={cn(
            i <= Math.round(rating)
              ? "fill-[var(--accent)] text-[var(--accent)]"
              : "fill-slate-200 text-slate-200",
          )}
        />
      ))}
    </span>
  );
}

export function VerifiedBadge({ level }: { level: string }) {
  if (level === "NONE") return null;
  const label =
    level === "DOCUMENTS" ? "Documentação verificada" : level === "PROFILE" ? "Perfil verificado" : "Telefone verificado";
  return (
    <span className="badge bg-blue-50 text-blue-700" title={label}>
      <BadgeCheck size={13} />
      {level === "DOCUMENTS" ? "Verificado" : label}
    </span>
  );
}

export function StatusBadge({ status, label }: { status: string; label: string }) {
  const color: Record<string, string> = {
    BOOKING_REQUESTED: "bg-amber-100 text-amber-700",
    BOOKING_CONFIRMED: "bg-emerald-100 text-emerald-700",
    ON_THE_WAY: "bg-blue-100 text-blue-700",
    IN_PROGRESS: "bg-blue-100 text-blue-700",
    COMPLETED: "bg-slate-100 text-slate-600",
    CANCELLED: "bg-red-100 text-red-700",
    RESCHEDULE_PROPOSED: "bg-purple-100 text-purple-700",
    OPEN: "bg-amber-100 text-amber-700",
    ANSWERED: "bg-blue-100 text-blue-700",
    ACCEPTED: "bg-emerald-100 text-emerald-700",
    CLOSED: "bg-slate-100 text-slate-600",
    ACTIVE: "bg-emerald-100 text-emerald-700",
    PAST_DUE: "bg-red-100 text-red-700",
    CANCELED: "bg-slate-100 text-slate-600",
    PENDING: "bg-amber-100 text-amber-700",
    PENDING_PAYMENT: "bg-amber-100 text-amber-700",
    EXPIRED: "bg-slate-100 text-slate-600",
  };
  return <span className={cn("badge", color[status] ?? "bg-slate-100 text-slate-600")}>{label}</span>;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-white px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        {icon}
      </div>
      <h3 className="font-semibold text-slate-700">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-slate-400">
      <Loader2 className="animate-spin" size={20} />
      <span className="text-sm">{label ?? "Carregando..."}</span>
    </div>
  );
}

export function SectionTitle({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-bold text-slate-800">{children}</h2>
      {sub && <p className="text-sm text-slate-500">{sub}</p>}
    </div>
  );
}

export function Avatar({
  name,
  src,
  size = 40,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const letters = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--primary-light)] font-bold text-[var(--primary-dark)]",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        letters
      )}
    </div>
  );
}

export function LocationLine({ city, state }: { city: string; state: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-slate-500">
      <MapPin size={13} />
      {city} - {state}
    </span>
  );
}

export function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  accent?: string;
}) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl",
          accent ?? "bg-[var(--primary-light)] text-[var(--primary-dark)]",
        )}
      >
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-lg font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}
