"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Crosshair, Loader2 } from "lucide-react";
import { updateFullProfileAction, type ProfileState } from "@/server/actions/profile";
import { lookupCep, maskCep } from "@/lib/cep";
import { maskPhone } from "@/lib/utils";
import { MapPicker } from "./map";

export interface FullProfileInitial {
  role: "CUSTOMER" | "PROVIDER" | "ADMIN";
  name: string;
  phone: string;
  // cliente
  city: string;
  state: string;
  addressText: string;
  // prestador
  displayName: string;
  headline: string;
  bio: string;
  experienceYears: string;
  certifications: string;
  whatsapp: string;
  cep: string;
  neighborhood: string;
  serviceRadiusKm: string;
  emergency: boolean;
  // ponto fixo
  providerAddress: string;
  publicLocation: boolean;
  lat: number;
  lng: number;
}

const input = "input";
const sectionTitle = "text-sm font-bold uppercase tracking-wide text-slate-400";

export function ProfileFullForm({ initial }: { initial: FullProfileInitial }) {
  const [state, action, pending] = useActionState<ProfileState | undefined, FormData>(
    updateFullProfileAction,
    undefined,
  );
  const isProvider = initial.role === "PROVIDER";
  const isCustomer = initial.role === "CUSTOMER";

  // prestador — endereço com autofill de CEP + ponto fixo no mapa
  const [cep, setCep] = useState(initial.cep ? maskCep(initial.cep) : "");
  const [pCity, setPCity] = useState(initial.city);
  const [pState, setPState] = useState(initial.state);
  const [pNeighborhood, setPNeighborhood] = useState(initial.neighborhood);
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "notfound" | "error">("idle");
  const [coords, setCoords] = useState({ lat: initial.lat, lng: initial.lng });

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
      if (found.city) setPCity(found.city);
      if (found.state) setPState(found.state.toUpperCase());
      if (found.neighborhood) setPNeighborhood(found.neighborhood);
      setCepStatus("idle");
    } catch {
      setCepStatus("error");
    }
  };

  return (
    <form action={action} className="space-y-6">
      {state?.error && (
        <p className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-[var(--danger)]">
          <AlertCircle size={15} /> {state.error}
        </p>
      )}
      {state?.success && (
        <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
          <CheckCircle2 size={15} /> {state.success}
        </p>
      )}

      {/* Dados da conta (todos os perfis) */}
      <section className="card space-y-4 p-5">
        <h2 className={sectionTitle}>Dados da conta</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="pf-name">Nome completo</label>
            <input id="pf-name" name="name" required minLength={3} maxLength={120} defaultValue={initial.name} className={input} />
          </div>
          <div>
            <label className="label" htmlFor="pf-phone">Telefone / WhatsApp</label>
            <input
              id="pf-phone"
              name="phone"
              inputMode="tel"
              defaultValue={initial.phone}
              placeholder="(33) 99999-9999"
              onChange={(e) => {
                e.target.value = maskPhone(e.target.value);
              }}
              className={input}
            />
          </div>
        </div>
      </section>

      {/* Cliente: endereço */}
      {isCustomer && (
        <section className="card space-y-4 p-5">
          <h2 className={sectionTitle}>Seu local (usado para buscar profissionais perto de você)</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="pf-city">Cidade</label>
              <input id="pf-city" name="city" maxLength={80} defaultValue={initial.city} className={input} placeholder="Teófilo Otoni" />
            </div>
            <div>
              <label className="label" htmlFor="pf-state">UF</label>
              <input
                id="pf-state"
                name="state"
                maxLength={2}
                defaultValue={initial.state}
                className={`${input} uppercase`}
                placeholder="MG"
                onChange={(e) => {
                  e.target.value = e.target.value.toUpperCase();
                }}
              />
            </div>
            <div>
              <label className="label" htmlFor="pf-address">Bairro / região</label>
              <input id="pf-address" name="addressText" maxLength={200} defaultValue={initial.addressText} className={input} placeholder="Centro" />
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Seu endereço completo nunca é exibido publicamente — apenas a região aproximada nas buscas.
          </p>
        </section>
      )}

      {/* Prestador: perfil profissional */}
      {isProvider && (
        <section className="card space-y-4 p-5">
          <h2 className={sectionTitle}>Perfil profissional (visível para clientes)</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="pf-display">Nome profissional / Empresa</label>
              <input id="pf-display" name="displayName" required minLength={3} maxLength={120} defaultValue={initial.displayName} className={input} placeholder="Ex: João Eletricista" />
            </div>
            <div>
              <label className="label" htmlFor="pf-headline">Título profissional</label>
              <input id="pf-headline" name="headline" maxLength={160} defaultValue={initial.headline} className={input} placeholder="Ex: Eletricista residencial e comercial" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="pf-bio">Sobre você</label>
            <textarea id="pf-bio" name="bio" rows={4} maxLength={2000} defaultValue={initial.bio} className={`${input} resize-none`} placeholder="Descreva sua experiência, especialidades e diferenciais..." />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="pf-exp">Anos de experiência</label>
              <input id="pf-exp" name="experienceYears" type="number" min={0} max={70} defaultValue={initial.experienceYears} className={input} placeholder="10" />
            </div>
            <div>
              <label className="label" htmlFor="pf-whatsapp">WhatsApp profissional</label>
              <input
                id="pf-whatsapp"
                name="whatsapp"
                inputMode="tel"
                defaultValue={initial.whatsapp}
                placeholder="(33) 99999-9999"
                onChange={(e) => {
                  e.target.value = maskPhone(e.target.value);
                }}
                className={input}
              />
            </div>
            <div>
              <label className="label" htmlFor="pf-cert">Certificações (opcional)</label>
              <input id="pf-cert" name="certifications" maxLength={500} defaultValue={initial.certifications} className={input} placeholder="Ex: NR-10, CREA..." />
            </div>
          </div>
        </section>
      )}

      {isProvider && (
        <section className="card space-y-4 p-5">
          <h2 className={sectionTitle}>Atendimento</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="pf-cep">CEP</label>
              <div className="relative">
                <input
                  id="pf-cep"
                  name="cep"
                  inputMode="numeric"
                  maxLength={9}
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
              {cepStatus === "error" && <p className="mt-1 text-xs text-amber-600">Consulta indisponível agora. Preencha manualmente.</p>}
            </div>
            <div>
              <label className="label" htmlFor="pf-pcity">Cidade</label>
              <input id="pf-pcity" name="city" maxLength={80} className={input} placeholder="Teófilo Otoni" value={pCity} onChange={(e) => setPCity(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="pf-pstate">UF</label>
              <input
                id="pf-pstate"
                name="state"
                maxLength={2}
                className={`${input} uppercase`}
                placeholder="MG"
                value={pState}
                onChange={(e) => setPState(e.target.value.toUpperCase())}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="pf-neighborhood">Bairro</label>
              <input id="pf-neighborhood" name="neighborhood" maxLength={80} className={input} placeholder="Centro" value={pNeighborhood} onChange={(e) => setPNeighborhood(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="pf-radius">Raio de atendimento (km)</label>
              <input id="pf-radius" name="serviceRadiusKm" type="number" min={1} max={200} defaultValue={initial.serviceRadiusKm} className={input} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="emergency" defaultChecked={initial.emergency} className="h-4 w-4 rounded accent-[var(--primary)]" />
            ⚡ Atendo emergências
          </label>
        </section>
      )}

      {isProvider && (
        <section className="card space-y-4 p-5">
          <h2 className={sectionTitle}>Ponto fixo (loja, oficina ou escritório)</h2>
          <div>
            <label className="label" htmlFor="pf-address">Endereço do ponto fixo (opcional)</label>
            <input id="pf-address" name="providerAddress" maxLength={200} defaultValue={initial.providerAddress} className={input} placeholder="Rua das Flores, 100 - Centro" />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="label mb-0">Posição no mapa</p>
              <button
                type="button"
                className="btn-ghost px-3 py-1.5 text-xs"
                onClick={() => {
                  if (!navigator.geolocation) return;
                  navigator.geolocation.getCurrentPosition(
                    (pos) => setCoords({ lat: Number(pos.coords.latitude.toFixed(6)), lng: Number(pos.coords.longitude.toFixed(6)) }),
                    () => {},
                    { enableHighAccuracy: true, timeout: 8000 },
                  );
                }}
              >
                <Crosshair size={14} /> Usar minha localização
              </button>
            </div>
            <div className="relative z-0">
              <MapPicker lat={coords.lat} lng={coords.lng} onChange={(la, ln) => setCoords({ lat: la, lng: ln })} />
            </div>
            <input type="hidden" name="lat" value={coords.lat} />
            <input type="hidden" name="lng" value={coords.lng} />
          </div>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" name="publicLocation" defaultChecked={initial.publicLocation} className="mt-0.5 h-4 w-4 rounded accent-[var(--primary)]" />
            <span>
              <b>Exibir meu ponto fixo publicamente</b>
              <span className="block text-xs text-slate-400">
                Mostra o pin no mapa e o endereço na sua página pública. Desmarcado, os clientes veem apenas cidade e bairro.
              </span>
            </span>
          </label>
        </section>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button disabled={pending} className="btn-gradient flex-1 py-3">
          {pending ? "Salvando..." : "Salvar alterações"}
        </button>
        <Link href="/perfil" className="btn-outline sm:w-40">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
