# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `QP_CACHE_MAX_DISK_ENTRIES` (default `5000`): caps the on-disk cache layer.
  Expired files are pruned and, when the count still exceeds the cap, the
  oldest files are evicted (throttled to once per minute), so a long-running
  server's `QP_CACHE_DIR` can no longer grow unboundedly.

## [2.0.0] - 2026-08-09

### Changed

- Every tool is now backed by the Quranpedia API, named after its route, and
  annotated `openWorldHint: true` (23 tools total).
- Renamed to mirror routes: `get_ayah_content_options` → `get_ayah_options`,
  `get_tafsir` → `get_ayah_book_content`,
  `get_surah_background` → `get_surah_information`,
  `search_quranpedia` → `search`.

### Added

- 18 new route tools: mushaf, surah, translation, library, and index lookups.

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
  Streamable HTTP endpoint `https://mcp.quranpedia.net/`; `.env.example` documents
  the `QP_*` variables.

### Changed

- (package name, `McpServer` name, npm bin `quranpedia-mcp`, `server.json`,
  `smithery.yaml`). Repository moved to
  <https://github.com/quranpedia/quranpedia-mcp>.
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
