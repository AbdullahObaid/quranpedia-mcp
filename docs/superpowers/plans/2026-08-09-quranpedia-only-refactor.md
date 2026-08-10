# Quranpedia-Only Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove `quran-search-engine` and its 8 dataset tools; rebuild all 23 tools on the Quranpedia API, named after their API routes, and bump to v2.0.0.

**Architecture:** All tools become thin typed wrappers over `https://api.quranpedia.net/v1` routed through the existing `quranpediaRequest()` TTL cache + `source` attribution. `src/quranpedia-client.ts` gains ~17 typed endpoint helpers; `src/data.ts` and the 8 dataset tool files are deleted; `src/tools/_shared.ts` keeps only external-service helpers. Every tool is annotated `openWorldHint: true`.

**Tech Stack:** TypeScript 5 (NodeNext/ESM), `@modelcontextprotocol/sdk`, `zod`, Node 22. Yarn 1.22. No `quran-search-engine` after this plan.

## Global Constraints

- Tool names MUST match the table in §3 of the design spec (route-mirroring, snake_case).
- Every tool: `annotations: EXTERNAL_READ_ONLY_ANNOTATIONS` (`readOnlyHint:true, destructiveHint:false, idempotentHint:true, openWorldHint:true`).
- Input argument names mirror API params: `mushaf_id`, `surah_id`, `ayah_number`, `book_id`, `language`/`language_code`, `query`, `type`, `note_id`, `fatwa_id`, `category_id`.
- Tool descriptions ≤ 299 chars; no words MUST/ALWAYS/NEVER/REQUIRED/SHALL.
- `src/tools/index.ts` registers tools in ALPHABETICAL order (stable `tools/list`).
- Responses use `jsonOk`/`quranpediaOk`/`quranpediaErrorResponse` from `_shared.ts`.
- All env vars, Docker, compose, smithery, mcp.json stay unchanged.
- Target: package version `2.0.0`, all tests pass, lint passes, docs updated.

---

### Task 1: Extend `src/quranpedia-client.ts` with all endpoint helpers

**Files:**
- Modify: `src/quranpedia-client.ts`

**Interfaces:**
- Consumes: existing `quranpediaRequest<T>(cacheKey, path)`, `QuranpediaResult<T>`, `QuranpediaSearchType`.
- Produces: `fetchMushafs()`, `fetchMushaf(id)`, `fetchMushafAyah(mushafId, surahId, ayahNumber)`, `fetchMushafSurah(mushafId, surahId)`, `fetchSurahBooks(surahId)`, `fetchSurahFatwas(surahId)`, `fetchTranslationBooks(language?)`, `fetchAyahTranslationByBook(bookId, surahId, ayahNumber?)`, `fetchTranslationAvailableLanguages(surahId, ayahNumber)`, `fetchBook(bookId)`, `fetchRelatedBooks(bookId)`, `fetchFatwa(fatwaId)`, `fetchNote(noteId)`, `fetchTopics()`, `fetchReciters()`, `fetchCategories(type?)`, `fetchCategoryItems(categoryId, type)` — each returns `Promise<QuranpediaResult<unknown>>`.

- [ ] **Step 1: Add the typed helpers**

Append to `src/quranpedia-client.ts` (below the existing endpoint helpers), following the exact `quranpediaRequest(cacheKey, path)` pattern already used by `fetchAyahOptions`:

