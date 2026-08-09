import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fetchMushafSurah } from '../quranpedia-client.js';
import {
  EXTERNAL_READ_ONLY_ANNOTATIONS,
  isQuranpediaNotFound,
  quranpediaErrorResponse,
  quranpediaOk,
} from './_shared.js';

export function registerGetMushafSurah(server: McpServer): void {
  server.registerTool(
    'get_mushaf_surah',
    {
      title: 'Get Mushaf Surah',
      description: 'Get all ayahs of one surah from a mushaf.',
      inputSchema: z.object({
        mushaf_id: z.number().int().min(1).default(1),
        surah_id: z.number().int().min(1).max(114),
      }),
      annotations: EXTERNAL_READ_ONLY_ANNOTATIONS,
    },
    async ({ mushaf_id, surah_id }) => {
      try {
        const { url, data } = await fetchMushafSurah(mushaf_id, surah_id);
        return quranpediaOk(url, { mushaf_id, surah_id, ayahs: data });
      } catch (error) {
        if (isQuranpediaNotFound(error)) {
          return quranpediaOk(error.url, { mushaf_id, surah_id, ayahs: null });
        }
        return quranpediaErrorResponse(error);
      }
    },
  );
}
