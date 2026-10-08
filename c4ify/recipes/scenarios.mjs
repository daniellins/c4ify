// Scenario recipes for `bizify guide`: pick the business question first, then
// the diagram type. Signals are weighted substrings (EN + PT-BR, accent-free
// variants included because users type both).

const RAW_RECIPES = [
  {
    id: 'scope-baseline', type: 'wbs', proof: 'rd-project',
    presentation: { preset: 'classic', motion: 'static', views: 'optional' },
    signals: [['wbs', 16], ['work breakdown', 16], ['eap', 16], ['estrutura analitica', 16], ['estrutura analítica', 16], ['work package', 10], ['pacote de trabalho', 10], ['escopo', 6], ['scope', 6], ['entregas', 5], ['deliverables', 5], ['dicionario da eap', 12], ['dicionário da eap', 12]],
    en: {
      title: 'Scope baseline (WBS)', question: 'What exactly will the project deliver, and how does 100% of the scope break down?',
      summary: 'A deliverable-oriented tree with codes, work packages, owners and rolled-up effort/cost.',
      useWhen: 'Proposals, R&D work plans, kick-offs, scope sign-off, cost roll-up review.',
      avoidWhen: 'The audience needs sequence or dates (use a schedule) or a process (use BPMN).',
      include: ['one root', 'project management at level 2', 'deliverables as nouns', 'work packages as leaves', 'effort on leaves only'],
      prompt: 'Use bizify to draw the project WBS: one root, level 2 = major deliverables plus project management, decompose until each leaf is an estimable work package with one owner; put effort on leaves only and let bizify roll it up.',
    },
    pt: {
      title: 'Linha de base do escopo (EAP)', question: 'O que exatamente o projeto entrega e como 100% do escopo se decompõe?',
      summary: 'Árvore orientada a entregas, com códigos, pacotes de trabalho, responsáveis e esforço/custo consolidados.',
      useWhen: 'Propostas, planos de trabalho de P&D, kick-off, aceite de escopo e revisão de custos.',
      avoidWhen: 'Quando o público precisa de sequência ou datas (use cronograma) ou de um processo (use BPMN).',
      include: ['uma raiz', 'gestão do projeto no nível 2', 'entregas como substantivos', 'pacotes de trabalho nas folhas', 'esforço só nas folhas'],
      prompt: 'Use o bizify para desenhar a EAP do projeto: uma raiz, nível 2 com as grandes entregas e a gestão do projeto, decomponha até cada folha ser um pacote de trabalho estimável com um responsável; informe o esforço só nas folhas e deixe o bizify consolidar.',
    },
  },
  {
    id: 'process-as-is-to-be', type: 'bpmn', proof: 'support-ticket',
    presentation: { preset: 'classic', motion: 'trace', views: 'recommended' },
    signals: [['bpmn', 18], ['business process', 12], ['processo de negocio', 12], ['processo de negócio', 12], ['as-is', 10], ['to-be', 10], ['as is', 8], ['to be', 6], ['swimlane', 9], ['raia', 9], ['piscina', 9], ['pool', 6], ['gateway', 8], ['fluxo do processo', 10], ['process flow', 10], ['aprovacao', 5], ['aprovação', 5], ['handoff', 6]],
    en: {
      title: 'Business process (BPMN AS-IS / TO-BE)', question: 'Who does what, in which order, with which decisions and hand-offs?',
      summary: 'A BPMN 2.0 process with pools, lanes, events, tasks, gateways and message flows.',
      useWhen: 'Process discovery, requirements for automation, AS-IS pain analysis, TO-BE redesign, SLA hand-offs.',
      avoidWhen: 'The question is waste and lead time (use VSM) or only scope boundaries (use SIPOC).',
      include: ['one start and named end states', 'lanes by role', 'labelled gateway conditions', 'message flows only between pools', 'happy path on one row'],
      prompt: 'Use bizify to model this process in BPMN 2.0 (descriptive level): pools for each participant (external ones as black boxes), lanes by role, verb-object task names, labelled exclusive-gateway outcomes, balanced parallel splits and joins, and message flows only between pools.',
    },
    pt: {
      title: 'Processo de negócio (BPMN AS-IS / TO-BE)', question: 'Quem faz o quê, em que ordem, com quais decisões e passagens de bastão?',
      summary: 'Processo BPMN 2.0 com piscinas, raias, eventos, tarefas, gateways e fluxos de mensagem.',
      useWhen: 'Levantamento de processos, requisitos de automação, análise AS-IS, redesenho TO-BE, SLAs entre áreas.',
      avoidWhen: 'Quando a pergunta é desperdício e lead time (use VSM) ou só o escopo do processo (use SIPOC).',
      include: ['um início e fins nomeados', 'raias por papel', 'condições dos gateways rotuladas', 'fluxo de mensagem só entre piscinas', 'caminho feliz em uma linha'],
      prompt: 'Use o bizify para modelar este processo em BPMN 2.0 (nível descritivo): uma piscina por participante (externos como caixa-preta), raias por papel, tarefas no formato verbo + objeto, saídas dos gateways exclusivos rotuladas, paralelos com divisão e junção balanceadas e fluxos de mensagem só entre piscinas.',
    },
  },
  {
    id: 'value-stream-delivery', type: 'vsm', proof: 'software-delivery',
    presentation: { preset: 'classic', motion: 'trace', views: 'recommended' },
    signals: [['value stream', 16], ['fluxo de valor', 16], ['vsm', 18], ['mfv', 16], ['lead time', 10], ['flow efficiency', 10], ['eficiencia de fluxo', 10], ['eficiência de fluxo', 10], ['desperdicio', 8], ['desperdício', 8], ['waste', 8], ['gargalo', 6], ['bottleneck', 6], ['entrega de software', 8], ['software delivery', 8], ['idea to production', 8], ['ideia ate producao', 8]],
    en: {
      title: 'Value stream (office / software delivery)', question: 'Where does work wait, and how much of the lead time adds value?',
      summary: 'A current- or future-state value stream with process time, lead time, %C&A, queues and computed flow efficiency.',
      useWhen: 'Delivery-pipeline improvement, DevOps assessments, service operations, before/after kaizen.',
      avoidWhen: 'You need task-level logic and decisions (use BPMN) or the scope is still unclear (start with SIPOC).',
      include: ['one product family / request type', 'customer and trigger', '5–12 process blocks', 'PT, LT and %C&A per block', 'work hours per day'],
      prompt: 'Use bizify to draw the current-state value stream (office variant) for one request type from trigger to customer: process blocks with process time, lead time and %C&A, queues between them, information flows, and let bizify compute total lead time, activity ratio and rolled %C&A.',
    },
    pt: {
      title: 'Fluxo de valor (escritório / entrega de software)', question: 'Onde o trabalho espera e quanto do lead time agrega valor?',
      summary: 'Mapa do fluxo de valor atual ou futuro com tempo de processo, lead time, %C&A, filas e eficiência de fluxo calculada.',
      useWhen: 'Melhoria do pipeline de entrega, diagnósticos DevOps, operações de serviço, antes/depois de kaizen.',
      avoidWhen: 'Quando precisa da lógica e das decisões de cada tarefa (use BPMN) ou o escopo ainda não está claro (comece pelo SIPOC).',
      include: ['uma família de produto / tipo de demanda', 'cliente e gatilho', '5 a 12 blocos de processo', 'PT, LT e %C&A por bloco', 'horas de trabalho por dia'],
      prompt: 'Use o bizify para desenhar o fluxo de valor atual (variante escritório) de um tipo de demanda, do gatilho ao cliente: blocos de processo com tempo de processo, lead time e %C&A, filas entre eles e fluxos de informação; deixe o bizify calcular o lead time total, a razão de atividade e o %C&A acumulado.',
    },
  },
  {
    id: 'value-stream-manufacturing', type: 'vsm', proof: 'machining-cell',
    presentation: { preset: 'classic', motion: 'static', views: 'optional' },
    signals: [['takt', 14], ['tempo de ciclo', 10], ['cycle time', 10], ['changeover', 8], ['setup', 5], ['estoque', 7], ['inventory', 7], ['supermercado', 9], ['supermarket', 9], ['kanban', 8], ['chao de fabrica', 10], ['chão de fábrica', 10], ['shop floor', 10], ['linha de producao', 9], ['linha de produção', 9], ['manufatura', 8], ['manufacturing', 8]],
    en: {
      title: 'Value stream (manufacturing)', question: 'Does the flow meet takt, and where does inventory pile up?',
      summary: 'A Learning-to-See value stream with data boxes, inventory triangles, push/pull, takt and the timeline ladder.',
      useWhen: 'Plant or cell improvement, lean assessments, future-state design with supermarkets and pacemaker.',
      avoidWhen: 'Knowledge work without physical inventory (use the office variant).',
      include: ['customer demand and available time', 'C/T, C/O, uptime per process', 'inventory between processes', 'push vs pull', 'one pacemaker in the future state'],
      prompt: 'Use bizify to draw the manufacturing value stream (current state) for one product family: supplier, processes with data boxes, inventories, customer demand, information flows from production control, and let bizify compute takt, inventory days and the lead-time ladder.',
    },
    pt: {
      title: 'Fluxo de valor (manufatura)', question: 'O fluxo atende ao takt e onde o estoque se acumula?',
      summary: 'Mapa no padrão Aprendendo a Enxergar, com caixas de dados, triângulos de estoque, empurrado/puxado, takt e linha do tempo.',
      useWhen: 'Melhoria de fábrica ou célula, diagnóstico lean, estado futuro com supermercados e processo puxador.',
      avoidWhen: 'Trabalho do conhecimento sem estoque físico (use a variante escritório).',
      include: ['demanda do cliente e tempo disponível', 'T/C, TR e disponibilidade por processo', 'estoque entre processos', 'empurrado x puxado', 'um processo puxador no estado futuro'],
      prompt: 'Use o bizify para desenhar o fluxo de valor de manufatura (estado atual) de uma família de produtos: fornecedor, processos com caixas de dados, estoques, demanda do cliente, fluxos de informação do PCP; deixe o bizify calcular takt, dias de estoque e a linha do tempo de lead time.',
    },
  },
  {
    id: 'impact-roadmap', type: 'impactmap', proof: 'mobile-payments',
    presentation: { preset: 'classic', motion: 'static', views: 'recommended' },
    signals: [['impact map', 18], ['mapa de impacto', 18], ['impact mapping', 18], ['goal', 4], ['objetivo de negocio', 10], ['objetivo de negócio', 10], ['por que construir', 8], ['why', 3], ['okr', 6], ['metrica de negocio', 8], ['métrica de negócio', 8], ['atores', 5], ['actors', 5], ['priorizar entregas', 7]],
    en: {
      title: 'Impact map (why → who → how → what)', question: 'Which deliverables actually move the business goal, through whose behaviour?',
      summary: 'A four-level map from a measurable goal to actors, behaviour-change impacts and candidate deliverables, with the chosen path highlighted.',
      useWhen: 'Product discovery, roadmap framing, scoping an MVP, aligning stakeholders on value.',
      avoidWhen: 'Scope is already fixed and the question is decomposition (use WBS) or release slicing (use a story map).',
      include: ['one measurable goal (baseline, target, deadline)', 'specific actors', 'impacts as behaviour changes', 'deliverables as options', 'one selected path'],
      prompt: 'Use bizify to build an impact map: one measurable goal with baseline, target and deadline; specific actors; impacts written as behaviour changes; deliverables as options under each impact; mark the shortest path worth testing first.',
    },
    pt: {
      title: 'Mapa de impacto (por quê → quem → como → o quê)', question: 'Quais entregas realmente movem o objetivo de negócio, por meio do comportamento de quem?',
      summary: 'Mapa de quatro níveis do objetivo mensurável aos atores, aos impactos (mudanças de comportamento) e às entregas candidatas, com o caminho escolhido em destaque.',
      useWhen: 'Descoberta de produto, enquadramento de roadmap, definição de MVP, alinhamento de valor com stakeholders.',
      avoidWhen: 'Quando o escopo já está fechado e a pergunta é decomposição (use EAP) ou fatiamento de releases (use story map).',
      include: ['um objetivo mensurável (linha de base, meta, prazo)', 'atores específicos', 'impactos como mudança de comportamento', 'entregas como opções', 'um caminho escolhido'],
      prompt: 'Use o bizify para montar um mapa de impacto: um objetivo mensurável com linha de base, meta e prazo; atores específicos; impactos escritos como mudança de comportamento; entregas como opções sob cada impacto; marque o caminho mais curto que vale testar primeiro.',
    },
  },
  {
    id: 'release-planning', type: 'storymap', proof: 'saas-onboarding',
    presentation: { preset: 'classic', motion: 'static', views: 'recommended' },
    signals: [['story map', 18], ['user story map', 18], ['mapa de historias', 16], ['mapa de histórias', 16], ['backbone', 10], ['walking skeleton', 12], ['mvp', 8], ['release', 6], ['fatia', 6], ['slice', 6], ['backlog', 6], ['jornada do usuario', 7], ['jornada do usuário', 7], ['user journey', 7]],
    en: {
      title: 'User story map (release slices)', question: 'What is the smallest end-to-end release that delivers the outcome?',
      summary: 'A backbone of user activities and steps with stories below, sliced into releases with explicit outcomes.',
      useWhen: 'MVP definition, release planning, backlog shaping, onboarding a team to the product narrative.',
      avoidWhen: 'You need effort/cost structure (use WBS) or a system process (use BPMN).',
      include: ['activities in narrative order', 'steps under each activity', 'stories by priority', 'release slices with outcomes', 'first slice spans the backbone'],
      prompt: 'Use bizify to build a user story map: the backbone of user activities and steps in narrative order, stories under each step ordered by priority, and horizontal release slices each with an outcome; make the first slice a walking skeleton across the whole backbone.',
    },
    pt: {
      title: 'Mapa de histórias (fatias de release)', question: 'Qual é a menor release de ponta a ponta que entrega o resultado?',
      summary: 'Backbone de atividades e passos do usuário com histórias abaixo, fatiado em releases com resultados explícitos.',
      useWhen: 'Definição de MVP, planejamento de releases, organização do backlog, alinhamento do time com a narrativa do produto.',
      avoidWhen: 'Quando precisa da estrutura de esforço e custo (use EAP) ou de um processo sistêmico (use BPMN).',
      include: ['atividades em ordem narrativa', 'passos sob cada atividade', 'histórias por prioridade', 'fatias de release com resultados', 'a primeira fatia cobre todo o backbone'],
      prompt: 'Use o bizify para montar um mapa de histórias: backbone de atividades e passos do usuário em ordem narrativa, histórias sob cada passo ordenadas por prioridade e fatias horizontais de release, cada uma com um resultado; faça da primeira fatia um esqueleto funcional que atravessa todo o backbone.',
    },
  },
  {
    id: 'process-scoping', type: 'sipoc', proof: 'release-management',
    presentation: { preset: 'classic', motion: 'static', views: 'optional' },
    signals: [['sipoc', 18], ['copis', 16], ['fornecedores entradas', 12], ['suppliers inputs', 12], ['six sigma', 8], ['seis sigma', 8], ['dmaic', 10], ['escopo do processo', 10], ['process scope', 10], ['ctq', 8], ['fronteira do processo', 8], ['process boundary', 8]],
    en: {
      title: 'Process scope (SIPOC)', question: 'Where does the process start and end, and who feeds and receives it?',
      summary: 'Suppliers, inputs, 4–7 high-level steps, outputs with CTQ requirements, and customers.',
      useWhen: 'DMAIC Define, kick-off of process work, agreeing boundaries before BPMN or VSM.',
      avoidWhen: 'You already need decisions and hand-offs (use BPMN) or timings (use VSM).',
      include: ['start trigger and end boundary', '4–7 verb-noun steps', 'every input with a supplier', 'every output with a customer', 'CTQ per key output'],
      prompt: 'Use bizify to build a SIPOC: agree the start trigger and end boundary, list 4–7 high-level steps, then outputs with their CTQ requirements and customers, and inputs with their suppliers.',
    },
    pt: {
      title: 'Escopo do processo (SIPOC)', question: 'Onde o processo começa e termina, e quem o alimenta e recebe?',
      summary: 'Fornecedores, entradas, 4 a 7 etapas de alto nível, saídas com requisitos CTQ e clientes.',
      useWhen: 'Fase Define do DMAIC, abertura de trabalho em processos, acordo de fronteiras antes de BPMN ou VSM.',
      avoidWhen: 'Quando já precisa de decisões e passagens de bastão (use BPMN) ou de tempos (use VSM).',
      include: ['gatilho de início e fronteira de fim', '4 a 7 etapas verbo + substantivo', 'toda entrada com fornecedor', 'toda saída com cliente', 'CTQ nas saídas-chave'],
      prompt: 'Use o bizify para montar um SIPOC: combine o gatilho de início e a fronteira de fim, liste de 4 a 7 etapas de alto nível e depois as saídas com seus requisitos CTQ e clientes, e as entradas com seus fornecedores.',
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

const PT_HINT = /[ãõçáéíóúâêô]|\b(processo|fluxo|escopo|entrega|mapa|projeto|historias|histórias|fornecedor|cliente|valor)\b/iu;

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
    ? `Receitas de cenário do Bizify (${SCENARIO_RECIPES.length})`
    : `Bizify scenario recipes (${SCENARIO_RECIPES.length})`;
  const intro = isPt
    ? 'Escolha a pergunta antes do tipo de diagrama. Rode: bizify guide "seu cenário"'
    : 'Choose the question before the diagram type. Run: bizify guide "your scenario"';
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
