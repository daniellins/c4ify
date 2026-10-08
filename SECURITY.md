# Security Policy

## Supported versions

| Version | Supported |
|---|---|
| 0.1.x | ✅ |

## What is in scope

Bizify runs locally with Node.js and writes self-contained HTML files. Security-relevant areas:

- **Output safety:** authored strings reach SVG/HTML only through escaping (`esc`); a spec that
  produces executable markup in the artifact is a vulnerability.
- **File system:** `deliver` writes atomically and refuses unexpected output extensions; path
  handling lives in `renderers/shared/output-path.mjs`.
- **Network:** rendering and validation never fetch anything. The only network operation is the
  explicit, opt-in `bizify brands capture <url>` command (digest-pinned).
- **Generated HTML:** artifacts are offline by design (fonts and runtime embedded).

## Reporting a vulnerability

Please **do not open a public issue**. Use GitHub's
[private vulnerability reporting](https://github.com/daniellins/bizify/security/advisories/new)
with a minimal reproducing spec and the command you ran. You can expect an acknowledgement within
7 days and a fix or mitigation plan within 30 days for confirmed issues.

If the problem also affects the inherited engine, it may affect
[Archify](https://github.com/tt-a1i/archify) too; we will coordinate a responsible disclosure upstream.
