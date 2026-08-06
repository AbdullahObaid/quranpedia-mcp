# Tools reference

Every tool exposed by `quranpedia-mcp`. All tools are read-only — no state is
mutated and no data is written. Two kinds of tools exist:

- **Dataset tools** (8): pure lookups against the in-memory Quran dataset; no
  external service is contacted.
- **Quranpedia tools** (5): read-only lookups that contact the Quranpedia API
  (https://api.quranpedia.net/v1) for tafsir, translations, surah background,
  per-ayah content options, and encyclopedia search.

## Conventions

- Every tool returns `{ content: [{ type: 'text', text: JSON.stringify(payload) }] }` on success.
- Errors return `{ isError: true, content: [{ type: 'text', text: JSON.stringify({ error }) }] }`.
- Empty lookups (e.g. `get_verse` for a non-existent gid) return a successful payload with
  `null` or empty array — they do **not** return `isError: true`.
- Quranpedia lookups for a resource that genuinely does not exist (e.g. `get_ayah_content_options`
  for a non-existent ayah) also return `null` — not an error. Out-of-range inputs (surah > 114,
  ayah > 286) fail zod validation and return `isError: true`.
- Dataset-not-loaded errors (server still warming up) return `isError: true`.
- Every Quranpedia tool response carries a `source` block
  (`{ provider: 'quranpedia', url }`) so clients can attribute the answer to
  the exact upstream endpoint.
- `gid` (global id) is a 1-indexed sequential counter across all 114 surahs.
  For example, the first verse of Al-Fatihah is `gid: 1`, and `gid: 262` is
  Ayat al-Kursi (2:255).

## Tool annotations

All thirteen tools declare the same four hints, differing only in `openWorldHint`:

| Annotation | Dataset tools | Quranpedia tools | Why |
| --- | --- | --- | --- |
| `readOnlyHint` | `true` | `true` | No state changes. |
| `destructiveHint` | `false` | `false` | Nothing is deleted or altered. |
| `idempotentHint` | `true` | `true` | Repeated calls with the same inputs return the same payload. |
| `openWorldHint` | `false` | `true` | Dataset tools only read memory; Quranpedia tools contact an external service, so clients should surface a permission prompt. |

Clients may decide to pre-approve the dataset tools (closed world) while
requiring confirmation for the Quranpedia tools (open world).

---

## `search`

Title: **Quran Search**

Search the Quran with Arabic normalization, lemma/root options, and highlights.

| Field | Value |
| --- | --- |
| Description | "Search the Quran with Arabic normalization, lemma/root options, and highlights." (82 chars) |
| Annotations | `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: false` |

### Input

```json
{
  "query":  "string (min 1, required)",
  "lemma":  "boolean (default: true)",
  "root":   "boolean (default: true)",
  "page":   "integer ≥ 1 (default: 1)",
  "limit":  "integer 1–200 (default: 10)"
}
```

### Output

```json
{
  "results": [
    {
      "gid": 2,
      "sura_id": 1,
      "aya_id": 2,
      "aya_id_display": "٢",
      "uthmani": "ٱلۡحَمۡدُ لِلَّهِ رَبِّ ٱلۡعَٰلَمِينَ",
      "standard": "الحمد لله رب العالمين",
      "matchScore": 3,
      "matchType": "exact",
      "matchedTokens": ["الحمد"],
      "highlights": [{ "start": 0, "end": 5, "token": "الحمد", "matchType": "exact" }]
    }
  ],
  "counts":    { "simple": 48, "lemma": 0, "root": 0, "fuzzy": 265, "total": 313 },
  "pagination":{ "totalResults": 313, "totalPages": 105, "currentPage": 1, "limit": 3 }
}
```

### Try it

```bash
curl -X POST https://mcp.quran.us.kg/ \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search","arguments":{"query":"الرحمن","limit":3}}}'
```

---

## `list_surahs`

Title: **List Surahs**

Return all 114 surahs with id, names (Arabic, English, romanization), verse count, juz list, and Mushaf page range.

| Field | Value |
| --- | --- |
| Description | "Return all 114 surahs with id, names (Arabic, English, romanization), verse count, juz list, and Mushaf page range." (123 chars) |
| Annotations | `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: false` |

### Input

None — the input schema is `{}`.

### Output

```json
{
  "surahs": [
    {
      "id": 1,
      "sura_name": "الفاتحة",
      "sura_name_en": "The Opening",
      "sura_name_romanization": "Al-Fatihah",
      "total_verses": 7,
      "juz_ids": [1],
      "page_start": 1,
      "page_end": 1
    }
  ]
}
```

Length is always 114.

---

## `get_sura_info`

Title: **Get Sura Info**

Look up one surah by numeric id (1–114), Arabic name, English name, or romanization. Returns the matching record or null.

| Field | Value |
| --- | --- |
| Description | "Look up one surah by numeric id (1–114), Arabic name, English name, or romanization. Returns the matching record or null." (132 chars) |
| Annotations | `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: false` |

### Input

```json
{
  "identifier": "number (integer) | string (1–120 chars)"
}
```

### Output

```json
{ "sura": { "id": 2, "sura_name": "البقرة", "sura_name_en": "The Cow", "sura_name_romanization": "Al-Baqarah", "total_verses": 286, "juz_ids": [1, 2, 3], "page_start": 2, "page_end": 49 } }
```

If no sura matches, returns `{ "sura": null }` (not an error).

---

## `get_verse`

Title: **Get Verse**

Fetch a single verse by global id or by (suraId, ayaId). Returns the full verse record or null.

| Field | Value |
| --- | --- |
| Description | "Fetch a single verse by global id or by (suraId, ayaId). Returns the full verse record or null." (98 chars) |
| Annotations | `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: false` |

### Input

```json
{
  "gid":    "integer ≥ 1 (optional)",
  "suraId": "integer 1–114 (optional)",
  "ayaId":  "integer 1–286 (optional)"
}
```

Provide **either** `gid`, **or both** `suraId` and `ayaId`. Returns
`isError: true` if neither combination is supplied.

### Output

```json
{ "verse": { "gid": 262, "sura_id": 2, "aya_id": 255, "uthmani": "…", "standard": "…", "page_id": 42, "juz_id": 3, "sura_name": "البقرة", "sura_name_en": "The Cow", "sura_name_romanization": "Al-Baqarah" } }
```

---

## `get_verses_by_range`

Title: **Get Verses By Range**

Fetch verses by Quran range syntax: `'2:255'` (single), `'1:1-7'` (range), or `'2:'` (whole sura).

| Field | Value |
| --- | --- |
| Description | "Fetch verses by Quran range syntax: '2:255' (single), '1:1-7' (range), or '2:' (whole sura)." (102 chars) |
| Annotations | `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: false` |

### Input

```json
{ "range": "string matching ^\\d{1,3}:(\\d{1,3})?(-\\d{1,3})?$" }
```

### Output

```json
{
  "range": { "sura": 2, "startAya": 255 },
  "verses": [ { "gid": 262, "sura_id": 2, "aya_id": 255, "uthmani": "…", "standard": "…" } ]
}
```

`endAya` is omitted from the parsed range when not given. If only `startAya` is
given, the result is the single verse at that aya. If neither aya is given
(e.g. `"2:"`), the result is the whole sura. `endAya` is silently clamped to
the sura's `total_verses`.

---

## `find_verses_by_root`

Title: **Find Verses By Root**

Find verses containing a normalized Arabic root via the inverted root index. Paginated.

| Field | Value |
| --- | --- |
| Description | "Find verses containing a normalized Arabic root via the inverted root index. Paginated." (95 chars) |
| Annotations | `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: false` |

### Input

```json
{
  "root":  "string (min 1, required)",
  "page":  "integer ≥ 1 (default: 1)",
  "limit": "integer 1–200 (default: 20)"
}
```

### Output

```json
{
  "root": "حمد",
  "normalizedRoot": "حمد",
  "verses": [ { "gid": 2, "sura_id": 1, "aya_id": 2, "uthmani": "…", "standard": "…" } ],
  "pagination": { "totalResults": 124, "totalPages": 7, "currentPage": 1, "limit": 20 }
}
```

`normalizedRoot` is the form of `root` after `normalizeArabic()` — the form
actually used to key the inverted index. When the root is not in the index,
`verses` is `[]` and `pagination.totalResults` is `0`.

---

## `find_verses_by_lemma`

Title: **Find Verses By Lemma**

Find verses containing a normalized lemma via the inverted lemma index. Paginated.

| Field | Value |
| --- | --- |
| Description | "Find verses containing a normalized lemma via the inverted lemma index. Paginated." (94 chars) |
| Annotations | `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: false` |

### Input

```json
{
  "lemma": "string (min 1, required)",
  "page":  "integer ≥ 1 (default: 1)",
  "limit": "integer 1–200 (default: 20)"
}
```

### Output

```json
{
  "lemma": "حمد",
  "normalizedLemma": "حمد",
  "verses": [ { "gid": 2, "sura_id": 1, "aya_id": 2, "uthmani": "…", "standard": "…" } ],
  "pagination": { "totalResults": 124, "totalPages": 7, "currentPage": 1, "limit": 20 }
}
```

Same shape as `find_verses_by_root` but keyed on lemma. Empty results
(`{ verses: [], pagination: { totalResults: 0, … } }`) are returned when the
lemma is not in the index.

---

## `get_verse_morphology`

Title: **Get Verse Morphology**

Get the lemmas and roots for a single verse by gid or by (suraId, ayaId). Returns morphology or null.

| Field | Value |
| --- | --- |
| Description | "Get the lemmas and roots for a single verse by gid or by (suraId, ayaId). Returns morphology or null." (108 chars) |
| Annotations | `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: false` |

### Input

Same as `get_verse` — `gid` or `(suraId, ayaId)`.

### Output

```json
{ "morphology": { "gid": 1, "lemmas": ["حمد", "له", "رب", "علم"], "roots": ["حمد", "اله", "ربب", "علم"] } }
```

---

## Quranpedia tools

The five tools below read from the external Quranpedia API
(<https://api.quranpedia.net/v1>). They are annotated `openWorldHint: true`
and every successful response includes a `source` block:

```json
{ "source": { "provider": "quranpedia", "url": "https://api.quranpedia.net/v1/ayah/1/1/options" }, "ayah": { /* … */ } }
```

Responses are cached in memory for 30 days by default (and on disk when
`QP_CACHE_DIR` is set), so repeat calls are instant and offline-tolerant.

### Terminology

- **Ayah** — one verse, addressed by `surah` (1–114) and `ayah` (1–286).
- **Tafsir book** — a scholarly commentary; Quranpedia hosts many (Taysir
  al-Tafsir, Ibn Kathir, al-Sa'di, al-Tabari, and more).
- **e3rab / asbab / fatwa / topic** — Quranpedia content categories per ayah;
  `get_ayah_content_options` lists what exists, `get_tafsir` reads a book.

---

## `get_ayah_content_options`

Title: **Get Ayah Content Options**

List the related Quranpedia content available for one ayah (tafsir, e3rab,
asbab, translations, meanings, and more). Use this to discover what can be
fetched next.

| Field | Value |
| --- | --- |
| Description | "List the related Quranpedia content available for one ayah by surah and ayah number (tafsir, e3rab, asbab, translations, meanings, and more). Use this to discover what can be fetched next." (188 chars) |
| Annotations | `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true` |

### Input

```json
{
  "surah": "integer 1–114 (required)",
  "ayah":  "integer 1–286 (required)"
}
```

### Output

```json
{
  "source": { "provider": "quranpedia", "url": "https://api.quranpedia.net/v1/ayah/1/1/options" },
  "ayah": {
    "id": 1,
    "number": 1,
    "surah": 1,
    "page_number": 1,
    "text": "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
    "marker": null,
    "options": ["tafsir", "meanings", "similar", "topics", "fatwa", "e3rab", "notes", "asbab", "translations"]
  }
}
```

For a non-existent ayah (e.g. `1:8`), `ayah` is `null` — not an error.

---

## `get_tafsir`

Title: **Get Tafsir**

Fetch tafsir (exegesis) content for one ayah from a Quranpedia book. Defaults
to Taysir al-Tafsir by Ibrahim al-Qattan when `book_id` is omitted.

| Field | Value |
| --- | --- |
| Description | "Fetch tafsir (exegesis) content for one ayah from a Quranpedia book. Defaults to Taysir al-Tafsir by Ibrahim al-Qattan when book_id is omitted. When the book has no content for the ayah, returns the tafsir books available for that surah." (237 chars) |
| Annotations | `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true` |

### Input

```json
{
  "surah":   "integer 1–114 (required)",
  "ayah":    "integer 1–286 (required)",
  "book_id": "integer ≥ 1 (optional, default 1 = Taysir al-Tafsir)"
}
```

### Output

```json
{
  "source": { "provider": "quranpedia", "url": "https://api.quranpedia.net/v1/ayah/1/1/book/1" },
  "ayah": "1:1",
  "book_id": 1,
  "book": { "id": 1, "name": "تيسير التفسير", "short_name": "القطان", "author": { "id": 1050, "full_name": "…" }, "language": { "code": "ar", "direction": "rtl" } },
  "content": [ { "text": "…", "part": 1, "page": "…", "ayahs": "1" } ]
}
```

When the book has no content for the ayah (or `book_id` is unknown), the
handler falls back to the surah's tafsir book list:

```json
{
  "ayah": "1:1",
  "book_id": 999,
  "tafsir": null,
  "reason": "Book not found",
  "availableBooks": [ { "id": 1, "name": "تيسير التفسير", "short_name": "القطان", "author": "…" } ]
}
```

Other tafsir books (e.g. Ibn Kathir, al-Tabari) can be read by passing their
`id`, discovered via `get_ayah_content_options`, `get_surah_background`, or
the fallback `availableBooks` list.

---

## `get_translation`

Title: **Get Translation**

Get human-readable translations of one ayah from Quranpedia.

| Field | Value |
| --- | --- |
| Description | "Get human-readable translations of one ayah from Quranpedia. Pass a language code (en, fr, es, ur, and others) for one language, or omit language to get every available translation of the ayah grouped by language code." (218 chars) |
| Annotations | `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true` |

### Input

```json
{
  "surah":    "integer 1–114 (required)",
  "ayah":     "integer 1–286 (required)",
  "language": "string 2–16 chars (optional)"
}
```

### Output

```json
{
  "source": { "provider": "quranpedia", "url": "https://api.quranpedia.net/v1/translations/1/1/en" },
  "ayah": "1:1",
  "language": "en",
  "translations": [
    {
      "book": { "id": 1947, "name": "Saheeh International", "short_name": "Saheeh Int.", "authors": [ { "id": 3, "full_name": "…" } ] },
      "translation-content": "In the name of Allah, the Entirely Merciful, the Especially Merciful."
    }
  ]
}
```

Omit `language` to get every available translation grouped by language code.
Unknown language codes return `translations: []`; a non-existent ayah returns
`translations: null`.

---

## `get_surah_background`

Title: **Get Surah Background**

Get scholarly Quranpedia background for one surah: introduction, revelation
type, descent order, virtues, reasons for revelation, topics, and purposes.
This is distinct from the structural `get_sura_info` tool (id, names, verse
count, juz/page ranges from the local dataset).

| Field | Value |
| --- | --- |
| Description | "Get Quranpedia background for one surah by number: introduction, revelation type, descent order, virtues, reasons for revelation, topics, and purposes. This is scholarly background, distinct from the structural get_sura_info tool." (230 chars) |
| Annotations | `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true` |

### Input

```json
{ "surah": "integer 1–114 (required)" }
```

### Output

```json
{
  "source": { "provider": "quranpedia", "url": "https://api.quranpedia.net/v1/surah/information/2" },
  "surah": 2,
  "information": {
    "introduction": { "title": "…", "value": "…" },
    "surah_type":   { "title": "…", "value": "Medinan" },
    "descent":      { "title": "…", "value": "…" },
    "topics":       { "title": "…", "value": "…" },
    "ayahs_count":  [ { "title": "…", "value": "286" } ]
  }
}
```

Out-of-range surah numbers (outside 1–114) return an `isError` zod validation
error; surah numbers the API cannot resolve return `information: null`.

---

## `search_quranpedia`

Title: **Search Quranpedia**

Search the Quranpedia encyclopedia (books, fatwas, notes, and topics) by
keyword.

| Field | Value |
| --- | --- |
| Description | "Search the Quranpedia encyclopedia (books, fatwas, notes, and topics) by keyword. Pass books, fatwas, notes, or topics as type to narrow the search; omit type to search all content at once. This searches encyclopedia content, distinct from the Quran text search tool." (267 chars) |
| Annotations | `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true` |

### Input

```json
{
  "query": "string (min 1, required)",
  "type":  "'books' | 'fatwas' | 'notes' | 'topics' (optional)"
}
```

### Output (all types)

```json
{
  "source": { "provider": "quranpedia", "url": "https://api.quranpedia.net/v1/search/رحمن" },
  "query": "رحمن",
  "type": null,
  "results": {
    "notes":  { "items": [ "…" ], "currentPage": 1, "perPage": 10, "total": 0, "lastPage": 0 },
    "fatwas": { "items": [ "…" ], "currentPage": 1, "perPage": 10, "total": 0, "lastPage": 0 },
    "topics": { "items": [ "…" ], "currentPage": 1, "perPage": 10, "total": 0, "lastPage": 0 },
    "books":  { "items": [ "…" ], "currentPage": 1, "perPage": 10, "total": 0, "lastPage": 0 }
  }
}
```

### Output (single type)

When `type` is given, `results` is a single paginated page carrying a `type`
field (e.g. `{ items, currentPage, perPage, total, lastPage, type: "books" }`).
