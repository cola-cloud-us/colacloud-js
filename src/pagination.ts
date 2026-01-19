/**
 * COLA Cloud SDK Pagination Utilities
 */

import type { Pagination, PaginatedResponse, RateLimitInfo } from './types.js';

/**
 * Options for creating a paginated iterator
 */
export interface PaginatedIteratorOptions<TParams> {
  /** Parameters for the request (excluding page) */
  params: TParams;
  /** Function to fetch a page of results */
  fetchPage: (params: TParams & { page: number }) => Promise<{
    response: PaginatedResponse<unknown>;
    rateLimit: RateLimitInfo | null;
  }>;
  /** Starting page number (defaults to 1) */
  startPage?: number;
  /** Maximum number of pages to fetch (optional, defaults to all) */
  maxPages?: number;
}

/**
 * Result yielded by the paginated iterator
 */
export interface PaginatedIteratorResult<T> {
  /** The current item */
  item: T;
  /** Current page number */
  page: number;
  /** Index within the current page */
  indexInPage: number;
  /** Total items across all pages */
  total: number;
  /** Rate limit info from the last request */
  rateLimit: RateLimitInfo | null;
}

/**
 * Creates an async iterator that automatically handles pagination
 * @param options Configuration for the paginated iterator
 * @returns An async iterable that yields items across all pages
 */
export function createPaginatedIterator<T, TParams>(
  options: PaginatedIteratorOptions<TParams>
): AsyncIterable<T> {
  const { params, fetchPage, startPage = 1, maxPages } = options;

  return {
    [Symbol.asyncIterator](): AsyncIterator<T> {
      let currentPage = startPage;
      let currentItems: T[] = [];
      let currentIndex = 0;
      let pagination: Pagination | null = null;
      let pagesFetched = 0;
      let done = false;

      return {
        async next(): Promise<IteratorResult<T>> {
          // If we've exhausted current items, try to fetch next page
          while (currentIndex >= currentItems.length && !done) {
            // Check if we've hit the max pages limit
            if (maxPages !== undefined && pagesFetched >= maxPages) {
              done = true;
              break;
            }

            // Check if we've gone past the last page
            if (pagination !== null && currentPage > pagination.pages) {
              done = true;
              break;
            }

            // Fetch next page
            const result = await fetchPage({
              ...params,
              page: currentPage,
            });

            pagination = result.response.pagination;
            currentItems = result.response.data as T[];
            currentIndex = 0;
            currentPage++;
            pagesFetched++;

            // If the page is empty, we're done
            if (currentItems.length === 0) {
              done = true;
              break;
            }
          }

          // Return next item or done
          if (currentIndex < currentItems.length) {
            const item = currentItems[currentIndex];
            currentIndex++;
            if (item === undefined) {
              // Should not happen, but TypeScript requires this check
              return { done: true, value: undefined };
            }
            return { done: false, value: item };
          }

          return { done: true, value: undefined };
        },
      };
    },
  };
}

/**
 * Creates an async iterator that yields items with additional metadata
 * @param options Configuration for the paginated iterator
 * @returns An async iterable that yields items with page/index metadata
 */
export function createPaginatedIteratorWithMetadata<T, TParams>(
  options: PaginatedIteratorOptions<TParams>
): AsyncIterable<PaginatedIteratorResult<T>> {
  const { params, fetchPage, startPage = 1, maxPages } = options;

  return {
    [Symbol.asyncIterator](): AsyncIterator<PaginatedIteratorResult<T>> {
      let currentPage = startPage;
      let currentItems: T[] = [];
      let currentIndex = 0;
      let pagination: Pagination | null = null;
      let rateLimit: RateLimitInfo | null = null;
      let pagesFetched = 0;
      let done = false;

      return {
        async next(): Promise<IteratorResult<PaginatedIteratorResult<T>>> {
          // If we've exhausted current items, try to fetch next page
          while (currentIndex >= currentItems.length && !done) {
            // Check if we've hit the max pages limit
            if (maxPages !== undefined && pagesFetched >= maxPages) {
              done = true;
              break;
            }

            // Check if we've gone past the last page
            if (pagination !== null && currentPage > pagination.pages) {
              done = true;
              break;
            }

            // Fetch next page
            const result = await fetchPage({
              ...params,
              page: currentPage,
            });

            pagination = result.response.pagination;
            rateLimit = result.rateLimit;
            currentItems = result.response.data as T[];
            currentIndex = 0;
            currentPage++;
            pagesFetched++;

            // If the page is empty, we're done
            if (currentItems.length === 0) {
              done = true;
              break;
            }
          }

          // Return next item or done
          if (currentIndex < currentItems.length) {
            const item = currentItems[currentIndex];
            if (item === undefined) {
              return { done: true, value: undefined };
            }
            const result: PaginatedIteratorResult<T> = {
              item,
              page: currentPage - 1, // We already incremented after fetch
              indexInPage: currentIndex,
              total: pagination?.total ?? 0,
              rateLimit,
            };
            currentIndex++;
            return { done: false, value: result };
          }

          return { done: true, value: undefined };
        },
      };
    },
  };
}

/**
 * Collects all items from a paginated iterator into an array
 * Warning: Use with caution on large datasets
 * @param iterator The async iterable to collect from
 * @param maxItems Maximum number of items to collect (optional safety limit)
 * @returns Array of all collected items
 */
export async function collectAll<T>(
  iterator: AsyncIterable<T>,
  maxItems?: number
): Promise<T[]> {
  const items: T[] = [];
  for await (const item of iterator) {
    items.push(item);
    if (maxItems !== undefined && items.length >= maxItems) {
      break;
    }
  }
  return items;
}

/**
 * Takes the first N items from a paginated iterator
 * @param iterator The async iterable to take from
 * @param count Number of items to take
 * @returns Array of the first N items
 */
export async function take<T>(
  iterator: AsyncIterable<T>,
  count: number
): Promise<T[]> {
  return collectAll(iterator, count);
}
