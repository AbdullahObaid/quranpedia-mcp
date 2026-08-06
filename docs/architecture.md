# Architecture

This page explains how `quranpedia-mcp` is wired together internally.
For client-facing docs (tools, integrations, deployment), see the other pages
under `docs/`.

## High-level overview

```
                ┌──────────────────────────────┐
                │   quran-search-engine (npm)  │
                │   ─ loadQuranData            │
                │   ─ loadMorphology           │
                │   ─ loadWordMap              │
                │   ─ buildInvertedIndex       │
                │   ─ search / normalizeArabic │
                └──────────────┬───────────────┘
                               │
                               ▼
                     ┌──────────────────┐
                     │   src/data.ts    │
                     │  QuranDataset    │ ← gidOffsetTable (suraId → starting gid)
                     │  memoized load   │
                     └────────┬─────────┘
                              │
                              ▼
        ┌────────────────────────────────────────────┐
        │           src/create-server.ts             │
        │  new McpServer({ name, version }) +        │
        │  registerTools(server)                     │
        └────────┬──────────────────────┬────────────┘
                 │                      │
                 ▼                      ▼
   ┌────────────────────┐   ┌──────────────────────┐
   │   src/stdio.ts     │   │     src/http.ts      │
   │  StdioServerTrans… │   │  StreamableHTTP…     │
   │                    │   │  + hardening         │
   └────────────────────┘   └──────────────────────┘
```

The five Quranpedia-backed tools reach the external API through a shared
typed client:

```
   src/tools/get-tafsir.ts      ──┐
   src/tools/get-translation.ts  ─┤
   src/tools/get-ayah-content-options.ts ─┼──>  src/quranpedia-client.ts  ──>  api.quranpedia.net
   src/tools/get-surah-background.ts ──┤         (typed endpoints)          (HTTPS /v1)
   src/tools/search-quranpedia.ts ─┘         ▲
                                             │ cache
                                   src/quranpedia-cache.ts
                                   (memory + optional QP_CACHE_DIR disk layer)
```

## Transport selection

`src/server.ts` picks the transport at startup, in this order of precedence:

1. CLI flags `--http` / `--stdio`
2. CLI flag `--transport=http|stdio`
3. Environment variable `TRANSPORT` (default `stdio`)

Then it dispatches to either `runStdio()` or `runHttp(opts)`. Both call
`createServer()` from `create-server.ts`, which:

1. Constructs a fresh `McpServer({ name: 'quranpedia-mcp', version: VERSION })`.
2. Calls `registerTools(server)`, which registers all 13 tools in alphabetical
   order for a stable `tools/list` output.

Because both transports share the same `createServer()` + `registerTools()` path,
the advertised tool surface is identical regardless of transport.

## Quranpedia client and cache

`src/quranpedia-client.ts` is a thin, typed wrapper around the Quranpedia API
(`https://api.quranpedia.net/v1`). It centralizes:

- **Config** — base URL and defaults, all env-tunable (see table below).
- **Error normalization** — Quranpedia's `{ error: "…" }` bodies (400/404) are
  thrown as `QuranpediaError` instances carrying the HTTP `status` and `url`.
  Handlers branch on status: a 404 means "genuinely missing" (→ `null` payload),
  anything else becomes an `isError` response.
- **Typed endpoint helpers** — `fetchAyahOptions`, `fetchAyahBook`,
  `fetchSurahTafsirs`, `fetchTranslation`, `fetchSurahInformation`,
  `searchQuranpedia`, each returning `{ url, data }` for attribution.

Every request flows through `src/quranpedia-cache.ts` (`getOrSet`):

| Layer | When used | Notes |
| --- | --- | --- |
| In-memory `Map` | always | Shared across HTTP sessions; capped at `QP_CACHE_MAX_ENTRIES` (oldest evicted first). |
| On-disk (`QP_CACHE_DIR`) | when set | SHA-1-keyed JSON files that survive restarts, so a long-running server keeps serving cached ayahs even if the upstream is down. Point it at a mounted volume (e.g. rclone/FUSE Garage S3) for durable caching. |

Concurrent callers with the same key share one in-flight fetch (a `pending`
map), so popular ayahs never hammer the upstream in parallel.

### Quranpedia environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `QP_BASE_URL` | `https://api.quranpedia.net/v1` | Upstream base URL. |
| `QP_DEFAULT_TAFSIR_BOOK_ID` | `1` | Book used by `get_tafsir` when `book_id` is omitted (تيسير التفسير). |
| `QP_FETCH_TIMEOUT_MS` | `30000` | Per-request upstream timeout. |
| `QP_CACHE_TTL_MS` | `2592000000` (30 d) | Cache entry lifetime; Quranic text is static. |
| `QP_CACHE_DIR` | _(unset)_ | Optional persistent cache directory. |
| `QP_CACHE_MAX_ENTRIES` | `5000` | In-memory cache cap. |

