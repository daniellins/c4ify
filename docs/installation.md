# Installation

## Requirements

- **Node.js 18 or newer** — the only runtime requirement. Rendering and validation have no npm
  dependencies (the JSON Schema validators are precompiled).
- **Optional:** Google Chrome, Chromium or Microsoft Edge, used only by `bizify visual-check`
  (screenshots and first-screen containment evidence).

## Claude Code

### With the skills CLI

```bash
# user level (all projects)
npx -y skills add daniellins/bizify --skill bizify --agent claude-code --global --copy --yes
```

### Manually

```bash
git clone https://github.com/daniellins/bizify.git
cp -r bizify/bizify ~/.claude/skills/bizify          # user level
# or: cp -r bizify/bizify <your-project>/.claude/skills/bizify   (project level)
```

Restart the session (skills are listed at session start), then:

```bash
node ~/.claude/skills/bizify/bin/bizify.mjs doctor   # → "Bizify is ready."
node ~/.claude/skills/bizify/bin/bizify.mjs demo ./bizify-demo
```

### From a `.skill` package

Release pages attach `bizify.skill` (a zip of the skill folder). Unzip it into
`~/.claude/skills/` so that `~/.claude/skills/bizify/SKILL.md` exists.

## Other agents

Any agent that follows the Agent Skills convention (a folder with `SKILL.md`) can use Bizify: the
instructions in `SKILL.md` only rely on running `node bin/bizify.mjs …` in a shell. Without shell
access, the agent can still read the schemas and hand-write SVG into `assets/template.html`
(documented fallback), but no validation runs.

## Using it next to Archify

Bizify and Archify can be installed side by side. Their descriptions are written to trigger on
different requests: business diagrams (WBS, BPMN, VSM, impact map, story map, SIPOC) → Bizify;
software architecture, sequence, data-flow and state diagrams → Archify.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `doctor` reports missing files | reinstall the whole `bizify/` folder (not just `SKILL.md`) |
| `visual-check` says the browser is unavailable | install Chrome/Chromium/Edge or skip browser evidence (reported as `skipped`) |
| `Unknown diagram type` | types are `wbs`, `bpmn`, `vsm`, `impactmap`, `storymap`, `sipoc` |
| Output in English though the content is Portuguese | set `meta.locale: "pt-BR"` in the spec |
| `method/R-…` blocks `showcase` | fix the content, or add a justified waiver — see `references/authoring-contract.md` |
