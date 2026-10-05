import { relations } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const ts = (name: string) => integer(name, { mode: "timestamp" });
const now = () => new Date();

// ───────────────────────────── IDENTIDADE ─────────────────────────────

export const users = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    role: text("role", { enum: ["CUSTOMER", "PROVIDER", "ADMIN"] })
      .notNull()
      .default("CUSTOMER"),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    passwordHash: text("password_hash").notNull(),
    avatarUrl: text("avatar_url"),
    documentEncrypted: text("document_encrypted"),
    status: text("status", { enum: ["ACTIVE", "SUSPENDED", "BLOCKED"] })
      .notNull()
      .default("ACTIVE"),
    phoneVerified: integer("phone_verified", { mode: "boolean" })
      .notNull()
      .default(false),
    lgpdConsentAt: ts("lgpd_consent_at"),
    createdAt: ts("created_at").notNull().$defaultFn(now),
  },
  (t) => [
    uniqueIndex("users_email_uq").on(t.email),
    uniqueIndex("users_document_uq").on(t.documentEncrypted),
  ],
);

export const customers = sqliteTable(
  "customers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    city: text("city"),
    state: text("state"),
    addressText: text("address_text"),
    lat: real("lat"),
    lng: real("lng"),
  },
  (t) => [index("customers_user_idx").on(t.userId)],
);

// ───────────────────────────── PRESTADOR ─────────────────────────────

export const providers = sqliteTable(
  "providers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    slug: text("slug").notNull(),
    headline: text("headline"),
    bio: text("bio"),
    cpfCnpjEncrypted: text("cpf_cnpj_encrypted"),
    asaasCustomerId: text("asaas_customer_id"),
    trialUsed: integer("trial_used", { mode: "boolean" }).notNull().default(false),
    cep: text("cep"),
    city: text("city"),
    state: text("state"),
    neighborhood: text("neighborhood"),
    addressText: text("address_text"),
    lat: real("lat"),
    lng: real("lng"),
    /** exibir o ponto fixo (pin no mapa + endereço) publicamente */
    publicLocation: integer("public_location", { mode: "boolean" }).notNull().default(false),
    serviceRadiusKm: real("service_radius_km").notNull().default(15),
    emergency: integer("emergency", { mode: "boolean" }).notNull().default(false),
    experienceYears: integer("experience_years"),
    certifications: text("certifications"),
    verificationLevel: text("verification_level", {
      enum: ["NONE", "PHONE", "PROFILE", "DOCUMENTS"],
    })
      .notNull()
      .default("NONE"),
    status: text("status", {
      enum: ["DRAFT", "PENDING", "APPROVED", "SUSPENDED", "REJECTED"],
    })
      .notNull()
      .default("DRAFT"),
    rejectionReason: text("rejection_reason"),
    responseRate: real("response_rate").notNull().default(0),
    completedJobs: integer("completed_jobs").notNull().default(0),
    ratingAvg: real("rating_avg").notNull().default(0),
    ratingCount: integer("rating_count").notNull().default(0),
    planId: integer("plan_id"),
    whatsapp: text("whatsapp"),
    onboardingStep: integer("onboarding_step").notNull().default(1),
    createdAt: ts("created_at").notNull().$defaultFn(now),
  },
  (t) => [
    uniqueIndex("providers_slug_uq").on(t.slug),
    index("providers_user_idx").on(t.userId),
    index("providers_status_rating_idx").on(t.status, t.ratingAvg),
    index("providers_city_idx").on(t.city),
  ],
);

// ───────────────────────────── CATÁLOGO ─────────────────────────────

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  icon: text("icon").notNull().default("wrench"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const subcategories = sqliteTable(
  "subcategories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
  },
  (t) => [index("subcategories_category_idx").on(t.categoryId)],
);

export const services = sqliteTable("services", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  subcategoryId: integer("subcategory_id")
    .notNull()
    .references(() => subcategories.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
});

export const providerServices = sqliteTable(
  "provider_services",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    providerId: integer("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    serviceId: integer("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    priceType: text("price_type", { enum: ["FIXED", "RANGE", "ON_QUOTE"] })
      .notNull()
      .default("ON_QUOTE"),
    priceMin: integer("price_min"),
    priceMax: integer("price_max"),
  },
  (t) => [
    uniqueIndex("provider_service_uq").on(t.providerId, t.serviceId),
    index("provider_service_service_idx").on(t.serviceId),
  ],
);

export const providerLocations = sqliteTable("provider_locations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  providerId: integer("provider_id")
    .notNull()
    .references(() => providers.id, { onDelete: "cascade" }),
  city: text("city").notNull(),
  state: text("state").notNull(),
  neighborhood: text("neighborhood"),
});

