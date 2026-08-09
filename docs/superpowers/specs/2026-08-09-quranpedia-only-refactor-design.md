# Quranpedia-Only Refactor — Design Spec

**Date:** 2026-08-09
**Status:** Approved (pending spec review)
**Version:** `quranpedia-mcp` 1.0.0 → **2.0.0** (breaking)

## 1. Summary

Remove the `quran-search-engine` dependency and its 8 dataset-backed tools from
`quranpedia-mcp`. Rebuild the entire tool surface to be 100% backed by the
Quranpedia API (`https://api.quranpedia.net/v1`), with every tool named to
mirror the API route it calls. Net result: **23 read-only tools**, all
annotated `openWorldHint: true`.

This is a breaking major release: 8 tools are removed, 5 are renamed, and 18
are added.

## 2. Motivation

The user wants a single source of truth — the Quranpedia API — and no bundled
dataset dependency. `quran-search-engine` bundles the Quran text, morphology,
and lemma/root inverted indexes (~20 MB). Removing it:

- Eliminates the ~20 MB bundled-data dependency.
- Makes the server purely API-driven (network required for all tools).
- Removes features with no Quranpedia equivalent: full-text Quran search,
  root search, lemma search, and morphology.

## 3. Tool surface (23 tools, all `openWorldHint: true`)

### Removed (8)
`search`, `list_surahs`, `get_sura_info`, `get_verse`, `get_verses_by_range`,
`find_verses_by_root`, `find_verses_by_lemma`, `get_verse_morphology`.

### Final 23-tool surface, alphabetical (stable `tools/list` order)

| # | Tool | API route |
| --- | --- | --- |
| 1 | `get_ayah_book_content` | `GET /ayah/{surah_id}/{ayah_number}/book/{book_id}` |
| 2 | `get_ayah_options` | `GET /ayah/{surah_id}/{ayah_number}/options` |
| 3 | `get_book` | `GET /book/{book_id}` |
| 4 | `get_categories` | `GET /categories/{type?}` |
| 5 | `get_category_items` | `GET /category/{category_id}/{type}` |
| 6 | `get_fatwa` | `GET /fatwa/{fatwa_id}` |
| 7 | `get_mushaf` | `GET /mushafs/{id}` |
| 8 | `get_mushaf_ayah` | `GET /mushafs/{mushaf_id}/{surah_id}/{ayah_number}` |
| 9 | `get_mushaf_surah` | `GET /mushafs/{mushaf_id}/{surah_id}` |
| 10 | `get_mushafs` | `GET /mushafs` |
| 11 | `get_note` | `GET /note/{note_id}` |
| 12 | `get_reciters` | `GET /reciters` |
| 13 | `get_related_books` | `GET /related-books/{book_id}` |
| 14 | `get_surah_books` | `GET /surah/books/{surah_id}` |
| 15 | `get_surah_fatwas` | `GET /surah/fatwas/{surah_id}` |
| 16 | `get_surah_information` | `GET /surah/information/{surah_id}` |
| 17 | `get_surah_tafsirs` | `GET /surah/tafsirs/{surah_id}` |
| 18 | `get_topics` | `GET /topics` |
| 19 | `get_translation` | `GET /translations/{surah_id}/{ayah_number}/{language?}` |
| 20 | `get_translation_available_languages` | `GET /translations/available-languages/{surah_id}/{ayah_number}` |
| 21 | `get_translation_books` | `GET /translation-books/{language_code?}` |
| 22 | `get_translation_by_book` | `GET /translation/{book_id}/{surah_id}/{ayah_number?}` |
| 23 | `search` | `GET /search/{query}/{type?}` |

### Renamed from existing tools (5)
| Old name | New name |
| --- | --- |
| `get_ayah_content_options` | `get_ayah_options` |
| `get_tafsir` | `get_ayah_book_content` |
| `get_translation` | `get_translation` (unchanged) |
| `get_surah_background` | `get_surah_information` |
| `search_quranpedia` | `search` |

## 4. Code changes

### Deleted
- `src/data.ts` (dataset loader + `gidOffsetTable`)
- `src/tools/_shared.ts` dataset helpers: `getDatasetOrError`, `resolveGid`,
  `READ_ONLY_ANNOTATIONS`
- 8 removed tool files: `search.ts`, `list-surahs.ts`, `get-sura-info.ts`,
  `get-verse.ts`, `get-verses-by-range.ts`, `find-verses-by-root.ts`,
  `find-verses-by-lemma.ts`, `get-verse-morphology.ts`

### Rewritten / extended
- `src/quranpedia-client.ts` — add ~17 typed endpoint helpers for the new
  routes (`fetchMushafs`, `fetchMushaf`, `fetchMushafAyah`, `fetchMushafSurah`,
  `fetchSurahBooks`, `fetchSurahFatwas`, `fetchTranslationBooks`,
  `fetchAyahTranslationByBook`, `fetchTranslationAvailableLanguages`,
  `fetchBook`, `fetchRelatedBooks`, `fetchFatwa`, `fetchNote`, `fetchTopics`,
  `fetchReciters`, `fetchCategories`, `fetchCategoryItems`). The existing
  helpers (`fetchAyahOptions`, `fetchAyahBook`, `fetchSurahTafsirs`,
  `fetchTranslation`, `fetchSurahInformation`, `searchQuranpedia`) are
  retained. All helpers route through `quranpediaRequest()` (shared TTL cache
  + source URL attribution). Env config block (`QP_*`) unchanged.
