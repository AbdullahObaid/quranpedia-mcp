import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fetchCategories } from '../quranpedia-client.js';
import {
  EXTERNAL_READ_ONLY_ANNOTATIONS,
  isQuranpediaNotFound,
  quranpediaErrorResponse,
  quranpediaOk,
} from './_shared.js';

export function registerGetCategories(server: McpServer): void {
  server.registerTool(
    'get_categories',
    {
      title: 'Get Categories',
      description:
        'List categories, optionally filtered by content type (books, fatwas, or notes) to include counts.',
      inputSchema: z.object({
        type: z.enum(['books', 'fatwas', 'notes']).optional(),
      }),
      annotations: EXTERNAL_READ_ONLY_ANNOTATIONS,
    },
    async ({ type }) => {
      try {
        const { url, data } = await fetchCategories(type);
        return quranpediaOk(url, { type, categories: data });
      } catch (error) {
        if (isQuranpediaNotFound(error)) {
          return quranpediaOk(error.url, { type, categories: null });
        }
        return quranpediaErrorResponse(error);
      }
    },
  );
}
