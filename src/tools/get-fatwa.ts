import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fetchFatwa } from '../quranpedia-client.js';
import {
  EXTERNAL_READ_ONLY_ANNOTATIONS,
  isQuranpediaNotFound,
  quranpediaErrorResponse,
  quranpediaOk,
} from './_shared.js';

export function registerGetFatwa(server: McpServer): void {
  server.registerTool(
    'get_fatwa',
    {
      title: 'Get Fatwa',
      description: 'A single fatwa with question, answer, mufti, source URL, and category.',
      inputSchema: z.object({
        fatwa_id: z.number().int().min(1),
      }),
      annotations: EXTERNAL_READ_ONLY_ANNOTATIONS,
    },
    async ({ fatwa_id }) => {
      try {
        const { url, data } = await fetchFatwa(fatwa_id);
        return quranpediaOk(url, { fatwa_id, fatwa: data });
      } catch (error) {
        if (isQuranpediaNotFound(error)) {
          return quranpediaOk(error.url, { fatwa_id, fatwa: null });
        }
        return quranpediaErrorResponse(error);
      }
    },
  );
}
