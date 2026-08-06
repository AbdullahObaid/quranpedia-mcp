# Quranpedia MCP

[![npm version](https://img.shields.io/npm/v/quranpedia-mcp.svg)](https://www.npmjs.com/package/quranpedia-mcp)
[![MCP Registry](https://img.shields.io/badge/MCP-Registry-blue?style=flat&logo=github)](https://github.com/modelcontextprotocol/servers)
[![smithery badge](https://smithery.ai/badge/adelpro/quranpedia-mcp)](https://smithery.ai/servers/adelpro/quranpedia-mcp)
[![license](https://img.shields.io/npm/l/quranpedia-mcp.svg)](LICENSE)
[![Powered by quran-search-engine](https://img.shields.io/badge/Powered%20by-quran--search--engine-green)](https://github.com/adelpro/quran-search-engine)
[![quran-search-engine](https://img.shields.io/npm/v/quran-search-engine.svg?label=engine&color=blue)](https://www.npmjs.com/package/quran-search-engine)

An MCP (Model Context Protocol) server that gives AI clients fast, accurate,
hallucination-free access to the Quran — search, navigation, morphology,
**tafsir, translations, and surah background** — over **stdio** and **Streamable HTTP**.

> Explore the Quran through 13 MCP tools — verses, surahs, lemmas, roots, morphology, tafsir, translations, and Quranpedia encyclopedia search. Hosted at mcp.quran.us.kg.
> Instead of relying on an AI to "hallucinate" or predict Quranic verses, this
> tool routes every request to a dedicated search engine. The AI handles the
> natural language; the server returns the exact, literal Quranic text.
> Tafsir and translations come from the Quranpedia API
> (https://api.quranpedia.net/v1), with each answer attributed to its source.

## Public endpoint

The server is publicly hosted at **<https://mcp.quran.us.kg/>**
(Cloudflare-fronted, stable). No API key, no auth — the endpoint is open and
CORS-enabled for any client.

| Resource | URL |
| --- | --- |
| MCP server (Streamable HTTP) | `https://mcp.quran.us.kg/` |
| Health check | `https://mcp.quran.us.kg/health` |
| Status page | `https://quran.us.kg` |

## Features

- 🔌 **MCP compatible** — Claude Desktop, Claude Web, ChatGPT, Cursor, VS Code, and others.
- 🌐 **Two transports** — stdio for local integrations, Streamable HTTP for remote/hosted.
- 🔍 **Thirteen tools** — full-text search, surah metadata, verse navigation, lemma/root lookup, morphology, plus tafsir, translations, surah background, per-ayah content options, and Quranpedia encyclopedia search.
- 📖 **Accurate results** — every verse comes from a verified dataset; no LLM in the loop. Tafsir and translations come from Quranpedia with a `source` URL attached.
- 🛡️ **Hardened HTTP** — host allow-list, per-IP rate limit, body cap, session reaper, `/health`.
- 🗄️ **Offline-friendly Quranpedia cache** — responses cached in memory (and optionally on disk) for 30 days.

## Install

```bash
# Use the public endpoint
# → point your MCP client at https://mcp.quran.us.kg/

# Or run the server locally (stdio)
npx -y quranpedia-mcp
```

## Documentation

Detailed docs live under [`docs/`](docs/index.md):

- [Tools reference](docs/tools.md) — every tool, its schema, response shape, and examples.
- [Integrations](docs/integrations.md) — Claude Desktop, Claude Web, ChatGPT, Cursor, and others.
- [Architecture](docs/architecture.md) — internals: transports, dataset loading, HTTP hardening.
- [Development](docs/development.md) — build, test, add a new tool, deploy.

## Quick start (HTTP)

The shortest path: use any MCP client and point it at `https://mcp.quran.us.kg/`.
For ad-hoc testing, the [integrations page](docs/integrations.md#other-mcp-compatible-clients)
shows a one-off Node snippet that uses `@modelcontextprotocol/sdk` directly.

## Quick start (Docker)

```bash
docker compose up --build
# → "Quran MCP HTTP server listening on http://0.0.0.0:4000/"
```

## Requirements

- Node.js 20+ (LTS recommended)
- npm, pnpm, or yarn
- Network access to `api.quranpedia.net` for the five Quranpedia tools (the 8 dataset tools work offline).

## License

MIT — see [LICENSE](LICENSE).

## Contact

Email: <contact@adelpro.us.kg>
