import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';

/**
 * POST /api/products/[id]/sync-adjust
 * Update product quantity during inventory sync and track the movement
 * This creates a stock movement record for analytics and waste tracking
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { newQuantity } = body;

    if (newQuantity === undefined || newQuantity === null) {
      return NextResponse.json(
        { error: 'newQuantity is required' },
        { status: 400 }
      );
    }

    // Get current product state
    const currentProduct = await db.product.findUnique({
      where: { id },
    });

    if (!currentProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const oldQuantity = currentProduct.quantity;
    const difference = newQuantity - oldQuantity;

    // Skip if no change
    if (difference === 0) {
      return NextResponse.json({
        product: currentProduct,
        movement: null,
        message: 'No change in quantity',
      });
    }

    // Determine movement type based on difference
    const movementType = difference > 0 ? 'IN' : 'OUT';
    const absoluteDifference = Math.abs(difference);

    // Use Prisma transaction to update product and create movement atomically
    const result = await db.$transaction(async (tx) => {
      // Update product
      const updatedProduct = await tx.product.update({
        where: { id },
        data: {
          quantity: newQuantity,
          totalValue: currentProduct.unitPrice
            ? newQuantity * currentProduct.unitPrice
            : null,
        },
      });

      // Create stock movement record
      const stockMovement = await tx.stockMovement.create({
        data: {
          productId: id,
          movementType: 'ADJUSTMENT',
          quantity: absoluteDifference,
          balanceAfter: newQuantity,
          reason: 'Inventory Sync Adjustment',
          description: difference > 0
            ? `Stock increased by ${absoluteDifference.toFixed(1)} ${currentProduct.unit} during inventory sync (was ${oldQuantity.toFixed(1)}, now ${newQuantity.toFixed(1)})`
            : `Stock decreased by ${absoluteDifference.toFixed(1)} ${currentProduct.unit} during inventory sync (was ${oldQuantity.toFixed(1)}, now ${newQuantity.toFixed(1)})`,
          source: 'MANUAL', // Sync is a manual verification process
          unitPrice: currentProduct.unitPrice,
          totalValue: currentProduct.unitPrice
            ? absoluteDifference * currentProduct.unitPrice
            : null,
        },
      });

      return { product: updatedProduct, movement: stockMovement };
    });

    return NextResponse.json({
      success: true,
      product: result.product,
      movement: result.movement,
      difference: {
        oldQuantity,
        newQuantity,
        change: difference,
        type: difference > 0 ? 'addition' : 'loss',
      },
    });
  } catch (error) {
    console.error('Error adjusting product quantity:', error);
    return NextResponse.json(
      {
        error: 'Failed to adjust product quantity',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
