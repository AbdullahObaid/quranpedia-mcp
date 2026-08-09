import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fetchMushaf } from '../quranpedia-client.js';
import {
  EXTERNAL_READ_ONLY_ANNOTATIONS,
  isQuranpediaNotFound,
  quranpediaErrorResponse,
  quranpediaOk,
} from './_shared.js';

export function registerGetMushaf(server: McpServer): void {
  server.registerTool(
    'get_mushaf',
    {
      title: 'Get Mushaf',
      description:
        'Get a single mushaf with all its surahs and ayahs. Response is large — prefer get_mushaf_surah or get_mushaf_ayah for targeted lookups.',
      inputSchema: z.object({
        id: z.number().int().min(1),
      }),
      annotations: EXTERNAL_READ_ONLY_ANNOTATIONS,
    },
    async ({ id }) => {
      try {
        const { url, data } = await fetchMushaf(id);
        return quranpediaOk(url, { id, mushaf: data });
      } catch (error) {
        if (isQuranpediaNotFound(error)) {
          return quranpediaOk(error.url, { id, mushaf: null });
        }
        return quranpediaErrorResponse(error);
      }
    },
  );
}
