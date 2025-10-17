import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';

/**
 * PUT /api/products/[id]
 * Update a product by ID
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, quantity, unitPrice } = body;

    const product = await db.product.update({
      where: { id: params.id },
      data: {
        name,
        quantity,
        unitPrice,
        totalValue: unitPrice ? quantity * unitPrice : null,
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      {
        error: 'Failed to update product',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/products/[id]
 * Partially update a product by ID (for voice assistant)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, quantity, unitPrice, unit, trackable, parLevel, category } = body;

    // Build update data with only provided fields
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (quantity !== undefined) updateData.quantity = quantity;
    if (unitPrice !== undefined) updateData.unitPrice = unitPrice;
    if (unit !== undefined) updateData.unit = unit;
    if (trackable !== undefined) updateData.trackable = trackable;
    if (parLevel !== undefined) updateData.parLevel = parLevel;
    if (category !== undefined) updateData.category = category;

    // Calculate totalValue if both quantity and unitPrice are available
    if (quantity !== undefined && unitPrice !== undefined) {
      updateData.totalValue = quantity * unitPrice;
    }

    const product = await db.product.update({
      where: { id: params.id },
      data: updateData,
    });

    console.log('[API] Updated product:', product.name, 'quantity:', product.quantity, product.unit);
    return NextResponse.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      {
        error: 'Failed to update product',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/products/[id]
 * Delete a product by ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db.product.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete product',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
