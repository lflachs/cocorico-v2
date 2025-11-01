import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';

/**
 * POST /api/sales/[id]/confirm
 * Confirm sales and deduct stock based on recipes
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: receiptId } = await params;
    const body = await request.json();
    const { saleDate, totalAmount, dishes } = body;

    console.log('Confirming sales:', { receiptId, saleDate, totalAmount, dishes });

    // Validate input
    if (!dishes || !Array.isArray(dishes) || dishes.length === 0) {
      return NextResponse.json({ error: 'No dishes provided' }, { status: 400 });
    }

    const results = [];

    // Process each dish
    for (const dishInput of dishes) {
      const { name, quantity } = dishInput;

      // Find or create dish
      let dish = await db.dish.findFirst({
        where: {
          name: {
            equals: name,
            mode: 'insensitive',
          },
        },
        include: {
          recipeIngredients: {
            include: {
              product: true,
            },
          },
        },
      });

      // If dish doesn't exist, create it without recipe (manual handling needed)
      if (!dish) {
        console.log(`Dish not found: ${name}, creating placeholder`);
        dish = await db.dish.create({
          data: {
            name: name,
            isActive: true,
          },
          include: {
            recipeIngredients: {
              include: {
                product: true,
              },
            },
          },
        });
      }

      // Create sale record
      const sale = await db.sale.create({
        data: {
          dishId: dish.id,
          quantitySold: quantity,
          saleDate: saleDate ? new Date(saleDate) : new Date(),
          notes: `Imported from receipt scan - ${receiptId}`,
        },
      });

      // Deduct ingredients from stock based on recipe
      const stockMovements = [];

      if (dish.recipeIngredients.length > 0) {
        for (const ingredient of dish.recipeIngredients) {
          const quantityToDeduct = ingredient.quantityRequired * quantity;
          const product = ingredient.product;

          // Calculate new balance
          const newBalance = product.quantity - quantityToDeduct;

          // Create stock movement
          const movement = await db.stockMovement.create({
            data: {
              productId: product.id,
              movementType: 'OUT',
              quantity: -quantityToDeduct,
              balanceAfter: newBalance,
              movementDate: saleDate ? new Date(saleDate) : new Date(),
              saleId: sale.id,
              source: 'RECIPE_DEDUCTION', // Automated deduction
              reason: `Sale: ${dish.name} (x${quantity})`,
              description: `Automatic deduction from recipe`,
            },
          });

          // Update product quantity
          await db.product.update({
            where: { id: product.id },
            data: { quantity: newBalance },
          });

          stockMovements.push({
            productName: product.name,
            quantityDeducted: quantityToDeduct,
            unit: product.unit,
            newBalance,
          });
        }

        results.push({
          dishName: dish.name,
          quantitySold: quantity,
          ingredientsDeducted: stockMovements.length,
          hasRecipe: true,
        });
      } else {
        console.warn(`No recipe found for dish: ${dish.name}`);
        results.push({
          dishName: dish.name,
          quantitySold: quantity,
          ingredientsDeducted: 0,
          hasRecipe: false,
          warning: 'No recipe found - stock not deducted',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `${dishes.length} sales recorded`,
      results,
    });
  } catch (error) {
    console.error('Error confirming sales:', error);
    return NextResponse.json(
      {
        error: 'Failed to confirm sales',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
