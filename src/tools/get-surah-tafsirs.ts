import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fetchSurahTafsirs } from '../quranpedia-client.js';
import {
  EXTERNAL_READ_ONLY_ANNOTATIONS,
  isQuranpediaNotFound,
  quranpediaErrorResponse,
  quranpediaOk,
} from './_shared.js';

export function registerGetSurahTafsirs(server: McpServer): void {
  server.registerTool(
    'get_surah_tafsirs',
    {
      title: 'Get Surah Tafsirs',
      description: 'List the tafsir books available for a specific surah.',
      inputSchema: z.object({
        surah_id: z.number().int().min(1).max(114),
      }),
      annotations: EXTERNAL_READ_ONLY_ANNOTATIONS,
    },
    async ({ surah_id }) => {
      try {
        const { url, data } = await fetchSurahTafsirs(surah_id);
        return quranpediaOk(url, { surah_id, tafsirs: data });
      } catch (error) {
        if (isQuranpediaNotFound(error)) {
          return quranpediaOk(error.url, { surah_id, tafsirs: null });
        }
        return quranpediaErrorResponse(error);
      }
    },
  );
}
