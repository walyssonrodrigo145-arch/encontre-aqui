"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertCircle, Briefcase, Eye, EyeOff, User } from "lucide-react";
import { loginAction, registerAction, type ActionState } from "@/server/actions/auth";
import { digitsOnly, isValidCNPJ, isValidCPF, maskCNPJ, maskCPF, maskPhone } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Role = "CUSTOMER" | "PROVIDER";
type PersonType = "PF" | "PJ";

interface SharedFields {
  name: string;
  email: string;
  phone: string;
  password: string;
}

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export function RegisterForm({ defaultRole }: { defaultRole: Role }) {
  const [state, action, pending] = useActionState<ActionState | undefined, FormData>(
    registerAction,
    undefined,
  );

  const [role, setRole] = useState<Role>(defaultRole);
  const [personType, setPersonType] = useState<PersonType>("PF");
  const [shared, setShared] = useState<SharedFields>({ name: "", email: "", phone: "", password: "" });
  const [docCPF, setDocCPF] = useState("");
  const [docCNPJ, setDocCNPJ] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [terms, setTerms] = useState(false);
  const [docTouched, setDocTouched] = useState(false);

  const isProvider = role === "PROVIDER";
  const isPJ = isProvider && personType === "PJ";
  const docValue = isPJ ? docCNPJ : docCPF;
  const docValid = isPJ ? isValidCNPJ(docValue) : isValidCPF(docValue);
  const docDigits = digitsOnly(docValue).length;

  const nameValid = shared.name.trim().length >= 3;
  const emailValid = EMAIL_RE.test(shared.email);
  const phoneValid = digitsOnly(shared.phone).length >= 10;
  const passValid = shared.password.length >= 6;
  const canSubmit = nameValid && emailValid && phoneValid && passValid && docValid && terms && !pending;

  const setField = (k: keyof SharedFields, v: string) => setShared((s) => ({ ...s, [k]: v }));

  const roleCards: {
    value: Role;
    icon: React.ReactNode;
    title: string;
    desc: string;
  }[] = [
    {
      value: "PROVIDER",
      icon: <Briefcase size={22} />,
      title: "Prestador de serviço",
      desc: "Ofereço meus serviços e quero encontrar clientes.",
    },
    {
      value: "CUSTOMER",
      icon: <User size={22} />,
      title: "Quero contratar um serviço",
      desc: "Preciso encontrar profissionais para realizar um serviço.",
    },
  ];

  return (
    <div className="w-full max-w-xl">
      {/* Cabeçalho */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900 md:text-3xl">Criar conta</h1>
          <p className="mt-1 text-sm text-slate-500">É rápido, gratuito e seguro.</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="hidden text-slate-500 sm:inline">Já tem uma conta?</span>
          <Link href="/entrar" className="btn-outline px-4 py-2 text-xs">
            Entrar
          </Link>
        </div>
      </div>

      {/* Seletor de tipo de conta */}
      <p className="label">Quero me cadastrar como</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {roleCards.map((card) => {
          const selected = role === card.value;
          return (
            <motion.button
              key={card.value}
              type="button"
              onClick={() => setRole(card.value)}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "relative flex items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-300 cursor-pointer",
                selected
                  ? "border-[var(--primary)] bg-[var(--primary-soft)] shadow-lg shadow-[var(--primary)]/15 ring-2 ring-[var(--primary)]/25"
                  : "border-[var(--border)] bg-white hover:border-[var(--primary)]/35",
              )}
            >
              <span
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors duration-300",
                  selected
                    ? "bg-brand-gradient text-white shadow-md shadow-[var(--primary)]/30"
                    : "bg-slate-100 text-slate-400",
                )}
              >
                {card.icon}
              </span>
              <span>
                <span className={cn("block text-sm font-bold", selected ? "text-[var(--primary-dark)]" : "text-slate-700")}>
                  {card.title}
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-slate-500">{card.desc}</span>
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Erro do servidor */}
      {state?.error && (
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-[var(--danger)]">
          <AlertCircle size={15} /> {state.error}
        </p>
      )}

      {/* ─── Formulário dinâmico (um por vez) ─── */}
      <motion.form
        key={role}
        action={action}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="mt-6 space-y-4"
      >
        <input type="hidden" name="role" value={role} />
        <input type="hidden" name="personType" value={isPJ ? "PJ" : "PF"} />

        {/* Título da seção */}
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <span
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl",
              isProvider ? "bg-[var(--primary-light)] text-[var(--primary-dark)]" : "bg-slate-100 text-slate-600",
            )}
          >
            {isProvider ? <Briefcase size={17} /> : <User size={17} />}
          </span>
          <div>
            <p className="text-sm font-bold text-slate-800">
              {isProvider ? "Dados do prestador" : "Seus dados"}
            </p>
            <p className="text-xs text-slate-500">
              {isProvider
                ? "Informe seus dados para criar sua conta profissional."
                : "Informe seus dados para contratar serviços com segurança."}
            </p>
          </div>
        </div>

        {/* Prestador: PF/PJ */}
        {isProvider && (
          <div>
            <label className="label">Tipo de cadastro</label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["PF", "Pessoa Física", "CPF"],
                  ["PJ", "Pessoa Jurídica", "CNPJ"],
                ] as const
              ).map(([value, label, docLabel]) => (
                <label key={value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="personTypeRadio"
                    className="peer sr-only"
                    checked={personType === value}
                    onChange={() => {
                      setPersonType(value);
                      setDocTouched(false);
                    }}
                  />
                  <span
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all",
                      personType === value
                        ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-dark)]"
                        : "border-[var(--border)] text-slate-500 hover:border-[var(--primary)]/35",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded-full border-2",
                        personType === value ? "border-[var(--primary)]" : "border-slate-300",
                      )}
                    >
                      {personType === value && <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />}
                    </span>
                    {label} ({docLabel})
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Documento */}
        <div>
          <label className="label" htmlFor="document">
            {isPJ ? "CNPJ" : "CPF"}
          </label>
          <input
            id="document"
            name="document"
            inputMode="numeric"
            required
            autoComplete="off"
            className={cn(
              "input",
              docTouched && !docValid && "border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger)]/10",
            )}
            placeholder={isPJ ? "00.000.000/0000-00" : "000.000.000-00"}
            value={docValue}
            onBlur={() => setDocTouched(true)}
            onChange={(e) => {
              const v = e.target.value;
              if (isPJ) setDocCNPJ(maskCNPJ(v));
              else setDocCPF(maskCPF(v));
              setDocTouched(false);
            }}
          />
          {docTouched && !docValid && (
            <p className="mt-1 text-xs text-[var(--danger)]">
              {isPJ ? "CNPJ inválido." : "CPF inválido."}
            </p>
          )}
        </div>

        {/* Nome */}
        <div>
          <label className="label" htmlFor="name">
            {isPJ ? "Nome do responsável" : "Nome completo"}
          </label>
          <input
            id="name"
            name="name"
            required
            minLength={3}
            className="input"
            placeholder={isPJ ? "Nome do responsável pela empresa" : "Seu nome completo"}
            value={shared.name}
            onChange={(e) => setField("name", e.target.value)}
          />
        </div>

        {/* E-mail */}
        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="input"
            placeholder="seu@email.com"
            value={shared.email}
            onChange={(e) => setField("email", e.target.value)}
          />
        </div>

        {/* Telefone */}
        <div>
          <label className="label" htmlFor="phone">Telefone / WhatsApp</label>
          <input
            id="phone"
            name="phone"
            inputMode="tel"
            required
            className="input"
            placeholder="(33) 99999-9999"
            value={shared.phone}
            onChange={(e) => setField("phone", maskPhone(e.target.value))}
          />
        </div>

        {/* Senha */}
        <div>
          <label className="label" htmlFor="password">Senha</label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              className="input pr-11"
              placeholder="Mínimo 6 caracteres"
              value={shared.password}
              onChange={(e) => setField("password", e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>

        {/* Termos */}
        <label className="flex items-start gap-2.5 pt-1 text-xs text-slate-500">
          <input
            type="checkbox"
            name="lgpdConsent"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded accent-[var(--primary)]"
          />
          <span>
            Li e aceito os{" "}
            <Link href="/termos" className="font-medium text-[var(--primary)] underline" target="_blank">
              Termos de uso
            </Link>{" "}
            e a{" "}
            <Link href="/privacidade" className="font-medium text-[var(--primary)] underline" target="_blank">
              Política de privacidade
            </Link>{" "}
            (LGPD).
          </span>
        </label>

        {/* Submit */}
        <button
          type="submit"
          disabled={!canSubmit}
          title={
            !canSubmit
              ? docDigits === 0
                ? "Preencha os campos para continuar"
                : !docValid
                  ? "Documento inválido"
                  : !terms
                    ? "Aceite os termos para continuar"
                    : "Preencha todos os campos corretamente"
              : undefined
          }
          className="btn-gradient w-full py-3.5 text-base"
        >
          {pending ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Criando conta...
            </span>
          ) : (
            "Criar conta"
          )}
        </button>
      </motion.form>
    </div>
  );
}

