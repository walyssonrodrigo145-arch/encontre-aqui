"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, ArrowRight, Crosshair, Loader2, Plus, Trash2 } from "lucide-react";
import {
  saveStep1Action,
  saveStep2Action,
  saveStep3Action,
  saveStep4Action,
  saveStep5Action,
  saveStep6Action,
  saveStep7Action,
  saveStep8Action,
  type OnboardingState,
} from "@/server/actions/provider-onboarding";
import { WEEKDAYS } from "@/lib/utils";
import { lookupCep, maskCep } from "@/lib/cep";
import { MapPicker } from "./map";

interface CatalogCategory {
  id: number;
  name: string;
  subcategories: { id: number; name: string; services: { id: number; name: string }[] }[];
}

interface WizardProps {
  step: number;
  categories: CatalogCategory[];
  initial: {
    displayName: string;
    city: string;
    state: string;
    neighborhood: string;
    cep: string;
    addressText: string;
    lat: number;
    lng: number;
    headline: string;
    bio: string;
    experienceYears: number | null;
    certifications: string;
    selectedSubcategoryIds: number[];
    selectedServiceIds: number[];
    priceType: "FIXED" | "RANGE" | "ON_QUOTE";
    priceMin: string;
    priceMax: string;
    emergency: boolean;
    serviceRadiusKm: number;
    availability: Record<number, { startTime: string; endTime: string }>;
    portfolio: { description: string }[];
  };
}

const STEPS = [
  "Dados pessoais",
  "Localização",
  "Profissão",
  "Serviços",
  "Experiência",
  "Portfólio",
  "Preços",
  "Disponibilidade",
];

function ErrorBox({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">
      <AlertCircle size={15} /> {error}
    </p>
  );
}