```ts
export function fetchMushafs(): Promise<QuranpediaResult<unknown>> {
  return quranpediaRequest('mushafs', '/mushafs');
}
export function fetchMushaf(id: number): Promise<QuranpediaResult<unknown>> {
  return quranpediaRequest(`mushaf:${id}`, `/mushafs/${id}`);
}
export function fetchMushafAyah(
  mushafId: number, surahId: number, ayahNumber: number,
): Promise<QuranpediaResult<unknown>> {
  return quranpediaRequest(
    `mushaf-ayah:${mushafId}:${surahId}:${ayahNumber}`,
    `/mushafs/${mushafId}/${surahId}/${ayahNumber}`,
  );
}
export function fetchMushafSurah(
  mushafId: number, surahId: number,
): Promise<QuranpediaResult<unknown>> {
  return quranpediaRequest(`mushaf-surah:${mushafId}:${surahId}`, `/mushafs/${mushafId}/${surahId}`);
}
export function fetchSurahBooks(surahId: number): Promise<QuranpediaResult<unknown>> {
  return quranpediaRequest(`surah-books:${surahId}`, `/surah/books/${surahId}`);
}
export function fetchSurahFatwas(surahId: number): Promise<QuranpediaResult<unknown>> {
  return quranpediaRequest(`surah-fatwas:${surahId}`, `/surah/fatwas/${surahId}`);
}
export function fetchTranslationBooks(language?: string): Promise<QuranpediaResult<unknown>> {
  const suffix = language ? `/${language}` : '';
  return quranpediaRequest(`translation-books:${language ?? 'all'}`, `/translation-books${suffix}`);
}
export function fetchAyahTranslationByBook(
  bookId: number, surahId: number, ayahNumber?: number,
): Promise<QuranpediaResult<unknown>> {
  const suffix = ayahNumber !== undefined ? `/${ayahNumber}` : '';
  return quranpediaRequest(
    `translation-book:${bookId}:${surahId}:${ayahNumber ?? 'surah'}`,
    `/translation/${bookId}/${surahId}${suffix}`,
  );
}
export function fetchTranslationAvailableLanguages(
  surahId: number, ayahNumber: number,
): Promise<QuranpediaResult<unknown>> {
  return quranpediaRequest(
    `translation-languages:${surahId}:${ayahNumber}`,
    `/translations/available-languages/${surahId}/${ayahNumber}`,
  );
}
export function fetchBook(bookId: number): Promise<QuranpediaResult<unknown>> {
  return quranpediaRequest(`book:${bookId}`, `/book/${bookId}`);
}
export function fetchRelatedBooks(bookId: number): Promise<QuranpediaResult<unknown>> {
  return quranpediaRequest(`related-books:${bookId}`, `/related-books/${bookId}`);
}
export function fetchFatwa(fatwaId: number): Promise<QuranpediaResult<unknown>> {
  return quranpediaRequest(`fatwa:${fatwaId}`, `/fatwa/${fatwaId}`);
}
export function fetchNote(noteId: number): Promise<QuranpediaResult<unknown>> {
  return quranpediaRequest(`note:${noteId}`, `/note/${noteId}`);
}
export function fetchTopics(): Promise<QuranpediaResult<unknown>> {
  return quranpediaRequest('topics', '/topics');
}
export function fetchReciters(): Promise<QuranpediaResult<unknown>> {
  return quranpediaRequest('reciters', '/reciters');
}
export function fetchCategories(type?: QuranpediaSearchType): Promise<QuranpediaResult<unknown>> {
  const suffix = type ? `/${type}` : '';
  return quranpediaRequest(`categories:${type ?? 'all'}`, `/categories${suffix}`);
}
export function fetchCategoryItems(
  categoryId: number, type: QuranpediaSearchType,
): Promise<QuranpediaResult<unknown>> {
  return quranpediaRequest(`category:${categoryId}:${type}`, `/category/${categoryId}/${type}`);
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `yarn tsc --noEmit`
Expected: no new errors (the 8 old tool files still reference `quran-search-engine` — if they error, that is EXPECTED at this stage; the deleted-files task comes later).

- [ ] **Step 3: Commit**

```bash
git add src/quranpedia-client.ts
git commit -m "feat(client): add Quranpedia endpoint helpers for new tools"
```

---

### Task 2: Slim `src/tools/_shared.ts`

**Files:**
- Modify: `src/tools/_shared.ts`

**Interfaces:**
- Consumes: existing exports.
- Produces: keeps `jsonOk`, `jsonError`, `handleCaughtError`, `EXTERNAL_READ_ONLY_ANNOTATIONS`, `quranpediaOk`, `isQuranpediaNotFound`, `quranpediaErrorResponse`. Removes `getDatasetOrError`, `resolveGid`, `READ_ONLY_ANNOTATIONS`, and the `getDataset`/`isDataLoaded` imports.

- [ ] **Step 1: Remove dataset helpers**

Edit `src/tools/_shared.ts`:
- Delete the `import { getDataset, isDataLoaded, type QuranDataset } from '../data.js';` line.
- Delete `READ_ONLY_ANNOTATIONS` (lines with `readOnlyHint: true ... openWorldHint: false`).
- Delete `getDatasetOrError(...)`.
- Delete `resolveGid(...)` (and its `QuranDataset` type usage).
- Keep everything else unchanged.

- [ ] **Step 2: Verify type-check**

Run: `yarn tsc --noEmit`
Expected: errors ONLY from the old tool files / `data.ts` that still reference removed helpers — acceptable mid-refactor.

- [ ] **Step 3: Commit**

```bash
git add src/tools/_shared.ts
git commit -m "refactor(shared): remove dataset helpers, keep external-service helpers"
```

---

### Task 3: Rename + update the 5 existing tools

**Files:**
- Rename: `src/tools/get-ayah-content-options.ts` → `src/tools/get-ayah-options.ts`; `src/tools/get-tafsir.ts` → `src/tools/get-ayah-book-content.ts`; `src/tools/get-surah-background.ts` → `src/tools/get-surah-information.ts`; `src/tools/search-quranpedia.ts` → `src/tools/search.ts`
- Modify: `src/tools/get-translation.ts` (keep name)
- Modify: `src/tools/index.ts`

**Interfaces:**
- Consumes: Task 1 helpers + `_shared.ts` exports.
- Produces: register functions `registerGetAyahOptions`, `registerGetAyahBookContent`, `registerGetSurahInformation`, `registerSearch`, `registerGetTranslation`.

- [ ] **Step 1: `get-ayah-options.ts`**

Rename the file, rename `registerGetAyahContentOptions` → `registerGetAyahOptions`, rename the registered tool to `get_ayah_options`, title `Get Ayah Options`, description `List the related content available for one ayah in the Hafs mushaf: tafsir, meanings, topics, fatwa, e3rab, notes, asbab, translations.`. Schema unchanged (`surah`, `ayah`).

- [ ] **Step 2: `get-ayah-book-content.ts`**

Rename the file, rename `registerGetTafsir` → `registerGetAyahBookContent`, rename the tool to `get_ayah_book_content`, title `Get Ayah Book Content`. Description: `Fetch book content (tafsir, e3rab, etc.) for one ayah from a Quranpedia book. Defaults to Taysir al-Tafsir when book_id is omitted. When the book has no content for the ayah, returns the tafsir books available for that surah.`. Keep the 404→`availableBooks` fallback via `fetchSurahTafsirs` exactly as the current `get-tafsir.ts` does. Keep input `{ surah, ayah, book_id? }`.

- [ ] **Step 3: `get-surah-information.ts`**

Rename the file, rename `registerGetSurahBackground` → `registerGetSurahInformation`, rename the tool to `get_surah_information`, title `Get Surah Information`. Description: `Scholarly surah background: introduction, revelation type, descent order, virtues, topics, purposes.`. Keep input `{ surah }` and the existing `fetchSurahInformation` call.

- [ ] **Step 4: `search.ts`**

Rename `search-quranpedia.ts` → `search.ts`, rename `registerSearchQuranpedia` → `registerSearch`, rename the tool to `search`, title `Search Quranpedia`. Description: `Search the Quranpedia encyclopedia by keyword across books, fatwas, notes, and topics, or filtered by type.`. Keep input `{ query, type? }` (type enum `books|fatwas|notes|topics`).

- [ ] **Step 5: `get-translation.ts`**

Keep the tool name `get_translation` and function `registerGetTranslation`. Update the description to `Fetch translations of one ayah from the Quranpedia API, for one language or grouped by all available languages.` Keep input `{ surah, ayah, language? }`.

- [ ] **Step 6: Update `src/tools/index.ts`**

Replace imports/calls with the new register functions in ALPHABETICAL order (see the full 23-tool list in the design spec §3). New tools not yet created will be added in later tasks — for now register only these five, keeping the file compiling by leaving the 8 old registrations removed.

- [ ] **Step 7: Remove the 8 old tool registrations**

Delete from `index.ts`: `registerFindVersesByLemma`, `registerFindVersesByRoot`, `registerGetVerse`, `registerGetVerseMorphology`, `registerGetVersesByRange`, `registerGetSuraInfo`, `registerListSurahs`, and the old `registerSearch` (dataset search) — but do NOT delete the 8 tool files yet (next task).

- [ ] **Step 8: Verify type-check**

Run: `yarn tsc --noEmit`
Expected: errors limited to the still-present old tool files + `data.ts`.

- [ ] **Step 9: Commit**

```bash
git add src/tools/
git commit -m "feat(tools): rename existing tools to mirror Quranpedia routes"
```

---

### Task 4: Delete `src/data.ts` and the 8 removed tool files

**Files:**
- Delete: `src/data.ts`, `src/tools/search.ts` (old dataset version — replaced in Task 3; verify content before deleting), `src/tools/list-surahs.ts`, `src/tools/get-sura-info.ts`, `src/tools/get-verse.ts`, `src/tools/get-verses-by-range.ts`, `src/tools/find-verses-by-root.ts`, `src/tools/find-verses-by-lemma.ts`, `src/tools/get-verse-morphology.ts`

> Note: `src/tools/search.ts` was renamed from `search-quranpedia.ts` in Task 3 (overwrites the old dataset `search.ts`). If both exist, delete the dataset version and keep the renamed one.

- [ ] **Step 1: Delete files**

```bash
git rm src/data.ts src/tools/list-surahs.ts src/tools/get-sura-info.ts src/tools/get-verse.ts src/tools/get-verses-by-range.ts src/tools/find-verses-by-root.ts src/tools/find-verses-by-lemma.ts src/tools/get-verse-morphology.ts
```

- [ ] **Step 2: Verify type-check**

Run: `yarn tsc --noEmit`
Expected: PASS (no more `quran-search-engine` imports anywhere).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(tools): remove quran-search-engine dataset tools and data loader"
```

