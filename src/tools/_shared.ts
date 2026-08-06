import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { getDataset, isDataLoaded, type QuranDataset } from '../data.js';
import { QuranpediaError } from '../quranpedia-client.js';

/**
 * Wraps a successful payload as the standard MCP text-content response.
 * Every tool returns the same shape so clients can rely on it.
 */
export function jsonOk(payload: unknown): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload) }],
  };
}

/**
 * Wraps an error message as a standard MCP tool-error response.
 */
export function jsonError(message: string): CallToolResult {
  return {
    isError: true,
    content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
  };
}

/**
 * Catch-all error → MCP error response.
 */
export function handleCaughtError(error: unknown): CallToolResult {
  return jsonError(error instanceof Error ? error.message : 'Unknown error');
}

/**
 * Discriminated helper that returns either the loaded dataset or an
 * MCP error response (when the dataset has not finished loading yet).
 * Use this at the top of every tool handler that needs the dataset.
 */
export function getDatasetOrError():
  | { ok: true; dataset: QuranDataset }
  | { ok: false; response: CallToolResult } {
  if (!isDataLoaded()) {
    return {
      ok: false,
      response: jsonError('Server is still loading data, please try again in a moment'),
    };
  }
  return { ok: true, dataset: getDataset() };
}

/**
 * Standard annotations applied to every tool in this server.
 * All tools are pure read-only lookups against an in-memory Quran
 * dataset, so the values are uniform across the surface.
 */
export const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

/**
 * Annotations for the Quranpedia-backed tools. Same read-only contract, but
 * `openWorldHint: true` because these tools contact an external service
 * (api.quranpedia.net) rather than only reading the in-memory dataset.
 */
export const EXTERNAL_READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

/**
 * Wraps a successful Quranpedia payload with a `source` block so clients can
 * attribute the answer to the exact endpoint that produced it.
 */
export function quranpediaOk(url: string, payload: unknown): CallToolResult {
  return jsonOk({
    source: { provider: 'quranpedia', url },
    ...(payload as Record<string, unknown>),
  });
}

/** True when the error is a Quranpedia 404 (resource genuinely missing). */
export function isQuranpediaNotFound(error: unknown): error is QuranpediaError {
  return error instanceof QuranpediaError && error.status === 404;
}

/**
 * Converts any thrown error into a standard MCP tool-error response.
 * Quranpedia 400/5xx responses surface their upstream message; network and
 * JSON failures fall back to the generic Error text.
 */
export function quranpediaErrorResponse(error: unknown): CallToolResult {
  if (error instanceof QuranpediaError) {
    return jsonError(`Quranpedia error (${error.status}): ${error.message}`);
  }
  return handleCaughtError(error);
}

/**
 * Resolve a verse gid (1-indexed global id) from either an explicit
 * `gid` argument or a `(suraId, ayaId)` pair using the precomputed
 * offset table. Returns `null` when the lookup is invalid.
 */
export function resolveGid(
  args: { gid?: number; suraId?: number; ayaId?: number },
  dataset: QuranDataset,
): number | null {
  if (typeof args.gid === 'number') {
    return args.gid;
  }
  if (typeof args.suraId === 'number' && typeof args.ayaId === 'number') {
    const start = dataset.gidOffsetTable.get(args.suraId);
    if (start === undefined) return null;
    return start + (args.ayaId - 1);
  }
  return null;
}
