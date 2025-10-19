import { NextRequest, NextResponse } from 'next/server';
import { agenceBioService } from '@/lib/services/agence-bio.service';
import { getProducerByIdSchema } from '@/lib/validations/producer.schema';
import { ZodError } from 'zod';

/**
 * GET /api/producers
 *
 * Get a specific producer by SIRET, numéro BIO, or legal name
 *
 * Query Parameters:
 * - siret: SIRET number (14 digits)
 * - numero_bio: Agence BIO operator number
 * - legal_name: Legal business name
 *
 * At least one parameter is required.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const rawParams = {
      siret: searchParams.get('siret') || undefined,
      numero_bio: searchParams.get('numero_bio') || undefined,
      legal_name: searchParams.get('legal_name') || undefined,
    };

    // Validate input
    const validatedParams = getProducerByIdSchema.parse(rawParams);

    // Call service
    const producer = await agenceBioService.getProducerById(validatedParams);

    if (!producer) {
      return NextResponse.json(
        { error: 'Producer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(producer, { status: 200 });

  } catch (error) {
    console.error('Error in /api/producers:', error);

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
        error: error instanceof Error ? error.message : 'Failed to fetch producer',
      },
      { status: 500 }
    );
  }
}
