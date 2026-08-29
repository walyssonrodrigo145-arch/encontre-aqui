import { cn } from "@/lib/utils";

/**
 * Logo "Encontre Aqui" — réplica vetorial do pin com martelo.
 * Gradiente da marca: violeta (#8a3ffc) → azul (#2f80ed).
 */

export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size * (56 / 48)}
      viewBox="0 0 48 56"
      fill="none"
      className={className}
      role="img"
      aria-label="Encontre Aqui"
    >
      <defs>
        <linearGradient id="ea-pin" x1="6" y1="4" x2="42" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8a3ffc" />
          <stop offset="0.55" stopColor="#6d4aff" />
          <stop offset="1" stopColor="#2f80ed" />
        </linearGradient>
        <linearGradient id="ea-pin-glow" x1="24" y1="46" x2="24" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8a3ffc" stopOpacity="0.55" />
          <stop offset="1" stopColor="#2f80ed" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* brilho sob o pin */}
      <ellipse cx="24" cy="50" rx="14" ry="4" fill="url(#ea-pin-glow)" />

      {/* pin */}
      <path
        d="M24 2C13.6 2 5.2 10.4 5.2 20.8c0 6.9 4.3 13.1 9.3 18.9 3.1 3.6 6.4 7 9.5 10.3 3.1-3.3 6.4-6.7 9.5-10.3 5-5.8 9.3-12 9.3-18.9C42.8 10.4 34.4 2 24 2z"
        fill="url(#ea-pin)"
      />
      {/* borda interna sutil */}
      <path
        d="M24 5.4c-8.5 0-15.4 6.9-15.4 15.4 0 5.7 3.7 11.2 8.3 16.6 2.5 2.9 5 5.7 7.1 8.2 2.1-2.5 4.6-5.3 7.1-8.2 4.6-5.4 8.3-10.9 8.3-16.6 0-8.5-6.9-15.4-15.4-15.4z"
        fill="#ffffff"
        fillOpacity="0.08"
      />

      {/* martelo */}
      <g transform="translate(24 20.5)">
        <g transform="rotate(-38)">
          <rect x="-2.6" y="-8.2" width="5.2" height="15" rx="2.4" fill="#ffffff" />
          <rect x="-8.4" y="-14.2" width="16.8" height="7.2" rx="3.4" fill="#ffffff" />
          <rect x="5.4" y="-12.6" width="3.4" height="4" rx="1.6" fill="#ffffff" fillOpacity="0.85" />
        </g>
      </g>
    </svg>
  );
}

export function BrandLogo({
  variant = "dark",
  size = "md",
  withTagline = false,
  className,
}: {
  /** dark = fundo escuro (texto branco) · light = fundo claro (texto escuro) */
  variant?: "dark" | "light";
  size?: "sm" | "md" | "lg";
  withTagline?: boolean;
  className?: string;
}) {
  const markSize = size === "sm" ? 26 : size === "lg" ? 44 : 34;
  const titleSize = size === "sm" ? "text-base" : size === "lg" ? "text-2xl" : "text-lg";

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={markSize} />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-display font-extrabold tracking-tight",
            titleSize,
            variant === "dark" ? "text-white" : "text-slate-900",
          )}
        >
          encontre{" "}
          <span className="text-brand-gradient">aqui</span>
        </span>
        {withTagline && (
          <span
            className={cn(
              "mt-1 text-[9px] font-bold uppercase tracking-[0.18em]",
              variant === "dark" ? "text-white/50" : "text-slate-400",
            )}
          >
            Encontre. Contrate. Resolva.
          </span>
        )}
      </span>
    </span>
  );
}