- **Input arguments mirror the API parameter names** (`surah_id`,
  `ayah_number`, `mushaf_id`, `book_id`, `language` / `language_code`, `query`,
  `type`, `note_id`, `fatwa_id`, `category_id`, …) so the MCP surface reads
  like the API itself.
- `get_ayah_book_content` retains the old `get_tafsir` fallback: on a 404 from
  `/ayah/{surah}/{ayah}/book/{book_id}`, return `{ content: null }` plus the
  available tafsir books via `GET /surah/tafsirs/{surah_id}`.
- `src/tools/_shared.ts` — keep `jsonOk`, `jsonError`, `handleCaughtError`,
  `EXTERNAL_READ_ONLY_ANNOTATIONS`, `quranpediaOk`, `isQuranpediaNotFound`,
  `quranpediaErrorResponse`. Remove dataset-only helpers.
- `src/tools/index.ts` — register 23 tools in alphabetical order.
- 18 new tool files (one per tool, naming mirrors route, see §3).
- 5 existing tool files renamed and updated (input schemas follow the API
  params).

### Untouched
`src/server.ts`, `src/stdio.ts`, `src/http.ts`, `src/create-server.ts`,
`src/version.ts`, `src/quranpedia-cache.ts`. HTTP hardening, transports,
healthcheck, cache — all stay.

## 5. Package / metadata changes

- `package.json`: remove `quran-search-engine` from `dependencies`; bump
  `version` to `2.0.0`; update `description` and `keywords` (drop
  "search", "tafsir" stays; reflect encyclopedia + mushaf + translations);
  keep `bin`, `files`, `packageManager`.
- `server.json`: version → `2.0.0`, update `description`.
- `CHANGELOG.md`: add `[2.0.0]` entry (removals, renames, additions).
- `yarn.lock`: regenerated via `yarn install` (drops the engine).
- `dist/`: rebuilt (`yarn build`); committed.

## 6. Config / infra — unchanged
- All env vars stay: `TRANSPORT`, `PORT`, `HOST`, `MCP_ALLOWED_HOSTS`,
  `MCP_SESSION_TTL_MS`, `MCP_MAX_SESSIONS`, `MCP_MAX_BODY_BYTES`,
  `MCP_RATE_LIMIT_PER_MINUTE`, `QP_BASE_URL`, `QP_DEFAULT_TAFSIR_BOOK_ID`,
  `QP_FETCH_TIMEOUT_MS`, `QP_CACHE_TTL_MS`, `QP_CACHE_DIR`,
  `QP_CACHE_MAX_ENTRIES`.
- `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `smithery.yaml`,
  `mcp.json`, `.env.example` — unchanged.
- The `QP_DEFAULT_TAFSIR_BOOK_ID` default now only drives `get_ayah_book_content`
  when `book_id` is omitted.

## 7. Testing

Rewrite `scripts/test.js` and `scripts/test-http.js`:
- `REQUIRED_TOOLS` = the 23 names from §3.
- All tools assert `readOnlyHint: true`, `destructiveHint: false`,
  `idempotentHint: true`, **`openWorldHint: true`** (no more
  `EXTERNAL_TOOLS` split — every tool is external now).
- Happy-path call per tool against the live API; negative cases: 404 →
  `null`-style payload or `isError`, schema validation errors → `isError`.
- `get_mushaf` and `get_surah_*` responses can be large — assert shape, not size.

Update `scripts/check-submission.js`: same tool list; every tool's
`openWorldHint` must be `true`; description ≤ 299 chars; no
MUST/ALWAYS/NEVER/REQUIRED/SHALL.

## 8. Docs

- `README.md`: replace "13 tools / 8 offline" narrative; tool count → 23;
  remove the offline-dataset feature bullet; Requirements note: network
  access to `api.quranpedia.net` required for **all** tools; update feature
  list and tool links.
- `docs/index.md`: tool table → 23 route-mirroring tools; remove dataset-vs-Quranpedia split.
- `docs/tools.md`: full rewrite — 23 tool sections (schema, output, example, annotations).
- `docs/architecture.md`: remove "Dataset loading" and "Quranpedia client" env table stays; update the overview diagrams; all tools are API-backed.
- `docs/development.md`: update "add a new tool" recipe (no dataset helpers), test description (all tools external), repo layout (remove `data.ts`, 8 tool files).
- `docs/integrations.md`: minor — remove any "8 offline tools" wording.
- `CONTRIBUTING.md`: 13 → 23 tools; remove offline claims.
- `PRESENTATION.md` + `artifacts/PRESENTATION.md`: update §3 tool tables, §1 structure, §6 env audit note (still accurate), remove the "8 offline dataset tools" clarification box, add v2.0.0/removal notes, re-export to `artifacts/`.

## 9. Out of scope
- `get_verses_by_range` is **not** reintroduced (no matching API route; the
  user asked to respect the route structure). Users use `get_mushaf_ayah` or
  `get_mushaf_surah`.
- No new env vars. No infra changes. No CI workflows.

## 10. Risks / notes
- **Breaking change**: 8 tools removed, 5 renamed → clients must update.
  Mitigated by v2.0.0 bump + CHANGELOG + docs.
- **Network dependency**: all 23 tools require `api.quranpedia.net`. The
  existing TTL cache (memory + optional `QP_CACHE_DIR` disk layer) mitigates
  availability, and `get_surah_information`/translations/tafsir are static text.
- **Large payloads**: `get_mushaf` (full mushaf tree) and `get_mushaf_surah`
  return large responses — acceptable, documented in `docs/tools.md`.
