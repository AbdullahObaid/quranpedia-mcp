import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fetchSurahFatwas } from '../quranpedia-client.js';
import {
  EXTERNAL_READ_ONLY_ANNOTATIONS,
  isQuranpediaNotFound,
  quranpediaErrorResponse,
  quranpediaOk,
} from './_shared.js';

export function registerGetSurahFatwas(server: McpServer): void {
  server.registerTool(
    'get_surah_fatwas',
    {
      title: 'Get Surah Fatwas',
      description: 'List the fatwas related to a specific surah.',
      inputSchema: z.object({
        surah_id: z.number().int().min(1).max(114),
      }),
      annotations: EXTERNAL_READ_ONLY_ANNOTATIONS,
    },
    async ({ surah_id }) => {
      try {
        const { url, data } = await fetchSurahFatwas(surah_id);
        return quranpediaOk(url, { surah_id, fatwas: data });
      } catch (error) {
        if (isQuranpediaNotFound(error)) {
          return quranpediaOk(error.url, { surah_id, fatwas: null });
        }
        return quranpediaErrorResponse(error);
      }
    },
  );
}
