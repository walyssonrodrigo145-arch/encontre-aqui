import { z } from "zod";

export const registerSchema = z
  .object({
    name: z.string().min(3, "Informe seu nome completo").max(120),
    email: z.string().email("E-mail inválido"),
    phone: z.string().min(10, "Telefone inválido").max(15),
    password: z.string().min(6, "Senha deve ter ao menos 6 caracteres").max(72),
    role: z.enum(["CUSTOMER", "PROVIDER"]),
    personType: z.enum(["PF", "PJ"]).default("PF"),
    document: z
      .string()
      .transform((v) => v.replace(/\D/g, ""))
      .pipe(z.string().min(11, "Documento inválido").max(14)),
    lgpdConsent: z.literal(true, { message: "É necessário aceitar os termos" }),
  })
  .refine((d) => (d.role === "CUSTOMER" ? d.personType === "PF" : true), {
    message: "Clientes devem se cadastrar com CPF",
    path: ["personType"],
  })
  .refine((d) => (d.personType === "PF" ? d.document.length === 11 : d.document.length === 14), {
    message: "Documento não corresponde ao tipo de pessoa selecionado",
    path: ["document"],
  });

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

export const quoteRequestSchema = z.object({
  providerId: z.number({ message: "Profissional inválido." }),
  serviceId: z.number().optional(),
  description: z.string().min(10, "Descreva o que precisa (mínimo 10 caracteres)").max(2000),
  urgency: z.enum(["NORMAL", "URGENT", "EMERGENCY"]),
  desiredDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data desejada inválida")
    .max(10)
    .optional(),
  addressText: z.string().min(3).max(200),
});

export const quoteResponseSchema = z.object({
  quoteId: z.number({ message: "Solicitação inválida." }),
  price: z.number().min(1, "Informe o valor"),
  estimatedDays: z.number().min(0, "Prazo inválido").max(365, "Prazo inválido").optional(),
  note: z.string().max(1000, "Observação muito longa (máx. 1000 caracteres)").optional(),
});

export const bookingSchema = z.object({
  providerId: z.number({ message: "Profissional inválido." }),
  serviceId: z.number().optional(),
  quoteId: z.number().optional(),
  quoteResponseId: z.number().optional(),
  scheduledAt: z.string().min(1, "Escolha data e horário"),
  addressText: z.string().min(3).max(200),
});

export const reviewSchema = z.object({
  appointmentId: z.number({ message: "Agendamento inválido." }),
  rating: z.number().min(1, "Escolha uma nota de 1 a 5").max(5, "Escolha uma nota de 1 a 5"),
  quality: z.number().min(1).max(5).optional(),
  punctuality: z.number().min(1).max(5).optional(),
  service: z.number().min(1).max(5).optional(),
  costBenefit: z.number().min(1).max(5).optional(),
  comment: z.string().max(1000, "Comentário muito longo (máx. 1000 caracteres)").optional(),
});

export const messageSchema = z.object({
  conversationId: z.number().optional(),
  providerId: z.number().optional(),
  content: z.string().min(1).max(2000),
});

export const profileUpdateSchema = z.object({
  name: z.string().min(3, "Informe seu nome completo").max(120),
  phone: z.string().max(20).optional(),
  // cliente
  city: z.string().max(80).optional(),
  state: z.string().max(2).optional(),
  addressText: z.string().max(200, "Endereço muito longo (máx. 200 caracteres)").optional(),
  // prestador
  displayName: z.string().min(3, "Nome profissional muito curto").max(120).optional(),
  headline: z.string().max(160, "Título muito longo (máx. 160 caracteres)").optional(),
  bio: z.string().max(2000, "Descrição muito longa (máx. 2000 caracteres)").optional(),
  experienceYears: z.number().int().min(0).max(70, "Máximo de 70 anos").optional(),
  certifications: z.string().max(500, "Máx. 500 caracteres").optional(),
  whatsapp: z.string().max(20).optional(),
  cep: z.string().max(9).optional(),
  neighborhood: z.string().max(80).optional(),
  serviceRadiusKm: z.number().min(1, "Raio entre 1 e 200 km").max(200, "Raio entre 1 e 200 km").optional(),
  emergency: z.boolean().optional(),
  // ponto fixo (prestador)
  providerAddress: z.string().max(200, "Endereço muito longo (máx. 200 caracteres)").optional(),
  publicLocation: z.boolean().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
