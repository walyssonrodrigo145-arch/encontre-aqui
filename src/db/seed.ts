import "dotenv/config";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import {
  adminLogs,
  appointments,
  blockedDates,
  boosts,
  categories,
  conversations,
  customers,
  favorites,
  messages,
  notifications,
  payments,
  portfolio,
  providerAvailability,
  providerLocations,
  providerServices,
  providers,
  quoteResponses,
  quotes,
  rankingConfig,
  reports,
  reviews,
  services,
  subcategories,
  subscriptionPlans,
  subscriptions,
  users,
} from "../lib/schema";
import { slugify } from "../lib/utils";

const client = createClient({ url: process.env.DATABASE_URL ?? "file:./data/local.db" });
const db = drizzle(client);

const catalog: Record<string, Record<string, string[]>> = {
  "Construção e Reformas": {
    "Elétrica": ["Instalação elétrica", "Manutenção elétrica", "Instalação de chuveiro", "Instalação de tomadas", "Troca de disjuntores", "Iluminação"],
    "Hidráulica": ["Desentupimento", "Vazamentos", "Instalação de pias e tanques", "Manutenção de caixa d'água"],
    "Alvenaria": ["Construção de paredes", "Reboco", "Piso e revestimento", "Telhado"],
    "Pintura": ["Pintura interna", "Pintura externa", "Pintura de muros", "Textura e efeitos"],
    "Gesso e Serralheria": ["Forro de gesso", "Sancas", "Portões de ferro", "Estruturas metálicas", "Vidraçaria"],
  },
  "Casa e Domésticos": {
    "Limpeza": ["Diarista", "Limpeza pós-obra", "Limpeza de estofados"],
    "Jardim": ["Corte de grama", "Poda de árvores", "Manutenção de jardins"],
    "Montagem": ["Montagem de móveis", "Instalação de prateleiras", "Suporte de TV"],
    "Marido de aluguel": ["Pequenos reparos", "Instalações diversas", "Troca de acessórios"],
  },
  "Tecnologia": {
    "Informática": ["Formatação de computador", "Limpeza de notebooks", "Redes e Wi-Fi", "Recuperação de dados"],
    "Ar-condicionado": ["Instalação de split", "Manutenção preventiva", "Higienização", "Carga de gás"],
  },
  "Automóveis": {
    "Mecânica": ["Revisão geral", "Troca de óleo", "Freios", "Suspensão"],
    "Funilaria e lavação": ["Funilaria", "Polimento", "Lavação a domicílio"],
  },
  "Eventos e Criação": {
    "Fotografia": ["Fotografia de eventos", "Ensaio fotográfico", "Fotos de produtos"],
    "Design": ["Logotipo", "Posts para redes sociais", "Cardápios e flyers"],
  },
  "Aulas e Acompanhamento": {
    "Reforço escolar": ["Matemática", "Português", "Inglês"],
    "Personal": ["Treino funcional", "Musculação", "Alongamento"],
  },
  "Saúde e Bem-estar": {
    "Cuidados": ["Cuidador de idosos", "Fisioterapia domiciliar", "Massoterapia"],
  },
};

