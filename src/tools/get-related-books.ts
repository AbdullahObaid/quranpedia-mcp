import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fetchRelatedBooks } from '../quranpedia-client.js';
import {
  EXTERNAL_READ_ONLY_ANNOTATIONS,
  isQuranpediaNotFound,
  quranpediaErrorResponse,
  quranpediaOk,
} from './_shared.js';

export function registerGetRelatedBooks(server: McpServer): void {
  server.registerTool(
    'get_related_books',
    {
      title: 'Get Related Books',
      description:
        'Books related to a given book by author, category, or topic. Returns empty when none exist.',
      inputSchema: z.object({
        book_id: z.number().int().min(1),
      }),
      annotations: EXTERNAL_READ_ONLY_ANNOTATIONS,
    },
    async ({ book_id }) => {
      try {
        const { url, data } = await fetchRelatedBooks(book_id);
        return quranpediaOk(url, { book_id, related_books: data });
      } catch (error) {
        if (isQuranpediaNotFound(error)) {
          return quranpediaOk(error.url, { book_id, related_books: null });
        }
        return quranpediaErrorResponse(error);
      }
    },
  );
}
