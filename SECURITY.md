# Security Policy

## Supported versions

| Version | Supported |
|---|---|
| 0.1.x | ✅ |

## What is in scope

c4ify runs locally with Node.js and writes self-contained HTML files. Security-relevant areas:

- **Output safety:** authored strings (names, descriptions, technologies, glossary entries) reach
  SVG/HTML only through escaping (`esc`); a model that produces executable markup in the artifact
  is a vulnerability.
- **File system:** `deliver` writes atomically and refuses unexpected output extensions; delivering
  all views writes only `<view-key>.html` files into the chosen directory. Path handling lives in
  `renderers/shared/output-path.mjs`.
- **Network:** rendering and validation never fetch anything. The only network operation is the
  explicit, opt-in `c4ify brands capture <url>` command (digest-pinned).
- **Generated HTML:** artifacts are offline by design (fonts and runtime embedded); drill-down
  links point only at sibling view files.

## Reporting a vulnerability

Please **do not open a public issue**. Use GitHub's
[private vulnerability reporting](https://github.com/daniellins/c4ify/security/advisories/new)
with a minimal reproducing model and the command you ran. You can expect an acknowledgement within
7 days and a fix or mitigation plan within 30 days for confirmed issues.

If the problem also affects the inherited engine, it may affect
[bizify](https://github.com/daniellins/bizify) and [Archify](https://github.com/tt-a1i/archify)
too; we will coordinate a responsible disclosure upstream.
