import { db } from '@/lib/db/client';

/**
 * Calculate the unit price of a composite product based on its ingredients
 * This is calculated dynamically based on current ingredient prices
 */
export async function calculateCompositeProductPrice(compositeProductId: string): Promise<number> {
  const compositeProduct = await db.product.findUnique({
    where: { id: compositeProductId },
    include: {
      compositeIngredients: {
        include: {
          baseProduct: {
            select: {
              unitPrice: true,
              unit: true,
            },
          },
        },
      },
    },
  });

  if (!compositeProduct || !compositeProduct.isComposite) {
    throw new Error('Product is not a composite product');
  }

  let totalCost = 0;
  let hasMissingPrices = false;

  // Sum up the cost of all ingredients
  for (const ingredient of compositeProduct.compositeIngredients) {
    const basePrice = ingredient.baseProduct.unitPrice;

    if (basePrice === null || basePrice === 0) {
      hasMissingPrices = true;
      continue;
    }

    // Calculate cost: quantity × unit price
    const ingredientCost = ingredient.quantity * basePrice;
    totalCost += ingredientCost;
  }

  // If yield quantity is specified, calculate price per unit
  const yieldQuantity = compositeProduct.yieldQuantity || 1;
  const pricePerUnit = totalCost / yieldQuantity;

  return hasMissingPrices ? 0 : pricePerUnit;
}

/**
 * Calculate prices for multiple composite products
 */
export async function calculateMultipleCompositeProductPrices(
  compositeProductIds: string[]
): Promise<Map<string, number>> {
  const prices = new Map<string, number>();

  await Promise.all(
    compositeProductIds.map(async (id) => {
      try {
        const price = await calculateCompositeProductPrice(id);
        prices.set(id, price);
      } catch (error) {
        console.error(`Error calculating price for composite product ${id}:`, error);
        prices.set(id, 0);
      }
    })
  );

  return prices;
}

/**
 * Get composite product with calculated price
 */
export async function getCompositeProductWithPrice(compositeProductId: string) {
  const product = await db.product.findUnique({
    where: { id: compositeProductId },
    include: {
      compositeIngredients: {
        include: {
          baseProduct: {
            select: {
              id: true,
              name: true,
              unit: true,
              unitPrice: true,
            },
          },
        },
      },
    },
  });

  if (!product) {
    return null;
  }

  const calculatedPrice = await calculateCompositeProductPrice(compositeProductId);

  return {
    ...product,
    calculatedUnitPrice: calculatedPrice,
  };
}

/**
 * Calculate ingredient breakdown for a composite product
 */
export async function getCompositeProductCostBreakdown(compositeProductId: string) {
  const compositeProduct = await db.product.findUnique({
    where: { id: compositeProductId },
    include: {
      compositeIngredients: {
        include: {
          baseProduct: {
            select: {
              id: true,
              name: true,
              unit: true,
              unitPrice: true,
            },
          },
        },
      },
    },
  });

  if (!compositeProduct) {
    return null;
  }

  const breakdown = compositeProduct.compositeIngredients.map((ingredient) => {
    const basePrice = ingredient.baseProduct.unitPrice || 0;
    const cost = ingredient.quantity * basePrice;

    return {
      ingredientId: ingredient.id,
      productName: ingredient.baseProduct.name,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      unitPrice: basePrice,
      totalCost: cost,
      hasMissingPrice: basePrice === 0,
    };
  });

  const totalCost = breakdown.reduce((sum, item) => sum + item.totalCost, 0);
  const yieldQuantity = compositeProduct.yieldQuantity || 1;
  const pricePerUnit = totalCost / yieldQuantity;

  return {
    breakdown,
    totalCost,
    yieldQuantity,
    yieldUnit: compositeProduct.unit,
    pricePerUnit,
    hasMissingPrices: breakdown.some((item) => item.hasMissingPrice),
  };
}
