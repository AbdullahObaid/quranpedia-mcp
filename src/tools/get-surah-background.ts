import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fetchSurahInformation } from '../quranpedia-client.js';
import {
  EXTERNAL_READ_ONLY_ANNOTATIONS,
  isQuranpediaNotFound,
  quranpediaErrorResponse,
  quranpediaOk,
} from './_shared.js';

export function registerGetSurahBackground(server: McpServer): void {
  server.registerTool(
    'get_surah_background',
    {
      title: 'Get Surah Background',
      description:
        'Get Quranpedia background for one surah by number: introduction, revelation type, descent order, virtues, reasons for revelation, topics, and purposes. This is scholarly background, distinct from the structural get_sura_info tool.',
      inputSchema: z.object({
        surah: z.number().int().min(1).max(114),
      }),
      annotations: EXTERNAL_READ_ONLY_ANNOTATIONS,
    },
    async ({ surah }) => {
      try {
        const { url, data } = await fetchSurahInformation(surah);
        return quranpediaOk(url, { surah, information: data });
      } catch (error) {
        if (isQuranpediaNotFound(error)) {
          return quranpediaOk(error.url, { surah, information: null });
        }
        return quranpediaErrorResponse(error);
      }
    },
  );
}
