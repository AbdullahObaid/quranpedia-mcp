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
        'Get human-readable translations of one ayah from Quranpedia. Pass a language code (en, fr, es, ur, and others) for one language, or omit language to get every available translation of the ayah grouped by language code.',
      inputSchema: z.object({
        surah: z.number().int().min(1).max(114),
        ayah: z.number().int().min(1).max(286),
        language: z.string().min(2).max(16).optional(),
      }),
      annotations: EXTERNAL_READ_ONLY_ANNOTATIONS,
    },
    async ({ surah, ayah, language }) => {
      const lang = language?.toLowerCase();
      try {
        const { url, data } = await fetchTranslation(surah, ayah, lang);
        return quranpediaOk(url, {
          ayah: `${surah}:${ayah}`,
          language: lang ?? null,
          translations: data,
        });
      } catch (error) {
        if (isQuranpediaNotFound(error)) {
          return quranpediaOk(error.url, {
            ayah: `${surah}:${ayah}`,
            language: lang ?? null,
            translations: null,
          });
        }
        return quranpediaErrorResponse(error);
      }
    },
  );
}
