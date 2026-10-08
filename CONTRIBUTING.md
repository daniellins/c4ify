# Contributing to c4ify

Thank you for helping! c4ify grows best through **better layouts and routing, sourced rule
corrections, importers, new view types, translations and examples**. This guide explains how to
propose and land a change.

By participating you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to contribute

| Contribution | Start with |
|---|---|
| Report a bug (wrong layout, crash, wrong view content) | an issue using the **Bug report** template, with the model JSON and view key |
| Fix or add a **rule** | an issue using **C4 notation correction**, citing the c4model.com page |
| Propose a **new view type** (deployment, dynamic, …) | an issue using **New view type**, before writing code |
| Improve layout, routing or label placement | a PR with before/after screenshots |
| Add or improve a translation | a PR touching `renderers/shared/i18n.mjs` and `renderers/c4/messages.mjs` |
| Add an example | a PR adding `c4ify/examples/<name>.c4.json` that passes `showcase` |

## Development setup

```bash
git clone https://github.com/daniellins/c4ify.git
cd c4ify/c4ify
npm ci                                   # dev dependencies only (AJV, simple-icons)
npm test                                 # generators check + full node:test suite
node bin/c4ify.mjs doctor
```

Node.js 18 or newer. `visual-check` additionally needs Chrome/Chromium/Edge installed; it is not
part of `npm test`.

To try your working copy inside Claude Code, point a symlink (or a copy) of `c4ify/c4ify` at
`~/.claude/skills/c4ify`.

## Workflow

`main` is protected and accepts changes **only through pull requests**:

1. Create a branch from `main` (`feat/…`, `fix/…`, `docs/…`).
2. Open a PR using the template checklist.
3. CI runs `npm ci`, `npm test`, `doctor` and renders every example on **Ubuntu and Windows ×
   Node 18, 20 and 22**; a maintainer reviews.
4. The PR is **squash-merged** once CI is green and the review is approved.

## The golden rules

1. **Rules come from sources.** Every rule has an id (`R-C4-NN`), a level (HARD or SOFT) and a
   citation in `references/theory-c4.md`, normally a c4model.com page (notation, review checklist
   or the diagram pages). Paraphrase; do not copy the text.
2. **HARD means the notation is wrong** (hierarchy, scope, unlabelled or self-nested
   relationships); style and practice are SOFT.
3. **Authors write semantics, not coordinates.** New layout knobs are repair tools for a named
   diagnostic, not a starting point.
4. **Never make a view pass by deleting meaning** (elements, relationship labels, technologies).
   Diagnose instead.
5. **First screen:** example views must pass `visual-check` containment at 1440×900–2048×1320.
6. **Portuguese text uses full accents**; English is the default for code and docs.

## Adding a view type

Read [docs/adding-a-view-type.md](docs/adding-a-view-type.md) and
[c4ify/renderers/README.md](c4ify/renderers/README.md) (the renderer contract).

## Pull request checklist

- [ ] `npm test` passes (it also checks that generated validators and palette CSS are current:
      run `npm run generate:validators` and `npm run generate:palette` after schema/palette edits).
- [ ] Every example still passes `validate c4 <model> --quality showcase` with 0 errors and
      0 warnings in every view.
- [ ] Visual changes: before/after screenshots (light and dark) attached.
- [ ] New or changed rules: id, level and source in `theory-c4.md`; a test per HARD rule.
- [ ] Docs updated (`SKILL.md`, `authoring-c4.md`, `CHANGELOG.md` under *Unreleased*).
- [ ] `SKILL.md` stays under 500 lines and every reference file under 350 lines.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/): `feat(layout): …`, `fix(routing): …`,
`docs: …`, `test(resolve): …`, `chore: …`. One logical change per commit; the squash-merge title
follows the same format.

## Upstream

c4ify is a fork of [bizify](https://github.com/daniellins/bizify), a fork of
[Archify](https://github.com/tt-a1i/archify). Fixes to the shared engine (viewer, geometry,
delivery, rule engine) that are not C4-specific are good candidates to offer upstream; please
mention it in your PR. Keep the internal `Archify`/`ARCHIFY_*` identifiers when touching inherited
code; they make upstream diffs readable.

## Releases

Maintainers bump `c4ify/package.json`, `c4ify/skill-release.json` and the `SKILL.md` metadata
version together, move *Unreleased* in `CHANGELOG.md` under the new version and tag `vX.Y.Z`.
