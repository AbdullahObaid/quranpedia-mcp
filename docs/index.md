# Quranpedia MCP

[![npm version](https://img.shields.io/npm/v/quranpedia-mcp.svg)](https://www.npmjs.com/package/quranpedia-mcp)
[![license](https://img.shields.io/npm/l/quranpedia-mcp.svg)](LICENSE)

An [MCP](https://modelcontextprotocol.io) (Model Context Protocol) server that gives AI
clients fast, accurate, hallucination-free access to the Quran — mushafs, ayahs,
surahs, tafsir, translations, books, fatwas, notes, topics, reciters, and
categories — all backed by the [Quranpedia](https://api.quranpedia.net/v1) API.

> Explore the Quran through 23 MCP tools — mushafs, ayahs, surahs, tafsir, translations, books, fatwas, notes, topics, reciters, and categories. Hosted at mcp.quran.us.kg.

The server is publicly hosted at **<https://mcp.quran.us.kg>** (Cloudflare-fronted, stable
subdomain of `quran.us.kg`) and exposes its full tool surface over both
**stdio** (for local AI clients) and **MCP Streamable HTTP** (for remote/hosted
clients).

## Public endpoint

| Resource | URL |
| --- | --- |
| MCP server (Streamable HTTP) | `https://mcp.quran.us.kg/` |
| Health check | `https://mcp.quran.us.kg/health` |
| Status page | `https://quran.us.kg` |

The HTTP server speaks the standard MCP protocol (`2024-11-05`) over Server-Sent Events.
No API key, no auth — the endpoint is open and CORS-enabled for any client.

## Quick start (HTTP)

The shortest path: use any MCP client and point it at `https://mcp.quran.us.kg/`.
For ad-hoc testing with `curl` + a one-off Node script, see
[integrations.md](integrations.md#other-mcp-compatible-clients).

## Quick start (stdio)

```bash
npx -y quranpedia-mcp
```

This runs the server over stdio. Use it with Claude Desktop, Cursor, or any other
MCP client that supports the stdio transport.

## What can the server do?

Twenty-three tools, all read-only and all backed by the Quranpedia API
(`https://api.quranpedia.net/v1`). Each tool mirrors the API route it calls and
is annotated `openWorldHint: true`:

| Tool | API route |
| --- | --- |
| `get_ayah_book_content` | `GET /ayah/{surah_id}/{ayah_number}/book/{book_id}` |
| `get_ayah_options` | `GET /ayah/{surah_id}/{ayah_number}/options` |
| `get_book` | `GET /book/{book_id}` |
| `get_categories` | `GET /categories/{type?}` |
| `get_category_items` | `GET /category/{category_id}/{type}` |
| `get_fatwa` | `GET /fatwa/{fatwa_id}` |
| `get_mushaf` | `GET /mushafs/{id}` |
| `get_mushaf_ayah` | `GET /mushafs/{mushaf_id}/{surah_id}/{ayah_number}` |
| `get_mushaf_surah` | `GET /mushafs/{mushaf_id}/{surah_id}` |
| `get_mushafs` | `GET /mushafs` |
| `get_note` | `GET /note/{note_id}` |
| `get_reciters` | `GET /reciters` |
| `get_related_books` | `GET /related-books/{book_id}` |
| `get_surah_books` | `GET /surah/books/{surah_id}` |
| `get_surah_fatwas` | `GET /surah/fatwas/{surah_id}` |
| `get_surah_information` | `GET /surah/information/{surah_id}` |
| `get_surah_tafsirs` | `GET /surah/tafsirs/{surah_id}` |
| `get_topics` | `GET /topics` |
| `get_translation` | `GET /translations/{surah_id}/{ayah_number}/{language?}` |
| `get_translation_available_languages` | `GET /translations/available-languages/{surah_id}/{ayah_number}` |
| `get_translation_books` | `GET /translation-books/{language_code?}` |
| `get_translation_by_book` | `GET /translation/{book_id}/{surah_id}/{ayah_number?}` |
| `search` | `GET /search/{query}/{type?}` |

Responses are cached for 30 days in memory (and on disk when `QP_CACHE_DIR` is
set), and each response carries a `source` block so the answer can be attributed
to its upstream URL.

Full reference with schemas and examples: [tools.md](tools.md).

## Documentation

- [Tools reference](tools.md) — every tool, its schema, response shape, and a live example.
- [Integrations](integrations.md) — Claude Desktop, Claude Web, ChatGPT, Cursor, VS Code, and others.
- [Architecture](architecture.md) — internals: transports, HTTP hardening, Docker.
- [Development](development.md) — build, test, lint, add a new tool, deploy.
