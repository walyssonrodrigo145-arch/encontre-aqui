export interface CepAddress {
  city: string;
  state: string;
  neighborhood: string;
  street: string;
}

/**
 * Consulta um CEP na ViaCEP (serviço público brasileiro).
 * Retorna null quando o CEP é inválido/inexistente; lança apenas falha de rede.
 */
export async function lookupCep(cep: string): Promise<CepAddress | null> {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return null;

  const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("CEP_UNAVAILABLE");
  const data = (await res.json()) as {
    erro?: boolean | string;
    localidade?: string;
    uf?: string;
    bairro?: string;
    logradouro?: string;
  };
  if (!data || data.erro) return null;

  return {
    city: data.localidade ?? "",
    state: data.uf ?? "",
    neighborhood: data.bairro ?? "",
    street: data.logradouro ?? "",
  };
}

export function maskCep(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}
