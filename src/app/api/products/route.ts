import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';

/**
 * GET /api/products
 * Get all products from inventory
 */
export async function GET(request: NextRequest) {
  try {
    const products = await db.product.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        unit: true,
        quantity: true,
        unitPrice: true,
      },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch products',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products
 * Create a new product in inventory
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, quantity, unit, unitPrice, trackable, parLevel, category } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Product name is required' },
        { status: 400 }
      );
    }

    // Create product
    const product = await db.product.create({
      data: {
        name,
        quantity: quantity || 0,
        unit: unit || 'PC',
        unitPrice: unitPrice || null,
        trackable: trackable !== undefined ? trackable : true,
        parLevel: parLevel || null,
        category: category || null,
      },
    });

    console.log('[API] Created product:', product.name);

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      {
        error: 'Failed to create product',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
