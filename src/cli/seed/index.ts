import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const SUPER_ADMIN = {
  email: "admin@admin.com",
  password: "Testando123!",
  name: "Administrator",
};

const TERMS_V1 = {
  version: "1.0.0",
  title: "Termos de Uso e Política de Privacidade — Pulse",
  effectiveAt: new Date("2026-01-01"),
  content: `<h2>Termos de Uso e Política de Privacidade</h2>
<p><strong>Versão:</strong> 1.0.0 &nbsp;|&nbsp; <strong>Vigência:</strong> 01 de janeiro de 2026</p>

<hr/>

<h3>1. Das Partes e do Objeto</h3>
<p>
  O presente instrumento regula a relação entre a <strong>Pulse Tecnologia em Saúde Ocupacional</strong>
  ("Pulse", "nós" ou "plataforma") e a <strong>Organização Contratante</strong> ("você", "cliente" ou "organização"),
  pessoa jurídica que contrata o acesso à plataforma Pulse para fins de gestão de saúde ocupacional de seus colaboradores.
</p>
<p>
  Ao aceitar estes Termos, o representante da organização declara possuir poderes suficientes para contratar em nome
  da empresa e que leu, compreendeu e concorda com todas as cláusulas aqui dispostas.
</p>

<h3>2. Descrição do Serviço</h3>
<p>A Pulse é uma plataforma SaaS (Software as a Service) voltada à saúde ocupacional, que oferece os seguintes recursos principais:</p>
<ul>
  <li>Gestão de cadastro de colaboradores e departamentos;</li>
  <li>Envio e coleta de questionários de saúde (surveys) via SMS ou WhatsApp;</li>
  <li>Registro e gerenciamento de consentimento de coleta de dados dos colaboradores (conforme LGPD);</li>
  <li>Detecção e disparo de alertas de saúde baseados em respostas coletadas;</li>
  <li>Criação e acompanhamento de planos de ação corretivos e preventivos;</li>
  <li>Repositório de documentos relacionados à saúde e segurança do trabalho;</li>
  <li>Elaboração e revisão do Programa de Gerenciamento de Riscos (PGR);</li>
  <li>Canal de denúncias anônimas;</li>
  <li>Relatórios e métricas de saúde organizacional;</li>
  <li>Importação de colaboradores via planilha CSV.</li>
</ul>

<h3>3. Cadastro e Responsabilidades do Contratante</h3>
<p>
  3.1. A organização é responsável por manter atualizados os dados cadastrais fornecidos à Pulse, incluindo informações
  dos usuários administradores que acessam a plataforma.
</p>
<p>
  3.2. O contratante assume integral responsabilidade pela utilização da plataforma por seus usuários (administradores e
  profissionais de RH), devendo implementar controles internos adequados para impedir acessos não autorizados.
</p>
<p>
  3.3. É vedado ao contratante compartilhar credenciais de acesso entre diferentes usuários. Cada usuário deve possuir
  login e senha individuais.
</p>
<p>
  3.4. A organização declara ter base legal adequada (consentimento ou outra hipótese do Art. 7º da LGPD) para
  processar os dados pessoais de seus colaboradores na plataforma.
</p>

<h3>4. Planos, Pagamentos e Faturamento</h3>
<p>
  4.1. O acesso à Pulse está condicionado à contratação de um plano pago, cujos valores, limites de colaboradores e
  funcionalidades disponíveis são descritos na página de planos no momento da contratação.
</p>
<p>
  4.2. O pagamento é processado de forma segura por meio de provedor externo de pagamentos (atualmente Stripe).
  A Pulse não armazena dados completos de cartão de crédito em seus servidores.
</p>
<p>
  4.3. As cobranças são realizadas de forma recorrente (mensal ou anual, conforme o plano escolhido). A organização
  autoriza as cobranças automáticas na forma e periodicidade contratadas.
</p>
<p>
  4.4. Em caso de inadimplência, o acesso à plataforma poderá ser suspenso após notificação, sendo restabelecido
  mediante regularização do pagamento.
</p>
<p>
  4.5. Não haverá reembolso proporcional em caso de cancelamento antes do fim do período faturado, salvo disposição
  contrária prevista em lei.
</p>
<p>
  4.6. A Pulse reserva-se o direito de reajustar os valores dos planos, comunicando com antecedência mínima de 30 dias.
  O contratante poderá cancelar o serviço sem penalidade dentro deste prazo caso não concorde com o reajuste.
</p>

<h3>5. Limite de Colaboradores e Uso da Plataforma</h3>
<p>
  5.1. Cada plano possui um limite máximo de colaboradores ativos. O contratante não poderá cadastrar colaboradores
  além do limite contratado sem realizar o upgrade do plano.
</p>
<p>
  5.2. O limite de colaboradores vigente é aquele registrado no momento da contratação ou último upgrade,
  permanecendo imutável mesmo que o plano seja posteriormente alterado, até o início do próximo ciclo de faturamento.
</p>
<p>
  5.3. É vedada a utilização da plataforma para fins diversos da gestão de saúde ocupacional, como revenda,
  treinamento de modelos de inteligência artificial de terceiros, ou qualquer atividade ilícita.
</p>

<h3>6. Proteção de Dados e Privacidade (LGPD)</h3>
<p>
  6.1. A Pulse atua como <strong>operadora</strong> dos dados pessoais dos colaboradores, nos termos da Lei Geral
  de Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD), e a organização contratante atua como <strong>controladora</strong>.
</p>
<p>
  6.2. Os dados pessoais tratados pela plataforma incluem, sem limitação: nome, e-mail, telefone, departamento,
  cargo, informações de saúde fornecidas em questionários e dados de consentimento.
</p>
<p>
  6.3. A Pulse se compromete a:
</p>
<ul>
  <li>Tratar os dados pessoais exclusivamente conforme as instruções da controladora e para as finalidades descritas nestes Termos;</li>
  <li>Adotar medidas técnicas e administrativas de segurança adequadas à proteção dos dados;</li>
  <li>Não compartilhar dados pessoais com terceiros, exceto quando necessário para a prestação do serviço ou por obrigação legal;</li>
  <li>Notificar a controladora em prazo razoável em caso de incidente de segurança que envolva dados pessoais;</li>
  <li>Auxiliar a controladora no atendimento às requisições de titulares de dados (acesso, correção, exclusão, portabilidade).</li>
</ul>
<p>
  6.4. Dados de colaboradores que revogarem o consentimento poderão ser anonimizados ou excluídos da plataforma
  a pedido do contratante.
</p>
<p>
  6.5. Os dados são armazenados em servidores localizados no Brasil ou em jurisdições que ofereçam nível adequado
  de proteção conforme os padrões da ANPD.
</p>
<p>
  6.6. Os dados da organização e seus colaboradores serão retidos enquanto o contrato estiver ativo. Após o
  encerramento, os dados serão mantidos por até 90 dias para fins de backup e, em seguida, excluídos de forma segura,
  salvo obrigação legal de retenção.
</p>

<h3>7. Consentimento dos Colaboradores</h3>
<p>
  7.1. A plataforma disponibiliza mecanismo de registro de consentimento de coleta de dados de saúde dos colaboradores.
  É responsabilidade da organização garantir que o consentimento seja obtido de forma livre, informada e inequívoca,
  antes de iniciar a coleta de dados de saúde.
</p>
<p>
  7.2. A Pulse armazena o registro de consentimento (ou recusa) com data e hora, para fins de auditoria e comprovação,
  sendo este registro de responsabilidade conjunta da controladora e da operadora.
</p>
<p>
  7.3. O canal de denúncias anônimas é operado de forma a garantir o anonimato do denunciante. A Pulse não realiza
  qualquer tentativa de identificação do denunciante a partir dos dados técnicos da requisição.
</p>

<h3>8. Disponibilidade e Nível de Serviço</h3>
<p>
  8.1. A Pulse envidará esforços razoáveis para manter a plataforma disponível 24 horas por dia, 7 dias por semana,
  com disponibilidade-alvo de 99% ao mês, excluindo janelas de manutenção programadas.
</p>
<p>
  8.2. Manutenções programadas serão comunicadas com antecedência mínima de 24 horas, preferencialmente em horários
  de menor impacto.
</p>
<p>
  8.3. A Pulse não se responsabiliza por indisponibilidades decorrentes de fatores externos, como falhas de
  infraestrutura de terceiros, ataques cibernéticos ou casos fortuitos e de força maior.
</p>

<h3>9. Propriedade Intelectual</h3>
<p>
  9.1. Todo o código-fonte, interfaces, algoritmos, documentação, marcas e demais ativos intelectuais da plataforma
  Pulse são de propriedade exclusiva da Pulse Tecnologia em Saúde Ocupacional, sendo vedada qualquer reprodução,
  modificação ou distribuição não autorizada.
</p>
<p>
  9.2. Os dados inseridos pelo contratante na plataforma (cadastros, documentos, respostas de questionários) pertencem
  à organização contratante. A Pulse não reivindica qualquer direito de propriedade sobre esses dados.
</p>
<p>
  9.3. O contratante autoriza a Pulse a utilizar dados anonimizados e agregados (sem identificação de pessoas ou
  organizações) para fins de melhoria do produto, pesquisa e desenvolvimento de novas funcionalidades.
</p>

<h3>10. Limitação de Responsabilidade</h3>
<p>
  10.1. A Pulse não se responsabiliza por decisões médicas, laborais ou jurídicas tomadas com base nos dados e
  relatórios gerados pela plataforma. A plataforma é uma ferramenta de apoio à gestão, não substituindo a avaliação
  de profissionais habilitados.
</p>
<p>
  10.2. Em nenhuma hipótese a responsabilidade total da Pulse perante o contratante excederá o valor total pago
  pelo contratante nos 12 meses anteriores ao evento que deu origem à reclamação.
</p>
<p>
  10.3. A Pulse não se responsabiliza por danos indiretos, lucros cessantes, perda de dados por ação do próprio
  contratante, ou danos causados por uso inadequado da plataforma.
</p>

<h3>11. Cancelamento e Rescisão</h3>
<p>
  11.1. O contratante poderá cancelar sua assinatura a qualquer momento pelo painel de faturamento da plataforma.
  O acesso permanecerá ativo até o fim do período já pago.
</p>
<p>
  11.2. A Pulse poderá rescindir o contrato imediatamente, sem aviso prévio, em caso de:
</p>
<ul>
  <li>Uso da plataforma em desacordo com estes Termos ou com a legislação vigente;</li>
  <li>Inadimplência superior a 30 dias após tentativas de cobrança;</li>
  <li>Fornecimento de informações falsas no cadastro;</li>
  <li>Tentativa de acesso não autorizado a dados de outras organizações.</li>
</ul>
<p>
  11.3. Após o encerramento, os dados do contratante poderão ser exportados mediante solicitação dentro do prazo de
  30 dias. Após esse prazo, os dados serão excluídos conforme a política de retenção descrita na cláusula 6.6.
</p>

<h3>12. Alterações nos Termos</h3>
<p>
  12.1. A Pulse poderá atualizar estes Termos periodicamente para refletir mudanças no serviço, na legislação ou
  nas melhores práticas do setor.
</p>
<p>
  12.2. Alterações substanciais serão comunicadas com antecedência mínima de 15 dias por e-mail e/ou notificação
  na plataforma.
</p>
<p>
  12.3. O uso continuado da plataforma após a data de vigência da nova versão implicará na aceitação das alterações.
  Caso o contratante não concorde, poderá cancelar o serviço sem penalidade dentro do prazo de 15 dias contados
  da comunicação.
</p>

<h3>13. Disposições Gerais</h3>
<p>
  13.1. Este instrumento é regido pelas leis da República Federativa do Brasil.
</p>
<p>
  13.2. Fica eleito o foro da Comarca de São Paulo — SP para dirimir quaisquer controvérsias oriundas destes Termos,
  com renúncia expressa a qualquer outro foro, por mais privilegiado que seja.
</p>
<p>
  13.3. A tolerância de qualquer das partes quanto ao descumprimento de qualquer cláusula não constitui novação
  ou renúncia ao direito de exigir o cumprimento integral.
</p>
<p>
  13.4. Caso alguma cláusula seja considerada inválida ou inaplicável, as demais permanecerão em pleno vigor.
</p>
<p>
  13.5. Para dúvidas ou solicitações relacionadas a estes Termos, entre em contato pelo e-mail:
  <strong>privacidade@usepulse.com.br</strong>
</p>

<hr/>
<p style="font-size:12px;color:#64748b;">
  Ao aceitar estes Termos, você declara que leu, compreendeu e concorda com todas as disposições acima,
  e que possui autorização para contratar em nome da organização.
</p>`,
};

