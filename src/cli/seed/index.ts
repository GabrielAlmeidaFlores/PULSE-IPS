import "dotenv/config"

const EMAIL_SUPPORT = process.env["NEXT_PUBLIC_EMAIL_SUPPORT"] ?? "suporte@pulseips.com.br"
const EMAIL_PRIVACY = process.env["NEXT_PUBLIC_EMAIL_PRIVACY"] ?? "privacidade@pulseips.com.br"
const EMAIL_LEGAL = process.env["NEXT_PUBLIC_EMAIL_LEGAL"] ?? "legal@pulseips.com.br"
import { createLogger } from "../../libs/utils/logger"
import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });
const logger = createLogger("seed")

const SUPER_ADMIN = {
  email: "admin@admin.com",
  password: "Testando123!",
  name: "Administrator",
};

const TERMS_V1 = {
  version: "1.0.0",
  title: "Termos de Uso — Pulse IPS",
  effectiveAt: new Date("2026-05-01"),
  content: `<h1>Termos de Uso da Plataforma Pulse IPS</h1>
<p><strong>Versão:</strong> 1.1.0 | <strong>Vigência:</strong> 01 de maio de 2026</p>
<hr/>
<p>O presente instrumento regula a relação contratual entre a <strong>Pulse Tecnologia em Saúde Ocupacional Ltda.</strong> ("Pulse", "nós" ou "plataforma") e a <strong>Organização Contratante</strong> ("você", "cliente" ou "organização"), pessoa jurídica que contrata o acesso à plataforma Pulse IPS para fins de monitoramento de saúde e bem-estar ocupacional de seus colaboradores.</p>
<p>Ao aceitar estes Termos, o representante da organização declara possuir poderes legais suficientes para contratar em nome da empresa e que leu, compreendeu e concorda com todas as cláusulas aqui dispostas.</p>
<h2>1. Objeto do Contrato</h2>
<p>O objeto deste contrato é a licença de uso da plataforma SaaS Pulse IPS, software de monitoramento de saúde ocupacional voltado ao cumprimento das obrigações legais decorrentes da Norma Regulamentadora NR-1 (Portaria MTE nº 1.419/2024) e demais legislação trabalhista e previdenciária aplicável.</p>
<h2>2. Descrição do Serviço</h2>
<p>A plataforma Pulse IPS disponibiliza os seguintes recursos:</p>
<ul>
  <li>Gestão de cadastro de colaboradores e departamentos;</li>
  <li>Envio e coleta de questionários de saúde ocupacional via SMS ou WhatsApp;</li>
  <li>Registro e gerenciamento de consentimento de participação dos colaboradores, conforme LGPD;</li>
  <li>Detecção e disparo automático de alertas de saúde com base nas respostas coletadas;</li>
  <li>Criação, acompanhamento e gestão de planos de ação corretivos e preventivos;</li>
  <li>Canal de relatos anônimos de colaboradores;</li>
  <li>Repositório de documentos de saúde e segurança do trabalho;</li>
  <li>Geração de relatórios em PDF para o Programa de Gerenciamento de Riscos (PGR).</li>
</ul>
<h2>3. Condições de Acesso e Uso</h2>
<h3>3.1 Cadastro e Responsabilidade</h3>
<p>Para utilizar a plataforma, a organização deve fornecer informações verdadeiras, completas e atualizadas no momento do cadastro. A organização é responsável pela manutenção das credenciais de acesso de seus usuários e por todas as ações realizadas mediante tais credenciais.</p>
<h3>3.2 Usuários Autorizados</h3>
<p>A organização pode cadastrar usuários com os perfis de Administrador e RH. Cada usuário deve ser uma pessoa física identificada com vínculo empregatício ou contratual com a organização. O compartilhamento de credenciais de acesso é expressamente vedado.</p>
<h3>3.3 Uso Aceitável</h3>
<p>A organização se compromete a utilizar a plataforma exclusivamente para as finalidades descritas neste contrato e em conformidade com a legislação aplicável. É vedado:</p>
<ul>
  <li>Usar a plataforma para fins ilícitos ou que violem direitos de terceiros;</li>
  <li>Tentar acessar dados de outras organizações cadastradas na plataforma;</li>
  <li>Realizar engenharia reversa, decompilar ou desmontar qualquer componente da plataforma;</li>
  <li>Usar os dados dos colaboradores para fins discriminatórios, punitivos ou que violem a LGPD;</li>
  <li>Tomar decisões individuais automatizadas com base nas respostas das pesquisas, sem análise humana;</li>
  <li>Sublocar, revender ou transferir o acesso à plataforma a terceiros.</li>
</ul>
<h2>4. Responsabilidades da Pulse</h2>
<p>A Pulse se responsabiliza por:</p>
<ul>
  <li>Disponibilizar a plataforma com disponibilidade mínima de 99,5% ao mês, excluídos períodos de manutenção programada previamente comunicados;</li>
  <li>Processar os dados dos colaboradores exclusivamente conforme as instruções da organização e nos limites deste contrato e da LGPD;</li>
  <li>Implementar e manter medidas técnicas e organizacionais adequadas para proteger os dados contra acesso não autorizado, perda ou destruição;</li>
  <li>Comunicar incidentes de segurança que afetem dados pessoais em até 72 horas após a confirmação;</li>
  <li>Manter um Encarregado de Proteção de Dados (DPO) disponível para atender solicitações relacionadas à LGPD;</li>
  <li>Excluir ou devolver os dados da organização ao término do contrato, conforme solicitação.</li>
</ul>
<h2>5. Responsabilidades da Organização Contratante</h2>
<p>A organização se responsabiliza por:</p>
<ul>
  <li>Obter o consentimento livre, informado e expresso de cada colaborador antes de seu ingresso nas pesquisas, por meio do Termo de Consentimento Livre e Esclarecido (TCLE) disponibilizado pela plataforma;</li>
  <li>Utilizar os dados e resultados das pesquisas exclusivamente para as finalidades previstas neste contrato e no TCLE;</li>
  <li>Não usar os resultados das pesquisas para fins disciplinares, demissionários ou avaliativos individuais;</li>
  <li>Manter os cadastros de colaboradores atualizados, incluindo status de pausa e desligamento;</li>
  <li>Designar usuários com perfis adequados às suas atribuições;</li>
  <li>Comunicar à Pulse qualquer suspeita de uso indevido da plataforma ou de dados de colaboradores.</li>
</ul>
<h2>6. Proteção de Dados e LGPD</h2>
<h3>6.1 Papéis no Tratamento de Dados</h3>
<p>Para fins da Lei nº 13.709/2018 (LGPD), a organização contratante é a <strong>Controladora</strong> dos dados de seus colaboradores, e a Pulse atua como <strong>Operadora</strong>, processando os dados exclusivamente conforme as instruções da organização.</p>
<h3>6.2 Bases Legais</h3>
<p>O tratamento de dados na plataforma está fundamentado nas seguintes hipóteses legais da LGPD:</p>
<ul>
  <li><strong>Consentimento (art. 7º, I):</strong> obtido de cada colaborador via TCLE antes de qualquer coleta;</li>
  <li><strong>Cumprimento de obrigação legal (art. 7º, II):</strong> obrigações trabalhistas e previdenciárias decorrentes da NR-1;</li>
  <li><strong>Legítimo interesse (art. 7º, IX):</strong> para dados de cadastro operacional de usuários da plataforma.</li>
</ul>
<h3>6.3 Garantias Técnicas de Anonimato</h3>
<p>As respostas às pesquisas são anonimizadas por garantia técnica. Após o envio, nenhum vínculo técnico existe entre a resposta e o colaborador que a forneceu. Métricas de um setor são exibidas somente quando ao menos cinco colaboradores responderam no período.</p>
<h3>6.4 Dados Pessoais Tratados</h3>
<p>A Pulse, na qualidade de Operadora, trata os seguintes dados pessoais dos colaboradores em nome da organização:</p>
<ul>
  <li>Nome completo e telefone — para envio do link de pesquisa;</li>
  <li>E-mail — opcional, para comunicações administrativas;</li>
  <li>Hash SHA-256 do CPF — somente mediante aceite formal do TCLE;</li>
  <li>Registro de consentimento — data, hora, versão do termo e IP;</li>
  <li>Respostas às pesquisas — anonimizadas no momento do envio.</li>
</ul>
<h2>7. Confidencialidade</h2>
<p>Ambas as partes se comprometem a manter em sigilo todas as informações confidenciais a que tiverem acesso em razão deste contrato, utilizando-as exclusivamente para as finalidades previstas, e a não divulgá-las a terceiros sem autorização prévia e por escrito da parte titular das informações. Esta obrigação de confidencialidade persiste por 5 (cinco) anos após o término do contrato.</p>
<h2>8. Propriedade Intelectual</h2>
<p>A plataforma Pulse IPS, incluindo seu código-fonte, interface, marca, logotipo, documentação e demais elementos, é de propriedade exclusiva da Pulse Tecnologia em Saúde Ocupacional Ltda. Nada neste contrato transfere à organização qualquer direito de propriedade intelectual sobre a plataforma ou seus componentes. A organização detém a propriedade dos dados inseridos e gerados em sua conta.</p>
<h2>9. Planos, Preços e Pagamento</h2>
<h3>9.1 Planos Disponíveis</h3>
<p>A plataforma é oferecida em diferentes planos de assinatura, com características, limites de colaboradores e preços descritos na página de planos acessível durante o cadastro e na área de faturamento da plataforma.</p>
<h3>9.2 Faturamento</h3>
<p>O faturamento é realizado de forma recorrente conforme o plano contratado, com cobrança mensal ou anual, conforme escolha da organização. O pagamento é processado por meio de plataforma de pagamentos certificada PCI DSS. A Pulse não armazena dados de cartão de crédito.</p>
<h3>9.3 Inadimplência</h3>
<p>Em caso de falha no pagamento, a organização será notificada por e-mail. Após o período de carência definido pelo plano, o acesso à plataforma poderá ser suspenso até a regularização. Dados e configurações são preservados durante a suspensão por até 90 dias.</p>
<h3>9.4 Cancelamento</h3>
<p>A organização pode cancelar a assinatura a qualquer momento pela área de faturamento da plataforma. O cancelamento produz efeito ao fim do período contratado em vigor. Não há reembolso proporcional por períodos não utilizados, exceto nos casos previstos no Código de Defesa do Consumidor.</p>
<h2>10. Suspensão e Rescisão</h2>
<h3>10.1 Suspensão por Descumprimento</h3>
<p>A Pulse poderá suspender o acesso da organização, sem aviso prévio, em caso de violação grave destes Termos, uso ilegal da plataforma ou risco à segurança de dados de terceiros. A organização será notificada imediatamente após a suspensão e terá prazo para apresentar justificativas.</p>
<h3>10.2 Rescisão por Justa Causa</h3>
<p>Este contrato poderá ser rescindido por justa causa por qualquer das partes em caso de descumprimento grave das obrigações previstas, mediante notificação escrita com prazo de cura de 15 dias, exceto nos casos em que a cura não seja possível.</p>
<h3>10.3 Efeitos da Rescisão</h3>
<p>Após a rescisão ou cancelamento, a organização terá 30 dias para exportar seus dados. Findo esse prazo, os dados serão excluídos de forma segura, exceto os registros de consentimento dos colaboradores, que são retidos por 5 anos por determinação legal.</p>
<h2>11. Limitação de Responsabilidade</h2>
<p>A responsabilidade total da Pulse por danos diretos decorrentes deste contrato, em qualquer hipótese, fica limitada ao valor pago pela organização nos 12 meses anteriores ao evento que gerou o dano. A Pulse não se responsabiliza por danos indiretos, lucros cessantes, perda de dados por ação da organização ou falhas de infraestrutura de terceiros.</p>
<h2>12. Modificações dos Termos</h2>
<p>A Pulse poderá atualizar estes Termos para refletir mudanças no serviço ou na legislação. Alterações relevantes serão comunicadas com antecedência mínima de 15 dias por e-mail ou notificação na plataforma. O uso continuado da plataforma após a data de vigência da nova versão implica aceitação dos novos termos.</p>
<h2>13. Disposições Gerais</h2>
<h3>13.1 Integralidade</h3>
<p>Este instrumento, em conjunto com a Política de Privacidade e demais políticas referenciadas, constitui o acordo integral entre as partes sobre o objeto aqui tratado, substituindo quaisquer entendimentos anteriores, verbais ou escritos.</p>
<h3>13.2 Cessão</h3>
<p>A organização não pode ceder os direitos e obrigações deste contrato sem autorização prévia e por escrito da Pulse. A Pulse pode ceder o contrato em caso de fusão, aquisição ou reestruturação societária, desde que o sucessor assuma todas as obrigações aqui previstas.</p>
<h3>13.3 Lei Aplicável e Foro</h3>
<p>Este contrato é regido pela legislação brasileira. Fica eleito o foro da Comarca de São Paulo — SP para dirimir quaisquer controvérsias decorrentes deste instrumento, com renúncia a qualquer outro, por mais privilegiado que seja.</p>
<h2>14. Contato</h2>
<ul>
  <li><strong>Suporte técnico:</strong> ${EMAIL_SUPPORT}</li>
  <li><strong>Questões contratuais:</strong> ${EMAIL_LEGAL}</li>
  <li><strong>Proteção de dados (DPO):</strong> ${EMAIL_PRIVACY}</li>
</ul>
<hr/>
<p>Ao aceitar estes Termos, você declara que leu, compreendeu e concorda com todas as disposições acima, e que possui poderes legais para contratar em nome da organização.</p>
<p>Pulse Tecnologia em Saúde Ocupacional Ltda. — Versão 1.0.0 — Vigente a partir de 01/05/2026.</p>`,
};

