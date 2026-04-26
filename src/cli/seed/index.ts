import "dotenv/config";
import { createHash } from "crypto";
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

const CONSENT_TERM_V1 = {
  version: "1.0.0",
  content: `<!-- legacy -->`,
};

const CONSENT_TERM_V2 = {
  version: "1.1.0",
  content: `<div style="font-family:sans-serif;line-height:1.7;color:#1e293b;max-width:760px;margin:0 auto">

<div style="background:#f0f7ff;border:1px solid #bfdbfe;border-radius:10px;padding:20px 24px;margin-bottom:28px">
  <p style="margin:0 0 6px 0;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#1d4ed8">📋 Termo de Consentimento Livre e Esclarecido (TCLE)</p>
  <p style="margin:0;font-size:13px;color:#334155">
    <strong>Versão:</strong> 1.1.0 &nbsp;·&nbsp;
    <strong>Vigência:</strong> 01 de maio de 2026 &nbsp;·&nbsp;
    <strong>Fundamento legal:</strong> LGPD — Lei nº 13.709/2018
  </p>
</div>

<p>
  Antes de aceitar, leia com atenção. Este documento explica, de forma clara e completa, o que é
  a plataforma <strong>Pulse</strong>, para que seus dados serão usados, o que <em>jamais</em>
  será feito com eles e quais são os seus direitos.
</p>
<p>
  <strong>Sua participação é 100% voluntária.</strong> Aceitar ou recusar não gera qualquer
  consequência no seu emprego, na sua avaliação de desempenho, na sua remuneração ou em qualquer
  outra dimensão da sua vida profissional. Você pode mudar de ideia a qualquer momento.
</p>

<hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0"/>

<h2 style="font-size:16px;font-weight:700;color:#1e293b;margin:24px 0 10px 0">1. Quem somos e por que este termo existe</h2>
<p>
  A plataforma <strong>Pulse</strong> é um software de monitoramento de bem-estar ocupacional contratado
  pela sua empresa. Ela foi criada para apoiar organizações a cuidar ativamente da saúde e do desempenho
  de suas equipes, identificando fatores que afetam o clima, a motivação e o bem-estar dos colaboradores
  de forma ética, segura e confidencial.
</p>
<p>
  Para fazer esse monitoramento de forma ética e legal, a lei exige que cada colaborador seja
  informado com clareza e dê seu consentimento expresso antes de qualquer coleta de dados.
  <strong>Este documento é esse consentimento.</strong>
</p>
<p>Nesta relação existem três partes:</p>
<ul>
  <li><strong>Você</strong> (colaborador) — o <strong>titular dos dados</strong>, a quem pertencem
    todas as informações geradas pela sua participação;</li>
  <li><strong>Sua empresa</strong> (empregadora) — a <strong>controladora dos dados</strong>,
    que definiu a finalidade do uso e é juridicamente responsável pelo tratamento;</li>
  <li><strong>Pulse Tecnologia em Saúde Ocupacional</strong> — a <strong>operadora dos dados</strong>,
    que processa as informações exclusivamente conforme instruções da sua empresa e nos limites
    deste termo.</li>
</ul>

<hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0"/>

<h2 style="font-size:16px;font-weight:700;color:#1e293b;margin:24px 0 10px 0">2. O que é o Pulse e como ele funciona na prática</h2>
<p>
  O Pulse envia periodicamente uma pesquisa rápida para o seu celular (via link por SMS ou WhatsApp).
  Ela tem entre 5 e 10 perguntas e leva menos de 2 minutos para responder. As perguntas abordam temas como:
</p>
<ul>
  <li>Como você está se sentindo no trabalho ultimamente;</li>
  <li>Se a carga de trabalho está equilibrada;</li>
  <li>Como está a relação com sua equipe e liderança;</li>
  <li>Se o ambiente físico e os recursos disponíveis são adequados;</li>
  <li>Outros fatores que impactam o bem-estar no dia a dia.</li>
</ul>
<p>
  As respostas são avaliações numéricas (de 1 a 5) e, eventualmente, campos de texto livre opcionais.
  A frequência das pesquisas é definida pela sua empresa — pode ser semanal, quinzenal ou mensal.
</p>
<p>
  Além das pesquisas, a plataforma disponibiliza um canal opcional de relato anônimo, onde você pode
  reportar situações que considera importantes sem se identificar.
</p>
<p>
  <strong>O sistema só envia pesquisas dentro do seu horário de expediente</strong>, nos dias de
  trabalho configurados pela empresa. Nunca fora do turno, exceto se sua função exigir configuração
  diferente acordada com a empresa.
</p>

<hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0"/>

<h2 style="font-size:16px;font-weight:700;color:#1e293b;margin:24px 0 10px 0">3. Quais dados são coletados e para que</h2>
<p>Ao aceitar este termo, você autoriza o tratamento das seguintes informações:</p>

<table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px">
  <thead>
    <tr style="background:#f1f5f9">
      <th style="text-align:left;padding:10px 12px;border:1px solid #e2e8f0;font-weight:700;color:#334155">Dado coletado</th>
      <th style="text-align:left;padding:10px 12px;border:1px solid #e2e8f0;font-weight:700;color:#334155">Finalidade</th>
      <th style="text-align:left;padding:10px 12px;border:1px solid #e2e8f0;font-weight:700;color:#334155">Identificado?</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding:10px 12px;border:1px solid #e2e8f0">Respostas às pesquisas (notas de 1 a 5)</td>
      <td style="padding:10px 12px;border:1px solid #e2e8f0">Calcular indicadores de bem-estar por setor</td>
      <td style="padding:10px 12px;border:1px solid #e2e8f0;color:#16a34a"><strong>Não — anônimo</strong></td>
    </tr>
    <tr style="background:#f8fafc">
      <td style="padding:10px 12px;border:1px solid #e2e8f0">Texto livre opcional nas pesquisas</td>
      <td style="padding:10px 12px;border:1px solid #e2e8f0">Complementar análise qualitativa do setor</td>
      <td style="padding:10px 12px;border:1px solid #e2e8f0;color:#16a34a"><strong>Não — anônimo</strong></td>
    </tr>
    <tr>
      <td style="padding:10px 12px;border:1px solid #e2e8f0">Data da resposta (sem horário)</td>
      <td style="padding:10px 12px;border:1px solid #e2e8f0">Organizar resultados por período de referência</td>
      <td style="padding:10px 12px;border:1px solid #e2e8f0;color:#16a34a"><strong>Não — anônimo</strong></td>
    </tr>
    <tr style="background:#f8fafc">
      <td style="padding:10px 12px;border:1px solid #e2e8f0">Registro de aceite deste termo (data, hora, versão)</td>
      <td style="padding:10px 12px;border:1px solid #e2e8f0">Comprovação de conformidade legal (LGPD)</td>
      <td style="padding:10px 12px;border:1px solid #e2e8f0;color:#d97706"><strong>Sim — vinculado ao seu cadastro</strong></td>
    </tr>
    <tr>
      <td style="padding:10px 12px;border:1px solid #e2e8f0">Nome e telefone (cadastro pelo RH)</td>
      <td style="padding:10px 12px;border:1px solid #e2e8f0">Enviar o link da pesquisa ao seu celular</td>
      <td style="padding:10px 12px;border:1px solid #e2e8f0;color:#d97706"><strong>Sim — apenas para o RH</strong></td>
    </tr>
    <tr style="background:#f8fafc">
      <td style="padding:10px 12px;border:1px solid #e2e8f0">Conteúdo do relato anônimo (se utilizado)</td>
      <td style="padding:10px 12px;border:1px solid #e2e8f0">Apoiar ações corretivas pela gestão de RH</td>
      <td style="padding:10px 12px;border:1px solid #e2e8f0;color:#16a34a"><strong>Não — anônimo</strong></td>
    </tr>
    <tr>
      <td style="padding:10px 12px;border:1px solid #e2e8f0">Hash do CPF (somente se solicitado)</td>
      <td style="padding:10px 12px;border:1px solid #e2e8f0">Confirmação de identidade para fins de auditoria legal</td>
      <td style="padding:10px 12px;border:1px solid #e2e8f0;color:#16a34a"><strong>Hash irreversível — CPF não pode ser recuperado</strong></td>
    </tr>
  </tbody>
</table>

<hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0"/>

<h2 style="font-size:16px;font-weight:700;color:#1e293b;margin:24px 0 10px 0">4. O que <u>jamais</u> será feito com seus dados</h2>
<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px 20px;margin-bottom:16px">
  <p style="margin:0 0 8px 0;font-weight:700;color:#b91c1c">🚫 Proibições absolutas — garantidas contratualmente:</p>
  <ul style="margin:0;padding-left:20px;color:#7f1d1d">
    <li>Usar seus dados para decidir promoções, demissões, advertências ou qualquer sanção disciplinar;</li>
    <li>Comparar publicamente resultados individuais entre colaboradores;</li>
    <li>Compartilhar suas respostas com gestores identificando quem as escreveu;</li>
    <li>Vender, alugar ou ceder seus dados a terceiros para fins comerciais;</li>
    <li>Usar os dados em processos seletivos para outras vagas;</li>
    <li>Cruzar respostas das pesquisas com sistemas de controle de ponto para tentar identificar respondentes;</li>
    <li>Usar o CPF para qualquer finalidade além da verificação de identidade descrita acima.</li>
  </ul>
</div>
<p>
  O descumprimento dessas proibições pela empresa caracteriza uso indevido de dados pessoais,
  sujeito às sanções previstas na LGPD (art. 52) e à responsabilidade civil trabalhista.
</p>

<hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0"/>

<h2 style="font-size:16px;font-weight:700;color:#1e293b;margin:24px 0 10px 0">5. Como o anonimato é garantido — Proteção técnica em múltiplas camadas</h2>
<p>
  O anonimato das respostas não é apenas uma promessa — é uma <strong>garantia técnica</strong>
  incorporada na arquitetura do sistema. Entenda como funciona:
</p>

<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin-bottom:12px">
  <p style="margin:0 0 8px 0;font-weight:700;color:#15803d">🔒 Camada 1 — Desvinculamento no momento do envio</p>
  <p style="margin:0;color:#14532d;font-size:14px">
    Quando você abre a pesquisa pelo link recebido no celular, o sistema gera uma sessão temporária.
    No momento em que você confirma o envio das respostas, o sistema registra as respostas em uma
    tabela separada <em>sem nenhum identificador pessoal</em> — sem nome, telefone, matrícula ou e-mail.
    O link de acesso é então invalidado. A partir desse momento, <strong>não existe mais nenhuma
    ligação técnica</strong> entre você e as respostas enviadas.
  </p>
</div>

<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin-bottom:12px">
  <p style="margin:0 0 8px 0;font-weight:700;color:#15803d">🔒 Camada 2 — Regra de mínimo de respondentes</p>
  <p style="margin:0;color:#14532d;font-size:14px">
    Métricas e tendências de um setor só são exibidas para o RH quando <strong>ao menos 5 colaboradores
    responderam</strong> naquele período. Com menos respondentes, nenhum resultado é exibido — porque
    com poucos participantes seria fácil deduzir quem disse o quê. Essa regra não pode ser desativada
    pela empresa.
  </p>
</div>

<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin-bottom:12px">
  <p style="margin:0 0 8px 0;font-weight:700;color:#15803d">🔒 Camada 3 — Data sem horário</p>
  <p style="margin:0;color:#14532d;font-size:14px">
    O sistema armazena apenas a <em>data</em> da resposta (ex: "15/05/2026"), nunca o horário.
    Isso impede cruzamento com registros de ponto ou câmeras para tentativa de identificação pelo
    horário exato.
  </p>
</div>

<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin-bottom:12px">
  <p style="margin:0 0 8px 0;font-weight:700;color:#15803d">🔒 Camada 4 — Canal de relatos sem metadados</p>
  <p style="margin:0;color:#14532d;font-size:14px">
    O canal de relatos anônimos não coleta endereço IP, identificador de dispositivo, dados de
    localização ou qualquer metadado que pudesse indicar a identidade do autor. O único dado
    armazenado é o conteúdo do relato e o setor informado pelo próprio usuário.
  </p>
</div>

<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin-bottom:16px">
  <p style="margin:0 0 8px 0;font-weight:700;color:#15803d">🔒 Camada 5 — Acesso negado ao provedor da plataforma</p>
  <p style="margin:0;color:#14532d;font-size:14px">
    Por design arquitetural, nem mesmo os administradores técnicos da Pulse têm acesso às respostas
    das pesquisas ou aos relatos anônimos de nenhuma empresa cliente. Esse isolamento está
    implementado no nível do banco de dados e não pode ser contornado operacionalmente.
  </p>
</div>

<hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0"/>

<h2 style="font-size:16px;font-weight:700;color:#1e293b;margin:24px 0 10px 0">6. Dados que nunca são coletados</h2>
<p>A plataforma <strong>não coleta e tecnicamente não tem como coletar</strong>:</p>
<ul>
  <li>Localização GPS ou endereço IP durante o preenchimento da pesquisa;</li>
  <li>Dados biométricos (impressão digital, reconhecimento facial, voz);</li>
  <li>Informações médicas, diagnósticos, laudos ou prontuários clínicos;</li>
  <li>Histórico de navegação, cookies de rastreamento ou dados de outros aplicativos;</li>
  <li>Gravações de áudio ou vídeo de qualquer natureza;</li>
  <li>Dados de familiares ou pessoas fora do vínculo empregatício;</li>
  <li>Número do CPF em texto legível — apenas o hash SHA-256 (código criptográfico irreversível)
    pode ser armazenado, exclusivamente quando necessário para verificação de identidade em
    auditoria legal.</li>
</ul>

<hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0"/>

<h2 style="font-size:16px;font-weight:700;color:#1e293b;margin:24px 0 10px 0">7. Base legal para o tratamento de dados (LGPD)</h2>
<p>O tratamento dos seus dados está fundamentado em:</p>
<ul>
  <li>
    <strong>Art. 7º, inciso I da LGPD — Consentimento do titular:</strong> você fornece seu
    consentimento expresso, livre e informado ao aceitar este termo;
  </li>
  <li>
    <strong>Art. 7º, inciso II da LGPD — Cumprimento de obrigação legal:</strong> a empresa tem
    responsabilidade legal de cuidar da saúde ocupacional de seus colaboradores, e a plataforma
    instrumentaliza esse cumprimento;
  </li>
  <li>
    <strong>Art. 7º, inciso IX da LGPD — Legítimo interesse:</strong> para os dados de cadastro
    (nome e telefone) usados exclusivamente para envio do link da pesquisa, há legítimo interesse
    da empresa em cumprir suas obrigações trabalhistas e de saúde.
  </li>
</ul>
<p>O consentimento que você fornece aqui é:</p>
<ul>
  <li><strong>Livre:</strong> não há pressão, coerção ou consequência por recusar;</li>
  <li><strong>Informado:</strong> você está lendo agora todas as informações relevantes;</li>
  <li><strong>Inequívoco:</strong> o aceite é um ato positivo e expresso — não há aceitação tácita;</li>
  <li><strong>Específico:</strong> válido apenas para as finalidades descritas neste documento.</li>
</ul>

<hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0"/>

<h2 style="font-size:16px;font-weight:700;color:#1e293b;margin:24px 0 10px 0">8. Como seus dados são armazenados e protegidos</h2>
<p>
  A plataforma adota medidas técnicas e organizacionais de segurança adequadas ao nível de sensibilidade
  dos dados tratados, incluindo:
</p>
<ul>
  <li><strong>Criptografia em trânsito:</strong> toda comunicação entre seu dispositivo e os
    servidores usa protocolo TLS 1.2 ou superior;</li>
  <li><strong>Criptografia em repouso:</strong> dados armazenados no banco são criptografados
    em nível de disco;</li>
  <li><strong>Controle de acesso por perfil:</strong> cada usuário da empresa (RH, gestor) acessa
    apenas os dados correspondentes à sua função e setor;</li>
  <li><strong>Isolamento entre empresas:</strong> os dados da sua empresa estão tecnicamente isolados
    de qualquer outra empresa que use a plataforma;</li>
  <li><strong>Trilha de auditoria imutável:</strong> toda ação relevante realizada na plataforma
    é registrada com data, hora e responsável — sem possibilidade de exclusão;</li>
  <li><strong>Monitoramento de vulnerabilidades:</strong> a infraestrutura é monitorada continuamente
    e atualizada conforme boas práticas de segurança da informação.</li>
</ul>

<h3 style="font-size:14px;font-weight:700;color:#334155;margin:20px 0 10px 0">Prazo de retenção dos dados</h3>
<ul>
  <li><strong>Registro deste consentimento:</strong> mantido por <strong>mínimo de 5 anos</strong>
    após o encerramento do seu vínculo empregatício;</li>
  <li><strong>Respostas às pesquisas (anônimas):</strong> retidas pelo período de vigência do
    contrato entre a empresa e a Pulse;</li>
  <li><strong>Dados de cadastro (nome, telefone):</strong> excluídos em até 90 dias após o encerramento
    do contrato da empresa com a Pulse, salvo obrigação legal de retenção;</li>
  <li><strong>Após encerramento do contrato:</strong> todos os dados são excluídos de forma segura,
    salvo determinação legal em contrário.</li>
</ul>

<hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0"/>

<h2 style="font-size:16px;font-weight:700;color:#1e293b;margin:24px 0 10px 0">9. Seus direitos como titular de dados (LGPD)</h2>
<p>A Lei Geral de Proteção de Dados Pessoais (LGPD) garante a você os seguintes direitos, que podem ser exercidos a qualquer momento:</p>
<ul>
  <li>
    <strong>Acesso (art. 18, II):</strong> saber quais dados pessoais seus estão armazenados na plataforma;
  </li>
  <li>
    <strong>Correção (art. 18, III):</strong> solicitar a correção de dados incompletos, inexatos ou desatualizados;
  </li>
  <li>
    <strong>Anonimização ou exclusão (art. 18, IV):</strong> solicitar que dados desnecessários ou
    tratados em desconformidade com a LGPD sejam anonimizados, bloqueados ou excluídos;
  </li>
  <li>
    <strong>Portabilidade (art. 18, V):</strong> receber seus dados em formato estruturado para
    transferência a outro serviço;
  </li>
  <li>
    <strong>Revogação do consentimento (art. 18, IX):</strong> retirar seu consentimento a qualquer
    momento, sem penalidade de nenhuma natureza;
  </li>
  <li>
    <strong>Oposição (art. 18, VI):</strong> opor-se ao tratamento realizado sem base legal adequada;
  </li>
  <li>
    <strong>Informação (art. 18, VII e VIII):</strong> ser informado sobre entidades públicas e privadas
    com as quais seus dados foram compartilhados;
  </li>
  <li>
    <strong>Reclamação à ANPD (art. 18, §1º):</strong> registrar reclamação à Autoridade Nacional
    de Proteção de Dados se acreditar que seus direitos foram violados.
  </li>
</ul>
<p>
  Para exercer qualquer desses direitos, procure o setor de RH da sua empresa. O RH é o canal
  preferencial para solicitações do dia a dia. Para questões que o RH não puder resolver, entre em
  contato diretamente com a Pulse pelo e-mail <strong>privacidade@usepulse.com.br</strong>.
</p>

<hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0"/>

<h2 style="font-size:16px;font-weight:700;color:#1e293b;margin:24px 0 10px 0">10. Como revogar seu consentimento</h2>
<p>
  Você pode revogar este consentimento a qualquer momento. Basta comunicar o RH da sua empresa ou,
  ao receber o link de uma pesquisa, utilizar a opção <em>"Não quero mais participar"</em> disponível
  no próprio formulário.
</p>
<p>Ao revogar:</p>
<ul>
  <li>Você não receberá mais nenhuma pesquisa;</li>
  <li>Respostas já enviadas permanecem nos registros em forma anônima — não é possível excluí-las
    individualmente porque, por design, não há como identificar quais respostas foram suas;</li>
  <li>O registro da revogação é mantido para fins de auditoria legal;</li>
  <li><strong>Não há nenhuma consequência trabalhista, funcional ou disciplinar.</strong>
    Sua avaliação de desempenho, remuneração e relação de trabalho não são afetadas.</li>
</ul>

<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 18px;margin:16px 0">
  <p style="margin:0;font-size:13px;color:#15803d">
    ✅ <strong>Se mudar de ideia, pode aceitar novamente.</strong> Se você revogou e quiser
    voltar a participar, o RH pode te enviar um novo convite. Um colaborador pode aceitar,
    recusar, revogar e aceitar novamente quantas vezes quiser.
  </p>
</div>

<hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0"/>

<h2 style="font-size:16px;font-weight:700;color:#1e293b;margin:24px 0 10px 0">11. Como seus dados são usados pela sua empresa</h2>
<p>
  Os responsáveis de RH e gestores autorizados da empresa têm acesso ao painel da plataforma,
  onde visualizam exclusivamente:
</p>
<ul>
  <li><strong>Médias e indicadores agregados por setor</strong> — nunca por indivíduo;</li>
  <li><strong>Percentual de participação por setor</strong> — quantos colaboradores responderam,
    sem identificar quem;</li>
  <li><strong>Tendências ao longo do tempo</strong> — se um setor vem melhorando ou piorando;</li>
  <li><strong>Alertas automáticos</strong> — quando algum indicador cai abaixo de um limiar
    configurado, o sistema avisa o RH para que uma ação seja tomada;</li>
  <li><strong>Relatos anônimos</strong> — apenas o conteúdo, sem qualquer identificação do autor.</li>
</ul>
<p>
  O objetivo de todo esse processo é que a empresa tome <strong>ações coletivas de melhoria</strong>
  — como ajustar a carga de trabalho de um setor, promover treinamentos, melhorar a comunicação
  interna ou revisar processos.
</p>

<hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0"/>

<h2 style="font-size:16px;font-weight:700;color:#1e293b;margin:24px 0 10px 0">12. Compartilhamento de dados com terceiros</h2>
<p>Seus dados <strong>não são vendidos, alugados ou compartilhados para fins comerciais</strong>. O acesso é restrito a:</p>
<ul>
  <li>
    <strong>Sua empresa:</strong> acessa apenas métricas anônimas e agregadas por setor,
    conforme descrito na cláusula 11;
  </li>
  <li>
    <strong>Pulse (operadora):</strong> acessa dados técnicos estritamente necessários para operar
    e manter a plataforma, sob obrigação de confidencialidade;
  </li>
  <li>
    <strong>Parceiros de infraestrutura:</strong> serviços de hospedagem, banco de dados e
    envio de mensagens (SMS/WhatsApp), todos vinculados por acordos de processamento de dados (DPA)
    em conformidade com a LGPD;
  </li>
  <li>
    <strong>Autoridades competentes:</strong> exclusivamente quando exigido por lei, decisão
    judicial ou regulamentação de autoridade competente.
  </li>
</ul>

<hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0"/>

<h2 style="font-size:16px;font-weight:700;color:#1e293b;margin:24px 0 10px 0">13. Incidentes de segurança</h2>
<p>
  Em caso de incidente de segurança que possa colocar em risco seus direitos e liberdades, a Pulse
  e sua empresa têm as seguintes obrigações:
</p>
<ul>
  <li>Comunicar o incidente à ANPD em até 72 horas após a confirmação;</li>
  <li>Notificar os titulares afetados em prazo razoável, descrevendo o que aconteceu, quais dados
    foram envolvidos e quais medidas foram tomadas;</li>
  <li>Documentar o incidente, as causas e as ações corretivas no registro de auditoria interno.</li>
</ul>
<p>
  Dado que as respostas às pesquisas são desvinculadas da identidade dos respondentes, um eventual
  vazamento de dados de pesquisa <strong>não compromete a privacidade individual</strong> —
  pois os dados em si são anônimos por design.
</p>

<hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0"/>

<h2 style="font-size:16px;font-weight:700;color:#1e293b;margin:24px 0 10px 0">14. Atualizações deste termo</h2>
<p>
  Este termo pode ser atualizado para refletir mudanças no serviço, na legislação ou nas práticas
  de proteção de dados. Quando isso ocorrer:
</p>
<ul>
  <li>Você será notificado por SMS ou WhatsApp com um link para o novo termo;</li>
  <li>A participação nas pesquisas ficará temporariamente suspensa até que você aceite ou recuse
    a nova versão — suas respostas anteriores permanecem íntegras;</li>
  <li>Recusar o novo termo tem o mesmo efeito que revogar o consentimento (ver cláusula 10),
    sem qualquer penalidade.</li>
</ul>

<hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0"/>

<h2 style="font-size:16px;font-weight:700;color:#1e293b;margin:24px 0 10px 0">15. Canais de contato e Encarregado de Dados (DPO)</h2>
<ul>
  <li>
    <strong>RH da sua empresa:</strong> canal preferencial para solicitações do dia a dia,
    revogação de consentimento e dúvidas operacionais;
  </li>
  <li>
    <strong>Pulse — Encarregado de Proteção de Dados (DPO):</strong>
    <strong>privacidade@usepulse.com.br</strong>
    — para solicitações de direitos do titular, reclamações ou questões que o RH não puder resolver;
  </li>
  <li>
    <strong>Autoridade Nacional de Proteção de Dados (ANPD):</strong>
    se você acreditar que seus direitos como titular foram violados, pode registrar uma reclamação
    diretamente em <strong>www.gov.br/anpd</strong>.
  </li>
</ul>

<hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0"/>

<h2 style="font-size:16px;font-weight:700;color:#1e293b;margin:24px 0 10px 0">16. Glossário — Termos técnicos em linguagem simples</h2>
<ul style="font-size:13px">
  <li><strong>Titular dos dados:</strong> você — a pessoa a quem os dados se referem;</li>
  <li><strong>Controlador:</strong> sua empresa — quem decide para que os dados são usados;</li>
  <li><strong>Operador:</strong> a Pulse — quem trata os dados conforme instruções do controlador;</li>
  <li><strong>LGPD:</strong> Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018);</li>
  <li><strong>TCLE:</strong> Termo de Consentimento Livre e Esclarecido — este documento;</li>
  <li><strong>ANPD:</strong> Autoridade Nacional de Proteção de Dados — órgão que fiscaliza o cumprimento da LGPD;</li>
  <li><strong>Hash SHA-256:</strong> algoritmo matemático que transforma um dado em um código irreversível;</li>
  <li><strong>Fator de risco ocupacional:</strong> elemento do ambiente de trabalho que pode afetar a saúde ou bem-estar dos colaboradores, como sobrecarga, conflitos ou falta de recursos;</li>
  <li><strong>DPO (Data Protection Officer):</strong> Encarregado de Proteção de Dados — responsável por garantir o cumprimento da LGPD.</li>
</ul>

<hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0"/>

<div style="background:#f0f7ff;border:1px solid #bfdbfe;border-radius:10px;padding:20px 24px;margin-bottom:20px">
  <p style="margin:0 0 10px 0;font-weight:700;color:#1d4ed8;font-size:15px">✅ Ao aceitar este termo, você declara que:</p>
  <ul style="margin:0;padding-left:20px;color:#1e3a5f">
    <li>Leu e compreendeu todas as informações descritas acima;</li>
    <li>Aceita voluntariamente participar das pesquisas periódicas de bem-estar;</li>
    <li>Está ciente de que suas respostas são anônimas por garantia técnica, não apenas por promessa;</li>
    <li>Entende que pode revogar este consentimento a qualquer momento, sem penalidade de qualquer natureza;</li>
    <li>Conhece seus direitos como titular de dados pessoais conforme a LGPD e os canais para exercê-los;</li>
    <li>Tem ciência de que a participação não influencia sua avaliação de desempenho, remuneração ou qualquer decisão sobre o seu emprego.</li>
  </ul>
</div>

<p style="font-size:11px;color:#64748b;margin-top:16px;text-align:center">
  Pulse Tecnologia em Saúde Ocupacional · privacidade@usepulse.com.br ·
  Versão 1.1.0 — Vigente a partir de 01/05/2026 ·
  Fundamento legal: LGPD (Lei nº 13.709/2018)
</p>

</div>`,
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

async function seedConsentTerms() {
  const existingV2 = await prisma.consentTermVersion.findUnique({
    where: { version: CONSENT_TERM_V2.version },
  });
  if (existingV2) {
    console.log(`⏭  Consent term v${CONSENT_TERM_V2.version} already exists`);
    return;
  }

  const contentHash = createHash("sha256").update(CONSENT_TERM_V2.content).digest("hex");
  await prisma.$transaction(async (tx) => {
    await tx.consentTermVersion.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });
    await tx.consentTermVersion.create({
      data: {
        version: CONSENT_TERM_V2.version,
        content: CONSENT_TERM_V2.content,
        contentHash,
        isActive: true,
      },
    });
  });

  console.log(`✅ Consent term v${CONSENT_TERM_V2.version} created`);
}