`/health` reports `quranpediaCache: { memoryEntries, diskEntries, hits, misses }`
alongside the existing `status` / `dataLoaded` / `version` / `sessions` fields.

## Dataset loading

`src/data.ts` exposes a single memoized `QuranDataset` and three helpers:

- `ensureDataLoaded(): Promise<QuranDataset>` — idempotent; concurrent callers
  share one in-flight promise.
- `isDataLoaded(): boolean` — synchronous check.
- `getDataset(): QuranDataset` — throws if the dataset has not finished loading.

`QuranDataset` carries four maps plus one precomputed lookup:

| Field | Type | Built from |
| --- | --- | --- |
| `quranData` | `Map<number, QuranText>` | `loadQuranData()` |
| `morphologyMap` | `Map<number, MorphologyAya>` | `loadMorphology()` |
| `wordMap` | `WordMap` | `loadWordMap()` |
| `invertedIndex` | `InvertedIndex` | `buildInvertedIndex(morphologyMap, quranData)` |
| `gidOffsetTable` | `Map<number, number>` | single pass over `quranData.values()` |

`gidOffsetTable` maps `suraId (1–114) → gid of the first verse in that sura`.
`get_verse` and `get_verse_morphology` use it to resolve `(suraId, ayaId)` to
`gid` in O(1) without iterating the verse map.

## HTTP transport

`src/http.ts` implements a hardened Streamable HTTP transport on top of
Node's built-in `http.createServer`. The same `McpServer` factory is used,
but each session gets its own `StreamableHTTPServerTransport` with a UUID
session id. Sessions are tracked in a `Map<sessionId, Session>`.

### Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/` | Initialize new sessions and send JSON-RPC requests |
| `GET` | `/` | Server-sent events for streaming responses |
| `DELETE` | `/` | Close a session |
| `GET` | `/health` | `{"status":"ok","dataLoaded":bool,"version":"…","sessions":N,"quranpediaCache":{…}}` |
| `OPTIONS` | `*` | CORS preflight |

### Hardening

| Control | Variable | Default | Notes |
| --- | --- | --- | --- |
| Host allow-list | `MCP_ALLOWED_HOSTS` | _(unset)_ | Comma-separated `Host` header values. Unset = allow all. |
| Request body cap | `MCP_MAX_BODY_BYTES` | `1048576` | 1 MiB. |
| Per-IP rate limit | `MCP_RATE_LIMIT_PER_MINUTE` | `60` | Token bucket, 60-second window. |
| Session TTL | `MCP_SESSION_TTL_MS` | `300000` | 5 minutes. Reaper runs every 60 s. |
| Max sessions | `MCP_MAX_SESSIONS` | `500` | Returns 503 when exceeded. |
| CORS | _baked in_ | `*` | Open CORS for browser-based clients. |

`uncaughtException` and `unhandledRejection` are logged to stderr but not
crashing the process. Graceful shutdown on `SIGTERM` / `SIGINT` with a 10-second
hard-exit timer.

## stdio transport

`src/stdio.ts` connects a single `McpServer` to `StdioServerTransport`. The
server is `connect()`-ed immediately (so clients can `initialize` and
`tools/list` before the dataset is ready) and the dataset loads in the
background. The dataset readiness is reported via `isDataLoaded()` from
inside each tool handler.

## Docker

`Dockerfile` is a two-stage build:

- **Build stage** (`node:22-alpine`): `yarn install --frozen-lockfile`,
  copies `tsconfig.json` and `src/`, runs `yarn build`.
- **Runtime stage** (`node:22-alpine`): installs production deps only, copies
  the compiled `dist/`, runs as the unprivileged `node` user.

Default env: `TRANSPORT=http HOST=0.0.0.0 PORT=4000`. A `HEALTHCHECK` hits
`http://127.0.0.1:${PORT}/health` every 30 seconds (15 s start period,
3 retries).

`docker-compose.yml` adds a `mem_limit: 256m`, binds `127.0.0.1:${PORT:-9000}:${PORT:-9000}`,
and reads the same env file (typically `.env`).

## Cloudflare proxy

The publicly hosted endpoint at `https://mcp.quran.us.kg/` is fronted by
Cloudflare. The container runs behind Cloudflare's edge; the
`Host`-header allow-list in `MCP_ALLOWED_HOSTS` is set to `mcp.quran.us.kg`
in the `.env` so requests from any other hostname are rejected at the
application layer. The `Dockerfile` healthcheck still works because it
connects to `127.0.0.1:${PORT}` directly.