// ───────────────────────────── AGENDA ─────────────────────────────

export const providerAvailability = sqliteTable(
  "provider_availability",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    providerId: integer("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    weekday: integer("weekday").notNull(), // 0=dom .. 6=sáb
    startTime: text("start_time").notNull(), // "08:00"
    endTime: text("end_time").notNull(), // "18:00"
    slotMinutes: integer("slot_minutes").notNull().default(120),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  },
  (t) => [index("availability_provider_idx").on(t.providerId, t.weekday)],
);

export const blockedDates = sqliteTable(
  "blocked_dates",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    providerId: integer("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // "2026-09-01"
    reason: text("reason"),
  },
  (t) => [index("blocked_provider_date_idx").on(t.providerId, t.date)],
);

// ───────────────────────────── FINANCEIRO ─────────────────────────────

export const providerFinances = sqliteTable(
  "provider_finances",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    providerId: integer("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["INCOME", "EXPENSE"] }).notNull(),
    title: text("title").notNull(),
    amountCents: integer("amount_cents").notNull(),
    occurredAt: text("occurred_at").notNull(), // "yyyy-mm-dd" (BRT)
    category: text("category").notNull().default("outro"),
    notes: text("notes"),
    source: text("source", { enum: ["MANUAL", "PLATFORM"] })
      .notNull()
      .default("MANUAL"),
    appointmentId: integer("appointment_id"),
    createdAt: ts("created_at").notNull().$defaultFn(now),
  },
  (t) => [
    index("finances_provider_date_idx").on(t.providerId, t.occurredAt),
    index("finances_appointment_idx").on(t.appointmentId),
  ],
);

// ───────────────────────────── PORTFÓLIO ─────────────────────────────

export const portfolio = sqliteTable("portfolio", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  providerId: integer("provider_id")
    .notNull()
    .references(() => providers.id, { onDelete: "cascade" }),
  mediaUrl: text("media_url").notNull(),
  mediaType: text("media_type", { enum: ["IMAGE", "VIDEO"] })
    .notNull()
    .default("IMAGE"),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: ts("created_at").notNull().$defaultFn(now),
});

// ───────────────────────────── ORÇAMENTOS ─────────────────────────────

export const quotes = sqliteTable(
  "quotes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    providerId: integer("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    serviceId: integer("service_id").references(() => services.id),
    description: text("description").notNull(),
    urgency: text("urgency", { enum: ["NORMAL", "URGENT", "EMERGENCY"] })
      .notNull()
      .default("NORMAL"),
    desiredDate: text("desired_date"),
    addressText: text("address_text"),
    lat: real("lat"),
    lng: real("lng"),
    status: text("status", { enum: ["OPEN", "ANSWERED", "ACCEPTED", "CLOSED"] })
      .notNull()
      .default("OPEN"),
    createdAt: ts("created_at").notNull().$defaultFn(now),
  },
  (t) => [
    index("quotes_customer_idx").on(t.customerId),
    index("quotes_provider_idx").on(t.providerId, t.status),
  ],
);

export const quoteItems = sqliteTable("quote_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  quoteId: integer("quote_id")
    .notNull()
    .references(() => quotes.id, { onDelete: "cascade" }),
  mediaUrl: text("media_url"),
  mediaType: text("media_type", { enum: ["IMAGE", "VIDEO"] })
    .notNull()
    .default("IMAGE"),
});

export const quoteResponses = sqliteTable(
  "quote_responses",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    quoteId: integer("quote_id")
      .notNull()
      .references(() => quotes.id, { onDelete: "cascade" }),
    providerId: integer("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    price: integer("price").notNull(),
    estimatedDays: integer("estimated_days"),
    note: text("note"),
    status: text("status", { enum: ["SENT", "ACCEPTED", "REJECTED"] })
      .notNull()
      .default("SENT"),
    createdAt: ts("created_at").notNull().$defaultFn(now),
  },
  (t) => [index("quote_resp_quote_idx").on(t.quoteId)],
);

// ───────────────────────────── AGENDAMENTOS ─────────────────────────────

