/**
 * COLA Cloud API TypeScript Types
 */

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration options for the ColaCloud client
 */
export interface ColaCloudConfig {
  /** Your COLA Cloud API key */
  apiKey: string;
  /** Base URL for the API (defaults to https://app.colacloud.us/api/v1) */
  baseUrl?: string;
  /** Request timeout in milliseconds (defaults to 30000) */
  timeout?: number;
}

// ============================================================================
// Pagination Types
// ============================================================================

/**
 * Pagination metadata returned with list endpoints
 */
export interface Pagination {
  /** Current page number (1-indexed) */
  page: number;
  /** Number of items per page */
  per_page: number;
  /** Total number of items across all pages */
  total: number;
  /** Total number of pages */
  pages: number;
}

/**
 * Response wrapper for paginated list endpoints
 */
export interface PaginatedResponse<T> {
  /** Array of items for the current page */
  data: T[];
  /** Pagination metadata */
  pagination: Pagination;
}

/**
 * Response wrapper for single item endpoints
 */
export interface SingleResponse<T> {
  /** The requested item */
  data: T;
}

// ============================================================================
// Rate Limit Types
// ============================================================================

/**
 * Rate limit information from response headers
 */
export interface RateLimitInfo {
  /** Maximum requests allowed per minute */
  limit: number;
  /** Remaining requests in the current window */
  remaining: number;
  /** Unix timestamp when the rate limit resets */
  reset: number;
}

/**
 * Extended response that includes rate limit information
 */
export interface ResponseWithRateLimit<T> {
  /** The response data */
  data: T;
  /** Rate limit information from headers */
  rateLimit: RateLimitInfo | null;
}

// ============================================================================
// COLA Types
// ============================================================================

/**
 * Summary information about a COLA (Certificate of Label Approval)
 * Returned in list/search results
 */
export interface ColaSummary {
  /** Unique TTB identifier for this COLA */
  ttb_id: string;
  /** Brand name on the label */
  brand_name: string | null;
  /** Specific product name */
  product_name: string | null;
  /** Type of product (e.g., "DISTILLED SPIRITS", "WINE", "MALT BEVERAGES") */
  product_type: string | null;
  /** Product class name */
  class_name: string | null;
  /** Origin/country of the product */
  origin_name: string | null;
  /** Permit number of the applicant */
  permit_number: string | null;
  /** Date the COLA was approved */
  approval_date: string | null;
  /** Alcohol by volume percentage */
  abv: number | null;
  /** Container volume */
  volume: string | null;
  /** Number of images associated with this COLA */
  image_count: number;
  /** URL to the main/primary image */
  main_image_url: string | null;
}

/**
 * Image associated with a COLA
 */
export interface ColaImage {
  /** Unique identifier for this image */
  image_id: string;
  /** URL to the image */
  url: string;
  /** Type of image (e.g., "front", "back") */
  image_type: string | null;
  /** Image width in pixels */
  width: number | null;
  /** Image height in pixels */
  height: number | null;
}

/**
 * Barcode found on a COLA label
 */
export interface ColaBarcode {
  /** The barcode value/number */
  barcode_value: string;
  /** Type of barcode (e.g., "UPC-A", "EAN-13") */
  barcode_type: string | null;
}

/**
 * Full details for a COLA including images and barcodes
 */
export interface ColaDetail extends ColaSummary {
  /** Images associated with this COLA */
  images: ColaImage[];
  /** Barcodes found on the label */
  barcodes: ColaBarcode[];

  // LLM-extracted fields
  /** LLM-extracted description */
  llm_description: string | null;
  /** LLM-extracted ingredients */
  llm_ingredients: string | null;
  /** LLM-extracted tasting notes */
  llm_tasting_notes: string | null;
  /** LLM-extracted producer/brand information */
  llm_producer: string | null;

  // Wine-specific fields
  /** Vintage year for wines */
  vintage: number | null;
  /** Grape varietal(s) */
  varietal: string | null;
  /** Wine appellation */
  appellation: string | null;

  // Beer-specific fields
  /** Beer style */
  beer_style: string | null;
  /** International Bitterness Units */
  ibu: number | null;

  // Additional metadata
  /** Status of the COLA */
  status: string | null;
  /** Date the COLA was submitted */
  submitted_date: string | null;
  /** Serial number */
  serial_number: string | null;
}

/**
 * Query parameters for searching/listing COLAs
 */
export interface ColaListParams {
  /** Search query string */
  q?: string;
  /** Filter by product type */
  productType?: string;
  /** Filter by origin/country */
  origin?: string;
  /** Filter by brand name */
  brandName?: string;
  /** Filter by approval date (from) */
  approvalDateFrom?: string;
  /** Filter by approval date (to) */
  approvalDateTo?: string;
  /** Minimum ABV percentage */
  abvMin?: number;
  /** Maximum ABV percentage */
  abvMax?: number;
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page */
  perPage?: number;
}

// ============================================================================
// Permittee Types
// ============================================================================

/**
 * Summary information about a permittee (business/permit holder)
 */
export interface PermitteeSummary {
  /** Unique permit number */
  permit_number: string;
  /** Company/business name */
  company_name: string | null;
  /** State where the company is located */
  company_state: string | null;
  /** Type of permit */
  permittee_type: string | null;
  /** Whether the permit is currently active */
  is_active: boolean;
  /** Total number of COLAs */
  colas: number;
  /** Number of approved COLAs */
  colas_approved: number;
}

/**
 * Full details for a permittee including recent COLAs
 */
export interface PermitteeDetail extends PermitteeSummary {
  /** Recent COLAs from this permittee */
  recent_colas: ColaSummary[];
}

/**
 * Query parameters for searching/listing permittees
 */
export interface PermitteeListParams {
  /** Search query string */
  q?: string;
  /** Filter by state */
  state?: string;
  /** Filter by active status */
  isActive?: boolean;
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page */
  perPage?: number;
}

// ============================================================================
// Barcode Lookup Types
// ============================================================================

/**
 * Result of a barcode lookup
 */
export interface BarcodeLookupResult {
  /** The barcode value that was searched */
  barcode_value: string;
  /** Type of barcode */
  barcode_type: string | null;
  /** COLAs associated with this barcode */
  colas: ColaSummary[];
  /** Total number of COLAs with this barcode */
  total_colas: number;
}

// ============================================================================
// Usage/Stats Types
// ============================================================================

/**
 * API usage statistics for the current account
 */
export interface UsageStats {
  /** Account tier (e.g., "free", "pro", "enterprise") */
  tier: string;
  /** Monthly request limit */
  monthly_limit: number;
  /** Current billing period (ISO date string) */
  current_period: string;
  /** Number of requests used this period */
  requests_used: number;
  /** Number of requests remaining this period */
  requests_remaining: number;
  /** Per-minute rate limit */
  per_minute_limit: number;
}

// ============================================================================
// API Error Types
// ============================================================================

/**
 * Error response structure from the API
 */
export interface ApiErrorResponse {
  /** Error message */
  error: string;
  /** Error code */
  code?: string;
  /** Additional error details */
  details?: Record<string, unknown>;
}