const CONSENT_TERM = {
  version: "1.0.0",
  content: `<h1>Termo de Consentimento Livre e Esclarecido (TCLE)</h1>
<p><strong>Versão:</strong> 1.0.0 | <strong>Vigência:</strong> 01 de maio de 2026 | <strong>Fundamento legal:</strong> LGPD — Lei nº 13.709/2018</p>
<hr/>
<p>Antes de aceitar, leia com atenção. Este documento explica, de forma clara e completa, o que é a plataforma Pulse IPS, para que seus dados serão usados, o que jamais será feito com eles e quais são os seus direitos.</p>
<p><strong>Sua participação é 100% voluntária.</strong> Aceitar ou recusar não gera qualquer consequência no seu emprego, na sua avaliação de desempenho, na sua remuneração ou em qualquer outra dimensão da sua vida profissional. Você pode mudar de ideia a qualquer momento.</p>
<h2>1. Quem somos e por que este termo existe</h2>
<p>A plataforma <strong>Pulse IPS</strong> é um software de monitoramento de bem-estar ocupacional contratado pela sua empresa. Ela foi criada para apoiar organizações a cuidar ativamente da saúde e do desempenho de suas equipes, identificando fatores que afetam o clima, a motivação e o bem-estar dos colaboradores de forma ética, segura e confidencial.</p>
<p>Para fazer esse monitoramento de forma ética e legal, a lei exige que cada colaborador seja informado com clareza e dê seu consentimento expresso antes de qualquer coleta de dados. Este documento é esse consentimento.</p>
<p>Nesta relação existem três partes:</p>
<ul>
  <li><strong>Você</strong> (colaborador) — o titular dos dados, a quem pertencem todas as informações geradas pela sua participação;</li>
  <li><strong>Sua empresa</strong> (empregadora) — a controladora dos dados, que definiu a finalidade do uso e é juridicamente responsável pelo tratamento;</li>
  <li><strong>Pulse Tecnologia em Saúde Ocupacional Ltda.</strong> — a operadora dos dados, que processa as informações exclusivamente conforme instruções da sua empresa e nos limites deste termo.</li>
</ul>
<h2>2. O que é o Pulse IPS e como ele funciona na prática</h2>
<p>O Pulse IPS envia periodicamente uma pesquisa rápida para o seu celular, via link por SMS ou WhatsApp. Ela tem entre 5 e 10 perguntas e leva menos de 2 minutos para responder. As perguntas abordam temas como:</p>
<ul>
  <li>Como você está se sentindo no trabalho ultimamente;</li>
  <li>Se a carga de trabalho está equilibrada;</li>
  <li>Como está a relação com sua equipe e liderança;</li>
  <li>Se o ambiente físico e os recursos disponíveis são adequados;</li>
  <li>Outros fatores que impactam o bem-estar no dia a dia.</li>
</ul>
<p>As respostas são avaliações numéricas de 1 a 5. A frequência das pesquisas é definida pela sua empresa — pode ser semanal, quinzenal ou mensal.</p>
<p>Além das pesquisas, a plataforma disponibiliza um canal opcional de relato anônimo, onde você pode reportar situações que considera importantes sem se identificar.</p>
<p>O sistema só envia pesquisas dentro do seu horário de expediente, nos dias de trabalho configurados pela empresa. Nunca fora do turno.</p>
<h2>3. Quais dados são coletados e para que</h2>
<p>Ao aceitar este termo, você autoriza o tratamento das seguintes informações:</p>
<table>
  <thead>
    <tr>
      <th>Dado coletado</th>
      <th>Finalidade</th>
      <th>Identificado?</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Respostas às pesquisas (notas de 1 a 5)</td>
      <td>Calcular indicadores de bem-estar por setor</td>
      <td>Não — anônimo por garantia técnica</td>
    </tr>
    <tr>
      <td>Data da resposta (sem horário)</td>
      <td>Organizar resultados por período de referência</td>
      <td>Não — anônimo</td>
    </tr>
    <tr>
      <td>Registro de aceite deste termo (data, hora, versão)</td>
      <td>Comprovação de conformidade legal (LGPD)</td>
      <td>Sim — vinculado ao seu cadastro</td>
    </tr>
    <tr>
      <td>Nome e telefone (cadastrado pelo RH)</td>
      <td>Enviar o link da pesquisa ao seu celular</td>
      <td>Sim — apenas para o RH</td>
    </tr>
    <tr>
      <td>Conteúdo do relato anônimo (se utilizado)</td>
      <td>Apoiar ações corretivas pela gestão de RH</td>
      <td>Não — anônimo</td>
    </tr>
    <tr>
      <td>Hash do CPF (somente se solicitado)</td>
      <td>Confirmação de identidade para fins de auditoria legal</td>
      <td>Hash irreversível — CPF original não pode ser recuperado</td>
    </tr>
  </tbody>
</table>
<h2>4. O que jamais será feito com seus dados</h2>
<p>As seguintes utilizações são proibidas contratualmente e não são tecnicamente possíveis na plataforma:</p>
<ul>
  <li>Usar seus dados para decidir promoções, demissões, advertências ou qualquer sanção disciplinar;</li>
  <li>Comparar publicamente resultados individuais entre colaboradores;</li>
  <li>Compartilhar suas respostas com gestores identificando quem as escreveu;</li>
  <li>Vender, alugar ou ceder seus dados a terceiros para fins comerciais;</li>
  <li>Usar os dados em processos seletivos para outras vagas;</li>
  <li>Cruzar respostas das pesquisas com sistemas de controle de ponto para identificar respondentes;</li>
  <li>Usar o CPF para qualquer finalidade além da verificação de identidade descrita neste termo.</li>
</ul>
<p>O descumprimento dessas proibições pela empresa caracteriza uso indevido de dados pessoais, sujeito às sanções previstas na LGPD (art. 52) e à responsabilidade civil e trabalhista aplicável.</p>
<h2>5. Como o anonimato é garantido</h2>
<p>O anonimato das respostas não é apenas uma promessa — é uma garantia técnica incorporada na arquitetura do sistema.</p>
<h3>Camada 1 — Desvinculamento no momento do envio</h3>
<p>Quando você confirma o envio das respostas, o sistema as registra sem nenhum identificador pessoal — sem nome, telefone, matrícula ou e-mail. O link de acesso é então invalidado. A partir desse momento, não existe nenhuma ligação técnica entre você e as respostas enviadas.</p>
<h3>Camada 2 — Regra de mínimo de respondentes</h3>
<p>Métricas de um setor só são exibidas para o RH quando ao menos 5 colaboradores responderam naquele período. Essa regra não pode ser desativada pela empresa.</p>
<h3>Camada 3 — Data sem horário</h3>
<p>O sistema armazena apenas a data da resposta, nunca o horário. Isso impede cruzamento com registros de ponto para identificação pelo horário exato.</p>
<h3>Camada 4 — Canal de relatos sem metadados</h3>
<p>O canal de relatos anônimos não coleta endereço IP, identificador de dispositivo ou dados de localização. O único dado armazenado é o conteúdo do relato e o setor informado pelo próprio usuário.</p>
<h3>Camada 5 — Acesso negado ao provedor da plataforma</h3>
<p>Nem mesmo os administradores técnicos da Pulse têm acesso às respostas das pesquisas ou aos relatos anônimos de nenhuma empresa cliente. Esse isolamento está implementado no nível do banco de dados.</p>
<h2>6. Dados que nunca são coletados</h2>
<p>A plataforma não coleta e tecnicamente não tem como coletar:</p>
<ul>
  <li>Localização GPS ou endereço IP durante o preenchimento da pesquisa;</li>
  <li>Dados biométricos — impressão digital, reconhecimento facial, voz;</li>
  <li>Informações médicas, diagnósticos, laudos ou prontuários clínicos;</li>
  <li>Histórico de navegação ou dados de outros aplicativos;</li>
  <li>Gravações de áudio ou vídeo de qualquer natureza;</li>
  <li>Dados de familiares ou pessoas sem vínculo empregatício com a empresa;</li>
  <li>Número do CPF em texto legível — apenas o hash SHA-256 pode ser armazenado.</li>
</ul>
<h2>7. Base legal para o tratamento de dados (LGPD)</h2>
<p>O tratamento dos seus dados está fundamentado nas seguintes hipóteses da Lei nº 13.709/2018:</p>
<ul>
  <li><strong>Art. 7º, inciso I — Consentimento do titular:</strong> você fornece seu consentimento expresso, livre e informado ao aceitar este termo;</li>
  <li><strong>Art. 7º, inciso II — Cumprimento de obrigação legal:</strong> a empresa tem responsabilidade legal de cuidar da saúde ocupacional de seus colaboradores, conforme a CLT e a NR-1;</li>
  <li><strong>Art. 7º, inciso IX — Legítimo interesse:</strong> para os dados de cadastro usados exclusivamente para envio do link da pesquisa.</li>
</ul>
<p>O consentimento que você fornece é livre, informado, inequívoco e específico — válido apenas para as finalidades descritas neste documento.</p>
<h2>8. Como seus dados são armazenados e protegidos</h2>
<p>A plataforma adota as seguintes medidas de segurança:</p>
<ul>
  <li><strong>Criptografia em trânsito:</strong> toda comunicação usa protocolo TLS 1.2 ou superior;</li>
  <li><strong>Criptografia em repouso:</strong> dados armazenados são criptografados em nível de disco;</li>
  <li><strong>Controle de acesso por perfil:</strong> cada usuário acessa apenas os dados da sua função;</li>
  <li><strong>Isolamento entre empresas:</strong> os dados da sua empresa estão tecnicamente isolados de qualquer outra empresa que use a plataforma;</li>
  <li><strong>Trilha de auditoria imutável:</strong> toda ação relevante é registrada com data, hora e responsável, sem possibilidade de exclusão;</li>
  <li><strong>Monitoramento contínuo:</strong> a infraestrutura é monitorada e atualizada conforme boas práticas de segurança.</li>
</ul>
<h3>Prazos de retenção dos dados</h3>
<ul>
  <li><strong>Registro deste consentimento:</strong> mínimo de 5 anos após o encerramento do vínculo empregatício;</li>
  <li><strong>Respostas às pesquisas (anônimas):</strong> durante a vigência do contrato entre a empresa e a Pulse;</li>
  <li><strong>Dados de cadastro (nome, telefone):</strong> excluídos em até 90 dias após o encerramento do contrato;</li>
  <li><strong>Após encerramento do contrato:</strong> todos os dados são excluídos de forma segura, salvo determinação legal.</li>
</ul>
<h2>9. Seus direitos como titular de dados (LGPD)</h2>
<p>A Lei nº 13.709/2018 garante a você os seguintes direitos, exercíveis a qualquer momento:</p>
<ul>
  <li><strong>Acesso (art. 18, II):</strong> saber quais dados pessoais seus estão armazenados;</li>
  <li><strong>Correção (art. 18, III):</strong> solicitar a correção de dados incompletos ou desatualizados;</li>
  <li><strong>Anonimização ou exclusão (art. 18, IV):</strong> solicitar que dados tratados em desconformidade com a LGPD sejam anonimizados ou excluídos;</li>
  <li><strong>Portabilidade (art. 18, V):</strong> receber seus dados em formato estruturado;</li>
  <li><strong>Revogação do consentimento (art. 18, IX):</strong> retirar seu consentimento a qualquer momento, sem penalidade;</li>
  <li><strong>Oposição (art. 18, VI):</strong> opor-se ao tratamento realizado sem base legal adequada;</li>
  <li><strong>Informação (art. 18, VII e VIII):</strong> saber com quem seus dados foram compartilhados;</li>
  <li><strong>Reclamação à ANPD (art. 18, § 1º):</strong> registrar reclamação se seus direitos forem violados.</li>
</ul>
<p>Para exercer qualquer desses direitos, procure o RH da sua empresa. Para questões que o RH não puder resolver, entre em contato com a Pulse pelo e-mail <strong>${EMAIL_PRIVACY}</strong>. Prazo de resposta: até 15 dias corridos.</p>
<h2>10. Como revogar seu consentimento</h2>
<p>Você pode revogar este consentimento a qualquer momento. Basta comunicar o RH da sua empresa ou, ao receber o link de uma pesquisa, utilizar a opção "Não quero mais participar" disponível no próprio formulário.</p>
<p>Ao revogar:</p>
<ul>
  <li>Você não receberá mais nenhuma pesquisa;</li>
  <li>Respostas já enviadas permanecem nos registros em forma anônima — não é possível excluí-las individualmente porque não há como identificar quais foram suas;</li>
  <li>O registro da revogação é mantido para fins de auditoria legal;</li>
  <li>Não há nenhuma consequência trabalhista, funcional ou disciplinar.</li>
</ul>
<p>Se mudar de ideia, pode aceitar novamente. O RH pode enviar um novo convite a qualquer momento.</p>
<h2>11. Como seus dados são usados pela sua empresa</h2>
<p>Os responsáveis de RH e gestores autorizados têm acesso ao painel da plataforma, onde visualizam exclusivamente:</p>
<ul>
  <li>Médias e indicadores agregados por setor — nunca por indivíduo;</li>
  <li>Percentual de participação por setor — quantos colaboradores responderam, sem identificar quem;</li>
  <li>Tendências ao longo do tempo — se um setor vem melhorando ou piorando;</li>
  <li>Alertas automáticos — quando algum indicador cai abaixo de um limiar configurado;</li>
  <li>Relatos anônimos — apenas o conteúdo, sem qualquer identificação do autor.</li>
</ul>
<h2>12. Compartilhamento de dados com terceiros</h2>
<p>Seus dados não são vendidos, alugados ou compartilhados para fins comerciais. O acesso é restrito a:</p>
<ul>
  <li><strong>Sua empresa:</strong> acessa apenas métricas anônimas e agregadas por setor;</li>
  <li><strong>Pulse (operadora):</strong> acessa dados técnicos estritamente necessários para operar a plataforma, sob obrigação de confidencialidade;</li>
  <li><strong>Parceiros de infraestrutura:</strong> serviços de hospedagem e envio de mensagens, vinculados por acordos de processamento de dados (DPA) em conformidade com a LGPD;</li>
  <li><strong>Autoridades competentes:</strong> exclusivamente quando exigido por lei ou decisão judicial.</li>
</ul>
<h2>13. Incidentes de segurança</h2>
<p>Em caso de incidente de segurança que possa colocar em risco seus direitos, a Pulse e sua empresa têm as seguintes obrigações:</p>
<ul>
  <li>Comunicar o incidente à ANPD em até 72 horas após a confirmação;</li>
  <li>Notificar os titulares afetados, descrevendo o que ocorreu, quais dados foram envolvidos e quais medidas foram tomadas;</li>
  <li>Documentar o incidente, as causas e as ações corretivas no registro de auditoria interno.</li>
</ul>
<h2>14. Atualizações deste termo</h2>
<p>Este termo pode ser atualizado para refletir mudanças no serviço ou na legislação. Quando isso ocorrer:</p>
<ul>
  <li>Você será notificado por SMS ou WhatsApp com um link para o novo termo;</li>
  <li>A participação nas pesquisas ficará temporariamente suspensa até que você aceite ou recuse a nova versão;</li>
  <li>Recusar o novo termo tem o mesmo efeito que revogar o consentimento, sem qualquer penalidade.</li>
</ul>
<h2>15. Canais de contato e Encarregado de Dados (DPO)</h2>
<ul>
  <li><strong>RH da sua empresa:</strong> canal preferencial para revogação de consentimento e dúvidas do dia a dia;</li>
  <li><strong>Pulse — DPO:</strong> ${EMAIL_PRIVACY} — para solicitações de direitos do titular ou questões que o RH não puder resolver;</li>
  <li><strong>ANPD:</strong> www.gov.br/anpd — para reclamações sobre violação de direitos como titular.</li>
</ul>
<h2>16. Glossário</h2>
<ul>
  <li><strong>Titular dos dados:</strong> você — a pessoa a quem os dados se referem;</li>
  <li><strong>Controlador:</strong> sua empresa — quem decide para que os dados são usados;</li>
  <li><strong>Operador:</strong> a Pulse — quem trata os dados conforme instruções do controlador;</li>
  <li><strong>LGPD:</strong> Lei Geral de Proteção de Dados Pessoais, Lei nº 13.709/2018;</li>
  <li><strong>TCLE:</strong> Termo de Consentimento Livre e Esclarecido — este documento;</li>
  <li><strong>ANPD:</strong> Autoridade Nacional de Proteção de Dados;</li>
  <li><strong>Hash SHA-256:</strong> algoritmo que transforma um dado em código irreversível;</li>
  <li><strong>DPO:</strong> Data Protection Officer — Encarregado de Proteção de Dados.</li>
</ul>
<hr/>
<p>Ao aceitar este termo, você declara que:</p>
<ul>
  <li>Leu e compreendeu todas as informações descritas acima;</li>
  <li>Aceita voluntariamente participar das pesquisas periódicas de bem-estar;</li>
  <li>Está ciente de que suas respostas são anônimas por garantia técnica;</li>
  <li>Entende que pode revogar este consentimento a qualquer momento, sem penalidade;</li>
  <li>Conhece seus direitos como titular de dados pessoais conforme a LGPD;</li>
  <li>Tem ciência de que a participação não influencia sua avaliação de desempenho, remuneração ou qualquer decisão sobre o seu emprego.</li>
</ul>
<p>Pulse Tecnologia em Saúde Ocupacional Ltda. — Versão 1.0.0 — Vigente a partir de 01/05/2026.</p>`,
};

