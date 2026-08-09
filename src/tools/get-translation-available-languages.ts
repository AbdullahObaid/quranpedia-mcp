import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fetchTranslationAvailableLanguages } from '../quranpedia-client.js';
import {
  EXTERNAL_READ_ONLY_ANNOTATIONS,
  isQuranpediaNotFound,
  quranpediaErrorResponse,
  quranpediaOk,
} from './_shared.js';

export function registerGetTranslationAvailableLanguages(server: McpServer): void {
  server.registerTool(
    'get_translation_available_languages',
    {
      title: 'Get Translation Available Languages',
      description: 'List the languages that have translations available for a specific ayah.',
      inputSchema: z.object({
        surah_id: z.number().int().min(1).max(114),
        ayah_number: z.number().int().min(1).max(286),
      }),
      annotations: EXTERNAL_READ_ONLY_ANNOTATIONS,
    },
    async ({ surah_id, ayah_number }) => {
      try {
        const { url, data } = await fetchTranslationAvailableLanguages(surah_id, ayah_number);
        return quranpediaOk(url, { surah_id, ayah_number, languages: data });
      } catch (error) {
        if (isQuranpediaNotFound(error)) {
          return quranpediaOk(error.url, {
            surah_id,
            ayah_number,
            languages: null,
          });
        }
        return quranpediaErrorResponse(error);
      }
    },
  );
}
