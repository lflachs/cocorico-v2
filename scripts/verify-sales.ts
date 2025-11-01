import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifySales() {
  console.log('🔍 Verifying sales data...\n');

  // Check for Black Angus (onglet de boeuf) sales
  const ongletSales = await prisma.sale.findMany({
    where: {
      dish: {
        name: {
          contains: 'onglet',
          mode: 'insensitive',
        },
      },
    },
    include: {
      dish: true,
    },
    orderBy: {
      saleDate: 'desc',
    },
    take: 10,
  });

  console.log(`Found ${ongletSales.length} sales for "L'onglet de bœuf"\n`);

  if (ongletSales.length > 0) {
    console.log('Recent sales:');
    ongletSales.forEach((sale) => {
      console.log(
        `  - ${sale.saleDate.toISOString().split('T')[0]}: ${sale.quantitySold} portions sold`
      );
    });
  }

  // Get summary of all sales in last 10 days
  const tenDaysAgo = new Date();
  tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

  const recentSales = await prisma.sale.groupBy({
    by: ['dishId'],
    where: {
      saleDate: {
        gte: tenDaysAgo,
      },
    },
    _sum: {
      quantitySold: true,
    },
    _count: {
      id: true,
    },
  });

  console.log(`\n📊 Sales summary (last 10 days):`);
  console.log(`Total sale records: ${recentSales.length}`);

  // Get dish names for the sales
  for (const sale of recentSales.slice(0, 5)) {
    const dish = await prisma.dish.findUnique({
      where: { id: sale.dishId },
      select: { name: true },
    });
    console.log(
      `  ${dish?.name}: ${sale._sum.quantitySold} portions (${sale._count.id} records)`
    );
  }

  // Check stock movements
  const recentMovements = await prisma.stockMovement.findMany({
    where: {
      createdAt: {
        gte: tenDaysAgo,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 10,
    include: {
      product: {
        select: {
          name: true,
        },
      },
    },
  });

  console.log(`\n📦 Recent stock movements (last 10 days): ${recentMovements.length} found`);
  recentMovements.forEach((movement) => {
    console.log(
      `  - ${movement.createdAt.toISOString().split('T')[0]}: ${movement.product.name} (${movement.movementType}) - ${movement.quantity}`
    );
  });

  await prisma.$disconnect();
}

verifySales().catch((e) => {
  console.error(e);
  process.exit(1);
});
