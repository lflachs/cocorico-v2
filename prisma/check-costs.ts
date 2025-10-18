import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCosts() {
  console.log('🔍 Checking dish costs...\n');

  const dishes = await prisma.dish.findMany({
    include: {
      recipeIngredients: {
        include: {
          product: true,
        },
      },
    },
    take: 5,
  });

  for (const dish of dishes) {
    console.log(`\n📊 ${dish.name}`);
    console.log(`   Selling Price: €${dish.sellingPrice?.toFixed(2) || 'N/A'}`);
    console.log(`   Ingredients:`);

    let totalCost = 0;
    for (const ing of dish.recipeIngredients) {
      const cost = (ing.product.unitPrice || 0) * ing.quantityRequired;
      totalCost += cost;
      console.log(`     - ${ing.quantityRequired} ${ing.unit} of ${ing.product.name}`);
      console.log(`       Unit Price: €${ing.product.unitPrice?.toFixed(2) || '0.00'}/${ing.product.unit}`);
      console.log(`       Cost: €${cost.toFixed(2)}`);
    }
    console.log(`   TOTAL COST: €${totalCost.toFixed(2)}`);
  }

  await prisma.$disconnect();
}

checkCosts();
