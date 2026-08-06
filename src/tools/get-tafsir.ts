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

export function registerGetTafsir(server: McpServer): void {
  server.registerTool(
    'get_tafsir',
    {
      title: 'Get Tafsir',
      description:
        'Fetch tafsir (exegesis) content for one ayah from a Quranpedia book. Defaults to Taysir al-Tafsir by Ibrahim al-Qattan when book_id is omitted. When the book has no content for the ayah, returns the tafsir books available for that surah.',
      inputSchema: z.object({
        surah: z.number().int().min(1).max(114),
        ayah: z.number().int().min(1).max(286),
        book_id: z.number().int().min(1).optional(),
      }),
      annotations: EXTERNAL_READ_ONLY_ANNOTATIONS,
    },
    async ({ surah, ayah, book_id }) => {
      const bookId = book_id ?? QP_DEFAULT_TAFSIR_BOOK_ID;
      try {
        const { url, data } = await fetchAyahBook(surah, ayah, bookId);
        return quranpediaOk(url, {
          ayah: `${surah}:${ayah}`,
          book_id: bookId,
          book: data.book,
          content: data.content,
        });
      } catch (error) {
        if (isQuranpediaNotFound(error)) {
          try {
            const fallback = await fetchSurahTafsirs(surah);
            return quranpediaOk(fallback.url, {
              ayah: `${surah}:${ayah}`,
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
