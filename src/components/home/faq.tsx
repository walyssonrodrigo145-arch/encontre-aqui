"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Headset, Mail } from "lucide-react";
import { FadeIn } from "@/components/motion";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    q: "Como funciona o Encontre Aqui?",
    a: "Você busca o serviço que precisa, informa sua localização e recebe uma lista de profissionais verificados da sua região. Compare perfis, avaliações e preços, solicite orçamentos e agende — tudo em um só lugar.",
  },
  {
    q: "Os profissionais são verificados?",
    a: "Sim. Analisamos os dados cadastrais de cada prestador antes de aprovar o perfil. Profissionais com o selo 'Verificado' passaram por verificação de telefone, perfil ou documentação.",
  },
  {
    q: "Como encontro um profissional perto de mim?",
    a: "Digite o serviço na busca e informe sua cidade. O sistema mostra os profissionais que atendem na sua região, ordenados por relevância, avaliações e distância.",
  },
  {
    q: "Posso comparar vários profissionais?",
    a: "Pode e deve! Solicite orçamentos para quantos profissionais quiser e compare preços, prazos e avaliações antes de decidir — sem compromisso.",
  },
  {
    q: "Como funciona o orçamento?",
    a: "Você descreve o que precisa e o profissional responde com o valor estimado e o prazo. Você pode aceitar a proposta que preferir e agendar o serviço direto pela plataforma.",
  },
  {
    q: "O serviço é pago pelo Encontre Aqui?",
    a: "Atualmente o pagamento é combinado diretamente entre você e o profissional. A plataforma cobra mensalidade apenas dos prestadores para manterem seus perfis ativos.",
  },
  {
    q: "Como me torno um prestador?",
    a: "Clique em 'Quero ser prestador', crie sua conta, complete o cadastro profissional e escolha um plano. Após a aprovação, seu perfil começa a aparecer nas buscas da sua região.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="mx-auto w-full max-w-7xl scroll-mt-20 px-4 py-12 md:px-6 md:py-16">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
        {/* coluna esquerda */}
        <FadeIn>
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/15 bg-[var(--primary-soft)] px-4 py-1.5 text-[13px] font-semibold text-[var(--primary-dark)]">
            FAQ
          </span>
          <h2 className="font-display mt-4 text-2xl font-extrabold leading-tight text-slate-900 md:text-3xl">
            Perguntas <span className="text-brand-gradient">frequentes</span>
          </h2>
          <p className="mt-2 max-w-md text-[15px] leading-relaxed text-slate-500">
            Tudo o que você precisa saber antes de contratar. Não achou sua resposta? Fale
            direto com a nossa equipe.
          </p>

          <div className="card mt-7 p-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-[0_6px_16px_rgba(109,74,255,0.3)]">
              <Headset size={20} />
            </span>
            <h3 className="font-display mt-3.5 text-base font-bold text-slate-900">
              Ainda tem dúvidas?
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              Nosso time responde rápido e te ajuda a encontrar o profissional certo.
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <a
                href="https://wa.me/5533999990000"
                target="_blank"
                rel="noreferrer"
                className="btn-gradient px-4 py-2 text-sm"
              >
                Falar no WhatsApp
              </a>
              <a href="mailto:contato@encontreaqui.com.br" className="btn-outline px-4 py-2 text-sm">
                <Mail size={15} /> Enviar e-mail
              </a>
            </div>
          </div>
        </FadeIn>

        {/* coluna direita: acordeão */}
        <div className="space-y-3">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <FadeIn key={item.q} delay={i * 0.03}>
                <div
                  className={cn(
                    "card overflow-hidden transition-colors",
                    isOpen && "border-[var(--primary)]/40",
                  )}
                >
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className="text-sm font-semibold text-slate-800 md:text-[15px]">{item.q}</span>
                    <ChevronDown
                      size={18}
                      className={cn(
                        "shrink-0 text-slate-400 transition-transform duration-300",
                        isOpen && "rotate-180 text-[var(--primary)]",
                      )}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <p className="px-5 pb-5 text-sm leading-relaxed text-slate-600">{item.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
