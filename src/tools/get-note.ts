import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fetchNote } from '../quranpedia-client.js';
import {
  EXTERNAL_READ_ONLY_ANNOTATIONS,
  isQuranpediaNotFound,
  quranpediaErrorResponse,
  quranpediaOk,
} from './_shared.js';

export function registerGetNote(server: McpServer): void {
  server.registerTool(
    'get_note',
    {
      title: 'Get Note',
      description: 'A scholarly note with its text, linked ayahs, writer, and category.',
      inputSchema: z.object({
        note_id: z.number().int().min(1),
      }),
      annotations: EXTERNAL_READ_ONLY_ANNOTATIONS,
    },
    async ({ note_id }) => {
      try {
        const { url, data } = await fetchNote(note_id);
        return quranpediaOk(url, { note_id, note: data });
      } catch (error) {
        if (isQuranpediaNotFound(error)) {
          return quranpediaOk(error.url, { note_id, note: null });
        }
        return quranpediaErrorResponse(error);
      }
    },
  );
}