const PRIVACY_POLICY_V1 = {
  version: "1.0.0",
  title: "Política de Privacidade — Pulse IPS",
  effectiveAt: new Date("2026-05-01"),
  content: `<h1>Política de Privacidade — Pulse IPS</h1>
<p><strong>Versão:</strong> 1.0.0 | <strong>Vigência:</strong> 01 de maio de 2026</p>
<hr/>
<p>A <strong>Pulse Tecnologia em Saúde Ocupacional Ltda.</strong> ("Pulse", "nós" ou "plataforma") é uma empresa de software que oferece uma plataforma SaaS voltada ao monitoramento de bem-estar e saúde ocupacional de colaboradores em empresas contratantes.</p>
<p>Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos os dados pessoais de usuários da plataforma (administradores e profissionais de RH das organizações contratantes), bem como dos colaboradores cadastrados.</p>
<h2>1. Quem somos</h2>
<p>A Pulse atua como <strong>Operadora de Dados</strong> no sentido da LGPD, processando dados pessoais de colaboradores exclusivamente conforme as instruções das organizações contratantes, que são as Controladoras. Para os dados de usuários da plataforma (admins e RH), a Pulse atua como Controladora.</p>
<h2>2. Dados que coletamos</h2>
<h3>De usuários da plataforma (admins e RH)</h3>
<ul>
  <li>Nome completo, endereço de e-mail e senha (armazenada em hash seguro bcrypt);</li>
  <li>Endereço IP e user-agent no momento do aceite dos Termos de Uso;</li>
  <li>Registros de acesso (data, hora, páginas visitadas) para fins de auditoria e segurança.</li>
</ul>
<h3>De colaboradores das organizações contratantes</h3>
<ul>
  <li>Nome completo, telefone e e-mail (quando fornecido), cadastrados pelo RH da empresa;</li>
  <li>Departamento e status de participação;</li>
  <li>Hash criptográfico do CPF (SHA-256, irreversível) — apenas quando há aceite formal de participação;</li>
  <li>Respostas anônimas a pesquisas de bem-estar — desvinculadas da identidade do respondente por design técnico;</li>
  <li>Registro de consentimento (aceite, recusa ou revogação) com data, hora e versão do termo.</li>
</ul>
<h2>3. Finalidades do tratamento</h2>
<p>Os dados são usados exclusivamente para:</p>
<ul>
  <li>Operar e manter a plataforma e seus recursos;</li>
  <li>Enviar pesquisas de bem-estar aos colaboradores via SMS ou WhatsApp;</li>
  <li>Calcular indicadores agregados e anônimos por setor para exibição ao RH;</li>
  <li>Gerar alertas automáticos quando indicadores caem abaixo de limiares configurados;</li>
  <li>Registrar e comprovar o consentimento de cada colaborador conforme exigência da LGPD;</li>
  <li>Autenticar usuários e garantir a segurança de acesso;</li>
  <li>Gerar relatórios de evidência para o Programa de Gerenciamento de Riscos (PGR);</li>
  <li>Atender obrigações legais e regulatórias aplicáveis.</li>
</ul>
<p><strong>Não usamos dados para publicidade, venda a terceiros ou treinamento de modelos de inteligência artificial de terceiros.</strong></p>
<h2>4. Bases legais (LGPD)</h2>
<p>O tratamento de dados é realizado com as seguintes bases legais da Lei nº 13.709/2018:</p>
<ul>
  <li><strong>Consentimento (art. 7º, I):</strong> obtido de cada colaborador via TCLE para coleta de respostas às pesquisas;</li>
  <li><strong>Cumprimento de obrigação legal (art. 7º, II):</strong> obrigações trabalhistas e de saúde ocupacional (NR-1, CLT);</li>
  <li><strong>Execução de contrato (art. 7º, V):</strong> dados de usuários da plataforma necessários para a prestação do serviço contratado;</li>
  <li><strong>Legítimo interesse (art. 7º, IX):</strong> segurança da plataforma, autenticação e logs de auditoria.</li>
</ul>
<h2>5. Compartilhamento de dados</h2>
<p>Compartilhamos dados apenas nas seguintes situações:</p>
<ul>
  <li><strong>Organizações contratantes:</strong> têm acesso exclusivamente a indicadores anônimos e agregados por setor — nunca a respostas individuais identificáveis;</li>
  <li><strong>Parceiros de infraestrutura:</strong> provedores de hospedagem, banco de dados e envio de mensagens (SMS/WhatsApp), vinculados por contratos de processamento de dados (DPA) em conformidade com a LGPD;</li>
  <li><strong>Autoridades competentes:</strong> quando exigido por lei, decisão judicial ou determinação de autoridade regulatória.</li>
</ul>
<h2>6. Segurança dos dados</h2>
<p>Adotamos as seguintes medidas técnicas e organizacionais para proteger os dados:</p>
<ul>
  <li>Criptografia em trânsito (TLS 1.2 ou superior) e em repouso;</li>
  <li>Controle de acesso por perfil e isolamento de dados entre organizações;</li>
  <li>Trilha de auditoria imutável para todas as ações relevantes na plataforma;</li>
  <li>Senhas armazenadas exclusivamente como hash bcrypt — nunca em texto legível;</li>
  <li>Monitoramento contínuo de vulnerabilidades e atualização de dependências;</li>
  <li>Acesso negado por design: nem mesmo os administradores técnicos da Pulse têm acesso às respostas de pesquisas ou relatos anônimos das organizações clientes.</li>
</ul>
<h2>7. Retenção de dados</h2>
<p>Os dados são retidos pelos seguintes prazos:</p>
<ul>
  <li><strong>Dados de usuários da plataforma (admins e RH):</strong> enquanto a conta estiver ativa e por até 90 dias após o cancelamento;</li>
  <li><strong>Dados de colaboradores ativos:</strong> durante toda a vigência do contrato da organização;</li>
  <li><strong>Registros de consentimento dos colaboradores:</strong> mínimo de 5 anos após o encerramento do vínculo empregatício, conforme exigência legal;</li>
  <li><strong>Respostas de pesquisas (anônimas):</strong> enquanto o contrato estiver ativo;</li>
  <li><strong>Logs de auditoria:</strong> mínimo de 5 anos, conforme obrigação legal;</li>
  <li><strong>Após encerramento do contrato:</strong> dados mantidos por até 90 dias para fins de backup, em seguida excluídos de forma segura, salvo obrigação legal de retenção mais longa.</li>
</ul>
<h2>8. Direitos dos titulares de dados</h2>
<p>Você pode, a qualquer momento, exercer os seguintes direitos garantidos pela LGPD:</p>
<ul>
  <li><strong>Acesso (art. 18, II):</strong> saber quais dados pessoais seus estão armazenados;</li>
  <li><strong>Correção (art. 18, III):</strong> solicitar a correção de dados incorretos ou desatualizados;</li>
  <li><strong>Exclusão (art. 18, IV):</strong> solicitar a exclusão de dados desnecessários ou tratados ilegalmente;</li>
  <li><strong>Portabilidade (art. 18, V):</strong> receber seus dados em formato estruturado e interoperável;</li>
  <li><strong>Informação sobre compartilhamento (art. 18, VII e VIII):</strong> saber com quem seus dados foram compartilhados;</li>
  <li><strong>Revogação do consentimento (art. 18, IX):</strong> cancelar sua participação a qualquer momento, sem penalidade;</li>
  <li><strong>Oposição (art. 18, VI):</strong> opor-se ao tratamento realizado sem base legal adequada;</li>
  <li><strong>Reclamação à ANPD (art. 18, § 1º):</strong> registrar reclamação à Autoridade Nacional de Proteção de Dados.</li>
</ul>
<p>Para exercer seus direitos, entre em contato com o RH da sua empresa (para colaboradores) ou diretamente com a Pulse pelo e-mail <strong>${EMAIL_PRIVACY}</strong>. O prazo de resposta é de até 15 dias corridos.</p>
<h2>9. Cookies e rastreamento</h2>
<p>A plataforma utiliza cookies estritamente necessários para manter a sessão autenticada dos usuários e para lembrar a preferência de tema visual (claro ou escuro). Não utilizamos cookies de rastreamento, publicidade ou análise comportamental de terceiros.</p>
<h2>10. Transferência internacional de dados</h2>
<p>Os dados são armazenados em servidores localizados no Brasil ou em jurisdições que oferecem nível adequado de proteção conforme os padrões da ANPD e da LGPD. Quando utilizamos parceiros de infraestrutura no exterior, garantimos que estejam vinculados por cláusulas contratuais padrão de proteção de dados.</p>
<h2>11. Menores de idade</h2>
<p>A plataforma Pulse IPS não é destinada a menores de 18 anos. Não coletamos intencionalmente dados de menores. Se identificarmos que coletamos dados de um menor sem o devido consentimento, os dados serão excluídos imediatamente.</p>
<h2>12. Atualizações desta política</h2>
<p>Esta Política de Privacidade pode ser atualizada periodicamente para refletir mudanças no serviço, nas práticas de privacidade ou na legislação. Alterações relevantes serão comunicadas com antecedência mínima de 15 dias por e-mail ou notificação na plataforma. A versão vigente estará sempre disponível em pulseips.com.br/privacy-policy.</p>
<h2>13. Contato e Encarregado de Dados (DPO)</h2>
<ul>
  <li><strong>E-mail do DPO:</strong> ${EMAIL_PRIVACY}</li>
  <li><strong>Assunto sugerido:</strong> "Direitos do Titular" ou "Política de Privacidade"</li>
  <li><strong>Suporte geral:</strong> ${EMAIL_SUPPORT}</li>
</ul>
<p>Caso acredite que seus direitos foram violados, você pode registrar uma reclamação diretamente na <strong>Autoridade Nacional de Proteção de Dados (ANPD)</strong> em www.gov.br/anpd.</p>
<hr/>
<p>Pulse Tecnologia em Saúde Ocupacional Ltda. — Versão 1.0.0 — Vigente a partir de 01/05/2026.</p>`,
};

