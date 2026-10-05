export default function ClientAreaLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Carregando">
      <div className="h-8 w-56 animate-pulse rounded-xl bg-slate-200/70" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card h-36 animate-pulse bg-slate-100/60" />
        <div className="card h-36 animate-pulse bg-slate-100/60" />
      </div>
      <div className="card h-64 animate-pulse bg-slate-100/60" />
    </div>
  );
}
