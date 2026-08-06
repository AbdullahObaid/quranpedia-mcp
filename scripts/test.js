import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { CallToolResultSchema, ListToolsResultSchema } from '@modelcontextprotocol/sdk/types.js';

const serverPath = path.join(process.cwd(), 'dist', 'server.js');
const client = new Client({ name: 'quranpedia-mcp-test', version: '0.1.0' });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [serverPath],
  env: process.env,
});

const REQUIRED_TOOLS = [
  'search',
  'list_surahs',
  'get_sura_info',
  'get_verse',
  'get_verses_by_range',
  'find_verses_by_root',
  'find_verses_by_lemma',
  'get_verse_morphology',
  'get_ayah_content_options',
  'get_tafsir',
  'get_translation',
  'get_surah_background',
  'search_quranpedia',
];

const EXTERNAL_TOOLS = new Set([
  'get_ayah_content_options',
  'get_tafsir',
  'get_translation',
  'get_surah_background',
  'search_quranpedia',
]);

function assert(condition, message) {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

function parsePayload(result) {
  if (!result.content || result.content.length === 0) {
    throw new Error('tool returned empty content');
  }
  return JSON.parse(result.content[0].text);
}

async function callTool(name, args) {
  return client.request(
    { method: 'tools/call', params: { name, arguments: args } },
    CallToolResultSchema,
  );
}

try {
  await client.connect(transport);

  // tools/list: every required tool is registered
  const toolsResult = await client.request({ method: 'tools/list' }, ListToolsResultSchema);
  const toolNames = toolsResult.tools.map((tool) => tool.name);
  for (const required of REQUIRED_TOOLS) {
    assert(toolNames.includes(required), `expected tool "${required}" to be registered`);
  }

  // search — happy path
  const searchResult = await callTool('search', {
    query: 'الحمد',
    lemma: true,
    root: true,
    page: 1,
    limit: 3,
  });
  const searchPayload = parsePayload(searchResult);
  assert(Array.isArray(searchPayload.results), 'search.results should be an array');

  // list_surahs — returns 114 suras
  const listResult = await callTool('list_surahs', {});
  const listPayload = parsePayload(listResult);
  assert(listPayload.surahs.length === 114, `list_surahs should return 114, got ${listPayload.surahs.length}`);

  // get_sura_info — by numeric id
  const suraResult = await callTool('get_sura_info', { identifier: 1 });
  const suraPayload = parsePayload(suraResult);
  assert(suraPayload.sura && suraPayload.sura.id === 1, 'get_sura_info(1) should return Fatihah');

  // get_sura_info — by romanization
  const baqarahResult = await callTool('get_sura_info', { identifier: 'Al-Baqarah' });
  const baqarahPayload = parsePayload(baqarahResult);
  assert(baqarahPayload.sura && baqarahPayload.sura.id === 2, 'get_sura_info("Al-Baqarah") should return Baqarah');

  // get_sura_info — missing → null
  const missingSura = await callTool('get_sura_info', { identifier: 999 });
  const missingSuraPayload = parsePayload(missingSura);
  assert(missingSuraPayload.sura === null, 'get_sura_info(999) should return null');

  // get_verse — by gid
  const verseResult = await callTool('get_verse', { gid: 1 });
  const versePayload = parsePayload(verseResult);
  assert(
    versePayload.verse && versePayload.verse.sura_id === 1 && versePayload.verse.aya_id === 1,
    'get_verse(gid:1) should return Al-Fatihah 1:1',
  );

  // get_verse — by (suraId, ayaId)
  const verseBySura = await callTool('get_verse', { suraId: 2, ayaId: 255 });
  const verseBySuraPayload = parsePayload(verseBySura);
  assert(
    verseBySuraPayload.verse && verseBySuraPayload.verse.gid === 262,
    'get_verse(suraId:2, ayaId:255) should resolve to Ayat al-Kursi',
  );

  // get_verses_by_range — single verse
  const ayatKursi = await callTool('get_verses_by_range', { range: '2:255' });
  const ayatKursiPayload = parsePayload(ayatKursi);
  assert(ayatKursiPayload.verses.length === 1, "'2:255' should return 1 verse");

  // get_verses_by_range — range
  const fatihahFull = await callTool('get_verses_by_range', { range: '1:1-7' });
  const fatihahFullPayload = parsePayload(fatihahFull);
  assert(fatihahFullPayload.verses.length === 7, "'1:1-7' should return 7 verses");

  // get_verse_morphology
  const morphResult = await callTool('get_verse_morphology', { gid: 1 });
  const morphPayload = parsePayload(morphResult);
  assert(
    morphPayload.morphology && Array.isArray(morphPayload.morphology.lemmas),
    'get_verse_morphology should return morphology with lemmas array',
  );

  // find_verses_by_lemma
  const lemmaResult = await callTool('find_verses_by_lemma', { lemma: 'حمد', limit: 3 });
  const lemmaPayload = parsePayload(lemmaResult);
  assert(lemmaPayload.verses.length > 0, "find_verses_by_lemma('حمد') should return verses");
  assert(typeof lemmaPayload.normalizedLemma === 'string', 'normalizedLemma should be echoed back');

  // find_verses_by_root — unknown root → empty
  const noRoot = await callTool('find_verses_by_root', { root: 'XYZNOMATCH' });
  const noRootPayload = parsePayload(noRoot);
  assert(
    noRootPayload.verses.length === 0 && noRootPayload.pagination.totalResults === 0,
    "find_verses_by_root('XYZNOMATCH') should return empty pagination",
  );

  // Negative: get_verse with neither gid nor (suraId, ayaId) → tool error
  const emptyVerseResult = await callTool('get_verse', {});
  assert(emptyVerseResult.isError === true, 'get_verse({}) should return isError');

  // Negative: get_verses_by_range with bad syntax → tool error
  const badRangeResult = await callTool('get_verses_by_range', { range: 'abc:def' });
  assert(badRangeResult.isError === true, "get_verses_by_range('abc:def') should return isError");

  // get_ayah_content_options — 1:1 exposes a rich option set
  const optionsResult = await callTool('get_ayah_content_options', { surah: 1, ayah: 1 });
  const optionsPayload = parsePayload(optionsResult);
  assert(
    optionsPayload.ayah && Array.isArray(optionsPayload.ayah.options),
    'get_ayah_content_options(1,1) should return an options array',
  );
  assert(
    optionsPayload.ayah.options.includes('tafsir'),
    "get_ayah_content_options(1,1) should include 'tafsir' in options",
  );
  assert(optionsPayload.source?.provider === 'quranpedia', 'response should carry a quranpedia source block');

  // get_ayah_content_options — unknown ayah (1:8 does not exist) → null, not an error
  const missingAyah = await callTool('get_ayah_content_options', { surah: 1, ayah: 8 });
  const missingAyahPayload = parsePayload(missingAyah);
  assert(missingAyahPayload.ayah === null, 'get_ayah_content_options(1,8) should return ayah: null');

  // get_tafsir — default book (تيسير التفسير) for Ayat al-Kursi
  const tafsirResult = await callTool('get_tafsir', { surah: 2, ayah: 255 });
  const tafsirPayload = parsePayload(tafsirResult);
  assert(tafsirPayload.book && tafsirPayload.book.id === 1, 'get_tafsir(2,255) should default to book 1');
  assert(
    Array.isArray(tafsirPayload.content) && tafsirPayload.content.length > 0,
    'get_tafsir(2,255) should return tafsir content',
  );

  // get_tafsir — unknown book → falls back to available books list
  const tafsirFallback = await callTool('get_tafsir', { surah: 1, ayah: 1, book_id: 99999999 });
  const tafsirFallbackPayload = parsePayload(tafsirFallback);
  assert(
    tafsirFallbackPayload.tafsir === null && Array.isArray(tafsirFallbackPayload.availableBooks),
    'get_tafsir with a bad book_id should fall back to availableBooks',
  );

  // get_translation — English for 2:255
  const translationResult = await callTool('get_translation', { surah: 2, ayah: 255, language: 'en' });
  const translationPayload = parsePayload(translationResult);
  assert(
    Array.isArray(translationPayload.translations) && translationPayload.translations.length > 0,
    'get_translation(2,255,en) should return translations',
  );

  // get_translation — unknown ayah (1:8 does not exist) → null
  const missingTranslation = await callTool('get_translation', { surah: 1, ayah: 8, language: 'en' });
  const missingTranslationPayload = parsePayload(missingTranslation);
  assert(
    missingTranslationPayload.translations === null,
    'get_translation(1,8,en) should return translations: null',
  );

  // get_surah_background — Al-Baqarah
  const backgroundResult = await callTool('get_surah_background', { surah: 2 });
  const backgroundPayload = parsePayload(backgroundResult);
  assert(
    backgroundPayload.information && backgroundPayload.information.surah_type,
    'get_surah_background(2) should return revelation type info',
  );

  // get_surah_background — out-of-range surah → tool error (schema rejects > 114)
  const missingBackground = await callTool('get_surah_background', { surah: 999 });
  assert(missingBackground.isError === true, 'get_surah_background(999) should return isError');

  // search_quranpedia — all types
  const qpSearchResult = await callTool('search_quranpedia', { query: 'رحمن' });
  const qpSearchPayload = parsePayload(qpSearchResult);
  assert(
    qpSearchPayload.results && typeof qpSearchPayload.results === 'object',
    'search_quranpedia("رحمن") should return grouped results',
  );

  // search_quranpedia — single type
  const qpSearchBooks = await callTool('search_quranpedia', { query: 'تفسير', type: 'books' });
  const qpSearchBooksPayload = parsePayload(qpSearchBooks);
  assert(
    Array.isArray(qpSearchBooksPayload.results.items),
    "search_quranpedia('تفسير','books') should return an items array",
  );

  // search_quranpedia — invalid type → tool error
  const badTypeResult = await callTool('search_quranpedia', { query: 'رحمن', type: 'bogus' });
  assert(badTypeResult.isError === true, "search_quranpedia('bogus' type) should return isError");

  console.log('stdio transport test passed');
  process.exit(0);
} catch (error) {
  console.error(error);
  process.exit(1);
} finally {
  try {
    await client.close();
  } catch {
    process.exit(1);
  }
}