async function seedSuperAdmin() {
  const existing = await prisma.superAdmin.findUnique({
    where: { email: SUPER_ADMIN.email },
  });
  if (existing) {
    logger.info(`Admin already exists: ${SUPER_ADMIN.email}`);
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
  logger.info(`Super admin created: ${SUPER_ADMIN.email}`);
}

async function seedTerms() {
  await prisma.$transaction(async (tx) => {
    await tx.platformTermsVersion.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });
    await tx.platformTermsVersion.upsert({
      where: { version: TERMS_V1.version },
      update: {
        title: TERMS_V1.title,
        content: TERMS_V1.content,
        effectiveAt: TERMS_V1.effectiveAt,
        isActive: true,
      },
      create: {
        version: TERMS_V1.version,
        title: TERMS_V1.title,
        content: TERMS_V1.content,
        effectiveAt: TERMS_V1.effectiveAt,
        isActive: true,
      },
    });
  });
  logger.info(`Terms v${TERMS_V1.version} upserted`);
}

async function seedConsentTerms() {
  const contentHash = createHash("sha256").update(CONSENT_TERM.content).digest("hex");
  await prisma.$transaction(async (tx) => {
    await tx.consentTermVersion.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });
    await tx.consentTermVersion.upsert({
      where: { version: CONSENT_TERM.version },
      update: {
        content: CONSENT_TERM.content,
        contentHash,
        isActive: true,
      },
      create: {
        version: CONSENT_TERM.version,
        content: CONSENT_TERM.content,
        contentHash,
        isActive: true,
      },
    });
  });
  logger.info(`Consent term v${CONSENT_TERM.version} upserted`);
}