export const appointments = sqliteTable(
  "appointments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    providerId: integer("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    quoteId: integer("quote_id").references(() => quotes.id),
    quoteResponseId: integer("quote_response_id").references(
      () => quoteResponses.id,
    ),
    serviceId: integer("service_id").references(() => services.id),
    scheduledAt: ts("scheduled_at").notNull(),
    durationMinutes: integer("duration_minutes").notNull().default(120),
    addressText: text("address_text"),
    status: text("status", {
      enum: [
        "BOOKING_REQUESTED",
        "BOOKING_CONFIRMED",
        "ON_THE_WAY",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELLED",
        "RESCHEDULE_PROPOSED",
      ],
    })
      .notNull()
      .default("BOOKING_REQUESTED"),
    proposedAt: ts("proposed_at"),
    cancelledBy: text("cancelled_by", { enum: ["CUSTOMER", "PROVIDER", "ADMIN"] }),
    cancellationReason: text("cancellation_reason"),
    isReviewed: integer("is_reviewed", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: ts("created_at").notNull().$defaultFn(now),
    updatedAt: ts("updated_at").notNull().$defaultFn(now),
  },
  (t) => [
    index("appt_provider_time_idx").on(t.providerId, t.scheduledAt),
    index("appt_customer_time_idx").on(t.customerId, t.scheduledAt),
  ],
);

// ───────────────────────────── AVALIAÇÕES ─────────────────────────────

export const reviews = sqliteTable(
  "reviews",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    appointmentId: integer("appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    authorId: integer("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerId: integer("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    quality: integer("quality"),
    punctuality: integer("punctuality"),
    service: integer("service"),
    costBenefit: integer("cost_benefit"),
    comment: text("comment"),
    status: text("status", { enum: ["VISIBLE", "REPORTED", "REMOVED"] })
      .notNull()
      .default("VISIBLE"),
    providerReply: text("provider_reply"),
    createdAt: ts("created_at").notNull().$defaultFn(now),
  },
  (t) => [
    uniqueIndex("review_appointment_uq").on(t.appointmentId),
    index("review_provider_idx").on(t.providerId, t.status),
  ],
);

// ───────────────────────────── FAVORITOS ─────────────────────────────

export const favorites = sqliteTable(
  "favorites",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    providerId: integer("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    createdAt: ts("created_at").notNull().$defaultFn(now),
  },
  (t) => [uniqueIndex("favorite_uq").on(t.customerId, t.providerId)],
);

// ───────────────────────────── CHAT ─────────────────────────────

export const conversations = sqliteTable(
  "conversations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    providerId: integer("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    lastMessageAt: ts("last_message_at").notNull().$defaultFn(now),
    createdAt: ts("created_at").notNull().$defaultFn(now),
  },
  (t) => [uniqueIndex("conversation_uq").on(t.customerId, t.providerId)],
);

export const messages = sqliteTable(
  "messages",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    conversationId: integer("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: integer("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content"),
    mediaUrl: text("media_url"),
    messageType: text("message_type", {
      enum: ["TEXT", "IMAGE", "FILE", "LOCATION", "QUOTE"],
    })
      .notNull()
      .default("TEXT"),
    metadata: text("metadata"),
    isFlagged: integer("is_flagged", { mode: "boolean" }).notNull().default(false),
    createdAt: ts("created_at").notNull().$defaultFn(now),
  },
  (t) => [index("messages_conv_idx").on(t.conversationId, t.createdAt)],
);

// ───────────────────────────── MONETIZAÇÃO ─────────────────────────────

export const subscriptionPlans = sqliteTable("subscription_plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  priceCents: integer("price_cents").notNull(),
  maxPhotos: integer("max_photos").notNull().default(5),
  maxPortfolio: integer("max_portfolio").notNull().default(3),
  allowVideos: integer("allow_videos", { mode: "boolean" }).notNull().default(false),
  searchBoost: real("search_boost").notNull().default(0),
  featuredBadge: integer("featured_badge", { mode: "boolean" }).notNull().default(false),
  advancedStats: integer("advanced_stats", { mode: "boolean" }).notNull().default(false),
  prioritySupport: integer("priority_support", { mode: "boolean" }).notNull().default(false),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    providerId: integer("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    planId: integer("plan_id")
      .notNull()
      .references(() => subscriptionPlans.id),
    gatewaySubscriptionId: text("gateway_subscription_id"),
    status: text("status", {
      enum: ["ACTIVE", "PAST_DUE", "CANCELED", "PENDING_PAYMENT"],
    })
      .notNull()
      .default("PENDING_PAYMENT"),
    currentPeriodStart: ts("current_period_start").notNull().$defaultFn(now),
    currentPeriodEnd: ts("current_period_end").notNull(),
    cancelAtPeriodEnd: integer("cancel_at_period_end", { mode: "boolean" })
      .notNull()
      .default(false),
    canceledAt: ts("canceled_at"),
    createdAt: ts("created_at").notNull().$defaultFn(now),
  },
  (t) => [index("subs_provider_idx").on(t.providerId, t.status)],
);

