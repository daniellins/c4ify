// Scenario recipes for `c4ify guide`: pick the reader's question first, then
// the C4 view. Signals are weighted substrings (EN + PT-BR, accent-free
// variants included because users type both). `type` is the view type the
// recipe recommends; every recipe still means one model with several views.

const RAW_RECIPES = [
  {
    id: 'c4-model', type: 'systemContext+container', proof: 'online-store',
    presentation: { preset: 'classic', motion: 'static', views: 'one per level' },
    signals: [['c4 model', 16], ['modelo c4', 16], ['c4', 10], ['structurizr', 12], ['simon brown', 12], ['arquitetura de software', 8], ['software architecture', 8], ['documentar a arquitetura', 10], ['document the architecture', 10], ['drill', 6], ['niveis', 6], ['níveis', 6], ['levels', 6]],
    en: {
      title: 'C4 model (context and containers, with drill-down)', question: 'What is the system, who uses it, and which applications and data stores is it made of?',
      summary: 'One model with a System Context view and a Container view, linked by drill-down.',
      useWhen: 'Architecture documentation, onboarding, solution proposals, design reviews.',
      avoidWhen: 'The question is a business process (use bizify BPMN) or a request sequence (use archify sequence).',
      include: ['people and external systems around the scope', 'every container with technology', 'relationship intent plus protocol', 'acronyms in meta.glossary'],
      prompt: 'Use c4ify to model this system in C4: one model with the people, the software system and its containers (each with technology and a one-line responsibility), external systems marked external, and relationships described by intent with the protocol as technology; add a systemContext view and a container view of the system.',
    },
    pt: {
      title: 'Modelo C4 (contexto e contêineres, com detalhamento)', question: 'O que é o sistema, quem o usa e de quais aplicações e armazenamentos ele é feito?',
      summary: 'Um modelo com a visão de contexto e a de contêineres, ligadas por clique duplo.',
      useWhen: 'Documentação de arquitetura, onboarding, propostas de solução, revisões de design.',
      avoidWhen: 'Quando a pergunta é um processo de negócio (use o BPMN do bizify) ou uma sequência de chamadas (use o sequence do archify).',
      include: ['pessoas e sistemas externos ao redor do escopo', 'cada contêiner com tecnologia', 'intenção da relação e protocolo', 'siglas em meta.glossary'],
      prompt: 'Use o c4ify para modelar este sistema em C4: um modelo com as pessoas, o sistema de software e seus contêineres (cada um com tecnologia e uma frase de responsabilidade), sistemas externos marcados como externos e relações descritas pela intenção, com o protocolo como tecnologia; crie uma visão systemContext e uma visão container do sistema.',
    },
  },
  {
    id: 'system-landscape', type: 'systemLandscape', proof: 'online-store',
    presentation: { preset: 'classic', motion: 'static', views: 'optional' },
    signals: [['landscape', 14], ['panorama', 14], ['mapa de sistemas', 14], ['todos os sistemas', 10], ['all systems', 10], ['enterprise', 6], ['portfolio de sistemas', 10], ['portfólio de sistemas', 10], ['ecossistema', 8], ['ecosystem', 8]],
    en: {
      title: 'System landscape', question: 'Which systems does the organisation run, and who uses each one?',
      summary: 'Every person and software system of the enterprise, with the relationships between them.',
      useWhen: 'IT portfolio overviews, integration maps, the entry page of an architecture repository.',
      avoidWhen: 'The reader needs one system in detail (use a context view).',
      include: ['model.enterprise', 'internal vs. external systems', 'one relationship per real integration'],
      prompt: 'Use c4ify to draw a system landscape: set model.enterprise, add every person and software system (external ones marked external) with the integrations between them, and a systemLandscape view; add a systemContext view for the systems readers will open.',
    },
    pt: {
      title: 'Panorama de sistemas', question: 'Quais sistemas a organização opera e quem usa cada um?',
      summary: 'Todas as pessoas e sistemas de software da empresa, com as relações entre eles.',
      useWhen: 'Visão do portfólio de TI, mapas de integração, página de entrada de um repositório de arquitetura.',
      avoidWhen: 'Quando o leitor precisa de um sistema em detalhe (use a visão de contexto).',
      include: ['model.enterprise', 'sistemas internos e externos', 'uma relação por integração real'],
      prompt: 'Use o c4ify para desenhar o panorama de sistemas: defina model.enterprise, inclua todas as pessoas e sistemas de software (os externos marcados como externos) com as integrações entre eles e uma visão systemLandscape; acrescente visões systemContext para os sistemas que o leitor vai abrir.',
    },
  },
  {
    id: 'system-context', type: 'systemContext', proof: 'online-store',
    presentation: { preset: 'classic', motion: 'static', views: 'optional' },
    signals: [['context diagram', 16], ['diagrama de contexto', 16], ['system context', 16], ['contexto do sistema', 14], ['visao geral', 6], ['visão geral', 6], ['big picture', 8], ['quem usa', 8], ['who uses', 8], ['integracoes', 6], ['integrações', 6], ['stakeholders', 6], ['executivo', 6], ['executive', 6]],
    en: {
      title: 'System context', question: 'Who uses the system and which other systems does it depend on?',
      summary: 'The system as one box, with its users and neighbouring systems.',
      useWhen: 'Executive and non-technical audiences, the first page of a proposal, scoping a project.',
      avoidWhen: 'The reader asks how the system is built (add a container view).',
      include: ['the scope system', 'every user role', 'external systems marked external', 'what flows between them'],
      prompt: 'Use c4ify to draw the system context: people (roles, not individuals), the software system in scope and the systems it talks to (mark the ones outside the organisation as external), relationships described by intent; one systemContext view scoped to the system.',
    },
    pt: {
      title: 'Contexto do sistema', question: 'Quem usa o sistema e de quais outros sistemas ele depende?',
      summary: 'O sistema como uma caixa, com seus usuários e sistemas vizinhos.',
      useWhen: 'Públicos executivos e não técnicos, primeira página de uma proposta, delimitação de escopo.',
      avoidWhen: 'Quando o leitor pergunta como o sistema é construído (inclua a visão de contêineres).',
      include: ['o sistema em escopo', 'cada papel de usuário', 'sistemas externos marcados como externos', 'o que circula entre eles'],
      prompt: 'Use o c4ify para desenhar o contexto do sistema: pessoas (papéis, não indivíduos), o sistema de software em escopo e os sistemas com que ele conversa (os de fora da organização marcados como externos), relações descritas pela intenção; uma visão systemContext com o sistema como escopo.',
    },
  },
  {
    id: 'containers', type: 'container', proof: 'online-store',
    presentation: { preset: 'classic', motion: 'static', views: 'recommended' },
    signals: [['container diagram', 16], ['diagrama de conteineres', 16], ['diagrama de contêineres', 16], ['conteineres', 10], ['contêineres', 10], ['containers', 10], ['microservices', 10], ['microsservicos', 10], ['microsserviços', 10], ['deployable', 8], ['banco de dados', 4], ['database', 4], ['fila', 4], ['queue', 4], ['api', 3], ['frontend', 3], ['backend', 3]],
    en: {
      title: 'Containers', question: 'Which applications and data stores make up the system, and how do they talk?',
      summary: 'The system boundary with its containers, the people who use them and the systems they call.',
      useWhen: 'Technical design reviews, onboarding developers and operators, solution architecture in proposals.',
      avoidWhen: 'The reader needs classes or modules inside one container (use a component view).',
      include: ['each container with technology', 'stores with shape "database"', 'protocol on every inter-container arrow', 'async messaging marked async'],
      prompt: 'Use c4ify to draw the containers of this system: each separately runnable or deployable unit (web app, API, worker, database, queue) as a container with technology and responsibility, relationships with intent and protocol (async: true for messaging), external systems called by containers; one container view scoped to the system.',
    },
    pt: {
      title: 'Contêineres', question: 'Quais aplicações e armazenamentos compõem o sistema e como eles se comunicam?',
      summary: 'A fronteira do sistema com seus contêineres, as pessoas que os usam e os sistemas que eles chamam.',
      useWhen: 'Revisões de design técnico, onboarding de desenvolvedores e operação, arquitetura da solução em propostas.',
      avoidWhen: 'Quando o leitor precisa dos módulos dentro de um contêiner (use a visão de componentes).',
      include: ['cada contêiner com tecnologia', 'bancos com shape "database"', 'protocolo em toda seta entre contêineres', 'mensageria marcada como async'],
      prompt: 'Use o c4ify para desenhar os contêineres deste sistema: cada unidade executável ou implantável separadamente (aplicação web, API, worker, banco, fila) como contêiner com tecnologia e responsabilidade, relações com intenção e protocolo (async: true para mensageria) e os sistemas externos chamados pelos contêineres; uma visão container com o sistema como escopo.',
    },
  },
  {
    id: 'components', type: 'component', proof: 'library-lending',
    presentation: { preset: 'classic', motion: 'static', views: 'recommended' },
    signals: [['component diagram', 16], ['diagrama de componentes', 16], ['componentes', 10], ['components', 10], ['modulos', 8], ['módulos', 8], ['modules', 8], ['camadas', 6], ['layers', 6], ['controller', 6], ['repository', 6], ['repositorio', 6], ['repositório', 6], ['servicos internos', 8], ['serviços internos', 8]],
    en: {
      title: 'Components', question: 'How is one container structured inside, and which component handles what?',
      summary: 'The container boundary with its components, plus the containers and systems they use.',
      useWhen: 'Code reviews, refactoring plans, onboarding to one service.',
      avoidWhen: 'The container is small or the code is the clearer documentation; C4 calls this level optional.',
      include: ['components with technology (framework role)', 'relationships authored between components', 'the containers and systems they reach'],
      prompt: 'Use c4ify to add a component view: model the container\'s main components (controllers, services, repositories, adapters) with technology and responsibility, author relationships between components and to other containers/systems (c4ify lifts them for the higher views), and add a component view scoped to the container.',
    },
    pt: {
      title: 'Componentes', question: 'Como um contêiner se organiza por dentro e qual componente cuida de quê?',
      summary: 'A fronteira do contêiner com seus componentes e os contêineres e sistemas que eles usam.',
      useWhen: 'Revisões de código, planos de refatoração, onboarding em um serviço.',
      avoidWhen: 'Quando o contêiner é pequeno ou o código já documenta melhor; o C4 trata este nível como opcional.',
      include: ['componentes com tecnologia (papel no framework)', 'relações escritas entre componentes', 'os contêineres e sistemas que eles alcançam'],
      prompt: 'Use o c4ify para acrescentar a visão de componentes: modele os principais componentes do contêiner (controllers, serviços, repositórios, adaptadores) com tecnologia e responsabilidade, escreva as relações entre componentes e com outros contêineres e sistemas (o c4ify as eleva para as visões de cima) e crie uma visão component com o contêiner como escopo.',
    },
  },
];

