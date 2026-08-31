/** Configuração compartilhada de impulsionamentos (servidor + formulário). */
export const BOOST_CONFIG: Record<string, { multiplier: number; label: string }> = {
  BASIC: { multiplier: 0.1, label: "Básico" },
  REGIONAL: { multiplier: 0.2, label: "Regional" },
  FEATURED: { multiplier: 0.3, label: "Destaque" },
};

export const BOOST_DAYS = [1, 3, 7, 15, 30] as const;

/** Preço base por dia (centavos) — fonte única usada pelo servidor e pelo formulário. */
export const BOOST_BASE_PER_DAY: Record<number, number> = { 1: 990, 3: 2490, 7: 4990, 15: 8990, 30: 14900 };

export const BOOST_TYPE_FACTOR: Record<"BASIC" | "REGIONAL" | "FEATURED", number> = {
  BASIC: 1,
  REGIONAL: 1.8,
  FEATURED: 2.5,
};

export function boostPriceCents(type: "BASIC" | "REGIONAL" | "FEATURED", days: number): number {
  return Math.round((BOOST_BASE_PER_DAY[days] ?? 4990) * (BOOST_TYPE_FACTOR[type] ?? 1));
}
