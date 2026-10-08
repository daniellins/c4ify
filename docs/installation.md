# Installation

## Requirements

- **Node.js 18 or newer**: the only runtime requirement. Rendering and validation have no npm
  dependencies (the JSON Schema validators are precompiled).
- **Optional:** Google Chrome, Chromium or Microsoft Edge, used only by `c4ify visual-check`
  (screenshots and first-screen containment evidence).

## Claude Code

### With the skills CLI

```bash
# user level (all projects)
npx -y skills add daniellins/c4ify --skill c4ify --agent claude-code --global --copy --yes
```

### Manually

```bash
git clone https://github.com/daniellins/c4ify.git
cp -r c4ify/c4ify ~/.claude/skills/c4ify            # user level
# or: cp -r c4ify/c4ify <your-project>/.claude/skills/c4ify   (project level)
```

Restart the session (skills are listed at session start), then:

```bash
node ~/.claude/skills/c4ify/bin/c4ify.mjs doctor    # → "c4ify is ready."
node ~/.claude/skills/c4ify/bin/c4ify.mjs demo ./c4ify-demo
```

### From a `.skill` package

Release pages will attach `c4ify.skill` (a zip of the skill folder). Unzip it into
`~/.claude/skills/` so that `~/.claude/skills/c4ify/SKILL.md` exists.

## Other agents

Any agent that follows the Agent Skills convention (a folder with `SKILL.md`) can use c4ify: the
instructions in `SKILL.md` only rely on running `node bin/c4ify.mjs …` in a shell. Without shell
access, the agent can still read the schema and hand-write SVG into `assets/template.html`
(documented fallback), but no validation runs.

## Using it next to Archify and bizify

The three skills can be installed side by side; their descriptions trigger on different requests:
C4 model diagrams (system context, containers, components, landscape) → c4ify; free-form software
architecture, sequence, data-flow and state diagrams → Archify; business diagrams (WBS, BPMN, VSM,
impact map, story map, SIPOC) → bizify.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `doctor` reports missing files | reinstall the whole `c4ify/` folder (not just `SKILL.md`) |
| `visual-check` says the browser is unavailable | install Chrome/Chromium/Edge or skip browser evidence (reported as `skipped`) |
| `deliver` refuses an `.html` target | without `--view` it writes one file per view: pass a directory, or add `--view <key>` |
| `Unknown view "x"` | use a `key` from the model's `views[]` |
| Double-click does nothing | drill-down links point at sibling files: keep all `<view-key>.html` files in one folder |
| Output in English though the content is Portuguese | set `meta.locale: "pt-BR"` in the model |
| `method/R-C4-…` blocks `showcase` | fix the content, or add a justified waiver; see `references/authoring-contract.md` |
