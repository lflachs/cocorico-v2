import { NextRequest, NextResponse } from 'next/server';
import { agenceBioService } from '@/lib/services/agence-bio.service';
import { searchProducersSchema } from '@/lib/validations/producer.schema';
import { ZodError } from 'zod';

/**
 * GET /api/producers/search
 *
 * Search for organic producers using Agence BIO API
 *
 * Query Parameters:
 * - lat, lng, radius_km: Geographic circle search
 * - department, region, postal_code: Alternative geographic filters
 * - activity: Activity type filter
 * - product_category: Product category filter (comma-separated)
 * - certification_state: Certification status filter
 * - search_term: Free text search
 * - page, page_size: Pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Extract and parse query parameters
    const { searchParams } = new URL(request.url);

    const rawParams = {
      lat: searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : undefined,
      lng: searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : undefined,
      radius_km: searchParams.get('radius_km') ? parseFloat(searchParams.get('radius_km')!) : undefined,
      department: searchParams.get('department') || undefined,
      region: searchParams.get('region') || undefined,
      postal_code: searchParams.get('postal_code') || undefined,
      city: searchParams.get('city') || undefined,
      activity: searchParams.get('activity') || undefined,
      product_category: searchParams.get('product_category')
        ? searchParams.get('product_category')!.split(',')
        : undefined,
      certification_state: searchParams.get('certification_state') || undefined,
      search_term: searchParams.get('search_term') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined,
      page_size: searchParams.get('page_size') ? parseInt(searchParams.get('page_size')!) : undefined,
    };

    // Validate input
    const validatedParams = searchProducersSchema.parse(rawParams);

    // Call service
    const result = await agenceBioService.searchProducers(validatedParams);

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error('Error in /api/producers/search:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to search producers',
      },
      { status: 500 }
    );
  }
}
