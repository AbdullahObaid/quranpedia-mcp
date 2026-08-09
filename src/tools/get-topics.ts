import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fetchTopics } from '../quranpedia-client.js';
import {
  EXTERNAL_READ_ONLY_ANNOTATIONS,
  isQuranpediaNotFound,
  quranpediaErrorResponse,
  quranpediaOk,
} from './_shared.js';

export function registerGetTopics(server: McpServer): void {
  server.registerTool(
    'get_topics',
    {
      title: 'Get Topics',
      description: 'List all Quranic topics with their linked ayahs. Topics are hierarchical.',
      inputSchema: z.object({}),
      annotations: EXTERNAL_READ_ONLY_ANNOTATIONS,
    },
    async () => {
      try {
        const { url, data } = await fetchTopics();
        return quranpediaOk(url, { topics: data });
      } catch (error) {
        if (isQuranpediaNotFound(error)) {
          return quranpediaOk(error.url, { topics: null });
        }
        return quranpediaErrorResponse(error);
      }
    },
  );
}
