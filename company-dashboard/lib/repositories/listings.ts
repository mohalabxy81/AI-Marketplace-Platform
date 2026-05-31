import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

/**
 * Type-Safe Listings Repository
 *
 * Implements the data access layer for marketplace listings.
 * All queries are tenant-scoped via RLS and parameterized to
 * prevent SQL injection.
 *
 * Spec Reference: Spec 36, Section 4 — Type-Safe CRUD Repository
 *                 Spec 31, Section 7 — Data Access & Repository Layer
 */

// ─── Type Aliases ────────────────────────────────────────────
type ListingRow = Database['public']['Tables']['marketplace_listings']['Row']
type ListingInsert = Database['public']['Tables']['marketplace_listings']['Insert']
type ListingUpdate = Database['public']['Tables']['marketplace_listings']['Update']

// ─── Error Codes ─────────────────────────────────────────────
export const LISTING_ERRORS = {
  NOT_FOUND: 'LISTING_NOT_FOUND',
  PERMISSION_DENIED: 'LISTING_PERMISSION_DENIED',
  VALIDATION_FAILED: 'LISTING_VALIDATION_FAILED',
  QUOTA_EXCEEDED: 'LISTING_QUOTA_EXCEEDED',
  DB_ERROR: 'LISTING_DB_ERROR',
} as const

export type ListingError = {
  code: (typeof LISTING_ERRORS)[keyof typeof LISTING_ERRORS]
  message: string
  detail?: string
}

export type ListingResult<T> =
  | { data: T; error: null }
  | { data: null; error: ListingError }

// ─── Filter Types ─────────────────────────────────────────────
export type ListingsFilter = {
  status?: 'draft' | 'pending_review' | 'active' | 'paused' | 'archived' | 'rejected'
  category?: string
  minPrice?: number
  maxPrice?: number
  search?: string
  limit?: number
  offset?: number
  orderBy?: 'created_at' | 'updated_at' | 'price' | 'quality_score'
  orderDir?: 'asc' | 'desc'
}

// ─── Repository ───────────────────────────────────────────────
export class ListingsRepository {
  private readonly client: SupabaseClient<Database>

  constructor(client: SupabaseClient<Database>) {
    this.client = client
  }

  /**
   * Get a single listing by ID (tenant-scoped via RLS)
   */
  async getById(listingId: string): Promise<ListingResult<ListingRow>> {
    const { data, error } = await this.client
      .from('marketplace_listings')
      .select('*')
      .eq('id', listingId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          data: null,
          error: {
            code: LISTING_ERRORS.NOT_FOUND,
            message: `Listing ${listingId} not found`,
          },
        }
      }
      return {
        data: null,
        error: {
          code: LISTING_ERRORS.DB_ERROR,
          message: 'Database error fetching listing',
          detail: error.message,
        },
      }
    }

    return { data, error: null }
  }

  /**
   * List listings with filters (tenant-scoped via RLS)
   */
  async list(filters: ListingsFilter = {}): Promise<ListingResult<ListingRow[]>> {
    const {
      status,
      category,
      minPrice,
      maxPrice,
      search,
      limit = 20,
      offset = 0,
      orderBy = 'created_at',
      orderDir = 'desc',
    } = filters

    let query = this.client
      .from('marketplace_listings')
      .select('*', { count: 'exact' })

    if (status) query = query.eq('status', status)
    if (category) query = query.eq('category', category)
    if (minPrice !== undefined) query = query.gte('price', minPrice)
    if (maxPrice !== undefined) query = query.lte('price', maxPrice)
    if (search) query = query.ilike('title', `%${search}%`)

    query = query
      .order(orderBy, { ascending: orderDir === 'asc' })
      .range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      return {
        data: null,
        error: {
          code: LISTING_ERRORS.DB_ERROR,
          message: 'Database error listing listings',
          detail: error.message,
        },
      }
    }

    return { data: data ?? [], error: null }
  }

  /**
   * Create a new listing (auto-assigns tenant_id from session via RLS)
   */
  async create(input: ListingInsert): Promise<ListingResult<ListingRow>> {
    const { data, error } = await this.client
      .from('marketplace_listings')
      .insert(input)
      .select()
      .single()

    if (error) {
      // Map Postgres error codes to domain errors
      if (error.code === '23505') {
        return {
          data: null,
          error: {
            code: LISTING_ERRORS.VALIDATION_FAILED,
            message: 'A listing with this identifier already exists',
            detail: error.message,
          },
        }
      }
      if (error.code === '42501') {
        return {
          data: null,
          error: {
            code: LISTING_ERRORS.PERMISSION_DENIED,
            message: 'Permission denied to create listing',
            detail: error.message,
          },
        }
      }
      return {
        data: null,
        error: {
          code: LISTING_ERRORS.DB_ERROR,
          message: 'Failed to create listing',
          detail: error.message,
        },
      }
    }

    return { data, error: null }
  }

  /**
   * Update a listing by ID (tenant-scoped via RLS — can only update own tenant's listings)
   */
  async update(listingId: string, updates: ListingUpdate): Promise<ListingResult<ListingRow>> {
    const { data, error } = await this.client
      .from('marketplace_listings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', listingId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          data: null,
          error: {
            code: LISTING_ERRORS.NOT_FOUND,
            message: `Listing ${listingId} not found or access denied`,
          },
        }
      }
      return {
        data: null,
        error: {
          code: LISTING_ERRORS.DB_ERROR,
          message: 'Failed to update listing',
          detail: error.message,
        },
      }
    }

    return { data, error: null }
  }

  /**
   * Soft-delete a listing (sets status to 'archived')
   */
  async archive(listingId: string): Promise<ListingResult<ListingRow>> {
    return this.update(listingId, { status: 'archived' } as ListingUpdate)
  }

  /**
   * Publish a listing (transitions from 'draft' or 'pending_review' to 'active')
   */
  async publish(listingId: string): Promise<ListingResult<ListingRow>> {
    return this.update(listingId, {
      status: 'active',
    } as ListingUpdate)
  }
}

// ─── Factory ──────────────────────────────────────────────────

/**
 * Create a ListingsRepository using the server-side Supabase client.
 * Import this in API route handlers / Edge Functions.
 */
export function createListingsRepository(client: SupabaseClient<Database>): ListingsRepository {
  return new ListingsRepository(client)
}
