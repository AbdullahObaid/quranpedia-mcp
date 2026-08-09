import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerGetAyahBookContent } from './get-ayah-book-content.js';
import { registerGetAyahOptions } from './get-ayah-options.js';
import { registerGetSurahInformation } from './get-surah-information.js';
import { registerGetTranslation } from './get-translation.js';
import { registerSearch } from './search.js';

/**
 * Registers every MCP tool exposed by this server.
 * Order is alphabetical for stable `tools/list` output.
 */
export function registerTools(server: McpServer): void {
  registerGetAyahBookContent(server);
  registerGetAyahOptions(server);
  registerGetSurahInformation(server);
  registerGetTranslation(server);
  registerSearch(server);
}
