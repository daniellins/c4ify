# Examples

Every model here passes `validate --quality showcase` in all its views (CI checks
this) and is delivered with `node bin/c4ify.mjs deliver c4 <model> <dir>`.

| Model | Language | Views | What it shows |
|---|---|---|---|
| `online-store.c4.json` | pt-BR | landscape, context, containers | Small fictional online store: the bundled doctor/demo example. |
| `library-lending.c4.json` | en | context, containers, components | Fictional library system with a component view of its API. |
| `eshop.c4.json` | en | context, 5 container views, components | Microsoft's eShop reference application, split by flow (web shop, mobile, order flow, webhooks, sign-in) plus the Ordering API's components. |
| `online-boutique.c4.json` | en | context, 3 container views | Google's Online Boutique microservices demo, split into browsing, checkout and AI-assistant flows. |
| `spring-petclinic.c4.json` | pt-BR | context, 4 container views | Spring PetClinic Microservices: application flow, configuration and discovery, metrics, tracing and health. |

## Real-world sources

The last three were modelled by an agent using c4ify from each project's public
repository, reading the code (orchestration, manifests, clients) rather than the
README alone, during the skill's with/without evaluation (see the CHANGELOG for
0.2.0). They describe architecture facts only; no code or text was copied.

| Model | Repository | Commit read | License |
|---|---|---|---|
| `eshop.c4.json` | https://github.com/dotnet/eShop | `dc7ea49` | MIT |
| `online-boutique.c4.json` | https://github.com/GoogleCloudPlatform/microservices-demo | `38e7348` | Apache-2.0 |
| `spring-petclinic.c4.json` | https://github.com/spring-petclinic/spring-petclinic-microservices | `1d76b00` | Apache-2.0 |

Product and project names belong to their owners; the models are independent
documentation examples, not endorsed by them.
