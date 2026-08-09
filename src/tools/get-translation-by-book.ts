import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fetchAyahTranslationByBook } from '../quranpedia-client.js';
import {
  EXTERNAL_READ_ONLY_ANNOTATIONS,
  isQuranpediaNotFound,
  quranpediaErrorResponse,
  quranpediaOk,
} from './_shared.js';

export function registerGetTranslationByBook(server: McpServer): void {
  server.registerTool(
    'get_translation_by_book',
    {
      title: 'Get Translation By Book',
      description:
        'Fetch translation text for one ayah (or a whole surah when ayah_number is omitted) from a specific translation book.',
      inputSchema: z.object({
        book_id: z.number().int().min(1),
        surah_id: z.number().int().min(1).max(114),
        ayah_number: z.number().int().min(1).max(286).optional(),
      }),
      annotations: EXTERNAL_READ_ONLY_ANNOTATIONS,
    },
    async ({ book_id, surah_id, ayah_number }) => {
      try {
        const { url, data } = await fetchAyahTranslationByBook(book_id, surah_id, ayah_number);
        return quranpediaOk(url, {
          book_id,
          surah_id,
          ayah_number: ayah_number ?? null,
          translation: data,
        });
      } catch (error) {
        if (isQuranpediaNotFound(error)) {
          return quranpediaOk(error.url, {
            book_id,
            surah_id,
            ayah_number: ayah_number ?? null,
            translation: null,
          });
        }
        return quranpediaErrorResponse(error);
      }
    },
  );
}
