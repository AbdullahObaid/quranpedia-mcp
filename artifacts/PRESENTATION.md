# Quranpedia MCP — Project Presentation

> A slide-style walkthrough of `quranpedia-mcp` v2.0.0 (MIT).
> An MCP server exposing **23 read-only tools**, all backed by the Quranpedia
> API (`https://api.quranpedia.net/v1`) — every tool named to mirror the API
> route it calls. No bundled dataset; network access required for all tools.

---

## 1. Principal files & folder structure

```
quranpedia-mcp/
├── README.md                # Landing page, badges, quick starts
├── CHANGELOG.md             # Keep-a-Changelog format, semver history
├── CONTRIBUTING.md          # Contribution guide
├── LICENSE                  # MIT (Copyright 2026 Quranpedia)
├── package.json             # Scripts, deps, bin, files, packageManager
├── yarn.lock                # Yarn 1 lockfile ("yarn lockfile v1")
├── tsconfig.json            # NodeNext, ES2022, strict
├── server.json              # MCP registry manifest (npm stdio + remote HTTP)
├── mcp.json                 # MCP client config → mcp.quranpedia.net
├── smithery.yaml            # Smithery.ai deploy/install manifest
├── Dockerfile               # 2-stage build
├── docker-compose.yml       # Local prod compose (env_file, 256m, healthcheck)
├── .env.example             # All 14 documented env vars
├── .gitignore               # node_modules, dist, .env
├── .dockerignore            # Slim build context
├── .prettierrc              # Prettier options
├── .yarnrc.yml              # Yarn Berry config — inert under Yarn 1
├── eslint.config.mjs        # ESLint 9 flat config
├── commitlint.config.cjs    # Conventional commits
├── .husky/                  # pre-commit (lint) + commit-msg (commitlint)
├── .github/                 # Issue templates + PR template (no CI workflows)
├── assets/                  # Screenshots
├── dist/                    # Compiled output (committed)
├── docs/                    # index / tools / integrations / architecture / development
├── scripts/                 # test.js, test-http.js, check-submission.js
└── src/
    ├── server.ts            # Transport resolver (CLI flag → TRANSPORT env → stdio)
    ├── create-server.ts     # McpServer factory (name + version + registerTools)
    ├── stdio.ts             # stdio transport
    ├── http.ts              # Streamable HTTP transport + hardening
    ├── quranpedia-client.ts # Typed Quranpedia API client + env config
    ├── quranpedia-cache.ts  # TTL cache: memory + optional disk layer
    ├── version.ts           # Reads version from package.json
    └── tools/               # 23 tools, one file each + index.ts + _shared.ts
```

---

## 2. v2.0.0 breaking change

v1.0.0 → v2.0.0 is a **breaking** release. The server no longer bundles an
offline Quran dataset; every tool now talks to `api.quranpedia.net`:

- **8 removed** — the offline dataset-backed tools (full-text search, surahs,
  verses, ranges, root search, lemma search, morphology) have no Quranpedia
  equivalent and are gone.
- **5 renamed** to mirror their API routes:

| Old name                   | New name                      |
| -------------------------- | ----------------------------- |
| `get_ayah_content_options` | `get_ayah_options`            |
| `get_tafsir`               | `get_ayah_book_content`       |
| `get_translation`          | `get_translation` (unchanged) |
| `get_surah_background`     | `get_surah_information`       |
| `search_quranpedia`        | `search`                      |

- **18 added** — mushaf, surah, translation, library, and index tools (§4).

Net surface: **23 read-only tools**, all `openWorldHint: true`, all backed by
`api.quranpedia.net`. No new environment variables; the existing 14 all still
apply (§7).

---

## 3. Protocols

