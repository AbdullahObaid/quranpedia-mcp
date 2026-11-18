import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fetchChanges } from '../quranpedia-client.js';
import {
  EXTERNAL_READ_ONLY_ANNOTATIONS,
  quranpediaErrorResponse,
  quranpediaOk,
} from './_shared.js';

export function registerGetChanges(server: McpServer): void {
  server.registerTool(
    'get_changes',
    {
      title: 'Get Changes',
      description:
        'List what Quranpedia corrected since a date, so a cached copy can be refreshed. Each row carries a refetch path for the resource that changed. Dates further back than a year are refused — the dumps are the way to take a fresh full copy.',
      inputSchema: z.object({
        since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'since should be a date in YYYY-MM-DD form'),
      }),
      annotations: EXTERNAL_READ_ONLY_ANNOTATIONS,
    },
    async ({ since }) => {
      try {
        const { url, data } = await fetchChanges(since);
        return quranpediaOk(url, data);
      } catch (error) {
        return quranpediaErrorResponse(error);
      }
    },
  );
}