function StepHeader({ current }: { current: number }) {
  return (
    <div className="mb-6">
      <p className="text-sm font-medium text-[var(--primary)]">
        Etapa {current} de 8 — {STEPS[current - 1]}
      </p>
      <div className="mt-2 flex gap-1">
        {STEPS.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i < current ? "bg-[var(--primary)]" : "bg-slate-200"}`}
          />
        ))}
      </div>
    </div>
  );
}

export function OnboardingWizard({ step, categories, initial }: WizardProps) {
  const router = useRouter();
  const [current, setCurrent] = useState(step);
  const [topError, setTopError] = useState<string>();
  const [pending, startTransition] = useTransition();

  // passo 3
  const [selectedCats, setSelectedCats] = useState<number[]>(() => {
    const s = new Set<number>();
    for (const c of categories) {
      if (c.subcategories.some((sub) => initial.selectedSubcategoryIds.includes(sub.id))) s.add(c.id);
    }
    return [...s];
  });
  const [selectedSubs, setSelectedSubs] = useState<number[]>(initial.selectedSubcategoryIds);
  // passo 4
  const [selectedServices, setSelectedServices] = useState<number[]>(initial.selectedServiceIds);
  // passo 6
  const [portfolioItems, setPortfolioItems] = useState(initial.portfolio.length ? initial.portfolio : []);
  // passo 8
  const [availability, setAvailability] = useState<Record<number, { startTime: string; endTime: string }>>(
    initial.availability,
  );
  const [emergency, setEmergency] = useState(initial.emergency);
  const [radius, setRadius] = useState(initial.serviceRadiusKm);
  // passo 2 — localização
  const [coords, setCoords] = useState({ lat: initial.lat, lng: initial.lng });

  const servicesForSelectedSubs = categories
    .flatMap((c) => c.subcategories)
    .filter((sub) => selectedSubs.includes(sub.id))
    .flatMap((sub) => sub.services);

  const validServiceIds = new Set(servicesForSelectedSubs.map((s) => s.id));
  const effectiveSelected = selectedServices.filter((id) => validServiceIds.has(id));

  const goTo = (n: number) => {
    setTopError(undefined);
    setCurrent(n);
    window.scrollTo({ top: 0 });
  };

  const runAction = (fn: () => Promise<OnboardingState>, nextStep?: number) => {
    startTransition(async () => {
      const res = await fn();
      if (res.error) {
        setTopError(res.error);
        return;
      }
      if (nextStep != null) goTo(nextStep);
      else router.refresh();
    });
  };

  return (
    <div className="mx-auto max-w-2xl">
      <StepHeader current={current} />
      <div className="card p-6">
        <ErrorBox error={topError} />

        {/* ETAPA 1 */}
        {current === 1 && (
          <form action={(fd) => runAction(() => saveStep1Action(undefined, fd), 2)} className="space-y-4">
            <div>
              <h2 className="font-display font-bold text-slate-800">Identidade profissional</h2>
              <p className="text-sm text-slate-500">Seus dados pessoais e de contato já foram cadastrados. Agora defina como os clientes vão ver você.</p>
            </div>
            <div>
              <label className="label">Nome profissional / Empresa</label>
              <input name="displayName" required minLength={3} defaultValue={initial.displayName} className="input" placeholder="Ex: João Eletricista" />
              <p className="mt-1 text-xs text-slate-400">É o nome que aparece no seu perfil público</p>
            </div>
            <div>
              <label className="label">WhatsApp profissional</label>
              <input name="whatsapp" required className="input" placeholder="(33) 99999-9999" />
            </div>
            <Nav pending={pending} onNext={() => {}} />
          </form>
        )}

        {/* ETAPA 2 */}
        {current === 2 && (
          <Step2
            initial={initial}
            coords={coords}
            setCoords={setCoords}
            pending={pending}
            onNext={(fd) => runAction(() => saveStep2Action(undefined, fd), 3)}
            onBack={() => goTo(1)}
          />
        )}

        {/* ETAPA 3 */}
        {current === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-bold text-slate-800">Em quais áreas você trabalha?</h2>
              <p className="text-sm text-slate-500">Selecione uma ou mais categorias</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((c) => (
                <label key={c.id} className="cursor-pointer">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={selectedCats.includes(c.id)}
                    onChange={(e) => {
                      setSelectedCats((prev) => (e.target.checked ? [...prev, c.id] : prev.filter((x) => x !== c.id)));
                      if (!e.target.checked) {
                        setSelectedSubs((prev) =>
                          prev.filter((sid) => !c.subcategories.some((sub) => sub.id === sid)),
                        );
                      }
                    }}
                  />
                  <span className="block rounded-xl border border-[var(--border)] px-3 py-2.5 text-center text-sm font-medium text-slate-600 peer-checked:border-[var(--primary)] peer-checked:bg-[var(--primary-light)] peer-checked:text-[var(--primary-dark)]">
                    {c.name}
                  </span>
                </label>
              ))}
            </div>

            {selectedCats.length > 0 && (
              <div>
                <p className="label mt-4">Especialidades</p>
                <div className="flex flex-wrap gap-2">
                  {categories
                    .filter((c) => selectedCats.includes(c.id))
                    .flatMap((c) => c.subcategories)
                    .map((sub) => (
                      <label key={sub.id} className="cursor-pointer">
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={selectedSubs.includes(sub.id)}
                          onChange={(e) =>
                            setSelectedSubs((prev) =>
                              e.target.checked ? [...prev, sub.id] : prev.filter((x) => x !== sub.id),
                            )
                          }
                        />
                        <span className="inline-block rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-slate-600 peer-checked:border-[var(--primary)] peer-checked:bg-[var(--primary-light)] peer-checked:text-[var(--primary-dark)]">
                          {sub.name}
                        </span>
                      </label>
                    ))}
                </div>
              </div>
            )}

            <Nav
              pending={pending}
              onBack={() => goTo(2)}
              onNext={() =>
                runAction(
                  () => saveStep3Action(selectedCats, selectedSubs),
                  4,
                )
              }
            />
          </div>
        )}

        {/* ETAPA 4 */}
        {current === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-bold text-slate-800">Quais serviços você oferece?</h2>
              <p className="text-sm text-slate-500">
                {selectedSubs.length === 0
                  ? "Volte e selecione especialidades primeiro."
                  : "Selecione todos que se aplicam"}
              </p>
            </div>
            <div className="max-h-72 space-y-1.5 overflow-y-auto rounded-xl border border-[var(--border)] p-3">
              {servicesForSelectedSubs.map((s) => (
                <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={effectiveSelected.includes(s.id)}
                    onChange={(e) =>
                      setSelectedServices((prev) => (e.target.checked ? [...prev, s.id] : prev.filter((x) => x !== s.id)))
                    }
                    className="accent-[var(--primary)]"
                  />
                  <span className="text-sm text-slate-700">{s.name}</span>
                </label>
              ))}
            </div>
            <Nav
              pending={pending}
              onBack={() => goTo(3)}
              onNext={() => runAction(() => saveStep4Action(effectiveSelected), 5)}
            />
          </div>
        )}

        {/* ETAPA 5 */}
        {current === 5 && (
          <Step5 initial={initial} pending={pending} onNext={(fd) => runAction(() => saveStep5Action(undefined, fd), 6)} onBack={() => goTo(4)} />
        )}

        {/* ETAPA 6 */}
        {current === 6 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-bold text-slate-800">Portfólio</h2>
              <p className="text-sm text-slate-500">
                Descreva trabalhos que você já realizou (fotos podem ser adicionadas depois pelo painel)
              </p>
            </div>
            {portfolioItems.map((item, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="input"
                  placeholder={`Trabalho ${i + 1}: ex. "Instalação elétrica completa — casa no Centro"`}
                  value={item.description}
                  onChange={(e) =>
                    setPortfolioItems((prev) => prev.map((it, idx) => (idx === i ? { description: e.target.value } : it)))
                  }
                />
                <button
                  type="button"
                  className="btn-ghost shrink-0 text-[var(--danger)]"
                  onClick={() => setPortfolioItems((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button type="button" className="btn-outline w-full" onClick={() => setPortfolioItems((prev) => [...prev, { description: "" }])}>
              <Plus size={16} /> Adicionar trabalho
            </button>
            <Nav
              pending={pending}
              onBack={() => goTo(5)}
              nextLabel="Salvar e continuar"
              onNext={() => runAction(() => saveStep6Action(portfolioItems.filter((i) => i.description.trim())), 7)}
            />
          </div>
        )}

        {/* ETAPA 7 */}
        {current === 7 && (
          <Step7 initial={initial} pending={pending} onNext={(fd) => runAction(() => saveStep7Action(undefined, fd), 8)} onBack={() => goTo(6)} />
        )}

        {/* ETAPA 8 */}
        {current === 8 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-bold text-slate-800">Disponibilidade</h2>
              <p className="text-sm text-slate-500">Defina os dias e horários em que você atende</p>
            </div>
            <div className="space-y-2">
              {WEEKDAYS.slice(1).concat(WEEKDAYS[0]).map((dayName) => {
                const wd = WEEKDAYS.indexOf(dayName);
                const day = availability[wd];
                return (
                  <div key={wd} className="flex items-center gap-2 rounded-xl border border-[var(--border)] p-2">
                    <label className="flex w-28 items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="accent-[var(--primary)]"
                        checked={!!day}
                        onChange={(e) =>
                          setAvailability((prev) => {
                            const copy = { ...prev };
                            if (e.target.checked) copy[wd] = { startTime: "08:00", endTime: "18:00" };
                            else delete copy[wd];
                            return copy;
                          })
                        }
                      />
                      {dayName}
                    </label>
                    {day && (
                      <>
                        <input
                          type="time"
                          className="input flex-1 py-1.5"
                          value={day.startTime}
                          onChange={(e) => setAvailability((p) => ({ ...p, [wd]: { ...p[wd]!, startTime: e.target.value } }))}
                        />
                        <span className="text-slate-400">às</span>
                        <input
                          type="time"
                          className="input flex-1 py-1.5"
                          value={day.endTime}
                          onChange={(e) => setAvailability((p) => ({ ...p, [wd]: { ...p[wd]!, endTime: e.target.value } }))}
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="emergency"
                className="accent-[var(--primary)]"
                checked={emergency}
                onChange={(e) => setEmergency(e.target.checked)}
              />
              <label htmlFor="emergency" className="text-sm text-slate-700">
                ⚡ Atendo emergências
              </label>
            </div>

            <div>
              <label className="label">Raio de atendimento (km)</label>
              <input
                type="number"
                min={1}
                max={200}
                className="input w-32"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
              />
            </div>

            <div className="rounded-xl bg-[var(--primary-light)] p-4 text-sm text-[var(--primary-dark)]">
              <p className="font-semibold">🚀 Último passo!</p>
              <p>Ao finalizar, seu perfil será enviado para verificação da equipe EncontreAqui.</p>
            </div>

            <Nav
              pending={pending}
              backLabel="Voltar"
              onBack={() => goTo(7)}
              nextLabel="Finalizar cadastro 🎉"
              hideNextIcon
              onNext={() =>
                runAction(() =>
                  saveStep8Action(
                    Object.entries(availability).map(([wd, t]) => ({
                      weekday: Number(wd),
                      startTime: t.startTime,
                      endTime: t.endTime,
                      slotMinutes: 120,
                    })),
                    emergency,
                    radius,
                  ),
                )
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Nav({
  pending,
  onBack,
  onNext,
  nextLabel = "Continuar",
  backLabel = "Voltar",
  hideNextIcon,
}: {
  pending: boolean;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  backLabel?: string;
  hideNextIcon?: boolean;
}) {
  return (
    <div className="flex justify-between border-t border-slate-100 pt-4">
      {onBack ? (
        <button type="button" onClick={onBack} className="btn-outline" disabled={pending}>
          <ArrowLeft size={16} /> {backLabel}
        </button>
      ) : (
        <span />
      )}
      {/* type="submit": dentro de <form action={fn}> dispara a server action;
          fora de formulário (etapas 3, 4, 6 e 8) o onClick é o responsável. */}
      <button type="submit" onClick={onNext} className="btn-primary" disabled={pending}>
        {pending ? "Salvando..." : nextLabel} {!hideNextIcon && !pending && <ArrowRight size={16} />}
      </button>
    </div>
  );
}

function Step2({
  initial,
  coords,
  setCoords,
  pending,
  onNext,
  onBack,
}: {
  initial: WizardProps["initial"];
  coords: { lat: number; lng: number };
  setCoords: (c: { lat: number; lng: number }) => void;
  pending: boolean;
  onNext: (fd: FormData) => void;
  onBack: () => void;
}) {
  const [cep, setCep] = useState(initial.cep ? maskCep(initial.cep) : "");
  const [city, setCity] = useState(initial.city);
  const [state, setState] = useState(initial.state);
  const [neighborhood, setNeighborhood] = useState(initial.neighborhood);
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "notfound" | "error">("idle");

  const lookupCepNow = async () => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepStatus("loading");
    try {
      const found = await lookupCep(digits);
      if (!found) {
        setCepStatus("notfound");
        return;
      }
      if (found.city) setCity(found.city);
      if (found.state) setState(found.state.toUpperCase());
      if (found.neighborhood) setNeighborhood(found.neighborhood);
      setCepStatus("idle");
    } catch {
      setCepStatus("error");
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: Number(pos.coords.latitude.toFixed(6)), lng: Number(pos.coords.longitude.toFixed(6)) }),
      () => {},
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <form action={onNext} className="space-y-4">
      <div>
        <h2 className="font-bold text-slate-800">Onde você atende?</h2>
        <p className="text-sm text-slate-500">Seu endereço nunca é exibido publicamente, a menos que você ative o ponto fixo no mapa.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="wz-cep">CEP</label>
          <div className="relative">
            <input
              id="wz-cep"
              name="cep"
              required
              inputMode="numeric"
              className="input pr-9"
              placeholder="39800-000"
              value={cep}
              onChange={(e) => {
                setCep(maskCep(e.target.value));
                setCepStatus("idle");
              }}
              onBlur={lookupCepNow}
            />
            {cepStatus === "loading" && (
              <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
            )}
          </div>
          {cepStatus === "loading" && <p className="mt-1 text-xs text-slate-400">Buscando endereço...</p>}
          {cepStatus === "notfound" && <p className="mt-1 text-xs text-[var(--danger)]">CEP não encontrado. Preencha manualmente.</p>}
          {cepStatus === "error" && <p className="mt-1 text-xs text-amber-600">Não foi possível consultar o CEP agora. Preencha manualmente.</p>}
          {cepStatus === "idle" && <p className="mt-1 text-xs text-slate-400">Digite o CEP — cidade, UF e bairro preenchem sozinhos.</p>}
        </div>
        <div>
          <label className="label" htmlFor="wz-city">Cidade</label>
          <input id="wz-city" name="city" required className="input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Teófilo Otoni" />
        </div>
        <div>
          <label className="label" htmlFor="wz-state">UF</label>
          <input
            id="wz-state"
            name="state"
            required
            maxLength={2}
            className="input uppercase"
            value={state}
            onChange={(e) => setState(e.target.value.toUpperCase())}
            placeholder="MG"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="wz-neighborhood">Bairro</label>
          <input id="wz-neighborhood" name="neighborhood" required className="input" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="Centro" />
        </div>
        <div>
          <label className="label" htmlFor="wz-address">Endereço do ponto fixo (opcional)</label>
          <input id="wz-address" name="addressText" className="input" defaultValue={initial.addressText} placeholder="Rua, número — se tiver loja/escritório" />
        </div>
      </div>

      {/* Ponto fixo no mapa */}
      <div className="rounded-2xl border border-[var(--border)] bg-slate-50/60 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-700">Sua localização</p>
            <p className="text-xs text-slate-400">Arraste o pin ou clique no mapa. Você escolhe depois se exibe publicamente.</p>
          </div>
          <button type="button" onClick={useMyLocation} className="btn-ghost shrink-0 px-3 py-1.5 text-xs">
            <Crosshair size={14} /> Usar minha localização
          </button>
        </div>
        <div className="relative z-0">
          <MapPicker lat={coords.lat} lng={coords.lng} onChange={(la, ln) => setCoords({ lat: la, lng: ln })} />
        </div>
        <input type="hidden" name="lat" value={coords.lat} />
        <input type="hidden" name="lng" value={coords.lng} />
      </div>

      <Nav pending={pending} onBack={onBack} onNext={() => {}} />
    </form>
  );
}

function Step5({
  initial,
  pending,
  onNext,
  onBack,
}: {
  initial: WizardProps["initial"];
  pending: boolean;
  onNext: (fd: FormData) => void;
  onBack: () => void;
}) {
  return (
    <form action={onNext} className="space-y-4">
      <div>
        <h2 className="font-bold text-slate-800">Sua experiência</h2>
        <p className="text-sm text-slate-500">Conte aos clientes por que devem escolher você</p>
      </div>
      <div>
        <label className="label">Título profissional</label>
        <input name="headline" required className="input" defaultValue={initial.headline} placeholder="Ex: Eletricista residencial e comercial" />
      </div>
      <div>
        <label className="label">Sobre você</label>
        <textarea name="bio" required rows={4} minLength={20} className="input" defaultValue={initial.bio} placeholder="Descreva sua experiência, especialidades e diferencias..." />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Anos de experiência</label>
          <input name="experienceYears" type="number" min={0} max={70} className="input" defaultValue={initial.experienceYears ?? ""} placeholder="10" />
        </div>
        <div>
          <label className="label">Certificações (opcional)</label>
          <input name="certifications" className="input" defaultValue={initial.certifications} placeholder="Ex: NR-10, CREA..." />
        </div>
      </div>
      <Nav pending={pending} onBack={onBack} onNext={() => {}} />
    </form>
  );
}

function Step7({
  initial,
  pending,
  onNext,
  onBack,
}: {
  initial: WizardProps["initial"];
  pending: boolean;
  onNext: (fd: FormData) => void;
  onBack: () => void;
}) {
  const [priceType, setPriceType] = useState<"FIXED" | "RANGE" | "ON_QUOTE">(initial.priceType);
  return (
    <form action={onNext} className="space-y-4">
      <div>
        <h2 className="font-bold text-slate-800">Seus preços</h2>
        <p className="text-sm text-slate-500">Você pode alterar depois. Não é obrigatório informar valores.</p>
      </div>
      <div className="grid gap-2">
        {(
          [
            ["ON_QUOTE", "Sob orçamento", "Cliente solicita e você responde com o valor"],
            ["FIXED", "Preço fixo", "Um valor padrão para o serviço"],
            ["RANGE", "Faixa de preço", "De/até, variando conforme complexidade"],
          ] as const
        ).map(([value, title, desc]) => (
          <label key={value} className="cursor-pointer">
            <input type="radio" name="priceType" value={value} checked={priceType === value} onChange={() => setPriceType(value)} className="peer sr-only" />
            <span className="block rounded-xl border border-[var(--border)] p-3 peer-checked:border-[var(--primary)] peer-checked:bg-[var(--primary-light)]/50">
              <span className="text-sm font-semibold text-slate-700">{title}</span>
              <span className="block text-xs text-slate-500">{desc}</span>
            </span>
          </label>
        ))}
      </div>
      {priceType !== "ON_QUOTE" && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">{priceType === "RANGE" ? "De (R$)" : "Preço (R$)"}</label>
            <input name="priceMin" type="number" step="0.01" min={0} className="input" defaultValue={initial.priceMin} placeholder="250,00" />
          </div>
          {priceType === "RANGE" && (
            <div>
              <label className="label">Até (R$)</label>
              <input name="priceMax" type="number" step="0.01" min={0} className="input" defaultValue={initial.priceMax} placeholder="500,00" />
            </div>
          )}
        </div>
      )}
      <Nav pending={pending} onBack={onBack} onNext={() => {}} />
    </form>
  );
}
