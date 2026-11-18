import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { AYAH_SERVICES, fetchAyahService } from '../quranpedia-client.js';
import {
  EXTERNAL_READ_ONLY_ANNOTATIONS,
  isQuranpediaNotFound,
  quranpediaErrorResponse,
  quranpediaOk,
} from './_shared.js';

export function registerGetAyahContent(server: McpServer): void {
  server.registerTool(
    'get_ayah_content',
    {
      title: 'Get Ayah Content',
      description:
        "Fetch one service's content for one ayah: asbab, e3rab, fatwa, meanings, mutshabeh, nasekh, notes, qiraat, similar, tafsir, topics or translations. Call get_ayah_options first to see which of them exist for that ayah.",
      inputSchema: z.object({
        surah: z.number().int().min(1).max(114),
        ayah: z.number().int().min(1).max(286),
        service: z.enum(AYAH_SERVICES),
      }),
      annotations: EXTERNAL_READ_ONLY_ANNOTATIONS,
    },
    async ({ surah, ayah, service }) => {
      try {
        const { url, data } = await fetchAyahService(surah, ayah, service);
        return quranpediaOk(url, { ayah: `${surah}:${ayah}`, service, content: data });
      } catch (error) {
        // A missing ayah is a null answer rather than a failure, matching
        // get_ayah_options.
        if (isQuranpediaNotFound(error)) {
          return quranpediaOk(error.url, {
            ayah: `${surah}:${ayah}`,
            service,
            content: null,
            reason: error.message,
          });
        }
        return quranpediaErrorResponse(error);
      }
    },
  );
}