| Layer            | Protocol / mechanism                                                                  |
| ---------------- | ------------------------------------------------------------------------------------- |
| MCP              | **Model Context Protocol** — stdio (local) and **Streamable HTTP** (remote, SSE)      |
| Wire format      | JSON-RPC 2.0 messages: `initialize`, `tools/list`, `tools/call`, etc.                 |
| MCP version      | `2024-11-05` (per docs; server advertises latest SDK-compatible)                      |
| HTTP surface     | `POST/GET/DELETE /` (MCP), `GET /health`, `OPTIONS *` (CORS preflight)                |
| Tool annotations | Anthropic hints: `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint` |

Transport selection precedence (src/server.ts):

1. CLI flag `--http` / `--stdio`
2. CLI flag `--transport=http|stdio`
3. Env var `TRANSPORT` (default `stdio`)

Both transports share the same `createServer()` path → identical tool surface.

---

## 4. Tools (23, all read-only)

Every tool is a thin typed wrapper over `https://api.quranpedia.net/v1`, named
after the route it calls, and annotated `openWorldHint: true`.

| #   | Tool                                  | API route                                                        |
| --- | ------------------------------------- | ---------------------------------------------------------------- |
| 1   | `get_ayah_book_content`               | `GET /ayah/{surah_id}/{ayah_number}/book/{book_id}`              |
| 2   | `get_ayah_options`                    | `GET /ayah/{surah_id}/{ayah_number}/options`                     |
| 3   | `get_book`                            | `GET /book/{book_id}`                                            |
| 4   | `get_categories`                      | `GET /categories/{type?}`                                        |
| 5   | `get_category_items`                  | `GET /category/{category_id}/{type}`                             |
| 6   | `get_fatwa`                           | `GET /fatwa/{fatwa_id}`                                          |
| 7   | `get_mushaf`                          | `GET /mushafs/{id}`                                              |
| 8   | `get_mushaf_ayah`                     | `GET /mushafs/{mushaf_id}/{surah_id}/{ayah_number}`              |
| 9   | `get_mushaf_surah`                    | `GET /mushafs/{mushaf_id}/{surah_id}`                            |
| 10  | `get_mushafs`                         | `GET /mushafs`                                                   |
| 11  | `get_note`                            | `GET /note/{note_id}`                                            |
| 12  | `get_reciters`                        | `GET /reciters`                                                  |
| 13  | `get_related_books`                   | `GET /related-books/{book_id}`                                   |
| 14  | `get_surah_books`                     | `GET /surah/books/{surah_id}`                                    |
| 15  | `get_surah_fatwas`                    | `GET /surah/fatwas/{surah_id}`                                   |
| 16  | `get_surah_information`               | `GET /surah/information/{surah_id}`                              |
| 17  | `get_surah_tafsirs`                   | `GET /surah/tafsirs/{surah_id}`                                  |
| 18  | `get_topics`                          | `GET /topics`                                                    |
| 19  | `get_translation`                     | `GET /translations/{surah_id}/{ayah_number}/{language?}`         |
| 20  | `get_translation_available_languages` | `GET /translations/available-languages/{surah_id}/{ayah_number}` |
| 21  | `get_translation_books`               | `GET /translation-books/{language_code?}`                        |
| 22  | `get_translation_by_book`             | `GET /translation/{book_id}/{surah_id}/{ayah_number?}`           |
| 23  | `search`                              | `GET /search/{query}/{type?}`                                    |

Conventions: success = `{content:[{type:"text",text:JSON}]}`; errors = `isError:true`;
genuinely missing resources return `null` (not an error). Every Quranpedia response
carries a `source: {provider, url}` block for attribution.

---

## 5. Docs

| File                   | Contents                                                                     |
| ---------------------- | ---------------------------------------------------------------------------- |
| `docs/index.md`        | Overview, public endpoint, tool table                                        |
| `docs/tools.md`        | Full reference: schema, response shapes, examples for every tool (623 lines) |
| `docs/integrations.md` | Claude Desktop/Web, ChatGPT, Cursor, VS Code, Smithery, Docker               |
| `docs/architecture.md` | Internals: transports, API client, HTTP hardening, Docker, env tables        |
| `docs/development.md`  | Build, test, lint, add a tool, deploy, release, repo layout                  |
| `README.md`            | Landing page + badges (npm, Smithery, license, engine)                       |
| `CHANGELOG.md`         | Keep-a-Changelog; 1.0.0 → 2.0.0 (Quranpedia-only history)                    |
| `CONTRIBUTING.md`      | Contribution workflow, commit/hook guidance                                  |

