export default function ProviderLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Carregando">
      <div className="h-8 w-56 animate-pulse rounded-xl bg-slate-200/70" />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card h-28 animate-pulse bg-slate-100/60" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="card h-64 animate-pulse bg-slate-100/60 xl:col-span-2" />
        <div className="card h-64 animate-pulse bg-slate-100/60" />
      </div>
    </div>
  );
}