---

### Task 5: Add mushaf + surah tools (8 new files)

**Files:**
- Create: `src/tools/get-mushafs.ts`, `src/tools/get-mushaf.ts`, `src/tools/get-mushaf-ayah.ts`, `src/tools/get-mushaf-surah.ts`, `src/tools/get-surah-books.ts`, `src/tools/get-surah-fatwas.ts`, `src/tools/get-surah-tafsirs.ts`, `src/tools/get-surah-information.ts` (already created in Task 3 — skip)

**Interfaces:**
- Consumes: Task 1 helpers.
- Produces: `registerGetMushafs`, `registerGetMushaf`, `registerGetMushafAyah`, `registerGetMushafSurah`, `registerGetSurahBooks`, `registerGetSurahFatwas`, `registerGetSurahTafsirs`.

- [ ] **Step 1: `get-mushafs.ts`**

```ts
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fetchMushafs } from '../quranpedia-client.js';
import { EXTERNAL_READ_ONLY_ANNOTATIONS, quranpediaErrorResponse, quranpediaOk } from './_shared.js';

export function registerGetMushafs(server: McpServer): void {
  server.registerTool(
    'get_mushafs',
    {
      title: 'Get Mushafs',
      description:
        'List all available mushafs (Quran editions) with metadata: name, font files, image packages, and riwaya.',
      inputSchema: z.object({}),
      annotations: EXTERNAL_READ_ONLY_ANNOTATIONS,
    },
    async () => {
      try {
        const { url, data } = await fetchMushafs();
        return quranpediaOk(url, { mushafs: data });
      } catch (error) {
        return quranpediaErrorResponse(error);
      }
    },
  );
}
```