export const SCENARIO_RECIPES = Object.freeze(RAW_RECIPES.map((recipe) => Object.freeze({
  ...recipe,
  presentation: Object.freeze({ ...recipe.presentation }),
  signals: Object.freeze(recipe.signals.map((signal) => Object.freeze(signal.slice()))),
  en: Object.freeze({ ...recipe.en, include: Object.freeze(recipe.en.include.slice()) }),
  pt: Object.freeze({ ...recipe.pt, include: Object.freeze(recipe.pt.include.slice()) }),
})));

const PT_HINT = /[ãõçáéíóúâêô]|\b(sistema|sistemas|arquitetura|conteineres|componentes|usuarios|integracao|banco|fila|visao)\b/iu;

export function detectGuideLanguage(value = '') {
  return PT_HINT.test(value) ? 'pt' : 'en';
}

function normalized(value) {
  return String(value || '').normalize('NFKC').toLowerCase().replace(/[\s_]+/g, ' ').trim();
}

function localized(recipe, lang) {
  const copy = recipe[lang === 'pt' ? 'pt' : 'en'];
  return {
    id: recipe.id,
    type: recipe.type,
    proof: recipe.proof,
    presentation: { ...recipe.presentation },
    ...copy,
    include: copy.include.slice(),
  };
}