---

## 6. Package scripts & packages

### Scripts (package.json)

| Script                     | Command                                                    |
| -------------------------- | ---------------------------------------------------------- |
| `prebuild`                 | `rimraf dist`                                              |
| `build`                    | `tsc`                                                      |
| `start`                    | `node dist/server.js` (stdio)                              |
| `start:http`               | `cross-env TRANSPORT=http node dist/server.js`             |
| `dev`                      | `tsx src/server.ts` (stdio)                                |
| `dev:http`                 | `cross-env TRANSPORT=http tsx src/server.ts`               |
| `lint` / `lint:fix`        | ESLint over `src/**/*.{ts,tsx}` (+ `--fix`)                |
| `format`                   | Prettier write over `src/**/*.{ts,tsx,js,jsx,json,css,md}` |
| `test`                     | `yarn build && yarn test:stdio && yarn test:http`          |
| `test:stdio` / `test:http` | E2E against compiled server (spawns MCP client)            |
| `check:submission`         | ChatGPT developer-mode pre-submission linter               |
| `prepare`                  | `husky` (installs git hooks on `yarn install`)             |

### Dependencies (runtime, 2)

`@modelcontextprotocol/sdk` (MCP primitives) · `zod` (tool input schemas)

### DevDependencies

`typescript`, `tsx`, `rimraf`, `@types/node`, `cross-env`, `eslint` + `@eslint/js`, `typescript-eslint`,
`eslint-plugin-prettier`, `eslint-config-prettier`, `globals`, `prettier`, `husky`, `@commitlint/cli`,
`@commitlint/config-conventional`, and three **redundant** entries (see §7).

Also: `bin: quranpedia-mcp → dist/server.js` (npm package is runnable via `npx -y quranpedia-mcp`),
`files: [dist, CHANGELOG.md]`, `type: module`.

---

## 7. Environment variables — audit (no dead values)

All **14 vars documented in `.env.example` are used in code — unchanged in v2.0.0
(no new vars added, none removed)**. Table of what reads what:

| Variable                    | Default                 | Read by              | Purpose                               |
| --------------------------- | ----------------------- | -------------------- | ------------------------------------- |
| `TRANSPORT`                 | `stdio`                 | src/server.ts        | stdio vs http                         |
| `PORT`                      | `4000`                  | src/server.ts        | HTTP listen port                      |
| `HOST`                      | `0.0.0.0`               | src/server.ts        | HTTP bind host                        |
| `MCP_ALLOWED_HOSTS`         | unset (allow all)       | src/server.ts        | Host-header allow-list                |
| `MCP_SESSION_TTL_MS`        | `300000`                | src/server.ts        | Idle session TTL                      |
| `MCP_MAX_SESSIONS`          | `500`                   | src/server.ts        | Session cap (503)                     |
| `MCP_MAX_BODY_BYTES`        | `1048576`               | src/server.ts        | 1 MiB body cap                        |
| `MCP_RATE_LIMIT_PER_MINUTE` | `60`                    | src/server.ts        | Per-IP token bucket                   |
| `QP_BASE_URL`               | `api.quranpedia.net/v1` | quranpedia-client.ts | Upstream base URL                     |
| `QP_DEFAULT_TAFSIR_BOOK_ID` | `1`                     | quranpedia-client.ts | Default tafsir book                   |
| `QP_FETCH_TIMEOUT_MS`       | `30000`                 | quranpedia-client.ts | Upstream timeout                      |
| `QP_CACHE_TTL_MS`           | `2592000000` (30 d)     | quranpedia-client.ts | Cache lifetime                        |
| `QP_CACHE_DIR`              | unset (memory only)     | quranpedia-client.ts | Optional disk cache dir               |
| `QP_CACHE_MAX_ENTRIES`      | `5000`                  | quranpedia-client.ts | In-memory cap                         |
| `QP_CACHE_MAX_DISK_ENTRIES` | `5000`                  | quranpedia-client.ts | On-disk cap (prunes expired + oldest) |