- [ ] **Step 2: `get-mushaf.ts`**

Same pattern as Step 1. Tool `get_mushaf`, title `Get Mushaf`, description `Get a single mushaf with all its surahs and ayahs. Response is large — prefer get_mushaf_surah or get_mushaf_ayah for targeted lookups.`. Schema: `{ id: z.number().int().min(1) }`. Call `fetchMushaf(id)`; response `{ mushaf: data }`.

- [ ] **Step 3: `get-mushaf-ayah.ts`**

Tool `get_mushaf_ayah`, title `Get Mushaf Ayah`, description `Get a single ayah text from a mushaf by mushaf id, surah id, and ayah number.`. Schema: `{ mushaf_id: z.number().int().min(1).default(1), surah_id: z.number().int().min(1).max(114), ayah_number: z.number().int().min(1).max(286) }`. Call `fetchMushafAyah(mushafId, surahId, ayahNumber)`; response `{ ayah: data }`.

- [ ] **Step 4: `get-mushaf-surah.ts`**

Tool `get_mushaf_surah`, title `Get Mushaf Surah`, description `Get all ayahs of one surah from a mushaf.`. Schema: `{ mushaf_id: z.number().int().min(1).default(1), surah_id: z.number().int().min(1).max(114) }`. Call `fetchMushafSurah(...)`; response `{ ayahs: data }`.

