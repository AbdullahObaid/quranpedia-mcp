import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fetchMushafs } from '../quranpedia-client.js';
import {
  EXTERNAL_READ_ONLY_ANNOTATIONS,
  quranpediaErrorResponse,
  quranpediaOk,
} from './_shared.js';

export function registerGetMushafs(server: McpServer): void {
  server.registerTool(
    'get_mushafs',
    {
      title: 'Get Mushafs',
      description:
        'List all available mushafs (Quran editions) with metadata: name, font files, image packages, and riwaya.',
      inputSchema: z.object({}),
      annotations: EXTERNAL_READ_ONLY_ANNOTATIONS,
    },
    async () => {
      try {
        const { url, data } = await fetchMushafs();
        return quranpediaOk(url, { mushafs: data });
      } catch (error) {
        return quranpediaErrorResponse(error);
      }
    },
  );
}
