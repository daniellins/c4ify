<div align="center">

# c4ify

**Diagramas do modelo C4 que seguem a notação: validados, navegáveis por níveis, exploráveis em HTML.**

Panorama de Sistemas · Contexto do Sistema · Contêineres · Componentes

[English](README.md) · [Documentação](docs/) · [Como contribuir](CONTRIBUTING.md)

</div>

---

O c4ify é uma **Agent Skill** (Claude Code e agentes compatíveis) que gera diagramas do
[modelo C4](https://c4model.com). Você descreve o sistema uma única vez, num modelo JSON com
pessoas, sistemas de software, contêineres, componentes e relacionamentos; o c4ify confere o modelo
contra a notação C4 e entrega **um HTML interativo e autônomo por visão** (SVG embutido, tema claro
e escuro, zoom, busca, foco, visões guiadas, modo apresentação e exportação PNG/SVG/WebM), com links
entre as visões para descer do panorama até os componentes.

> **O c4ify é um fork do [bizify](https://github.com/daniellins/bizify)**, que por sua vez é um
> fork do **[Archify](https://github.com/tt-a1i/archify)**, de [tt-a1i](https://github.com/tt-a1i).
> Ele mantém o visualizador, o roteamento e os portões de entrega do Archify e o motor de regras de
> método do bizify, e acrescenta o modelo C4. Para diagramas livres de arquitetura, sequência ou
> fluxo de dados, use o Archify; para diagramas de negócio (EAP, BPMN, VSM…), use o bizify.

As capturas de tela chegam com a primeira versão. Até lá, `node bin/c4ify.mjs demo` gera os
exemplos localmente.

## Por que usar

- **O método é o produto:** treze regras (`R-C4-01` a `R-C4-13`) parafraseadas da orientação de
  notação e do checklist de revisão do c4model.com, cada uma com nível e fonte.
- **Regras HARD recusam o modelo:** contêiner fora de um sistema de software, visão cujo escopo não
  combina com o tipo, relacionamento sem descrição, seta de um contêiner para o próprio sistema.
- **Regras SOFT viram avisos:** elemento sem descrição ou tecnologia, chamada entre contêineres sem
  protocolo, sigla sem explicação, verbo vago ("usa"), visão lotada. No perfil `showcase` elas
  bloqueiam a entrega até serem corrigidas ou **dispensadas com um motivo explícito**.
- **Títulos e legenda gerados:** cada visão diz o que é ("Diagrama de contêineres de Loja
  On-line") e explica formas, cores e estilos de linha.
- **Semântica em vez de coordenadas:** layout, roteamento ortogonal e posição dos rótulos são
  automáticos; `placement` e `routes` servem só para corrigir um diagnóstico.
- **Interface em português:** `meta.locale: "pt-BR"` traduz controles, títulos, legenda e mensagens
  das regras.

## Um modelo, várias visões

Como no [Structurizr](https://structurizr.com), o modelo guarda cada elemento e relacionamento uma
única vez, e cada visão faz uma pergunta a ele num nível de abstração:

| Tipo de visão | Escopo | Mostra |
|---|---|---|
| `systemLandscape` | nenhum | todas as pessoas e sistemas de software |
| `systemContext` | um sistema de software | o sistema, seus usuários e os sistemas com que conversa |
| `container` | um sistema de software | seus contêineres dentro de uma fronteira tracejada, mais pessoas e sistemas externos |
| `component` | um contêiner | seus componentes, mais contêineres vizinhos, pessoas e sistemas externos |

**Relacionamentos implícitos:** descreva os relacionamentos entre os elementos mais detalhados que
você conhece. Cada visão os eleva ao nível que desenha (componente → componente vira contêiner →
contêiner numa visão de contêineres) e junta os repetidos com uma contagem.

**Navegação por níveis:** a entrega de um modelo grava `<chave-da-visão>.html` para cada visão numa
pasta. Uma barra de navegação liga todas as visões, e o clique duplo num elemento marcado com ⊕ (ou
Shift+Enter) abre o nível seguinte: panorama → contexto → contêineres → componentes.

## Instalação

```bash
npx -y skills add daniellins/c4ify --skill c4ify --agent claude-code --global --copy --yes
node ~/.claude/skills/c4ify/bin/c4ify.mjs doctor    # → "c4ify is ready."
```

Ou copie a pasta [`c4ify/`](c4ify/) para `~/.claude/skills/c4ify`. Requer Node.js 18+.

## Uso

Peça em linguagem natural:

```text
"Monte os diagramas C4 de contexto e de contêineres da nossa loja on-line"
"Modele este repositório em C4: contêineres e os componentes da API"
"Crie o panorama de sistemas da empresa com os sistemas internos e externos"
```

Ou use a CLI:

```bash
node bin/c4ify.mjs validate c4 examples/online-store.c4.json --quality showcase
node bin/c4ify.mjs deliver  c4 examples/online-store.c4.json saida/loja --quality showcase
node bin/c4ify.mjs deliver  c4 examples/online-store.c4.json saida/contexto.html --view contexto
```

As regras, a CLI completa e o exemplo mínimo estão no [README em inglês](README.md) e em
[docs/](docs/).

## Planos

Importar do Structurizr (exportação JSON e, depois, um subconjunto documentado da DSL) e, em
seguida, visões de implantação e dinâmicas. Veja o [ROADMAP.md](ROADMAP.md).

## Origem e agradecimentos

- O **[Archify](https://github.com/tt-a1i/archify)**, criado por **[tt-a1i](https://github.com/tt-a1i)**,
  construiu as partes difíceis: o visualizador autônomo, o pipeline de entrega determinístico, as
  checagens de geometria e composição, a exportação e o roteador ortogonal que o c4ify reaproveita.
- O **[bizify](https://github.com/daniellins/bizify)** contribuiu o motor de regras (HARD/SOFT,
  avisos e dispensas), o idioma pt-BR e a estrutura do repositório. O c4ify partiu do commit
  `7e174b9`.
- O **[modelo C4](https://c4model.com)** foi criado por **Simon Brown**; as regras do c4ify
  parafraseiam a orientação de notação e o checklist de revisão (CC BY 4.0).
- O **[Structurizr](https://structurizr.com)** inspirou a organização "um modelo, várias visões" e
  os relacionamentos implícitos.

Atribuição completa: [NOTICE.md](NOTICE.md).

## Licença

[MIT](LICENSE) © 2026 Daniel Lins, preservando os avisos de copyright do bizify, do Archify e da
Cocoon AI.