async function main() {
  console.log("🌱 Limpando banco...");
  await client.execute("PRAGMA foreign_keys = OFF");
  for (const t of [messages, reviews, appointments, quoteResponses, quotes, favorites, conversations, boosts, payments, subscriptions, notifications, reports, blockedDates, providerAvailability, providerServices, providerLocations, portfolio, providers, customers, users, services, subcategories, categories, subscriptionPlans, rankingConfig, adminLogs]) {
    await db.delete(t);
  }
  await client.execute("DELETE FROM sqlite_sequence");
  await client.execute("PRAGMA foreign_keys = ON");

  console.log("⚙️ Config de ranking...");
  await db.insert(rankingConfig).values([
    { key: "w_service_match", value: 0.3, description: "Compatibilidade com serviço buscado" },
    { key: "w_distance", value: 0.25, description: "Proximidade" },
    { key: "w_rating", value: 0.2, description: "Qualidade das avaliações" },
    { key: "w_response", value: 0.1, description: "Taxa de resposta/conclusão" },
    { key: "w_completeness", value: 0.1, description: "Perfil completo" },
    { key: "w_plan", value: 0.05, description: "Plano contratado" },
    { key: "boost_cap", value: 0.3, description: "Teto do impulsionamento" },
  ]);

  console.log("💰 Planos...");
  await db.insert(subscriptionPlans).values([
    { name: "Básico", slug: "basico", priceCents: 2990, description: "Perfil completo para começar a receber clientes", maxPhotos: 1, maxPortfolio: 3, allowVideos: false, searchBoost: 0, featuredBadge: false, advancedStats: false, prioritySupport: false, sortOrder: 1 },
    { name: "Profissional", slug: "profissional", priceCents: 5990, description: "Mais destaque, portfólio e estatísticas", maxPhotos: 3, maxPortfolio: 12, allowVideos: true, searchBoost: 0.1, featuredBadge: true, advancedStats: true, prioritySupport: false, sortOrder: 2 },
    { name: "Premium", slug: "premium", priceCents: 9990, description: "Máxima exposição e recursos avançados", maxPhotos: 6, maxPortfolio: 30, allowVideos: true, searchBoost: 0.2, featuredBadge: true, advancedStats: true, prioritySupport: true, sortOrder: 3 },
  ]);

  console.log("🗂️ Catálogo...");
  const catRows = Object.keys(catalog).map((name, i) => ({
    name, slug: slugify(name),
    icon: ["hammer", "home", "laptop", "car", "camera", "graduation-cap", "heart-pulse"][i] ?? "wrench",
    sortOrder: i,
  }));
  const insertedCats = await db.insert(categories).values(catRows).returning();
  const catByName = new Map(insertedCats.map((c) => [c.name, c.id]));

  const svcRows: { subcategoryId: number; name: string; slug: string }[] = [];
  const subToCat = new Map<string, number>();
  for (const [catName, subs] of Object.entries(catalog)) {
    const catId = catByName.get(catName)!;
    for (const [subName, svcList] of Object.entries(subs)) {
      const [sub] = await db.insert(subcategories).values({ categoryId: catId, name: subName, slug: slugify(subName) }).returning();
      subToCat.set(subName, catId);
      for (const svcName of svcList) {
        svcRows.push({ subcategoryId: sub!.id, name: svcName, slug: slugify(svcName) });
      }
    }
  }
  const insertedSvcs = await db.insert(services).values(svcRows).returning();
  const svcByName = new Map(insertedSvcs.map((s) => [s.name, s.id]));

  console.log("👑 Admin + cliente demo...");
  const pass = await bcrypt.hash("123456", 10);
  await db.insert(users).values({
    role: "ADMIN", name: "Administrador", email: "admin@encontreaqui.com",
    phone: "(33) 99999-0000", passwordHash: pass, phoneVerified: true, lgpdConsentAt: new Date(),
  });
  const [demoCustomerUser] = await db.insert(users).values({
    role: "CUSTOMER", name: "Maria Cliente", email: "cliente@email.com",
    phone: "(33) 98888-7777", passwordHash: pass, lgpdConsentAt: new Date(),
  }).returning();
  await db.insert(customers).values({
    userId: demoCustomerUser!.id, city: "Teófilo Otoni", state: "MG",
    addressText: "Centro, Teófilo Otoni - MG", lat: -18.9123, lng: -41.9496,
  });

  console.log("👷 Prestadores demo...");
  const planRows = await db.select().from(subscriptionPlans);
  const planBySlug = new Map(planRows.map((p) => [p.slug, p.id]));

  const demoProviders: {
    name: string; email: string; headline: string; lat: number; lng: number;
    rating: number; count: number; jobs: number;
    verify: "PHONE" | "PROFILE" | "DOCUMENTS"; plan: string;
    subs: string[]; emergency: boolean; km: number;
  }[] = [
    { name: "João Eletricista", email: "joao@demo.com", headline: "Eletricista residencial e comercial", lat: -18.9123, lng: -41.9496, rating: 4.9, count: 127, jobs: 210, verify: "DOCUMENTS", plan: "premium", subs: ["Elétrica"], emergency: true, km: 15 },
    { name: "Carlos Hidráulica", email: "carlos@demo.com", headline: "Encanador com 15 anos de experiência", lat: -18.9205, lng: -41.9568, rating: 4.8, count: 89, jobs: 150, verify: "DOCUMENTS", plan: "profissional", subs: ["Hidráulica"], emergency: true, km: 20 },
    { name: "Marcos Pinturas", email: "marcos@demo.com", headline: "Pintura interna e externa com acabamento fino", lat: -18.9031, lng: -41.9402, rating: 4.7, count: 54, jobs: 90, verify: "PROFILE", plan: "profissional", subs: ["Pintura"], emergency: false, km: 12 },
    { name: "Ana Diarista", email: "ana@demo.com", headline: "Limpeza residencial detalhada", lat: -18.9072, lng: -41.946, rating: 5.0, count: 41, jobs: 80, verify: "PHONE", plan: "basico", subs: ["Limpeza"], emergency: false, km: 10 },
    { name: "TecInfo Suporte", email: "tecinfo@demo.com", headline: "Técnico de informática — atendimento em domicílio", lat: -18.918, lng: -41.9435, rating: 4.6, count: 73, jobs: 160, verify: "DOCUMENTS", plan: "basico", subs: ["Informática"], emergency: false, km: 25 },
    { name: "FrioMax Ar-condicionado", email: "friomax@demo.com", headline: "Instalação e manutenção de split", lat: -18.925, lng: -41.958, rating: 4.8, count: 96, jobs: 180, verify: "DOCUMENTS", plan: "profissional", subs: ["Ar-condicionado"], emergency: false, km: 30 },
    { name: "Pedro Marceneiro", email: "pedro@demo.com", headline: "Móveis sob medida e montagem", lat: -18.856, lng: -41.903, rating: 4.5, count: 28, jobs: 60, verify: "PHONE", plan: "basico", subs: ["Montagem"], emergency: false, km: 20 },
    { name: "Jardim Belo Paisagismo", email: "jardim@demo.com", headline: "Cuidado completo do seu jardim", lat: -18.901, lng: -41.955, rating: 4.7, count: 33, jobs: 55, verify: "PROFILE", plan: "basico", subs: ["Jardim"], emergency: false, km: 15 },
    { name: "Mecânica do Zé", email: "ze@demo.com", headline: "Mecânica leve a domicílio", lat: -18.93, lng: -41.944, rating: 4.4, count: 61, jobs: 140, verify: "PHONE", plan: "basico", subs: ["Mecânica"], emergency: true, km: 18 },
    { name: "Luz Fotografia", email: "luz@demo.com", headline: "Fotografia de eventos e ensaios", lat: -18.91, lng: -41.949, rating: 5.0, count: 22, jobs: 35, verify: "PROFILE", plan: "premium", subs: ["Fotografia"], emergency: false, km: 40 },
    { name: "Monta Tudo", email: "montatudo@demo.com", headline: "Montador de móveis rápido e cuidadoso", lat: -18.915, lng: -41.952, rating: 4.6, count: 47, jobs: 110, verify: "PHONE", plan: "basico", subs: ["Montagem", "Marido de aluguel"], emergency: false, km: 12 },
    { name: "Bia Aulas Particulares", email: "bia@demo.com", headline: "Reforço escolar de matemática e português", lat: -18.905, lng: -41.948, rating: 4.9, count: 19, jobs: 30, verify: "PROFILE", plan: "basico", subs: ["Reforço escolar"], emergency: false, km: 15 },
  ];

  let i = 0;
  for (const dp of demoProviders) {
    i++;
    const [u] = await db.insert(users).values({
      role: "PROVIDER", name: dp.name, email: dp.email,
      phone: `(33) 9880${String(i).padStart(2, "0")}-${String(1000 + i).slice(1)}`,
      passwordHash: pass, phoneVerified: true, lgpdConsentAt: new Date(),
    }).returning();

    const [p] = await db.insert(providers).values({
      userId: u!.id, displayName: dp.name, slug: slugify(dp.name),
      headline: dp.headline,
      bio: `${dp.name} — ${dp.headline}. Trabalho com responsabilidade, pontualidade e garantia. Atendo Teófilo Otoni e região. Orçamento sem compromisso, entre em contato!`,
      cep: "39800-000",
      city: "Teófilo Otoni", state: "MG", neighborhood: "Centro",
      lat: dp.lat, lng: dp.lng, serviceRadiusKm: dp.km, emergency: dp.emergency,
      experienceYears: 5 + (i % 15), verificationLevel: dp.verify,
      status: "APPROVED", responseRate: 0.7 + (i % 4) * 0.08,
      completedJobs: dp.jobs, ratingAvg: dp.rating, ratingCount: dp.count,
      planId: planBySlug.get(dp.plan) ?? null, whatsapp: "(33) 99999-9999",
      publicLocation: true,
      onboardingStep: 8,
    }).returning();

    const svcIds = dp.subs.flatMap((subName) => {
      const catName = Object.keys(catalog).find((cn) => subName in catalog[cn]!);
      if (!catName) return [];
      return catalog[catName]![subName]!
        .map((n) => svcByName.get(n))
        .filter((id): id is number => id != null);
    });

    if (svcIds.length) {
      await db.insert(providerServices).values(
        svcIds.map((serviceId, idx) => ({
          providerId: p!.id, serviceId,
          priceType: (idx % 3 === 0 ? "RANGE" : idx % 3 === 1 ? "FIXED" : "ON_QUOTE") as "RANGE" | "FIXED" | "ON_QUOTE",
          priceMin: 8000 + i * 1000, priceMax: 30000 + i * 2000,
        })),
      );
    }

    await db.insert(providerLocations).values({ providerId: p!.id, city: "Teófilo Otoni", state: "MG" });
    await db.insert(providerAvailability).values(
      [1, 2, 3, 4, 5].map((weekday) => ({
        providerId: p!.id, weekday, startTime: "08:00",
        endTime: weekday % 2 === 0 ? "18:00" : "17:00", slotMinutes: 120,
      })),
    );

    if (dp.plan === "premium") {
      await db.insert(portfolio).values([
        { providerId: p!.id, mediaUrl: "", description: "Trabalho recente — antes e depois" },
        { providerId: p!.id, mediaUrl: "", description: "Projeto concluído com garantia" },
      ]);
    }
  }

  console.log("⭐ Serviços concluídos + avaliações (para depoimentos)...");
  const customerRow = (await db.select().from(customers).limit(1))[0]!;
  const providerRows = await db.select().from(providers);
  const reviewData = [
    { p: 0, rating: 5, comment: "Encontrei um eletricista rapidamente e consegui comparar as avaliações antes de contratar. Serviço perfeito!", service: "Instalação elétrica" },
    { p: 1, rating: 5, comment: "Resolveu o vazamento no mesmo dia. Profissional pontual e muito cuidadoso com o apartamento.", service: "Vazamentos" },
    { p: 2, rating: 5, comment: "Pintura ficou impecável, preço justo e tudo combinado pela plataforma. Recomendo demais!", service: "Pintura interna" },
    { p: 4, rating: 4, comment: "Formatou meu notebook e ainda melhorou o desempenho. Atendimento rápido pelo chat.", service: "Formatação de computador" },
    { p: 5, rating: 5, comment: "Instalou o ar-condicionado em menos de duas horas e explicou tudo sobre a manutenção.", service: "Instalação de split" },
    { p: 10, rating: 5, comment: "Montou todos os móveis do quarto com muito cuidado. Trabalho limpo e organizado.", service: "Montagem de móveis" },
  ];
  for (const rd of reviewData) {
    const pr = providerRows[rd.p]!;
    const past = new Date();
    past.setDate(past.getDate() - 10 - rd.p * 3);
    const [appt] = await db.insert(appointments).values({
      customerId: customerRow.id, providerId: pr.id,
      scheduledAt: past, status: "COMPLETED", isReviewed: true,
      addressText: "Teófilo Otoni - MG",
    }).returning();
    await db.insert(reviews).values({
      appointmentId: appt!.id, authorId: demoCustomerUser!.id, providerId: pr.id,
      rating: rd.rating, comment: rd.comment, status: "VISIBLE",
    });
  }

  console.log("✅ Seed concluído!");
  console.log("   Admin:     admin@encontreaqui.com / 123456");
  console.log("   Cliente:   cliente@email.com / 123456");
  console.log("   Prestador: joao@demo.com / 123456");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