- [ ] **Step 5: `get-surah-books.ts`, `get-surah-fatwas.ts`, `get-surah-tafsirs.ts`**

Same pattern. Schemas each `{ surah_id: z.number().int().min(1).max(114) }`. Responses `{ books: data }`, `{ fatwas: data }`, `{ tafsirs: data }`. Calls `fetchSurahBooks`, `fetchSurahFatwas`, `fetchSurahTafsirs`.

- [ ] **Step 6: Register all 7 in `src/tools/index.ts`**

Add imports + `register*` calls in alphabetical order.

- [ ] **Step 7: Verify type-check**

Run: `yarn tsc --noEmit`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/tools/
git commit -m "feat(tools): add mushaf and surah route tools"
```

---

### Task 6: Add translation tools (3 new files)

**Files:**
- Create: `src/tools/get-translation-books.ts`, `src/tools/get-translation-by-book.ts`, `src/tools/get-translation-available-languages.ts`

**Interfaces:**
- Consumes: Task 1 helpers.
- Produces: `registerGetTranslationBooks`, `registerGetTranslationByBook`, `registerGetTranslationAvailableLanguages`.

- [ ] **Step 1: `get-translation-books.ts`**

Tool `get_translation_books`, title `Get Translation Books`, description `List available translation books, optionally filtered by language code.`. Schema: `{ language: z.string().min(2).max(10).optional() }` (sent as `language_code`). Call `fetchTranslationBooks(language)`; response `{ books: data }`.

- [ ] **Step 2: `get-translation-by-book.ts`**

Tool `get_translation_by_book`, title `Get Translation By Book`, description `Fetch translation text for one ayah (or a whole surah when ayah_number is omitted) from a specific translation book.`. Schema: `{ book_id: z.number().int().min(1), surah_id: z.number().int().min(1).max(114), ayah_number: z.number().int().min(1).max(286).optional() }`. Call `fetchAyahTranslationByBook(bookId, surahId, ayahNumber)`; response `{ translation: data }`.

- [ ] **Step 3: `get-translation-available-languages.ts`**

Tool `get_translation_available_languages`, title `Get Translation Available Languages`, description `List the languages that have translations available for a specific ayah.`. Schema: `{ surah_id: z.number().int().min(1).max(114), ayah_number: z.number().int().min(1).max(286) }`. Call `fetchTranslationAvailableLanguages(surahId, ayahNumber)`; response `{ languages: data }`.

- [ ] **Step 4: Register all 3 in `index.ts`** (alphabetical).

- [ ] **Step 5: Verify type-check**

Run: `yarn tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/tools/
git commit -m "feat(tools): add translation route tools"
```

---

### Task 7: Add library + index tools (10 new files)

**Files:**
- Create: `src/tools/get-book.ts`, `src/tools/get-related-books.ts`, `src/tools/get-fatwa.ts`, `src/tools/get-note.ts`, `src/tools/get-topics.ts`, `src/tools/get-reciters.ts`, `src/tools/get-categories.ts`, `src/tools/get-category-items.ts`

**Interfaces:**
- Consumes: Task 1 helpers.
- Produces: `registerGetBook`, `registerGetRelatedBooks`, `registerGetFatwa`, `registerGetNote`, `registerGetTopics`, `registerGetReciters`, `registerGetCategories`, `registerGetCategoryItems`.

- [ ] **Step 1: `get-book.ts`**

Tool `get_book`, title `Get Book`, description `Detailed information about a single Quranpedia book: author, category, parts, edition, publisher, and contents URL.`. Schema: `{ book_id: z.number().int().min(1) }`. Call `fetchBook`; response `{ book: data }`.

- [ ] **Step 2: `get-related-books.ts`**

Tool `get_related_books`, title `Get Related Books`, description `Books related to a given book by author, category, or topic. Returns empty when none exist.`. Schema: `{ book_id: z.number().int().min(1) }`. Call `fetchRelatedBooks`; response `{ related_books: data }`.

- [ ] **Step 3: `get-fatwa.ts`**

Tool `get_fatwa`, title `Get Fatwa`, description `A single fatwa with question, answer, mufti, source URL, and category.`. Schema: `{ fatwa_id: z.number().int().min(1) }`. Call `fetchFatwa`; response `{ fatwa: data }`.

- [ ] **Step 4: `get-note.ts`**

Tool `get_note`, title `Get Note`, description `A scholarly note with its text, linked ayahs, writer, and category.`. Schema: `{ note_id: z.number().int().min(1) }`. Call `fetchNote`; response `{ note: data }`.

- [ ] **Step 5: `get-topics.ts`**

Tool `get_topics`, title `Get Topics`, description `List all Quranic topics with their linked ayahs. Topics are hierarchical.`. Schema: `z.object({})`. Call `fetchTopics`; response `{ topics: data }`.

- [ ] **Step 6: `get-reciters.ts`**

Tool `get_reciters`, title `Get Reciters`, description `List all reciters with recitations, audio servers, and available surahs.`. Schema: `z.object({})`. Call `fetchReciters`; response `{ reciters: data }`.

- [ ] **Step 7: `get-categories.ts`**

Tool `get_categories`, title `Get Categories`, description `List categories, optionally filtered by content type (books, fatwas, or notes) to include counts.`. Schema: `{ type: z.enum(['books', 'fatwas', 'notes']).optional() }`. Call `fetchCategories(type)`; response `{ categories: data }`.

- [ ] **Step 8: `get-category-items.ts`**

Tool `get_category_items`, title `Get Category Items`, description `Get books, fatwas, or notes within a specific category.`. Schema: `{ category_id: z.number().int().min(1), type: z.enum(['books', 'fatwas', 'notes']) }`. Call `fetchCategoryItems(categoryId, type)`; response `{ items: data }`.

- [ ] **Step 9: Register all 8 in `index.ts`** (alphabetical). Verify the full 23-tool registration list is present and alphabetical.

- [ ] **Step 10: Verify type-check**

Run: `yarn tsc --noEmit`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add src/tools/
git commit -m "feat(tools): add library and index route tools"
```

