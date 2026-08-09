import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fetchReciters } from '../quranpedia-client.js';
import {
  EXTERNAL_READ_ONLY_ANNOTATIONS,
  isQuranpediaNotFound,
  quranpediaErrorResponse,
  quranpediaOk,
} from './_shared.js';

export function registerGetReciters(server: McpServer): void {
  server.registerTool(
    'get_reciters',
    {
      title: 'Get Reciters',
      description: 'List all reciters with recitations, audio servers, and available surahs.',
      inputSchema: z.object({}),
      annotations: EXTERNAL_READ_ONLY_ANNOTATIONS,
    },
    async () => {
      try {
        const { url, data } = await fetchReciters();
        return quranpediaOk(url, { reciters: data });
      } catch (error) {
        if (isQuranpediaNotFound(error)) {
          return quranpediaOk(error.url, { reciters: null });
        }
        return quranpediaErrorResponse(error);
      }
    },
  );
}
