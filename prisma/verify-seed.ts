import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  console.log('🔍 Verifying seed data...\n');

  // Check dishes and their ingredients
  const dishes = await prisma.dish.findMany({
    include: {
      recipeIngredients: {
        include: {
          product: true,
        },
      },
    },
  });

  console.log('📊 Dishes and their ingredients:');
  for (const dish of dishes) {
    console.log(`\n${dish.name} (${dish.recipeIngredients.length} ingredients):`);
    if (dish.recipeIngredients.length === 0) {
      console.log('  ❌ NO INGREDIENTS!');
    } else {
      for (const ingredient of dish.recipeIngredients) {
        console.log(
          `  - ${ingredient.quantityRequired} ${ingredient.unit} of ${ingredient.product.name}`
        );
      }
    }
  }

  // Check menus
  const menus = await prisma.menu.findMany({
    include: {
      sections: {
        include: {
          dishes: {
            include: {
              dish: {
                include: {
                  recipeIngredients: true,
                },
              },
            },
          },
        },
      },
    },
  });

  console.log('\n\n📋 Menus:');
  for (const menu of menus) {
    console.log(`\n${menu.name}:`);
    for (const section of menu.sections) {
      console.log(`  ${section.name}:`);
      for (const menuDish of section.dishes) {
        console.log(
          `    - ${menuDish.dish.name} (${menuDish.dish.recipeIngredients.length} ingredients)`
        );
      }
    }
  }

  await prisma.$disconnect();
}

verify();
