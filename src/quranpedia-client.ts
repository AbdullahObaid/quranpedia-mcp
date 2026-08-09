import { QuranpediaCache } from './quranpedia-cache.js';

/**
 * Thin, typed client for the Quranpedia API (https://api.quranpedia.net/v1).
 *
 * - Centralizes the base URL and default book id so defaults can be swapped
 *   via env without touching tool handlers.
 * - Normalizes Quranpedia's error shapes (`{ error: "..." }` on 400/404) into
 *   `QuranpediaError` instances carrying the HTTP status, so handlers can
 *   distinguish a genuine "not found" from a bad request or a network fault.
 * - Routes every request through the shared TTL cache.
 */

export interface QuranpediaErrorShape {
  error?: string;
}

/** Normalized upstream error. `status` lets handlers branch on 404 vs others. */
export class QuranpediaError extends Error {
  readonly status: number;
  readonly url: string;

  constructor(status: number, message: string, url: string) {
    super(message);
    this.name = 'QuranpediaError';
    this.status = status;
    this.url = url;
  }
}

export interface QuranpediaResult<T> {
  url: string;
  data: T;
}

// --- Config (env-tunable, centralized here) ---

function positiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const QURANPEDIA_BASE_URL = process.env.QP_BASE_URL ?? 'https://api.quranpedia.net/v1';

/** Default tafsir book when `get_tafsir` is called without `book_id` (تيسير التفسير). */
export const QP_DEFAULT_TAFSIR_BOOK_ID = positiveInt(process.env.QP_DEFAULT_TAFSIR_BOOK_ID, 1);

export const QP_FETCH_TIMEOUT_MS = positiveInt(process.env.QP_FETCH_TIMEOUT_MS, 30_000);

export const QP_CACHE_TTL_MS = positiveInt(process.env.QP_CACHE_TTL_MS, 30 * 24 * 60 * 60 * 1000);
export const QP_CACHE_DIR = process.env.QP_CACHE_DIR || undefined;
export const QP_CACHE_MAX_ENTRIES = positiveInt(process.env.QP_CACHE_MAX_ENTRIES, 5000);

const cache = new QuranpediaCache({
  ttlMs: QP_CACHE_TTL_MS,
  directory: QP_CACHE_DIR,
  maxEntries: QP_CACHE_MAX_ENTRIES,
});

export function quranpediaCacheStats(): ReturnType<QuranpediaCache['stats']> {
  return cache.stats();
}

async function quranpediaGet<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(QP_FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    let message = `Quranpedia request failed (${response.status})`;
    try {
      const body = (await response.json()) as QuranpediaErrorShape;
      if (body && typeof body.error === 'string' && body.error.length > 0) {
        message = body.error;
      }
    } catch {
      // non-JSON error body — keep the generic message
    }
    throw new QuranpediaError(response.status, message, url);
  }
  return (await response.json()) as T;
}

/**
 * Cache-first fetch. On a miss the upstream response is stored under
 * `cacheKey` (e.g. `tafsir:2:255:1`) and returned alongside its URL for
 * attribution.
 */
export function quranpediaRequest<T>(cacheKey: string, path: string): Promise<QuranpediaResult<T>> {
  const url = `${QURANPEDIA_BASE_URL}${path}`;
  return cache
    .getOrSet(cacheKey, () => quranpediaGet<T>(url))
    .then((data): QuranpediaResult<T> => ({ url, data }));
}

// --- Typed response shapes (from the Quranpedia API docs + live responses) ---

export interface AyahOptions {
  id: number;
  number: number;
  surah: number | string;
  page_number: number;
  text: string;
  marker?: string | null;
  options: string[];
  number_in_hafs?: number[];
}

export interface AuthorInfo {
  id?: number;
  ar_name?: string;
  full_name?: string;
}

export interface LanguageInfo {
  id?: number;
  name?: string;
  code?: string;
  direction?: string;
}

export interface BookInfo {
  id: number;
  name: string;
  short_name?: string | null;
  parts?: number | null;
  publish_year?: string | null;
  edition?: string | null;
  nasher?: string | null;
  author?: AuthorInfo | string | null;
  mohaqeq?: AuthorInfo | null;
  introducer?: AuthorInfo | null;
  reviewer?: AuthorInfo | null;
  translator?: AuthorInfo | null;
  language?: LanguageInfo | null;
}

export interface BookContentItem {
  text: string;
  part?: string | number;
  page?: string | number;
  ayahs?: string;
}

export interface AyahBookContent {
  book: BookInfo;
  content: BookContentItem[];
}

export interface SurahTafsirBook {
  id: number;
  name: string;
  short_name?: string;
  author?: string;
}

export interface TranslationBook {
  id: number;
  name: string;
  short_name?: string | null;
  authors?: AuthorInfo[];
}

