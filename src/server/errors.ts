/**
 * Converte erros internos em mensagens seguras para a UI.
 * Stack traces, SQL e nomes de tabelas nunca chegam ao usuário;
 * o detalhe técnico é registrado apenas no log do servidor.
 */
export function friendlyError(
  e: unknown,
  fallback = "Não foi possível concluir a operação. Tente novamente.",
): string {
  console.error("[action-error]", e);

  if (e instanceof Error) {
    if (e.message === "UNAUTHENTICATED") return "Sua sessão expirou. Faça login novamente.";
    if (e.message === "FORBIDDEN") return "Você não tem permissão para esta ação.";
    if (/UNIQUE constraint/i.test(e.message)) return "Este registro já existe.";
    if (/FOREIGN KEY constraint/i.test(e.message)) return "Registro relacionado inválido.";
  }

  return fallback;
}
