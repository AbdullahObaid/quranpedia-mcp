import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { searchQuranpedia } from '../quranpedia-client.js';
import {
  EXTERNAL_READ_ONLY_ANNOTATIONS,
  quranpediaErrorResponse,
  quranpediaOk,
} from './_shared.js';

export function registerSearchQuranpedia(server: McpServer): void {
  server.registerTool(
    'search_quranpedia',
    {
      title: 'Search Quranpedia',
      description:
        'Search the Quranpedia encyclopedia (books, fatwas, notes, and topics) by keyword. Pass books, fatwas, notes, or topics as type to narrow the search; omit type to search all content at once. This searches encyclopedia content, distinct from the Quran text search tool.',
      inputSchema: z.object({
        query: z.string().min(1),
        type: z.enum(['books', 'fatwas', 'notes', 'topics']).optional(),
      }),
      annotations: EXTERNAL_READ_ONLY_ANNOTATIONS,
    },
    async ({ query, type }) => {
      try {
        const { url, data } = await searchQuranpedia(query, type);
        return quranpediaOk(url, { query, type: type ?? null, results: data });
      } catch (error) {
        return quranpediaErrorResponse(error);
      }
    },
  );
}
