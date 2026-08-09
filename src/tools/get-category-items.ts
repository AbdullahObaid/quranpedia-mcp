import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fetchCategoryItems } from '../quranpedia-client.js';
import {
  EXTERNAL_READ_ONLY_ANNOTATIONS,
  isQuranpediaNotFound,
  quranpediaErrorResponse,
  quranpediaOk,
} from './_shared.js';

export function registerGetCategoryItems(server: McpServer): void {
  server.registerTool(
    'get_category_items',
    {
      title: 'Get Category Items',
      description: 'Get books, fatwas, or notes within a specific category.',
      inputSchema: z.object({
        category_id: z.number().int().min(1),
        type: z.enum(['books', 'fatwas', 'notes']),
      }),
      annotations: EXTERNAL_READ_ONLY_ANNOTATIONS,
    },
    async ({ category_id, type }) => {
      try {
        const { url, data } = await fetchCategoryItems(category_id, type);
        return quranpediaOk(url, { category_id, type, items: data });
      } catch (error) {
        if (isQuranpediaNotFound(error)) {
          return quranpediaOk(error.url, { category_id, type, items: null });
        }
        return quranpediaErrorResponse(error);
      }
    },
  );
}
