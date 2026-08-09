import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fetchTranslationBooks } from '../quranpedia-client.js';
import {
  EXTERNAL_READ_ONLY_ANNOTATIONS,
  isQuranpediaNotFound,
  quranpediaErrorResponse,
  quranpediaOk,
} from './_shared.js';

export function registerGetTranslationBooks(server: McpServer): void {
  server.registerTool(
    'get_translation_books',
    {
      title: 'Get Translation Books',
      description: 'List available translation books, optionally filtered by language code.',
      inputSchema: z.object({
        language: z.string().min(2).max(10).optional(),
      }),
      annotations: EXTERNAL_READ_ONLY_ANNOTATIONS,
    },
    async ({ language }) => {
      try {
        const { url, data } = await fetchTranslationBooks(language);
        return quranpediaOk(url, { language: language ?? null, books: data });
      } catch (error) {
        if (isQuranpediaNotFound(error)) {
          return quranpediaOk(error.url, { language: language ?? null, books: null });
        }
        return quranpediaErrorResponse(error);
      }
    },
  );
}
