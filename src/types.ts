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
  /** "Domestic" or "Imported" */
  domestic_or_imported: string | null;
  /** Permit number of the applicant */
  permit_number: string | null;
  /** Type of application (e.g., "CERTIFICATE OF LABEL APPROVAL") */
  application_type: string | null;
  /** Status of the application (e.g., "APPROVED") */
  application_status: string | null;
  /** Date the application was submitted (ISO date string) */
  application_date: string | null;
  /** Date the COLA was approved (ISO date string) */
  approval_date: string | null;
  /** Date the COLA expires (ISO date string) */
  expiration_date: string | null;
  /** Alcohol by volume percentage */
  abv: number | null;
  /** Container volume */
  volume: string | null;
  /** Volume unit (e.g., "ml", "L") */
  volume_unit: string | null;
  /** LLM-assigned category (e.g., "Bourbon") */
  llm_category: string | null;
  /** LLM-assigned category path (e.g., "Spirits > Whiskey > Bourbon") */
  llm_category_path: string | null;
  /** Number of images associated with this COLA */
  image_count: number;
  /** URL to the main/primary image */
  main_image_url: string | null;
}

/**
 * Image associated with a COLA
 */
export interface ColaImage {
  /** Unique TTB image identifier */
  ttb_image_id: string;
  /** Position of image within the COLA's image set (0-indexed) */
  image_index: number;
  /** Position on the container (e.g., "FRONT", "BACK", "NECK", "STRIP") */
  container_position: string | null;
  /** File extension (e.g., "jpg", "png") */
  extension_type: string | null;
  /** Image width in pixels */
  width_pixels: number | null;
  /** Image height in pixels */
  height_pixels: number | null;
  /** Physical label width in inches */
  width_inches: number | null;
  /** Physical label height in inches */
  height_inches: number | null;
  /** File size in megabytes */
  file_size_mb: number | null;
  /** Number of barcodes detected in this image */
  barcode_count: number;
  /** Number of QR codes detected in this image */
  qrcode_count: number;
  /** Signed URL to the image (when available) */
  image_url?: string;
}

/**
 * Barcode found on a COLA label
 */
export interface ColaBarcode {
  /** Type of barcode (e.g., "UPC-A", "EAN-13") */
  barcode_type: string | null;
  /** The barcode value/number */
  barcode_value: string;
  /** TTB image ID where this barcode was found */
  ttb_image_id: string;
  /** Barcode width in pixels */
  width_pixels: number | null;
  /** Barcode height in pixels */
  height_pixels: number | null;
  /** Barcode orientation (e.g., "horizontal", "vertical") */
  orientation: string | null;
  /** Position of the barcode relative to the image */
  relative_image_position: string | null;
}

/**
 * Full details for a COLA including images and barcodes
 */
export interface ColaDetail extends ColaSummary {
  /** Product class ID */
  class_id: string | null;
  /** Origin ID */
  origin_id: string | null;
  /** Date of the most recent update (ISO date string) */
  latest_update_date: string | null;

  /** Whether the container has a distinctive shape */
  is_distinctive_container: boolean | null;
  /** Distinctive container capacity */
  for_distinctive_capacity: string | null;
  /** Whether this is a resubmission */
  is_resubmission: boolean | null;
  /** TTB ID of the original submission if this is a resubmission */
  for_resubmission_ttb_id: string | null;
  /** State exemption, if applicable */
  for_exemption_state: string | null;

  /** Applicant address recipient */
  address_recipient: string | null;
  /** Applicant ZIP code */
  address_zip_code: string | null;
  /** Applicant state */
  address_state: string | null;

  /** Grape varietals (wine) */
  grape_varietals: string | null;
  /** Vintage year (wine) */
  wine_vintage_year: number | null;
  /** Appellation (wine) */
  wine_appellation: string | null;

  /** LLM-extracted container type */
  llm_container_type: string | null;
  /** LLM-extracted product description */
  llm_product_description: string | null;
  /** LLM-extracted brand established year */
  llm_brand_established_year: number | null;
  /** LLM-extracted tasting note flavors */
  llm_tasting_note_flavors: string | null;
  /** LLM-extracted artwork credit */
  llm_artwork_credit: string | null;
  /** LLM-extracted wine designation */
  llm_wine_designation: string | null;
  /** LLM-extracted International Bitterness Units (beer) */
  llm_beer_ibu: number | null;
  /** LLM-extracted hop varieties (beer) */
  llm_beer_hops_varieties: string | null;
  /** LLM-extracted aged years (liquor) */
  llm_liquor_aged_years: number | null;
  /** LLM-extracted finishing process (liquor) */
  llm_liquor_finishing_process: string | null;
  /** LLM-extracted grains used (liquor) */
  llm_liquor_grains: string | null;

  /** Primary barcode type on this COLA */
  barcode_type: string | null;
  /** Primary barcode value on this COLA */
  barcode_value: string | null;
  /** QR code URL if present */
  qrcode_url: string | null;

  /** Whether a front label image exists */
  has_front_image: boolean;
  /** Whether a back label image exists */
  has_back_image: boolean;
  /** Whether a neck label image exists */
  has_neck_image: boolean;
  /** Whether a strip label image exists */
  has_strip_image: boolean;

  /** All images associated with this COLA */
  images: ColaImage[];
  /** All barcodes found on this COLA's images */
  barcodes: ColaBarcode[];
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
  /** Company ZIP code */
  company_zip_code: string | null;
  /** Type of permit */
  permittee_type: string | null;
  /** Whether the permit is currently active */
  is_active: boolean;
  /** Reason for active/inactive status */
  active_reason: string | null;
  /** Total number of COLAs */
  colas: number;
  /** Number of approved COLAs */
  colas_approved: number;
  /** Date of most recent COLA application (ISO date string) */
  last_cola_application_date: string | null;
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