### Findings (dead / stale values)

- ✅ **No unused env vars.** Every `.env.example` value maps to a live read.
- ⚠️ **`main: "index.js"`** in package.json → **no such file exists** (entry is
  `dist/server.js` via `bin`). Inert for an MCP server, but the field is stale/misleading.
- ⚠️ **Redundant devDeps**: `@eslint/eslintrc`, `@typescript-eslint/eslint-plugin`,
  `@typescript-eslint/parser` are declared but **never imported** — the flat config
  uses the `typescript-eslint` meta-package (which bundles plugin+parser). Safe to drop.
- ℹ️ `packageManager: "yarn@1.22.22"` is a Corepack field — ignored by Yarn 1 itself.

---

## 8. Husky · commitlint · ESLint · Prettier

### Husky (v9, installed via `prepare: husky`)

- `.husky/pre-commit` → `yarn lint`
- `.husky/commit-msg` → `yarn commitlint --edit "$1"`

### commitlint (`commitlint.config.cjs`)

- Extends `@commitlint/config-conventional`
- `type-enum` pinned to the 11 conventional types:
  `feat fix chore docs style refactor perf test build ci revert`

### ESLint 9 flat config (`eslint.config.mjs`)

- `ignores: ['dist/', 'node_modules/']`
- `eslint.recommended` + `typescript-eslint` recommended
- `prettier/prettier: error` (via `eslint-plugin-prettier`)
- Strict TS rules: `explicit-function-return-type`, `no-explicit-any`, `consistent-type-imports`
- `sort-imports` (case-insensitive, declaration-sort off)
- `eslint-config-prettier` appended **last** to disable conflicting style rules

### Prettier (`.prettierrc`)

`semi: true · singleQuote: true · printWidth: 100 · tabWidth: 2 · trailingComma: "all" · endOfLine: "auto"`

### Ignores

- No `.prettierignore` → Prettier still auto-skips `node_modules`; the `format` script
  is scoped to `src/**` anyway.
- No `.eslintignore` (flat config uses the `ignores` key).
- `.gitignore`: `node_modules`, `dist`, `.env`.

---

## 9. Yarn 1.22 + `.yarnrc.yml` — should you remove it?

**Short answer: yes, you can safely remove `.yarnrc.yml` — under Yarn 1.22 it does nothing.**

- `yarn.lock` starts with `# yarn lockfile v1` → the repo uses **Yarn Classic (1.x)**.
- Yarn 1 reads `.yarnrc` (INI format) — **it does not read `.yarnrc.yml`** (that is the
  **Yarn Berry / Yarn 2+** config file).
- Its only content, `nodeLinker: node-modules`, is Yarn 1's _default_ layout anyway —
  so even if it were read, it would change nothing.

| Option        | Result                                                                                                |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| **Remove it** | Zero behavior change under Yarn 1.22. Cleanest if you're staying on Yarn 1.                           |
| **Keep it**   | Harmless; only meaningful if you later migrate to Yarn Berry, or as a hint to Corepack/other tooling. |

Bonus: the `packageManager: "yarn@1.22.22"` field is read by **Corepack**, not by Yarn 1
(and modern Node/Corepack has effectively dropped Yarn-1 support), so treat it as informational.

---

## 10. Docker — multi-stage build, compose, ignore

### `.dockerignore` (why each line)

| Entry                                                    | Reason                                                               |
| -------------------------------------------------------- | -------------------------------------------------------------------- |
| `node_modules`, `dist`                                   | Rebuilt inside the image — don't ship host artifacts                 |
| `.git`, `.github`, `.husky`, `assets`, `scripts`, `*.md` | Not needed at build/runtime; smaller context                         |
| `.env*`                                                  | **Secrets never baked into the image** (config comes via `env_file`) |

