# Brand marks

Use a brand mark only when a real product, provider, model family, channel, or
service identity helps the reader. The C4 `type`, `description` and
`technology` still explain what the element is and does; `brand` only shows
whose product it is.

## Agent decision path

1. Search the built-in catalogue when the request names a recognizable brand:

   ```bash
   node bin/c4ify.mjs brands "PostgreSQL" --json
   ```

2. Put the returned canonical ID in the element:

   ```json
   {
     "id": "db",
     "type": "container",
     "parent": "shop",
     "name": "Orders Database",
     "technology": "PostgreSQL",
     "shape": "database",
     "brand": "postgresql"
   }
   ```

3. If there is no catalogue match and the user supplied the official website,
   capture its icon explicitly:

   ```bash
   node bin/c4ify.mjs brands capture "https://partner.example.com" --json
   ```

   Put the command's digest-pinned `brand` value in the authored element:

   ```json
   {
     "id": "partner",
     "type": "softwareSystem",
     "external": true,
     "name": "Partner portal",
     "brand": {
       "url": "https://partner.example.com",
       "sha256": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
     }
   }
   ```

4. If there is no match and no user-provided URL, omit `brand`. Do not invent a
   URL or silently assign a visually similar company.

Known-brand URLs resolve to the bundled vector instead of using the network.
Unknown URL capture accepts only bounded raster image formats, blocks
credentials, nonstandard public ports, and private or link-local destinations,
uses bounded concurrency and one total deadline, and returns the captured
content digest. Later render and validate operations require that exact digest;
blocked, unavailable, changed, oversized, or unsafe content fails closed instead
of silently changing the artifact.

The final artifact never fetches a brand asset when opened. Preset vectors and
digest-verified captured site icons remain embedded in SVG, PNG, WebP, JPEG,
Share Card, and WebM exports.

Use `node bin/c4ify.mjs brands --json` to inspect all canonical IDs, aliases,
categories, domains, and provenance. Current categories cover AI, cloud,
engineering, data, collaboration, business systems, channels, languages, and
frameworks.