const PRIVACY_POLICY_V1 = {
  version: "1.0.0",
  title: "Política de Privacidade — Pulse",
  effectiveAt: new Date("2026-01-01"),
  content: `<h2>Política de Privacidade</h2>
<p><strong>Versão:</strong> 1.0.0 &nbsp;|&nbsp; <strong>Vigência:</strong> 01 de janeiro de 2026</p>

<hr/>

<h3>1. Quem somos</h3>
<p>
  A <strong>Pulse Tecnologia em Saúde Ocupacional</strong> ("Pulse", "nós" ou "plataforma") é uma empresa
  de software que oferece uma plataforma SaaS voltada ao monitoramento de bem-estar e saúde ocupacional
  de colaboradores em empresas contratantes.
</p>
<p>
  Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos os dados pessoais
  de usuários da plataforma (administradores e profissionais de RH das organizações contratantes),
  bem como dos colaboradores cadastrados.
</p>

<h3>2. Dados que coletamos</h3>
<p><strong>De usuários da plataforma (admins e RH):</strong></p>
<ul>
  <li>Nome completo, endereço de e-mail e senha (armazenada em hash seguro);</li>
  <li>Endereço IP e user-agent no momento do aceite dos Termos de Uso;</li>
  <li>Registros de acesso (data, hora, páginas visitadas) para fins de auditoria e segurança.</li>
</ul>
<p><strong>De colaboradores das organizações contratantes:</strong></p>
<ul>
  <li>Nome completo, telefone e e-mail (quando fornecido), cadastrados pelo RH da empresa;</li>
  <li>Departamento e status de participação;</li>
  <li>Hash criptográfico do CPF (SHA-256, irreversível) — apenas quando há aceite formal de participação;</li>
  <li>Respostas anônimas a pesquisas de bem-estar — desvinculadas da identidade do respondente por design técnico;</li>
  <li>Registro de consentimento (aceite, recusa ou revogação) com data, hora e versão do termo.</li>
</ul>

<h3>3. Como usamos os dados</h3>
<p>Os dados são usados exclusivamente para:</p>
<ul>
  <li>Operar e manter a plataforma e seus recursos;</li>
  <li>Enviar pesquisas de bem-estar aos colaboradores via SMS ou WhatsApp;</li>
  <li>Calcular indicadores agregados e anônimos por setor para exibição ao RH;</li>
  <li>Gerar alertas automáticos quando indicadores caem abaixo de limiares configurados;</li>
  <li>Registrar e comprovar o consentimento de cada colaborador;</li>
  <li>Autenticar usuários e garantir a segurança de acesso;</li>
  <li>Atender obrigações legais e regulatórias aplicáveis.</li>
</ul>
<p>
  <strong>Não usamos dados para publicidade, venda a terceiros ou treinamento de modelos de inteligência
  artificial de terceiros.</strong>
</p>

<h3>4. Compartilhamento de dados</h3>
<p>Compartilhamos dados apenas nas seguintes situações:</p>
<ul>
  <li>
    <strong>Organizações contratantes:</strong> têm acesso exclusivamente a indicadores anônimos e agregados
    por setor — nunca a respostas individuais identificáveis;
  </li>
  <li>
    <strong>Parceiros de infraestrutura:</strong> provedores de hospedagem, banco de dados e envio de mensagens
    (SMS/WhatsApp), vinculados por contratos de processamento de dados (DPA);
  </li>
  <li>
    <strong>Autoridades competentes:</strong> quando exigido por lei, decisão judicial ou determinação de
    autoridade regulatória.
  </li>
</ul>

<h3>5. Segurança dos dados</h3>
<p>Adotamos medidas técnicas e organizacionais para proteger os dados, incluindo:</p>
<ul>
  <li>Criptografia em trânsito (TLS 1.2+) e em repouso;</li>
  <li>Controle de acesso por perfil e isolamento de dados entre organizações;</li>
  <li>Trilha de auditoria imutável para todas as ações relevantes;</li>
  <li>Monitoramento contínuo de vulnerabilidades;</li>
  <li>Acesso negado por design: nem mesmo os administradores técnicos da Pulse têm acesso às respostas
    de pesquisas ou relatos anônimos das organizações.</li>
</ul>

<h3>6. Retenção de dados</h3>
<p>Os dados são retidos pelos seguintes prazos:</p>
<ul>
  <li><strong>Dados de colaboradores ativos:</strong> durante toda a vigência do contrato da organização;</li>
  <li><strong>Registros de consentimento:</strong> mínimo de 5 anos após o encerramento do vínculo empregatício;</li>
  <li><strong>Respostas de pesquisas (anônimas):</strong> enquanto o contrato estiver ativo;</li>
  <li><strong>Após encerramento do contrato:</strong> dados mantidos por até 90 dias para fins de backup,
    em seguida excluídos de forma segura, salvo obrigação legal de retenção.</li>
</ul>

<h3>7. Seus direitos como titular de dados</h3>
<p>Você pode, a qualquer momento, exercer os seguintes direitos:</p>
<ul>
  <li><strong>Acesso:</strong> saber quais dados pessoais seus estão armazenados;</li>
  <li><strong>Correção:</strong> solicitar a correção de dados incorretos ou desatualizados;</li>
  <li><strong>Exclusão:</strong> solicitar a exclusão de dados desnecessários ou tratados ilegalmente;</li>
  <li><strong>Portabilidade:</strong> receber seus dados em formato estruturado;</li>
  <li><strong>Revogação do consentimento:</strong> cancelar participação a qualquer momento, sem penalidade;</li>
  <li><strong>Oposição:</strong> opor-se ao tratamento realizado sem base legal adequada;</li>
  <li><strong>Reclamação à ANPD:</strong> registrar reclamação à Autoridade Nacional de Proteção de Dados.</li>
</ul>
<p>
  Para exercer seus direitos, entre em contato com o RH da sua empresa ou diretamente com a Pulse pelo
  e-mail <strong>privacidade@usepulse.com.br</strong>. O prazo de resposta é de até 15 dias corridos.
</p>

<h3>8. Cookies e rastreamento</h3>
<p>
  A plataforma utiliza cookies estritamente necessários para manter a sessão autenticada dos usuários.
  Não utilizamos cookies de rastreamento, publicidade ou análise comportamental de terceiros.
</p>

<h3>9. Transferência internacional de dados</h3>
<p>
  Os dados são armazenados em servidores localizados no Brasil ou em jurisdições que oferecem nível
  adequado de proteção conforme os padrões da ANPD e da LGPD.
</p>

<h3>10. Atualizações desta política</h3>
<p>
  Esta Política de Privacidade pode ser atualizada periodicamente. Alterações relevantes serão comunicadas
  com antecedência mínima de 15 dias por e-mail ou notificação na plataforma.
</p>

<h3>11. Contato e Encarregado de Dados (DPO)</h3>
<ul>
  <li><strong>E-mail:</strong> privacidade@usepulse.com.br</li>
  <li><strong>Assunto:</strong> "Direitos do Titular" ou "Política de Privacidade"</li>
</ul>
<p>
  Caso acredite que seus direitos foram violados, você pode registrar uma reclamação diretamente na
  <strong>Autoridade Nacional de Proteção de Dados (ANPD)</strong> em <strong>www.gov.br/anpd</strong>.
</p>

<hr/>
<p style="font-size:12px;color:#64748b;">
  Pulse Tecnologia em Saúde Ocupacional · privacidade@usepulse.com.br · Versão 1.0.0 — Vigente a partir de 01/01/2026
</p>`,
};

async function seedPrivacyPolicy() {
  const existing = await prisma.privacyPolicyVersion.findUnique({
    where: { version: PRIVACY_POLICY_V1.version },
  });
  if (existing) {
    console.log(`⏭  Privacy policy v${PRIVACY_POLICY_V1.version} already exists`);
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.privacyPolicyVersion.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });
    await tx.privacyPolicyVersion.create({
      data: {
        version: PRIVACY_POLICY_V1.version,
        title: PRIVACY_POLICY_V1.title,
        content: PRIVACY_POLICY_V1.content,
        effectiveAt: PRIVACY_POLICY_V1.effectiveAt,
        isActive: true,
      },
    });
  });

  console.log(`✅ Privacy policy v${PRIVACY_POLICY_V1.version} created`);
}

async function main() {
  console.log("\n🌱 Starting seed...\n");

  await seedSuperAdmin();
  await seedTerms();
  await seedConsentTerms();
  await seedPrivacyPolicy();

  console.log("\n🎉 Seed complete!\n");
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
