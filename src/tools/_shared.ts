import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
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
