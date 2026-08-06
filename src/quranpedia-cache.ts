import { createHash } from 'node:crypto';
import { readdirSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * TTL cache for Quranpedia responses.
 *
 * Quranic tafsir / translation / surah-info text is static, so entries live
 * for a long time (default 30 days) and never need explicit invalidation.
 * Two layers:
 *
 *  1. an in-memory `Map` (shared across every HTTP session in the process)
 *  2. an optional on-disk layer (`QP_CACHE_DIR`) that survives restarts, so a
 *     long-running home server keeps serving previously-cached ayahs even if
 *     api.quranpedia.net is unreachable.
 *
 * The disk layer can be pointed at any mounted directory (including a Garage
 * S3 bucket mounted via rclone/FUSE) by setting `QP_CACHE_DIR`.
 */

export interface QuranpediaCacheOptions {
  ttlMs: number;
  directory?: string;
  maxEntries: number;
}

export interface QuranpediaCacheStats {
  memoryEntries: number;
  diskEntries: number;
  hits: number;
  misses: number;
}

interface CacheEntry {
  expiresAt: number;
  value: unknown;
}

export class QuranpediaCache {
  private readonly memory = new Map<string, CacheEntry>();
  private readonly pending = new Map<string, Promise<unknown>>();
  private hits = 0;
  private misses = 0;
  private readonly ttlMs: number;
  private readonly directory?: string;
  private readonly maxEntries: number;

  constructor(options: QuranpediaCacheOptions) {
    this.ttlMs = options.ttlMs;
    this.directory = options.directory;
    this.maxEntries = options.maxEntries;
  }

  private keyFile(key: string): string {
    const hash = createHash('sha1').update(key).digest('hex');
    return path.join(this.directory!, `${hash}.json`);
  }

  async get<T>(key: string): Promise<{ hit: true; value: T } | { hit: false }> {
    const now = Date.now();
    const entry = this.memory.get(key);
    if (entry && entry.expiresAt > now) {
      this.hits += 1;
      return { hit: true, value: entry.value as T };
    }
    if (entry) {
      this.memory.delete(key);
    }

    if (this.directory) {
      try {
        const raw = await readFile(this.keyFile(key), 'utf8');
        const diskEntry = JSON.parse(raw) as CacheEntry;
        if (diskEntry && diskEntry.expiresAt > now) {
          this.memory.set(key, diskEntry);
          this.hits += 1;
          return { hit: true, value: diskEntry.value as T };
        }
      } catch {
        // missing or unreadable disk entry — treat as a cache miss
      }
    }

    this.misses += 1;
    return { hit: false };
  }

  async set(key: string, value: unknown): Promise<void> {
    const expiresAt = Date.now() + this.ttlMs;
    this.memory.set(key, { expiresAt, value });
    this.trimMemory();

    if (this.directory) {
      try {
        await mkdir(this.directory, { recursive: true });
        const target = this.keyFile(key);
        const tmp = `${target}.tmp`;
        await writeFile(tmp, JSON.stringify({ expiresAt, value }), 'utf8');
        await rename(tmp, target);
      } catch {
        // disk persistence is best-effort; never fail a request over it
      }
    }
  }

  /**
   * Returns a cached value when fresh, otherwise runs `load`, stores the
   * result, and returns it. Concurrent callers with the same key share a
   * single in-flight fetch so popular ayahs (Ayat al-Kursi, 1:1, ...) never
   * hammer the upstream in parallel.
   */
  async getOrSet<T>(key: string, load: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached.hit) return cached.value;

    const existing = this.pending.get(key);
    if (existing) return existing as Promise<T>;

    const promise = load()
      .then(async (value): Promise<T> => {
        await this.set(key, value);
        return value;
      })
      .finally(() => {
        this.pending.delete(key);
      });
    this.pending.set(key, promise);
    return promise;
  }

  private trimMemory(): void {
    if (this.memory.size <= this.maxEntries) return;
    const overflow = this.memory.size - this.maxEntries;
    const staleKeys = [...this.memory.keys()].slice(0, overflow);
    for (const key of staleKeys) {
      this.memory.delete(key);
    }
  }

  stats(): QuranpediaCacheStats {
    return {
      memoryEntries: this.memory.size,
      diskEntries: this.directory ? countFiles(this.directory) : 0,
      hits: this.hits,
      misses: this.misses,
    };
  }
}

function countFiles(directory: string): number {
  try {
    return readdirSync(directory).length;
  } catch {
    return 0;
  }
}
