import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fetchSurahBooks } from '../quranpedia-client.js';
import {
  EXTERNAL_READ_ONLY_ANNOTATIONS,
  isQuranpediaNotFound,
  quranpediaErrorResponse,
  quranpediaOk,
} from './_shared.js';

export function registerGetSurahBooks(server: McpServer): void {
  server.registerTool(
    'get_surah_books',
    {
      title: 'Get Surah Books',
      description: 'List the books whose content covers a specific surah.',
      inputSchema: z.object({
        surah_id: z.number().int().min(1).max(114),
      }),
      annotations: EXTERNAL_READ_ONLY_ANNOTATIONS,
    },
    async ({ surah_id }) => {
      try {
        const { url, data } = await fetchSurahBooks(surah_id);
        return quranpediaOk(url, { surah_id, books: data });
      } catch (error) {
        if (isQuranpediaNotFound(error)) {
          return quranpediaOk(error.url, { surah_id, books: null });
        }
        return quranpediaErrorResponse(error);
      }
    },
  );
}
