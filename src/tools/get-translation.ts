import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fetchTranslation } from '../quranpedia-client.js';
import {
  EXTERNAL_READ_ONLY_ANNOTATIONS,
  isQuranpediaNotFound,
  quranpediaErrorResponse,
  quranpediaOk,
} from './_shared.js';

export function registerGetTranslation(server: McpServer): void {
  server.registerTool(
    'get_translation',
    {
      title: 'Get Translation',
      description:
        'Fetch translations of one ayah from the Quranpedia API, for one language or grouped by all available languages.',
      inputSchema: z.object({
        surah_id: z.number().int().min(1).max(114),
        ayah_number: z.number().int().min(1).max(286),
        language: z.string().min(2).max(16).optional(),
      }),
      annotations: EXTERNAL_READ_ONLY_ANNOTATIONS,
    },
    async ({ surah_id, ayah_number, language }) => {
      const lang = language?.toLowerCase();
      try {
        const { url, data } = await fetchTranslation(surah_id, ayah_number, lang);
        return quranpediaOk(url, {
          surah_id,
          ayah_number,
          language: lang ?? null,
          translations: data,
        });
      } catch (error) {
        if (isQuranpediaNotFound(error)) {
          return quranpediaOk(error.url, {
            surah_id,
            ayah_number,
            language: lang ?? null,
            translations: null,
          });
        }
        return quranpediaErrorResponse(error);
      }
    },
  );
}
