import { Navbar, Footer } from "@/components/navbar";

export const metadata = { title: "Política de privacidade" };

export default function PrivacidadePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="text-3xl font-extrabold text-slate-900">Política de privacidade</h1>
        <p className="mt-1 text-sm text-slate-400">Conformidade com a LGPD (Lei 13.709/2018)</p>
        <div className="mt-6 space-y-6 text-sm leading-relaxed text-slate-600">
          <section>
            <h2 className="font-bold text-slate-800">1. Dados que coletamos</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Dados de cadastro: nome, e-mail, telefone/WhatsApp;</li>
              <li>Prestadores: CPF/CNPJ (armazenado de forma criptografada), endereço comercial;</li>
              <li>Dados de uso: buscas, solicitações, agendamentos, mensagens e avaliações;</li>
              <li>Localização aproximada, quando autorizada, para exibir profissionais próximos.</li>
            </ul>
          </section>
          <section>
            <h2 className="font-bold text-slate-800">2. Como usamos</h2>
            <p>
              Utilizamos seus dados para operar a plataforma: apresentar profissionais próximos,
              viabilizar orçamentos e agendamentos, enviar notificações e melhorar o ranking de busca.
              Seus dados nunca são vendidos.
            </p>
          </section>
          <section>
            <h2 className="font-bold text-slate-800">3. O que é público</h2>
            <p>
              Do perfil do prestador são públicos: nome profissional, especialidades, portfólio,
              avaliações, cidade/região atendida e meios de contato profissional. Endereço residencial
              completo, documentos e dados financeiros nunca são exibidos.
            </p>
          </section>
          <section>
            <h2 className="font-bold text-slate-800">4. Seus direitos</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Acessar, corrigir e exportar seus dados;</li>
              <li>Revogar consentimento e excluir sua conta;</li>
              <li>Solicitar informações sobre compartilhamento.</li>
            </ul>
            <p className="mt-2">
              Para exercer seus direitos, utilize a opção de exclusão de conta no painel ou entre em
              contato pelo e-mail de suporte. Após a exclusão, dados pessoais são anonimizados em até
              30 dias, exceto registros exigidos por lei.
            </p>
          </section>
          <section>
            <h2 className="font-bold text-slate-800">5. Segurança</h2>
            <p>
              Aplicamos criptografia de dados sensíveis, controle de acesso por função, limites de
              requisição e auditoria de ações administrativas para proteger suas informações.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
