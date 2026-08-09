import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fetchMushafAyah } from '../quranpedia-client.js';
import {
  EXTERNAL_READ_ONLY_ANNOTATIONS,
  isQuranpediaNotFound,
  quranpediaErrorResponse,
  quranpediaOk,
} from './_shared.js';

export function registerGetMushafAyah(server: McpServer): void {
  server.registerTool(
    'get_mushaf_ayah',
    {
      title: 'Get Mushaf Ayah',
      description: 'Get a single ayah text from a mushaf by mushaf id, surah id, and ayah number.',
      inputSchema: z.object({
        mushaf_id: z.number().int().min(1).default(1),
        surah_id: z.number().int().min(1).max(114),
        ayah_number: z.number().int().min(1).max(286),
      }),
      annotations: EXTERNAL_READ_ONLY_ANNOTATIONS,
    },
    async ({ mushaf_id, surah_id, ayah_number }) => {
      try {
        const { url, data } = await fetchMushafAyah(mushaf_id, surah_id, ayah_number);
        return quranpediaOk(url, {
          mushaf_id,
          surah_id,
          ayah_number,
          ayah: data,
        });
      } catch (error) {
        if (isQuranpediaNotFound(error)) {
          return quranpediaOk(error.url, {
            mushaf_id,
            surah_id,
            ayah_number,
            ayah: null,
          });
        }
        return quranpediaErrorResponse(error);
      }
    },
  );
}
