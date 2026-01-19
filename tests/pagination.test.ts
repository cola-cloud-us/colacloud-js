/**
 * Tests for COLA Cloud SDK Pagination Utilities
 */

import { describe, it, expect, vi } from 'vitest';
import {
  createPaginatedIterator,
  createPaginatedIteratorWithMetadata,
  collectAll,
  take,
} from '../src/pagination.js';
import type { PaginatedResponse, RateLimitInfo } from '../src/types.js';

describe('createPaginatedIterator', () => {
  it('should iterate through all pages', async () => {
    const pages: PaginatedResponse<{ id: number }>[] = [
      { data: [{ id: 1 }, { id: 2 }], pagination: { page: 1, per_page: 2, total: 5, pages: 3 } },
      { data: [{ id: 3 }, { id: 4 }], pagination: { page: 2, per_page: 2, total: 5, pages: 3 } },
      { data: [{ id: 5 }], pagination: { page: 3, per_page: 2, total: 5, pages: 3 } },
    ];

    const fetchPage = vi.fn().mockImplementation(async ({ page }) => ({
      response: pages[page - 1],
      rateLimit: null,
    }));

    const iterator = createPaginatedIterator<{ id: number }, { q: string }>({
      params: { q: 'test' },
      fetchPage,
    });

    const items = [];
    for await (const item of iterator) {
      items.push(item);
    }

    expect(items).toHaveLength(5);
    expect(items.map(i => i.id)).toEqual([1, 2, 3, 4, 5]);
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it('should handle empty results', async () => {
    const fetchPage = vi.fn().mockResolvedValue({
      response: { data: [], pagination: { page: 1, per_page: 20, total: 0, pages: 0 } },
      rateLimit: null,
    });

    const iterator = createPaginatedIterator<{ id: number }, object>({
      params: {},
      fetchPage,
    });

    const items = [];
    for await (const item of iterator) {
      items.push(item);
    }

    expect(items).toHaveLength(0);
  });

  it('should respect maxPages option', async () => {
    const fetchPage = vi.fn().mockImplementation(async ({ page }) => ({
      response: {
        data: [{ id: page }],
        pagination: { page, per_page: 1, total: 100, pages: 100 },
      },
      rateLimit: null,
    }));

    const iterator = createPaginatedIterator<{ id: number }, object>({
      params: {},
      fetchPage,
      maxPages: 3,
    });

    const items = [];
    for await (const item of iterator) {
      items.push(item);
    }

    expect(items).toHaveLength(3);
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it('should start from specified page', async () => {
    const fetchPage = vi.fn().mockImplementation(async ({ page }) => ({
      response: {
        data: [{ id: page }],
        pagination: { page, per_page: 1, total: 5, pages: 5 },
      },
      rateLimit: null,
    }));

    const iterator = createPaginatedIterator<{ id: number }, object>({
      params: {},
      fetchPage,
      startPage: 3,
    });

    const items = [];
    for await (const item of iterator) {
      items.push(item);
    }

    expect(items).toHaveLength(3);
    expect(items.map(i => i.id)).toEqual([3, 4, 5]);
  });
});

describe('createPaginatedIteratorWithMetadata', () => {
  it('should yield items with metadata', async () => {
    const rateLimit: RateLimitInfo = { limit: 60, remaining: 59, reset: 1704067260 };
    const fetchPage = vi.fn().mockResolvedValue({
      response: {
        data: [{ id: 1 }, { id: 2 }],
        pagination: { page: 1, per_page: 2, total: 2, pages: 1 },
      },
      rateLimit,
    });

    const iterator = createPaginatedIteratorWithMetadata<{ id: number }, object>({
      params: {},
      fetchPage,
    });

    const results = [];
    for await (const result of iterator) {
      results.push(result);
    }

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      item: { id: 1 },
      page: 1,
      indexInPage: 0,
      total: 2,
      rateLimit,
    });
    expect(results[1]).toEqual({
      item: { id: 2 },
      page: 1,
      indexInPage: 1,
      total: 2,
      rateLimit,
    });
  });
});

describe('collectAll', () => {
  it('should collect all items from iterator', async () => {
    async function* generator() {
      yield 1;
      yield 2;
      yield 3;
    }

    const items = await collectAll(generator());
    expect(items).toEqual([1, 2, 3]);
  });

  it('should respect maxItems limit', async () => {
    async function* generator() {
      for (let i = 1; i <= 100; i++) {
        yield i;
      }
    }

    const items = await collectAll(generator(), 5);
    expect(items).toHaveLength(5);
    expect(items).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('take', () => {
  it('should take first N items', async () => {
    async function* generator() {
      for (let i = 1; i <= 100; i++) {
        yield i;
      }
    }

    const items = await take(generator(), 3);
    expect(items).toEqual([1, 2, 3]);
  });

  it('should return all items if count exceeds available', async () => {
    async function* generator() {
      yield 1;
      yield 2;
    }

    const items = await take(generator(), 10);
    expect(items).toEqual([1, 2]);
  });
});