async function seedPrivacyPolicy() {
  await prisma.$transaction(async (tx) => {
    await tx.privacyPolicyVersion.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });
    await tx.privacyPolicyVersion.upsert({
      where: { version: PRIVACY_POLICY_V1.version },
      update: {
        title: PRIVACY_POLICY_V1.title,
        content: PRIVACY_POLICY_V1.content,
        effectiveAt: PRIVACY_POLICY_V1.effectiveAt,
        isActive: true,
      },
      create: {
        version: PRIVACY_POLICY_V1.version,
        title: PRIVACY_POLICY_V1.title,
        content: PRIVACY_POLICY_V1.content,
        effectiveAt: PRIVACY_POLICY_V1.effectiveAt,
        isActive: true,
      },
    });
  });
  logger.info(`Privacy policy v${PRIVACY_POLICY_V1.version} upserted`);
}

const PLANS = [
  {
    name: "Starter",
    description: "Ideal para empresas em crescimento. Até 50 colaboradores, pesquisas semanais, alertas automáticos e acesso ao canal de relatos anônimos.",
    maxEmployees: 50,
    externalProductId: "prod_starter_pulse",
    prices: [
      { interval: "monthly", priceInCents: 29900, externalPriceId: "price_starter_monthly" },
      { interval: "annual",  priceInCents: 287040, externalPriceId: "price_starter_annual" },
    ],
  },
  {
    name: "Professional",
    description: "Para empresas em expansão. Até 150 colaboradores, todos os recursos do Starter mais exportação de relatórios PGR em PDF e integrações via WhatsApp.",
    maxEmployees: 150,
    externalProductId: "prod_professional_pulse",
    prices: [
      { interval: "monthly", priceInCents: 69900, externalPriceId: "price_professional_monthly" },
      { interval: "annual",  priceInCents: 671040, externalPriceId: "price_professional_annual" },
    ],
  },
  {
    name: "Enterprise",
    description: "Para grandes empresas. Até 300 colaboradores, suporte prioritário, SLA garantido e onboarding dedicado.",
    maxEmployees: 300,
    externalProductId: "prod_enterprise_pulse",
    prices: [
      { interval: "monthly", priceInCents: 149900, externalPriceId: "price_enterprise_monthly" },
      { interval: "annual",  priceInCents: 1439040, externalPriceId: "price_enterprise_annual" },
    ],
  },
] as const