async function seedSuperAdmin() {
  const existing = await prisma.superAdmin.findUnique({
    where: { email: SUPER_ADMIN.email },
  });
  if (existing) {
    console.log(`⏭  Super admin already exists: ${SUPER_ADMIN.email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(SUPER_ADMIN.password, 12);
  await prisma.superAdmin.create({
    data: {
      email: SUPER_ADMIN.email,
      passwordHash,
      name: SUPER_ADMIN.name,
    },
  });
  console.log(`✅ Super admin created: ${SUPER_ADMIN.email}`);
}

async function seedTerms() {
  const existing = await prisma.platformTermsVersion.findUnique({
    where: { version: TERMS_V1.version },
  });
  if (existing) {
    console.log(`⏭  Terms v${TERMS_V1.version} already exists`);
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.platformTermsVersion.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });
    await tx.platformTermsVersion.create({
      data: {
        version: TERMS_V1.version,
        title: TERMS_V1.title,
        content: TERMS_V1.content,
        effectiveAt: TERMS_V1.effectiveAt,
        isActive: true,
      },
    });
  });

  console.log(`✅ Terms v${TERMS_V1.version} created`);
}

async function main() {
  console.log("\n🌱 Starting seed...\n");

  await seedSuperAdmin();
  await seedTerms();

  console.log("\n🎉 Seed complete!\n");
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