export const payments = sqliteTable(
  "payments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    providerId: integer("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    subscriptionId: integer("subscription_id").references(() => subscriptions.id),
    boostId: integer("boost_id"),
    amountCents: integer("amount_cents").notNull(),
    description: text("description"),
    method: text("method", { enum: ["PIX", "CARD", "MANUAL"] })
      .notNull()
      .default("PIX"),
    status: text("status", {
      enum: ["PENDING", "CONFIRMED", "FAILED", "REFUNDED"],
    })
      .notNull()
      .default("PENDING"),
    gatewayPaymentId: text("gateway_payment_id"),
    paidAt: ts("paid_at"),
    createdAt: ts("created_at").notNull().$defaultFn(now),
  },
  (t) => [
    index("payments_provider_idx").on(t.providerId),
    uniqueIndex("payments_gateway_uq").on(t.gatewayPaymentId),
  ],
);

export const boosts = sqliteTable(
  "boosts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    providerId: integer("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["BASIC", "REGIONAL", "FEATURED"] }).notNull(),
    multiplier: real("multiplier").notNull().default(0.15),
    priceCents: integer("price_cents").notNull(),
    startsAt: ts("starts_at").notNull().$defaultFn(now),
    endsAt: ts("ends_at").notNull(),
    status: text("status", { enum: ["PENDING_PAYMENT", "ACTIVE", "EXPIRED", "CANCELLED"] })
      .notNull()
      .default("PENDING_PAYMENT"),
    createdAt: ts("created_at").notNull().$defaultFn(now),
  },
  (t) => [index("boosts_provider_idx").on(t.providerId, t.status)],
);

// ───────────────────────────── PLATAFORMA ─────────────────────────────

export const notifications = sqliteTable(
  "notifications",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    channel: text("channel", { enum: ["INAPP", "EMAIL", "WHATSAPP", "PUSH"] })
      .notNull()
      .default("INAPP"),
    link: text("link"),
    referenceType: text("reference_type"),
    referenceId: integer("reference_id"),
    readAt: ts("read_at"),
    createdAt: ts("created_at").notNull().$defaultFn(now),
  },
  (t) => [index("notif_user_idx").on(t.userId, t.readAt)],
);

export const reports = sqliteTable("reports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  reporterId: integer("reporter_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  targetType: text("target_type", { enum: ["REVIEW", "USER", "MESSAGE", "PROVIDER"] }).notNull(),
  targetId: integer("target_id").notNull(),
  reason: text("reason").notNull(),
  status: text("status", { enum: ["PENDING", "RESOLVED", "DISMISSED"] })
    .notNull()
    .default("PENDING"),
  resolutionNote: text("resolution_note"),
  createdAt: ts("created_at").notNull().$defaultFn(now),
});

export const adminLogs = sqliteTable("admin_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  adminId: integer("admin_id")
    .notNull()
    .references(() => users.id),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: integer("target_id"),
  metadata: text("metadata"),
  createdAt: ts("created_at").notNull().$defaultFn(now),
});

export const providerStats = sqliteTable("provider_stats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  providerId: integer("provider_id")
    .notNull()
    .references(() => providers.id, { onDelete: "cascade" }),
  profileViews: integer("profile_views").notNull().default(0),
  contactClicks: integer("contact_clicks").notNull().default(0),
  quotesReceived: integer("quotes_received").notNull().default(0),
  quotesSent: integer("quotes_sent").notNull().default(0),
  date: text("date").notNull(),
});

export const rankingConfig = sqliteTable("ranking_config", {
  key: text("key").primaryKey(),
  value: real("value").notNull(),
  description: text("description"),
});

// ───────────────────────────── RELATIONS ─────────────────────────────

export const usersRelations = relations(users, ({ one, many }) => ({
  provider: one(providers, { fields: [users.id], references: [providers.userId] }),
  customer: one(customers, { fields: [users.id], references: [customers.userId] }),
  notifications: many(notifications),
}));

export const providersRelations = relations(providers, ({ one, many }) => ({
  user: one(users, { fields: [providers.userId], references: [users.id] }),
  plan: one(subscriptionPlans, { fields: [providers.planId], references: [subscriptionPlans.id] }),
  services: many(providerServices),
  portfolio: many(portfolio),
  reviews: many(reviews),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  subcategories: many(subcategories),
}));

export const subcategoriesRelations = relations(subcategories, ({ one, many }) => ({
  category: one(categories, {
    fields: [subcategories.categoryId],
    references: [categories.id],
  }),
  services: many(services),
}));

export const servicesRelations = relations(services, ({ one }) => ({
  subcategory: one(subcategories, {
    fields: [services.subcategoryId],
    references: [subcategories.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type Provider = typeof providers.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Quote = typeof quotes.$inferSelect;
export type QuoteResponse = typeof quoteResponses.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Boost = typeof boosts.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
