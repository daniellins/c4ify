<div align="center">

# Bizify

**Diagramas de negócio para projetos de tecnologia — validados pelo método, exploráveis em HTML.**

EAP / WBS · BPMN 2.0 · Mapa do Fluxo de Valor · Mapa de Impacto · Mapa de Histórias · SIPOC

[English](README.md) · [Documentação](docs/) · [Como contribuir](CONTRIBUTING.md)

</div>

---

O Bizify é uma **Agent Skill** (Claude Code e agentes compatíveis) que transforma uma pergunta de
negócio numa especificação JSON tipada, calcula o layout e **os números**, aplica as regras do
método e entrega um único HTML interativo, com tema claro/escuro, estilos visuais, zoom, busca,
foco, visões guiadas, modo apresentação e exportação PNG/SVG/WebM.

> **O Bizify é um fork do [Archify](https://github.com/tt-a1i/archify), de [tt-a1i](https://github.com/tt-a1i).**
> O Archify é uma skill excelente para diagramas de *arquitetura de software*. O Bizify mantém o
> visualizador, o pipeline de entrega e os portões de qualidade do Archify e troca o conhecimento de
> arquitetura pelos **diagramas de negócio** que um projeto de tecnologia precisa: escopo, processo,
> fluxo e planejamento. Para arquitetura, sequência, fluxo de dados ou estados, use o Archify.

## O que ele gera

| Tipo | Pergunta que responde | Fontes |
|---|---|---|
| `wbs` (EAP) | O que o projeto entrega, e isso cobre 100% do escopo? | PMI, PMBOK, NASA, GAO, MIL-STD-881F |
| `bpmn` | Quem faz o quê, em que ordem, com quais decisões e passagens de bastão? | OMG BPMN 2.0.2, Silver, Camunda |
| `vsm` (MFV) | Onde o trabalho espera e quanto do lead time agrega valor? | Rother & Shook, Martin & Osterling |
| `impactmap` | Quais entregas movem o objetivo, pelo comportamento de quem? | Adzic |
| `storymap` | Qual é a menor release de ponta a ponta que entrega o resultado? | Patton |
| `sipoc` | Onde o processo começa e termina, quem o alimenta e quem recebe? | ASQ, Lean Six Sigma |

## Por que usar

- **O método é o produto:** cerca de 100 regras com id (`R-WBS-08`), nível e fonte citada.
- **Regras HARD recusam** a especificação (duas raízes, filhos que não somam o pai, total do VSM
  que não bate com o calculado); **regras SOFT** viram avisos que bloqueiam o perfil `showcase` até
  serem corrigidos ou dispensados com um motivo explícito.
- **Números calculados:** somas da EAP, lead time, eficiência do fluxo, %C&A acumulado, takt.
- **Semântica em vez de coordenadas:** você descreve pais, raias, ordem e métricas; o layout sai sozinho.
- **Interface em português:** `meta.locale: "pt-BR"` traduz controles, legenda, cartões e números.

## Instalação

```bash
npx -y skills add daniellins/bizify --skill bizify --agent claude-code --global --copy --yes
node ~/.claude/skills/bizify/bin/bizify.mjs doctor    # → "Bizify is ready."
```

Ou copie a pasta [`bizify/`](bizify/) para `~/.claude/skills/bizify`. Requer Node.js 18+.

## Uso

Peça em linguagem natural:

```text
"Monte a EAP do projeto VisionQC com as horas por pacote de trabalho"
"Modele em BPMN o processo AS-IS de requisição de compras, com o fornecedor como piscina externa"
"Mapeie o fluxo de valor atual do atendimento de incidentes; trabalhamos 8 h por dia"
"Crie o SIPOC do processo de release mensal do app"
```

Veja a galeria, a arquitetura e os detalhes no [README em inglês](README.md) e em [docs/](docs/).

## Origem e agradecimentos

O Bizify existe porque o **[Archify](https://github.com/tt-a1i/archify)** existe. O Archify, criado
por **[tt-a1i](https://github.com/tt-a1i)**, construiu as partes difíceis: o visualizador
autônomo, o pipeline de entrega determinístico, as checagens de geometria e composição e o sistema
de exportação. O Bizify partiu do **Archify 2.17.0-dev.1** (setembro de 2026), removeu os
renderizadores de arquitetura e acrescentou seis renderizadores de negócio, as regras de método, os
avisos com dispensa justificada, as métricas calculadas e o idioma pt-BR. Obrigado, tt-a1i.

## Licença

[MIT](LICENSE) © 2026 Daniel Lins, preservando os avisos de copyright originais do Archify e da Cocoon AI.
