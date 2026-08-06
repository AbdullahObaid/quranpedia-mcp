import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fetchAyahOptions } from '../quranpedia-client.js';
import {
  EXTERNAL_READ_ONLY_ANNOTATIONS,
  isQuranpediaNotFound,
  quranpediaErrorResponse,
  quranpediaOk,
} from './_shared.js';

export function registerGetAyahContentOptions(server: McpServer): void {
  server.registerTool(
    'get_ayah_content_options',
    {
      title: 'Get Ayah Content Options',
      description:
        'List the related Quranpedia content available for one ayah by surah and ayah number (tafsir, e3rab, asbab, translations, meanings, and more). Use this to discover what can be fetched next.',
      inputSchema: z.object({
        surah: z.number().int().min(1).max(114),
        ayah: z.number().int().min(1).max(286),
      }),
      annotations: EXTERNAL_READ_ONLY_ANNOTATIONS,
    },
    async ({ surah, ayah }) => {
      try {
        const { url, data } = await fetchAyahOptions(surah, ayah);
        return quranpediaOk(url, { ayah: data });
      } catch (error) {
        if (isQuranpediaNotFound(error)) {
          return quranpediaOk(error.url, { ayah: null });
        }
        return quranpediaErrorResponse(error);
      }
    },
  );
}