async function seedPlans(): Promise<void> {
  for (const plan of PLANS) {
    const maxEmp = plan.maxEmployees

    const existing = await prisma.plan.findFirst({ where: { externalProductId: plan.externalProductId } })
    let planId: string

    if (existing) {
      planId = existing.id
      logger.info(`⏭️  Plan already exists: ${plan.name}`)
    } else {
      const created = await prisma.plan.create({
        data: {
          name: plan.name,
          description: plan.description,
          maxEmployees: maxEmp,
          externalProductId: plan.externalProductId,
          isActive: true,
        },
      })
      planId = created.id
      logger.info(`✅ Plan created: ${plan.name}`)
    }

    for (const price of plan.prices) {
      const existingPrice = await prisma.planPrice.findUnique({ where: { externalPriceId: price.externalPriceId } })
      if (existingPrice) {
        logger.info(`⏭️  Price already exists: ${plan.name} ${price.interval}`)
        continue
      }
      await prisma.planPrice.create({
        data: {
          planId,
          externalPriceId: price.externalPriceId,
          priceInCents: price.priceInCents,
          currency: "brl",
          interval: price.interval,
          isActive: true,
        },
      })
      const display = (price.priceInCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      logger.info(`  💰 Price: ${display}/${price.interval}`)
    }
  }
}

async function main() {
  logger.info("Starting seed...");

  await seedSuperAdmin();
  await seedTerms();
  await seedConsentTerms();
  await seedPrivacyPolicy();
  await seedPlans();

  logger.info("Seed complete!");
}

main()
  .catch((err) => {
    logger.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