---

### Task 8: Update `package.json` — description, keywords, dependencies

**Files:**
- Modify: `package.json`

**Interfaces:**
- Produces: package `version` `2.0.0`, no `quran-search-engine` dep, new `description` + `keywords`.

- [ ] **Step 1: Edit `package.json`**

- `version`: `"1.0.0"` → `"2.0.0"`.
- `description`: →
  `Explore the Quran through 23 MCP tools backed by the Quranpedia API — mushafs, ayahs, surahs, tafsir, translations, books, fatwas, notes, topics, reciters, and categories. Hosted at mcp.quranpedia.net.`
- `keywords`: `["mcp","mcp-server","quran","tafsir","translation","mushaf","ayah","surah","quranpedia","arabic","claude","ai"]`
- `dependencies`: remove the `"quran-search-engine": "^0.3.2",` line. Keep `@modelcontextprotocol/sdk` and `zod`.

- [ ] **Step 2: Regenerate lockfile**

Run: `yarn install`
Expected: `yarn.lock` updated; no `quran-search-engine` entries remain. Verify with `Select-String -Path yarn.lock -Pattern 'quran-search-engine'` → no matches.

- [ ] **Step 3: Verify build**

Run: `yarn build`
Expected: `dist/` regenerated with no `data.js` and no `quran-search-engine` imports. Confirm `dist/data.js` absent.

- [ ] **Step 4: Commit**

```bash
git add package.json yarn.lock dist
git commit -m "chore(package): bump to 2.0.0, drop quran-search-engine dependency, update description"
```

---

### Task 9: Update `server.json` + `CHANGELOG.md`

**Files:**
- Modify: `server.json`, `CHANGELOG.md`

- [ ] **Step 1: `server.json`**

- `version`: `"1.0.0"` → `"2.0.0"` (both top-level and the `packages` entry).
- `description`: same new text as Task 8.

