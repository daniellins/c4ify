# Contributing to Bizify

Thank you for helping! Bizify grows best through **new diagram types, better layouts, sourced rule
corrections, translations and examples**. This guide explains how to propose and land a change.

By participating you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to contribute

| Contribution | Start with |
|---|---|
| Report a bug (wrong layout, crash, bad number) | an issue using the **Bug report** template, with the JSON spec |
| Fix or add a **method rule** | an issue using **Methodology correction**, citing the source |
| Propose a **new diagram type** | an issue using **New diagram type**, before writing code |
| Improve a layout, text fitting or routing | a PR with before/after screenshots |
| Add or improve a translation | a PR touching `renderers/shared/i18n.mjs` and `renderers/<type>/messages.mjs` |
| Add an example | a PR adding `bizify/examples/<name>.<type>.json` that passes `showcase` |

## Development setup

```bash
git clone https://github.com/daniellins/bizify.git
cd bizify/bizify
npm ci                                   # dev dependencies only (AJV, simple-icons)
npm test                                 # generators check + full node:test suite
node bin/bizify.mjs doctor
```

Node.js 18 or newer. `visual-check` additionally needs Chrome/Chromium/Edge installed; it is not
part of `npm test`.

To try your working copy inside Claude Code, point a symlink (or a copy) of `bizify/bizify` at
`~/.claude/skills/bizify`.

## The golden rules

1. **Methods come from sources.** Every rule has an id (`R-<TYPE>-NN`), a level (HARD or SOFT) and
   a citation in `references/theory-<type>.md`. Grade sources: *Gold* (standard or original author),
   *Silver* (recognized practitioner), *Bronze* (tertiary). A Bronze-only claim is marked
   `[ASSUMPTION]` and should not become a HARD rule. Folklore stays opt-in (see the 8/80 rule).
2. **HARD means the notation or the arithmetic is wrong**; style and practice are SOFT.
3. **Authors write semantics, not coordinates.** New layout knobs are repair tools for a named
   diagnostic, not a starting point.
4. **Compute numbers; never trust authored totals.** Mismatches are HARD.
5. **Never make a diagram pass by deleting meaning** (labels, nodes, numbers). Diagnose instead.
6. **First screen:** examples must pass `visual-check` containment at 1440×900–2048×1320.
7. **Portuguese text uses full accents**; English text is the default for code and docs.

## Adding a diagram type

Read [docs/adding-a-diagram-type.md](docs/adding-a-diagram-type.md) and
[bizify/renderers/README.md](bizify/renderers/README.md) (the renderer contract). In short, a type
`<t>` owns:

```
bizify/schemas/<t>.schema.json
bizify/renderers/<t>/render-<t>.mjs, messages.mjs, palette.mjs
bizify/references/theory-<t>.md, authoring-<t>.md
bizify/examples/<name>.<t>.json
bizify/test/<t>.test.mjs
```

and is registered in `bin/bizify.mjs` (TYPES, THEORY, doctor example), `renderers/shared/cli.mjs`
(START_TYPES, SEMANTIC_COLLECTIONS, RELATIONSHIP_COLLECTIONS), `renderers/shared/type-messages.mjs`,
`scripts/generate-validators.mjs`, `scripts/generate-kind-palette.mjs`, `scripts/render-examples.mjs`,
`recipes/scenarios.mjs` and the type router in `SKILL.md`.

## Pull request checklist

- [ ] `npm test` passes (it also checks that generated validators and palette CSS are current:
      run `npm run generate:validators` and `npm run generate:palette` after schema/palette edits).
- [ ] Changed renderers: every example of that type still passes
      `validate --quality showcase` with 0 errors and 0 warnings.
- [ ] Visual changes: before/after screenshots (light and dark) attached.
- [ ] New or changed rules: id, level and source in the theory file; a test per HARD rule family.
- [ ] Docs updated (`SKILL.md`, `authoring-<type>.md`, `CHANGELOG.md` under *Unreleased*).
- [ ] `SKILL.md` stays under 500 lines and every reference file under 350 lines.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/): `feat(bpmn): …`, `fix(wbs): …`,
`docs: …`, `test(vsm): …`, `chore: …`. One logical change per commit.

## Upstream

Bizify is a fork of [Archify](https://github.com/tt-a1i/archify). Fixes to the shared engine
(viewer, geometry, delivery) that are not business-specific are good candidates to offer upstream —
please mention it in your PR so we can coordinate. Keep the internal `Archify`/`ARCHIFY_*`
identifiers when touching inherited code; they make upstream diffs readable.

## Releases

Maintainers bump `bizify/package.json`, `bizify/skill-release.json` and the `SKILL.md` metadata
version together, move *Unreleased* in `CHANGELOG.md` under the new version and tag `vX.Y.Z`.
