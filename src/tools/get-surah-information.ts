import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fetchSurahInformation } from '../quranpedia-client.js';
import {
  EXTERNAL_READ_ONLY_ANNOTATIONS,
  isQuranpediaNotFound,
  quranpediaErrorResponse,
  quranpediaOk,
} from './_shared.js';

export function registerGetSurahInformation(server: McpServer): void {
  server.registerTool(
    'get_surah_information',
    {
      title: 'Get Surah Information',
      description:
        'Scholarly surah background: introduction, revelation type, descent order, virtues, topics, purposes.',
      inputSchema: z.object({
        surah_id: z.number().int().min(1).max(114),
      }),
      annotations: EXTERNAL_READ_ONLY_ANNOTATIONS,
    },
    async ({ surah_id }) => {
      try {
        const { url, data } = await fetchSurahInformation(surah_id);
        return quranpediaOk(url, { surah_id, information: data });
      } catch (error) {
        if (isQuranpediaNotFound(error)) {
          return quranpediaOk(error.url, { surah_id, information: null });
        }
        return quranpediaErrorResponse(error);
      }
    },
  );
}
