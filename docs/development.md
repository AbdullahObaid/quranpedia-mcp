# Development

Everything you need to build, test, lint, and deploy `quranpedia-mcp`.

## Prerequisites

- Node.js 20+ (LTS recommended; Dockerfile uses `node:22-alpine`)
- npm, pnpm, or yarn (project is `yarn@1.22.22` per `packageManager`)

## Install

```bash
yarn install
# or: npm install / pnpm install
```

## Build

```bash
yarn build
```

This runs `rimraf dist` and `tsc`. The output is committed to `dist/`.

## Local dev

```bash
# stdio transport (talks to a local MCP client like Claude Desktop)
yarn dev

# HTTP transport on http://localhost:4000/
yarn dev:http
```

The HTTP dev server is also reachable for ad-hoc testing with `curl`.

## Test

```bash
yarn test
```

This runs `yarn build` (via the `test` script), then `test:stdio` and
`test:http`. Both scripts:

- spawn the compiled `dist/server.js`
- open a real MCP client (stdio or Streamable HTTP)
- call `tools/list` and assert that all 23 required tools are registered
- call each tool with a happy-path argument
- assert that annotations are present, including `openWorldHint: true` for
  every tool (all 23 contact the external Quranpedia API)
- close the session and verify the server cleans up

Both suites call the Quranpedia tools against the live
`api.quranpedia.net`, so they require network access.

You can run the stdio or HTTP suite on its own:

```bash
yarn test:stdio
yarn test:http
```

## Lint

```bash
yarn lint
yarn lint:fix
```

## Submission check

Before publishing or submitting to the ChatGPT developer mode, run:

```bash
yarn build
yarn check:submission
```

This lints the deployed server: fetches `https://mcp.quran.us.kg/health`,
calls `tools/list`, and verifies every tool satisfies the submission
requirements (description length, forbidden words, annotations).

## Adding a new tool

The tool surface is structured one file per tool under `src/tools/`. Every
tool is a typed wrapper over a Quranpedia API route. To add a new tool:

1. **Create `src/tools/<name>.ts`** with this shape:

   ```ts
   import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
   import { z } from 'zod';
   import { fetchYourRoute } from '../quranpedia-client.js';
   import {
     EXTERNAL_READ_ONLY_ANNOTATIONS,
     isQuranpediaNotFound,
     quranpediaErrorResponse,
     quranpediaOk,
   } from './_shared.js';

   export function register<Name>(server: McpServer): void {
     server.registerTool(
       '<name>',
       {
         title: '<Human title>',
         description: '<≤299 chars, no MUST/ALWAYS/NEVER/REQUIRED/SHALL words>',
         inputSchema: z.object({ /* your Zod schema, mirroring the API params */ }),
         annotations: EXTERNAL_READ_ONLY_ANNOTATIONS,
       },
       async (args) => {
         try {
           const { url, data } = await fetchYourRoute(args);
           return quranpediaOk(url, { ...args, data });
         } catch (error) {
           if (isQuranpediaNotFound(error)) {
             // genuinely missing → return null-style payload, not an error
           }
           return quranpediaErrorResponse(error);
         }
       },
     );
   }
   ```

   Add a typed endpoint helper in `src/quranpedia-client.ts` that routes
   through `quranpediaRequest()` (shared TTL cache + `source` attribution), and
   name both the tool and the helper after the API route. See
   `src/tools/get-book.ts` as a worked example.

2. **Wire it in `src/tools/index.ts`** in alphabetical order (so `tools/list`
   output is stable).

3. **Add a positive test** in `scripts/test.js` and `scripts/test-http.js`,
   plus a negative test if your tool has a `Zod.refine()` or non-trivial
   validation. Every tool is external, so the `openWorldHint: true`
   annotation assertion already covers it.

4. **Document the tool** in `docs/tools.md` (description, schema, output,
   example, annotations).

5. **Run the full pipeline**:

   ```bash
   yarn build
   yarn test
   yarn check:submission
   ```

6. **Bump the version** in `package.json` and `server.json` (keep them in
   sync).

7. **Add a CHANGELOG entry** under the new version heading.

## Deploy

The public endpoint at `https://mcp.quran.us.kg/` is rebuilt and restarted
from the repo via the standard `docker compose` flow:

```bash
docker compose up -d --build
```

Verify the new version is live:

```bash
curl -sS https://mcp.quran.us.kg/health
# → {"status":"ok","version":"2.0.0","sessions":0,"quranpediaCache":{"memoryEntries":0,"diskEntries":0,"hits":0,"misses":0}}
```

## Release

```bash
yarn build
yarn version patch   # or minor / major
yarn publish --access public
```

## Repository layout

```
quranpedia-mcp/
├── README.md                    # short landing page
├── CHANGELOG.md
├── docs/                        # detailed documentation (this folder)
│   ├── index.md
│   ├── tools.md
│   ├── integrations.md
│   ├── architecture.md
│   └── development.md
├── src/
│   ├── server.ts                # transport resolver
│   ├── create-server.ts         # McpServer factory
│   ├── quranpedia-client.ts     # typed Quranpedia API client + config
│   ├── quranpedia-cache.ts      # TTL memory + optional disk cache
│   ├── stdio.ts                 # stdio transport
│   ├── http.ts                  # Streamable HTTP transport
│   ├── version.ts
│   └── tools/
│       ├── index.ts             # registerTools() — wires all 23 tools
│       ├── _shared.ts           # jsonOk / jsonError / quranpediaOk / annotations
│       ├── get-ayah-book-content.ts
│       ├── get-ayah-options.ts
│       ├── get-book.ts
│       ├── get-categories.ts
│       ├── get-category-items.ts
│       ├── get-fatwa.ts
│       ├── get-mushaf.ts
│       ├── get-mushaf-ayah.ts
│       ├── get-mushaf-surah.ts
│       ├── get-mushafs.ts
│       ├── get-note.ts
│       ├── get-reciters.ts
│       ├── get-related-books.ts
│       ├── get-surah-books.ts
│       ├── get-surah-fatwas.ts
│       ├── get-surah-information.ts
│       ├── get-surah-tafsirs.ts
│       ├── get-topics.ts
│       ├── get-translation.ts
│       ├── get-translation-available-languages.ts
│       ├── get-translation-books.ts
│       ├── get-translation-by-book.ts
│       └── search.ts
├── scripts/
│   ├── test.js                  # stdio end-to-end
│   ├── test-http.js             # HTTP end-to-end
│   └── check-submission.js      # ChatGPT submission linter
├── Dockerfile
├── docker-compose.yml
├── server.json                  # MCP registry manifest (npm stdio + remote HTTP)
├── mcp.json                     # client config pointing at mcp.quran.us.kg
└── smithery.yaml                # Smithery stdio manifest
```