export function LoginForm() {
  const [state, action, pending] = useActionState<ActionState | undefined, FormData>(loginAction, undefined);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="w-full max-w-md">
      <div className="mb-7 text-center lg:text-left">
        <h1 className="font-display text-2xl font-extrabold text-slate-900 md:text-3xl">Bem-vindo de volta</h1>
        <p className="mt-1 text-sm text-slate-500">Entre para acessar sua conta</p>
      </div>
      <form action={action} className="space-y-4">
        {state?.error && (
          <p className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-[var(--danger)]">
            <AlertCircle size={15} /> {state.error}
          </p>
        )}
        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" required className="input" placeholder="voce@email.com" />
        </div>
        <div>
          <label className="label" htmlFor="password">Senha</label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              className="input pr-11"
              placeholder="••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>
        <button disabled={pending} className="btn-gradient w-full py-3">
          {pending ? "Entrando..." : "Entrar"}
        </button>
        <p className="text-center text-sm text-slate-500">
          Não tem conta?{" "}
          <Link href="/cadastro" className="font-semibold text-[var(--primary)]">
            Cadastre-se
          </Link>
        </p>
      </form>
      {process.env.NODE_ENV !== "production" && (
        <div className="mt-6 rounded-xl bg-[var(--primary-soft)] p-3.5 text-center text-xs text-slate-500">
          <p className="font-semibold text-[var(--primary-dark)]">Contas de demonstração (senha: 123456)</p>
          <p className="mt-0.5">cliente@email.com · joao@demo.com · admin@encontreaqui.com</p>
        </div>
      )}
    </div>
  );
}

