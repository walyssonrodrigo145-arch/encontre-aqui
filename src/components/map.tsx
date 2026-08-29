"use client";

import dynamic from "next/dynamic";

function MapSkeleton({ height }: { height: string }) {
  return (
    <div
      className={`flex ${height} w-full items-center justify-center rounded-xl border border-[var(--border)] bg-slate-50 text-xs text-slate-400`}
    >
      Carregando mapa...
    </div>
  );
}

/** Carregados só no navegador (Leaflet não roda no servidor). */
export const MapPicker = dynamic(
  () => import("./leaflet-map").then((m) => m.MapPicker),
  { ssr: false, loading: () => <MapSkeleton height="h-64" /> },
);

export const StaticMap = dynamic(
  () => import("./leaflet-map").then((m) => m.StaticMap),
  { ssr: false, loading: () => <MapSkeleton height="h-56" /> },
);
