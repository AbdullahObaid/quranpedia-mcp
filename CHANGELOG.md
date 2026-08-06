# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-08-06

### Added

- **Five Quranpedia-backed MCP tools** that read from the external
  [Quranpedia API](https://api.quranpedia.net/v1), annotated
  `openWorldHint: true` (all other tools keep `openWorldHint: false`):
  - `get_ayah_content_options` — list the Quranpedia content available for one ayah (tafsir, e3rab, asbab, translations, meanings, and more).
  - `get_tafsir` — exegesis content for one ayah from a tafsir book (default: Taysir al-Tafsir by Ibrahim al-Qattan); falls back to the surah's available tafsir books when the book has no content.
  - `get_translation` — translations of one ayah in one language, or grouped by all available languages.
  - `get_surah_background` — scholarly surah background (introduction, revelation type, descent order, virtues, topics, purposes), distinct from the structural `get_sura_info`.
  - `search_quranpedia` — keyword search across the encyclopedia (books, fatwas, notes, topics).
- `src/quranpedia-client.ts` — typed Quranpedia client with env-tunable config
  (`QP_BASE_URL`, `QP_DEFAULT_TAFSIR_BOOK_ID`, `QP_FETCH_TIMEOUT_MS`,
  `QP_CACHE_TTL_MS`, `QP_CACHE_DIR`, `QP_CACHE_MAX_ENTRIES`), normalized
  `QuranpediaError` (status + url) for 404-vs-failure branching, and typed
  endpoint helpers returning `{ url, data }` for attribution.
- `src/quranpedia-cache.ts` — TTL cache (default 30 days) with an in-memory
  layer and an optional on-disk layer (`QP_CACHE_DIR`), plus in-flight
  de-duplication so concurrent callers share one upstream fetch.
- Every Quranpedia response carries a `source: { provider: 'quranpedia', url }`
  block for attribution. Missing resources (e.g. a non-existent ayah) return
  `null` — not an error.
- `GET /health` now reports `quranpediaCache: { memoryEntries, diskEntries, hits, misses }`.
- `server.json` `remotes` entry and `mcp.json` documenting the public
  Streamable HTTP endpoint `https://mcp.quran.us.kg/`; `.env.example` documents
  the `QP_*` variables.

### Changed

- Server renamed from `quran-search-engine-mcp` to **`quranpedia-mcp`**
  (package name, `McpServer` name, npm bin `quranpedia-mcp`, `server.json`,
  `smithery.yaml`). Repository moved to
  <https://github.com/adelpro/quranpedia-mcp>.
- Version bumped to `1.0.0` (check-versions parity across `package.json` and
  `server.json` maintained).
- `scripts/test.js` and `scripts/test-http.js` now assert all 13 tools and the
  `openWorldHint: true` annotation on the five Quranpedia tools, and exercise
  the Quranpedia tools against the live API (happy paths + missing-resource
  nulls + schema validation errors).
- `scripts/check-submission.js` annotation check now expects `openWorldHint:
  true` for the Quranpedia tools.
- Docs (`README.md`, `docs/*`) updated for the 13-tool surface, the Quranpedia
  client/cache architecture, and the `QP_*` environment variables.

## [0.5.0] - 2026-07-31

### Added

- **Seven new MCP tools** alongside the existing `search`, all read-only with
  full annotations (`readOnlyHint: true`, `destructiveHint: false`,
  `openWorldHint: false`, `idempotentHint: true`):
  - `list_surahs` — return all 114 surahs with names, verse count, juz list, and Mushaf page range.
  - `get_sura_info` — look up one surah by id, Arabic name, English name, or romanization.
  - `get_verse` — fetch one verse by global id or `(suraId, ayaId)`.
  - `get_verses_by_range` — fetch verses by Quran range syntax (`"2:255"`, `"1:1-7"`, `"2:"`).
  - `find_verses_by_root` — find verses by normalized Arabic root via the inverted index.
  - `find_verses_by_lemma` — find verses by normalized lemma via the inverted index.
  - `get_verse_morphology` — lemmas and roots for a single verse.
- `QuranDataset.gidOffsetTable` — precomputed `suraId → first gid` lookup built
  once at load time, making `(suraId, ayaId) → gid` resolution O(1).
- `scripts/check-submission.js` — pre-submission linter that verifies the
  public HTTPS endpoint, tool description lengths, forbidden-word policy, and
  full annotation coverage. Wired as `yarn check:submission`.
- `docs/` folder with five sub-pages: `index.md` (landing), `tools.md` (full
  reference), `integrations.md` (Claude / ChatGPT / Cursor / VS Code / others),
  `architecture.md` (internals), `development.md` (build / test / add-a-tool).
- Public deployment documented at <https://mcp.quran.us.kg/>.

### Changed

- Refactored `src/tools.ts` (single `search` tool) into a `src/tools/`
  directory with one file per tool, sharing helpers in `src/tools/_shared.ts`.
  `registerTools(server)` is the same public surface; both stdio and HTTP
  transports keep calling it through `createServer()`.
- `search` tool now declares the same annotation block as the new tools
  (no behavior change).
- HTTP endpoint path simplified from `/mcp` to `/`; the test script updated
  to match.
- README rewritten as a short landing page; the per-tool reference, transport
  details, and integration snippets moved to `docs/`.

## [Unreleased]

### Added

- MCP stdio server implementation using the official SDK and zod schemas.
- Stdio-based test script that validates tool registration and search output.
- MIT license and contribution guidelines.
- GitHub issue and pull request templates.
- **HTTP transport** alongside stdio. Run with `TRANSPORT=http` (or `--http`)
  to expose the same MCP `search` tool over the Streamable HTTP transport at
  `POST/GET/DELETE /mcp`, with a `GET /health` endpoint. Configurable via
  `PORT`, `HOST`, `MCP_ALLOWED_HOSTS`, `MCP_SESSION_TTL_MS`,
  `MCP_MAX_SESSIONS`, `MCP_MAX_BODY_BYTES`, and `MCP_RATE_LIMIT_PER_MINUTE`.
- HTTP-based test script (`scripts/test-http.js`) that round-trips a
  `search` call and validates session lifecycle, 400 on missing-session
  POSTs, and session-count drop after close.
- Multi-stage `Dockerfile` (Node 22 Alpine, non-root user, `/health`
  healthcheck, source-map strip) and `docker-compose.yml` that runs the
  server in HTTP mode on `127.0.0.1:4000`.

### Changed

- Replaced the Express HTTP server with MCP stdio tooling.
- Updated package metadata (author email, repository, keywords, license).
- Upgraded `quran-search-engine` from 0.1.5 to 0.3.2. Internal API now uses
  `SearchContext`, `buildInvertedIndex`, and the new `search()` signature;
  the MCP `search` tool's input and output shapes are unchanged.
- README rewritten to document both transports and configuration snippets
  for Claude Desktop, ChatGPT Connectors, Cursor, VS Code Copilot, MCP
  Inspector, and Smithery.

## [0.1.0] - 2026-01-20

### Added

- Initial release of the Quran Search Engine MCP server.
- Express.js server setup with CORS and JSON parsing.
- `/search` POST endpoint supporting:
  - Arabic query normalization.
  - Lemma and Root based search options.
  - Pagination (page and limit).
  - Search term highlighting in results.
- `/health` GET endpoint for service status checks.
- Integration with `quran-search-engine` for core search logic.
- Automatic data loading (Quran text, morphology, word map) on server startup.
- TypeScript configuration and development scripts.
