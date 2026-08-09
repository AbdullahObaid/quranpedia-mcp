import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  fetchAyahBook,
  fetchSurahTafsirs,
  QP_DEFAULT_TAFSIR_BOOK_ID,
} from '../quranpedia-client.js';
import {
  EXTERNAL_READ_ONLY_ANNOTATIONS,
  isQuranpediaNotFound,
  quranpediaErrorResponse,
  quranpediaOk,
} from './_shared.js';

export function registerGetAyahBookContent(server: McpServer): void {
  server.registerTool(
    'get_ayah_book_content',
    {
      title: 'Get Ayah Book Content',
      description:
        'Fetch book content (tafsir, e3rab, etc.) for one ayah from a Quranpedia book. Defaults to Taysir al-Tafsir when book_id is omitted. When the book has no content for the ayah, returns the tafsir books available for that surah.',
      inputSchema: z.object({
        surah_id: z.number().int().min(1).max(114),
        ayah_number: z.number().int().min(1).max(286),
        book_id: z.number().int().min(1).optional(),
      }),
      annotations: EXTERNAL_READ_ONLY_ANNOTATIONS,
    },
    async ({ surah_id, ayah_number, book_id }) => {
      const bookId = book_id ?? QP_DEFAULT_TAFSIR_BOOK_ID;
      try {
        const { url, data } = await fetchAyahBook(surah_id, ayah_number, bookId);
        return quranpediaOk(url, {
          surah_id,
          ayah_number,
          book_id: bookId,
          book: data.book,
          content: data.content,
        });
      } catch (error) {
        if (isQuranpediaNotFound(error)) {
          try {
            const fallback = await fetchSurahTafsirs(surah_id);
            return quranpediaOk(fallback.url, {
              surah_id,
              ayah_number,
              book_id: bookId,
              tafsir: null,
              reason: error.message,
              availableBooks: fallback.data,
            });
          } catch (fallbackError) {
            return quranpediaErrorResponse(fallbackError);
          }
        }
        return quranpediaErrorResponse(error);
      }
    },
  );
}