export function listScenarioRecipes(lang = 'en') {
  return SCENARIO_RECIPES.map((recipe) => localized(recipe, lang));
}

function scoreRecipe(recipe, query) {
  const text = normalized(query);
  if (!text) return { recipe, score: 0, matched: [] };
  if (text === recipe.id || text === recipe.id.replace(/-/g, ' ') || text === recipe.type) {
    return { recipe, score: 100, matched: [recipe.id] };
  }
  let score = 0;
  const matched = [];
  for (const [signal, weight] of recipe.signals) {
    if (text.includes(normalized(signal))) {
      score += weight;
      matched.push(signal);
    }
  }
  return { recipe, score, matched };
}

export function recommendScenario(query, options = {}) {
  const lang = options.lang === 'pt' || options.lang === 'en' ? options.lang : detectGuideLanguage(query);
  const ranked = SCENARIO_RECIPES.map((recipe) => scoreRecipe(recipe, query))
    .sort((left, right) => right.score - left.score || SCENARIO_RECIPES.indexOf(left.recipe) - SCENARIO_RECIPES.indexOf(right.recipe));
  const winner = ranked[0].score > 0 ? ranked[0] : { recipe: SCENARIO_RECIPES[0], score: 0, matched: [] };
  const confidence = winner.score >= 14 ? 'high' : winner.score >= 7 ? 'medium' : 'low';
  return {
    ok: true,
    mode: 'recommendation',
    lang,
    query: String(query || ''),
    confidence,
    matchedSignals: winner.matched.slice(),
    recommendation: localized(winner.recipe, lang),
    alternatives: ranked.filter((entry) => entry.recipe.id !== winner.recipe.id && entry.score > 0)
      .slice(0, 2)
      .map((entry) => ({ ...localized(entry.recipe, lang), score: entry.score })),
  };
}

