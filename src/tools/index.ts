import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerGetAyahBookContent } from './get-ayah-book-content.js';
import { registerGetAyahOptions } from './get-ayah-options.js';
import { registerGetMushaf } from './get-mushaf.js';
import { registerGetMushafAyah } from './get-mushaf-ayah.js';
import { registerGetMushafs } from './get-mushafs.js';
import { registerGetMushafSurah } from './get-mushaf-surah.js';
import { registerGetSurahBooks } from './get-surah-books.js';
import { registerGetSurahFatwas } from './get-surah-fatwas.js';
import { registerGetSurahInformation } from './get-surah-information.js';
import { registerGetSurahTafsirs } from './get-surah-tafsirs.js';
import { registerGetTranslation } from './get-translation.js';
import { registerSearch } from './search.js';

/**
 * Registers every MCP tool exposed by this server.
 * Order is alphabetical for stable `tools/list` output.
 */
export function registerTools(server: McpServer): void {
  registerGetAyahBookContent(server);
  registerGetAyahOptions(server);
  registerGetMushaf(server);
  registerGetMushafAyah(server);
  registerGetMushafs(server);
  registerGetMushafSurah(server);
  registerGetSurahBooks(server);
  registerGetSurahFatwas(server);
  registerGetSurahInformation(server);
  registerGetSurahTafsirs(server);
  registerGetTranslation(server);
  registerSearch(server);
}
