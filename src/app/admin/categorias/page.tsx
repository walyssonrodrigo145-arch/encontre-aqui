import { asc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, services, subcategories } from "@/lib/schema";
import { ToggleCategory } from "@/components/admin-forms";

export const metadata = { title: "Admin — Categorias" };

export default async function AdminCategoriasPage() {
  const cats = await db.select().from(categories).orderBy(asc(categories.sortOrder));
  const subRows = await db.select().from(subcategories);
  const svcCounts = await db
    .select({ subcategoryId: services.subcategoryId, c: sql<number>`count(*)` })
    .from(services)
    .groupBy(services.subcategoryId);

  const svcCountMap = new Map(svcCounts.map((s) => [s.subcategoryId, s.c]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Categorias e serviços</h1>
        <p className="text-sm text-slate-500">Estrutura do catálogo da plataforma</p>
      </div>

      <div className="space-y-4">
        {cats.map((cat) => {
          const subs = subRows.filter((s) => s.categoryId === cat.id);
          const totalServices = subs.reduce((acc, s) => acc + (svcCountMap.get(s.id) ?? 0), 0);
          return (
            <div key={cat.id} className="card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{cat.icon === "hammer" ? "🔨" : cat.icon === "home" ? "🏠" : cat.icon === "laptop" ? "💻" : cat.icon === "car" ? "🔧" : cat.icon === "camera" ? "📷" : cat.icon === "graduation-cap" ? "🎓" : cat.icon === "heart-pulse" ? "❤️" : "🛠️"}</span>
                  <h3 className="font-bold text-slate-800">{cat.name}</h3>
                  <span className="text-xs text-slate-400">
                    {subs.length} especialidades · {totalServices} serviços
                  </span>
                </div>
                <ToggleCategory categoryId={cat.id} isActive={cat.isActive} />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {subs.map((s) => (
                  <span key={s.id} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-slate-400">
        💡 Edição fina de subcategorias e serviços será expandida na próxima fase.
      </p>
    </div>
  );
}