export interface TranslationEntry {
  book: TranslationBook;
  'translation-content': string;
}

export type TranslationGrouped = Record<string, TranslationEntry[]>;

export interface SurahInformationEntry {
  title: string;
  value: string | number | null;
}

export interface SurahInformation {
  introduction?: SurahInformationEntry;
  surah_number?: SurahInformationEntry;
  surah_type?: SurahInformationEntry;
  words_count?: SurahInformationEntry;
  descent?: SurahInformationEntry;
  grace?: SurahInformationEntry;
  prophet?: SurahInformationEntry;
  revelation?: SurahInformationEntry;
  topics?: SurahInformationEntry;
  purposes?: SurahInformationEntry;
  asmaoha?: SurahInformationEntry;
  ayahs_count?: SurahInformationEntry[];
}

export interface SearchPage {
  items: unknown[];
  currentPage: number;
  perPage: number;
  total: number;
  lastPage: number;
}

export interface SearchAllResult {
  notes?: SearchPage;
  fatwas?: SearchPage;
  topics?: SearchPage;
  books?: SearchPage;
}

export interface SearchTypeResult extends SearchPage {
  type: string;
}

export type SearchResult = SearchAllResult | SearchTypeResult;

export type QuranpediaSearchType = 'books' | 'fatwas' | 'notes' | 'topics';

// --- Endpoint helpers ---

export function fetchAyahOptions(
  surah: number,
  ayah: number,
): Promise<QuranpediaResult<AyahOptions>> {
  return quranpediaRequest(`options:${surah}:${ayah}`, `/ayah/${surah}/${ayah}/options`);
}

export function fetchAyahBook(
  surah: number,
  ayah: number,
  bookId: number,
): Promise<QuranpediaResult<AyahBookContent>> {
  return quranpediaRequest(
    `book:${surah}:${ayah}:${bookId}`,
    `/ayah/${surah}/${ayah}/book/${bookId}`,
  );
}

export function fetchSurahTafsirs(surah: number): Promise<QuranpediaResult<SurahTafsirBook[]>> {
  return quranpediaRequest(`surah-tafsirs:${surah}`, `/surah/tafsirs/${surah}`);
}

export function fetchTranslation(
  surah: number,
  ayah: number,
  language?: string,
): Promise<QuranpediaResult<TranslationEntry[] | TranslationGrouped>> {
  const suffix = language ? `/${language}` : '';
  return quranpediaRequest(
    `translation:${surah}:${ayah}:${language ?? 'all'}`,
    `/translations/${surah}/${ayah}${suffix}`,
  );
}

export function fetchSurahInformation(surah: number): Promise<QuranpediaResult<SurahInformation>> {
  return quranpediaRequest(`surah-info:${surah}`, `/surah/information/${surah}`);
}

export function searchQuranpedia(
  query: string,
  type?: QuranpediaSearchType,
): Promise<QuranpediaResult<SearchResult>> {
  const encoded = encodeURIComponent(query);
  const suffix = type ? `/${type}` : '';
  return quranpediaRequest(`search:${type ?? 'all'}:${query}`, `/search/${encoded}${suffix}`);
}

export function fetchMushafs(): Promise<QuranpediaResult<unknown>> {
  return quranpediaRequest('mushafs', '/mushafs');
}
export function fetchMushaf(id: number): Promise<QuranpediaResult<unknown>> {
  return quranpediaRequest(`mushaf:${id}`, `/mushafs/${id}`);
}
export function fetchMushafAyah(
  mushafId: number,
  surahId: number,
  ayahNumber: number,
): Promise<QuranpediaResult<unknown>> {
  return quranpediaRequest(
    `mushaf-ayah:${mushafId}:${surahId}:${ayahNumber}`,
    `/mushafs/${mushafId}/${surahId}/${ayahNumber}`,
  );
}
export function fetchMushafSurah(
  mushafId: number,
  surahId: number,
): Promise<QuranpediaResult<unknown>> {
  return quranpediaRequest(
    `mushaf-surah:${mushafId}:${surahId}`,
    `/mushafs/${mushafId}/${surahId}`,
  );
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
  bookId: number,
  surahId: number,
  ayahNumber?: number,
): Promise<QuranpediaResult<unknown>> {
  const suffix = ayahNumber !== undefined ? `/${ayahNumber}` : '';
  return quranpediaRequest(
    `translation-book:${bookId}:${surahId}:${ayahNumber ?? 'surah'}`,
    `/translation/${bookId}/${surahId}${suffix}`,
  );
}
export function fetchTranslationAvailableLanguages(
  surahId: number,
  ayahNumber: number,
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
  categoryId: number,
  type: QuranpediaSearchType,
): Promise<QuranpediaResult<unknown>> {
  return quranpediaRequest(`category:${categoryId}:${type}`, `/category/${categoryId}/${type}`);
}