### `Dockerfile` — two-stage build

```
Stage 1 (build)  node:22-alpine
   COPY package.json yarn.lock → yarn install --frozen-lockfile   # all deps
   COPY tsconfig.json src → yarn build                            # → dist/
Stage 2 (runtime) node:22-alpine
   ENV NODE_ENV=production TRANSPORT=http HOST=0.0.0.0 PORT=4000
   COPY package.json yarn.lock → yarn install --frozen-lockfile --production
   yarn cache clean                                              # slim image
   COPY --from=build /app/dist ./dist
   USER node                                                      # unprivileged
   EXPOSE 4000
   HEALTHCHECK (30s / 15s start / 3 retries) → GET /health        # via node fetch
   CMD ["node", "dist/server.js"]
```

Why two installs: stage 1 needs devDeps to compile; stage 2 installs **production
deps only** (no TS, eslint, husky…) → smaller, safer runtime image.

### `docker-compose.yml`

- `build: .` + `container_name: quranpedia-mcp`, `restart: unless-stopped`
- `env_file: .env` (PORT/HOST/all MCP*\*/QP*\* come from the host `.env`)
- Ports: `127.0.0.1:${PORT:-9000}:${PORT:-9000}` — **bound to loopback only** (not public)
- `mem_limit: 256m`
- Mirrored healthcheck using the same `${PORT:-9000}` interpolation

> ⚠️ **Gotcha:** compose defaults to port **9000**, but the Dockerfile `ENV PORT=4000`.
> With a `.env` copied from `.env.example` (`PORT=4000`) everything lines up; but running
> compose **without** a `.env` leaves the container on 4000 while compose maps + healthchecks
> 9000 → healthcheck fails. Keep `PORT` consistent in `.env`.

---

## 11. `smithery.yaml` — why it's in the repo

**Smithery** (smithery.ai) is a marketplace + hosting platform for MCP servers — the MCP
equivalent of "one-click install" (similar to Vercel for MCP). This manifest tells Smithery
how to launch the server:

```yaml
startCommand:
  type: stdio
  commandFunction: (_config) => ({
    command: "npx",
    args: ["-y", "quranpedia-mcp"]   # install from npm, run over stdio
  })
configSchema:
  type: object
  properties: {}                      # no user-configurable options
```

- Allows users to add `quranpedia-mcp` to any MCP client through Smithery's registry UI.
- The `npx -y quranpedia-mcp` command mirrors the README's local stdio quick start.
- Backed by the npm package (`bin: dist/server.js`); the badge in README links to it.
- Empty `configSchema` = server takes no parameters; Smithery just spawns the command.

---

## 12. License

- **MIT License**, `LICENSE` file, **Copyright (c) 2026 Quranpedia**.
- Mirrored in `package.json` → `"license": "MIT"` and the README license badge.
- Permissive: anyone may use/copy/modify/publish/distribute/sublicense/sell, with the
  copyright + permission notice kept; software provided "AS IS", no warranty,
  no liability for authors/holders.

---

## Appendix — interesting facts & quick references

- Public endpoint: **https://mcp.quranpedia.net/** (Cloudflare-fronted, no auth, open CORS).
  Health: `/health` → `{status, version, sessions, quranpediaCache}`.
- `server.json` is the **MCP registry manifest** (npm stdio package + remote HTTP);
  `mcp.json` is the ready-made **client config** pointing at the public URL.
- No `.github/workflows` → **no CI pipeline**; quality gates are local (husky lint +
  commitlint, `yarn test`, `yarn check:submission`).
- `scripts/check-submission.js` lints the live endpoint + tool list against the ChatGPT
  developer-mode submission rules (HTTPS 200, descriptions ≤ 299 chars, no
  MUST/ALWAYS/NEVER/REQUIRED/SHALL, all 4 annotations present).
- `dist/` is committed → `npx quranpedia-mcp` and Smithery work straight from npm
  without a build step.