- [ ] **Step 2: `CHANGELOG.md` — slim to Quranpedia-only history (human ruling, 2026-08-09)**

The changelog must reflect **only the Quranpedia traces**. Keep only the
Quranpedia-era sections; delete the pre-Quranpedia (quran-search-engine /
dataset-era) sections entirely.

- Keep the intro (Keep a Changelog + SemVer note).
- **Delete** the `## [0.5.0]`, `## [Unreleased]`, and `## [0.1.0]` sections.
- **Keep** `## [1.0.0] - 2026-08-06` unchanged (the five Quranpedia-backed tools era).
- **Add** a slim `## [2.0.0] - 2026-08-09` entry at the top (below the intro,
  above `## [1.0.0]`), brief and Quranpedia-only:

```markdown
## [2.0.0] - 2026-08-09

### Changed

- Every tool is now backed by the Quranpedia API, named after its route, and
  annotated `openWorldHint: true` (23 tools total).
- Renamed to mirror routes: `get_ayah_content_options` → `get_ayah_options`,
  `get_tafsir` → `get_ayah_book_content`,
  `get_surah_background` → `get_surah_information`,
  `search_quranpedia` → `search`.

### Removed

- `quran-search-engine` dependency, the offline dataset loader, and the 8
  dataset-backed tools. All tools now require network access to
  `api.quranpedia.net`.

### Added

- 18 new route tools: mushaf, surah, translation, library, and index lookups.
```

- [ ] **Step 3: Commit**

```bash
git add server.json CHANGELOG.md
git commit -m "docs: record 2.0.0 breaking changes and update server manifest"
```

---

### Task 10: Rewrite the test scripts

**Files:**
- Modify: `scripts/test.js`, `scripts/test-http.js`, `scripts/check-submission.js`

**Interfaces:**
- Consumes: the final 23-tool surface (all `openWorldHint: true`).

- [ ] **Step 1: Update `REQUIRED_TOOLS` in both test scripts**

Replace the current 13-name array with the 23 names in alphabetical order (same as `index.ts`).

- [ ] **Step 2: Remove `EXTERNAL_TOOLS`**

Delete the `EXTERNAL_TOOLS` Set (both scripts) and the annotation assertion branch that used it. In `test-http.js`, the annotation loop becomes: all tools must have `openWorldHint === true`.

- [ ] **Step 3: Rewrite tool-call assertions**

For each of the 23 tools add a happy-path `callTool(...)` with valid args, `parsePayload`, and a shape assert (e.g. `get_mushafs` → `payload.mushafs` is an array with length ≥ 1; `get_mushaf_ayah` with `{ surah_id: 1, ayah_number: 1 }` → `payload.ayah.text` is a non-empty string; `get_surah_information` with `{ surah_id: 1 }` → `payload.information` is an object). Remove asserts for deleted tools. Keep negative tests: missing resource → `null` payload or `isError`; invalid enum (e.g. `get_categories` `type: 'bogus'`) → `isError: true`.

- [ ] **Step 4: `check-submission.js`**

Update the tool list logic: all tools must have `openWorldHint === true`. Keep the endpoint check and description/forbidden-words checks.

- [ ] **Step 5: Run the suite**

Run: `yarn test`
Expected: stdio + http suites PASS against the live API.

- [ ] **Step 6: Run submission check**

Run: `yarn build; yarn check:submission`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add scripts/
git commit -m "test: update e2e and submission scripts for 23 Quranpedia tools"
```

---

### Task 11: Update documentation

**Files:**
- Modify: `README.md`, `docs/index.md`, `docs/tools.md`, `docs/architecture.md`, `docs/development.md`, `docs/integrations.md`, `CONTRIBUTING.md`

- [ ] **Step 1: `README.md`**

- Tagline/quote: "13 MCP tools" → "23 MCP tools"; "verses, surahs, lemmas, roots, morphology, tafsir, translations, and Quranpedia encyclopedia search" → "mushafs, ayahs, surahs, tafsir, translations, books, fatwas, notes, topics, reciters, and categories".
- Features: remove the "8 dataset tools work offline" claim; change "Thirteen tools" bullet to "Twenty-three tools, all backed by the Quranpedia API".
- Requirements: note that `api.quranpedia.net` network access is required for ALL tools.

- [ ] **Step 2: `docs/index.md`**

Replace the tool table with the 23 route-mirroring tools (from the design spec §3). Remove the "Eight are pure lookups against the in-memory Quran dataset" sentence.

- [ ] **Step 3: `docs/tools.md`**

Full rewrite: one section per tool (23 sections), each with description, schema table, example output, annotations (`openWorldHint: true`). Use the API response shapes documented at `https://api.quranpedia.net/`.

