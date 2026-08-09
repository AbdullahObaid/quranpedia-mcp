import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fetchAyahOptions } from '../quranpedia-client.js';
import {
  EXTERNAL_READ_ONLY_ANNOTATIONS,
  isQuranpediaNotFound,
  quranpediaErrorResponse,
  quranpediaOk,
} from './_shared.js';

export function registerGetAyahOptions(server: McpServer): void {
  server.registerTool(
    'get_ayah_options',
    {
      title: 'Get Ayah Options',
      description:
        'List the related content available for one ayah in the Hafs mushaf: tafsir, meanings, topics, fatwa, e3rab, notes, asbab, translations.',
      inputSchema: z.object({
        surah_id: z.number().int().min(1).max(114),
        ayah_number: z.number().int().min(1).max(286),
      }),
      annotations: EXTERNAL_READ_ONLY_ANNOTATIONS,
    },
    async ({ surah_id, ayah_number }) => {
      try {
        const { url, data } = await fetchAyahOptions(surah_id, ayah_number);
        return quranpediaOk(url, {
          surah_id,
          ayah_number,
          options: data,
        });
      } catch (error) {
        if (isQuranpediaNotFound(error)) {
          return quranpediaOk(error.url, {
            surah_id,
            ayah_number,
            options: null,
          });
        }
        return quranpediaErrorResponse(error);
      }
    },
  );
}