export function formatScenarioList(lang = 'en') {
  const isPt = lang === 'pt';
  const heading = isPt
    ? `Receitas de cenário do c4ify (${SCENARIO_RECIPES.length})`
    : `c4ify scenario recipes (${SCENARIO_RECIPES.length})`;
  const intro = isPt
    ? 'Escolha a pergunta antes do tipo de diagrama. Rode: c4ify guide "seu cenário"'
    : 'Choose the question before the diagram type. Run: c4ify guide "your scenario"';
  return [heading, '', intro, '', ...listScenarioRecipes(lang).flatMap((recipe) => [
    `${recipe.id}  [${recipe.type}]  ${recipe.title}`,
    `  ${recipe.question}`,
  ])].join('\n');
}

export function formatScenarioRecommendation(result) {
  const isPt = result.lang === 'pt';
  const recipe = result.recommendation;
  const labels = isPt ? {
    heading: 'Recomendação', question: 'Pergunta respondida', use: 'Use quando', avoid: 'Evite quando', include: 'Deve incluir', presentation: 'Apresentação', prompt: 'Prompt pronto para copiar', alternatives: 'Outras opções', confidence: 'Confiança',
  } : {
    heading: 'Recommendation', question: 'Question answered', use: 'Use when', avoid: 'Avoid when', include: 'Must include', presentation: 'Presentation', prompt: 'Copy-ready prompt', alternatives: 'Other possible fits', confidence: 'Confidence',
  };
  const lines = [
    `${labels.heading}: ${recipe.title}  [${recipe.type}]`,
    `${labels.confidence}: ${result.confidence}`,
    `${labels.question}: ${recipe.question}`,
    '',
    `${labels.use}: ${recipe.useWhen}`,
    `${labels.avoid}: ${recipe.avoidWhen}`,
    `${labels.include}: ${recipe.include.join('; ')}`,
    `${labels.presentation}: ${recipe.presentation.preset} · ${recipe.presentation.motion} · views ${recipe.presentation.views}`,
    '',
    `${labels.prompt}:`,
    recipe.prompt,
  ];
  if (result.alternatives.length) {
    lines.push('', `${labels.alternatives}: ${result.alternatives.map((item) => `${item.title} [${item.type}]`).join(' · ')}`);
  }
  return lines.join('\n');
}