- [ ] **Step 4: `docs/architecture.md`**

Remove the "Dataset loading" section and the `gidOffsetTable` mentions. Update the overview diagram (no `data.ts`). Add a line: all 23 tools are typed wrappers over `api.quranpedia.net` via `quranpedia-client.ts`, cached with the shared TTL cache.

- [ ] **Step 5: `docs/development.md`**

Update: the "add a new tool" recipe (drop `getDatasetOrError`/`READ_ONLY_ANNOTATIONS`; use `EXTERNAL_READ_ONLY_ANNOTATIONS` + `quranpediaOk`); the test description (all 23 tools external); the repository-layout tree (remove `data.ts`, the 8 deleted files, `check-versions.js` references).

- [ ] **Step 6: `docs/integrations.md` + `CONTRIBUTING.md`**

Remove any "13 tools"/"8 offline" wording; update counts to 23.

- [ ] **Step 7: Commit**

```bash
git add README.md docs CONTRIBUTING.md
git commit -m "docs: document 23-tool Quranpedia-only surface"
```

---

### Task 11b: Fix Dockerfile stale `quran-search-engine` reference (human ruling, 2026-08-09)

**Files:**
- Modify: `Dockerfile`

Task 8 removed the `quran-search-engine` dependency, so the Dockerfile's
sourcemap-delete line would fail (`find` on a nonexistent path breaks
`docker build`).

- [ ] **Step 1: Edit `Dockerfile`**

Remove line 17 (` && find node_modules/quran-search-engine -name '*.map' -delete`).
Keep the `yarn cache clean` step. The runtime install step becomes:

```
RUN yarn install --frozen-lockfile --production \
 && yarn cache clean
```

- [ ] **Step 2: Verify**

`docker build` succeeds (or, if Docker is unavailable, confirm the file is
valid: `node_modules/quran-search-engine` appears nowhere in the Dockerfile).

- [ ] **Step 3: Commit**

```bash
git add Dockerfile
git commit -m "fix(docker): drop stale quran-search-engine sourcemap cleanup"
```

---

### Task 12: Update presentation + re-export artifacts

**Files:**
- Modify: `PRESENTATION.md`, `artifacts/PRESENTATION.md`

- [ ] **Step 1: `PRESENTATION.md`**

- §1 structure tree: remove `src/data.ts`.
- §3 tools: replace the 8+5 tables with the single 23-tool route-mirroring table; delete the "no API involved" clarification box (no longer applies — everything is the API).
- §5: package.json dependencies (drop `quran-search-engine`).
- §6: note "all 14 env vars still used; no new vars".
- Add a short §"v2.0.0 breaking change" note: 8 removed, 5 renamed, 18 added.
- §11 license unchanged.

- [ ] **Step 2: Re-export**

```powershell
Copy-Item -LiteralPath "PRESENTATION.md" -Destination "artifacts\PRESENTATION.md" -Force
```

- [ ] **Step 3: Commit**

```bash
git add PRESENTATION.md artifacts/PRESENTATION.md
git commit -m "docs: update presentation for 2.0.0 Quranpedia-only surface"
```

---

### Task 13: Final verification

**Files:**
- None (verification only).

- [ ] **Step 1: Full pipeline**

Run: `yarn lint`
Run: `yarn build`
Run: `yarn test`
Run: `yarn check:submission`
Expected: all PASS.

- [ ] **Step 2: Grep for leftovers**

`Select-String -Path (Get-ChildItem -Recurse -File src,scripts,docs,README.md,PRESENTATION.md).FullName -Pattern 'quran-search-engine|13 tools|8 offline|dataset tools|gidOffsetTable|get_verse_morphology|find_verses'` → expected: no matches (except intentional history in CHANGELOG).

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: final verification pass for 2.0.0"
```
