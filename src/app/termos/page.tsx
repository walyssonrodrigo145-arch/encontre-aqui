import { Navbar, Footer } from "@/components/navbar";

export const metadata = { title: "Termos de uso" };

export default function TermosPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="text-3xl font-extrabold text-slate-900">Termos de uso</h1>
        <p className="mt-1 text-sm text-slate-400">Última atualização: agosto de 2026</p>
        <div className="prose-sm mt-6 space-y-6 text-sm leading-relaxed text-slate-600">
          <section>
            <h2 className="font-bold text-slate-800">1. Sobre a plataforma</h2>
            <p>
              O EncontreAqui é um marketplace que conecta clientes a prestadores de serviços independentes.
              Não somos empregadores nem representantes dos prestadores; cada profissional é responsável
              pelos serviços que presta.
            </p>
          </section>
          <section>
            <h2 className="font-bold text-slate-800">2. Contas</h2>
            <p>
              Para contratar ou oferecer serviços é necessário criar uma conta com informações verdadeiras.
              Prestadores passam por verificação e podem ter o perfil suspenso em caso de irregularidade.
            </p>
          </section>
          <section>
            <h2 className="font-bold text-slate-800">3. Orçamentos e agendamentos</h2>
            <p>
              Orçamentos são estimativas sem vínculo contratual até a confirmação das partes. O pagamento
              dos serviços é combinado diretamente entre cliente e prestador (versão atual). Recomendamos
              sempre negociar pela plataforma para manter histórico e proteção.
            </p>
          </section>
          <section>
            <h2 className="font-bold text-slate-800">4. Assinaturas e impulsionamento</h2>
            <p>
              Prestadores pagam mensalidade conforme o plano escolhido para manter o perfil ativo. Serviços
              de impulsionamento aumentam a exposição do perfil sem garantir resultados específicos.
              Cancelamentos podem ser feitos a qualquer momento no painel.
            </p>
          </section>
          <section>
            <h2 className="font-bold text-slate-800">5. Avaliações</h2>
            <p>
              Avaliações só são permitidas após a conclusão real de um serviço pela plataforma. Conteúdos
              ofensivos, falsos ou enganosos podem ser removidos.
            </p>
          </section>
          <section>
            <h2 className="font-bold text-slate-800">6. Conduta</h2>
            <p>
              É proibido usar a plataforma para atividades ilegais, spam, assédio ou burlar o sistema de
              avaliações. Violações podem resultar em bloqueio da conta.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
