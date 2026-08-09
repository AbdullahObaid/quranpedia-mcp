import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fetchBook } from '../quranpedia-client.js';
import {
  EXTERNAL_READ_ONLY_ANNOTATIONS,
  isQuranpediaNotFound,
  quranpediaErrorResponse,
  quranpediaOk,
} from './_shared.js';

export function registerGetBook(server: McpServer): void {
  server.registerTool(
    'get_book',
    {
      title: 'Get Book',
      description:
        'Detailed information about a single Quranpedia book: author, category, parts, edition, publisher, and contents URL.',
      inputSchema: z.object({
        book_id: z.number().int().min(1),
      }),
      annotations: EXTERNAL_READ_ONLY_ANNOTATIONS,
    },
    async ({ book_id }) => {
      try {
        const { url, data } = await fetchBook(book_id);
        return quranpediaOk(url, { book_id, book: data });
      } catch (error) {
        if (isQuranpediaNotFound(error)) {
          return quranpediaOk(error.url, { book_id, book: null });
        }
        return quranpediaErrorResponse(error);
      }
    },
  );
}
