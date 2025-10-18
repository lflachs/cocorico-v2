import { PrismaClient, Unit, UserRole, MovementType, PricingType, DLCStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Clean up existing data (in reverse order of dependencies)
  console.log('🧹 Cleaning up existing data...');
  await prisma.sale.deleteMany();
  await prisma.dLC.deleteMany();
  await prisma.menuDish.deleteMany();
  await prisma.menuSection.deleteMany();
  await prisma.menu.deleteMany();
  await prisma.recipeIngredient.deleteMany();
  await prisma.dish.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.billProduct.deleteMany();
  await prisma.disputeProduct.deleteMany();
  await prisma.dispute.deleteMany();
  await prisma.bill.deleteMany();
  await prisma.compositeIngredient.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
  console.log('✅ Cleanup complete\n');

  // ============================================================================
  // USERS
  // ============================================================================
  console.log('👤 Creating users...');
  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('user123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@cocorico.fr',
      name: 'Chef Alexandre',
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
    },
  });

  const user = await prisma.user.create({
    data: {
      email: 'user@cocorico.fr',
      name: 'Sous-Chef Marie',
      passwordHash: userPassword,
      role: UserRole.USER,
    },
  });
  console.log('✅ Created 2 users\n');

  // ============================================================================
  // BASE PRODUCTS (Ingredients)
  // ============================================================================
  console.log('📦 Creating base products...');
  const products = await Promise.all([
    // Dairy
    prisma.product.create({
      data: {
        name: 'Lait entier',
        quantity: 50,
        unit: Unit.L,
        unitPrice: 1.2,
        trackable: true,
        parLevel: 30,
        category: 'Produits laitiers',
        isComposite: false,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Crème fraîche 35%',
        quantity: 20,
        unit: Unit.L,
        unitPrice: 4.5,
        trackable: true,
        parLevel: 15,
        category: 'Produits laitiers',
        isComposite: false,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Beurre doux',
        quantity: 15,
        unit: Unit.KG,
        unitPrice: 8.5,
        trackable: true,
        parLevel: 10,
        category: 'Produits laitiers',
        isComposite: false,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Œufs frais',
        quantity: 300,
        unit: Unit.PC,
        unitPrice: 0.25,
        trackable: true,
        parLevel: 200,
        category: 'Produits laitiers',
        isComposite: false,
      },
    }),

    // Dry goods
    prisma.product.create({
      data: {
        name: 'Farine T55',
        quantity: 100,
        unit: Unit.KG,
        unitPrice: 1.1,
        trackable: true,
        parLevel: 50,
        category: 'Épicerie sèche',
        isComposite: false,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Sucre en poudre',
        quantity: 45,
        unit: Unit.KG,
        unitPrice: 1.5,
        trackable: true,
        parLevel: 30,
        category: 'Épicerie sèche',
        isComposite: false,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Sel fin',
        quantity: 25,
        unit: Unit.KG,
        unitPrice: 0.8,
        trackable: true,
        parLevel: 15,
        category: 'Épicerie sèche',
        isComposite: false,
      },
    }),

    // Proteins
    prisma.product.create({
      data: {
        name: 'Poulet fermier (entier)',
        quantity: 30,
        unit: Unit.PC,
        unitPrice: 12.5,
        trackable: true,
        parLevel: 20,
        category: 'Viandes',
        isComposite: false,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Filet de bœuf',
        quantity: 12,
        unit: Unit.KG,
        unitPrice: 35.0,
        trackable: true,
        parLevel: 8,
        category: 'Viandes',
        isComposite: false,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Saumon norvégien',
        quantity: 15,
        unit: Unit.KG,
        unitPrice: 22.0,
        trackable: true,
        parLevel: 10,
        category: 'Poissons',
        isComposite: false,
      },
    }),

    // Vegetables
    prisma.product.create({
      data: {
        name: 'Pommes de terre',
        quantity: 80,
        unit: Unit.KG,
        unitPrice: 1.8,
        trackable: true,
        parLevel: 50,
        category: 'Légumes',
        isComposite: false,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Carottes',
        quantity: 25,
        unit: Unit.KG,
        unitPrice: 2.0,
        trackable: true,
        parLevel: 15,
        category: 'Légumes',
        isComposite: false,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Oignons',
        quantity: 30,
        unit: Unit.KG,
        unitPrice: 1.5,
        trackable: true,
        parLevel: 20,
        category: 'Légumes',
        isComposite: false,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Tomates',
        quantity: 20,
        unit: Unit.KG,
        unitPrice: 3.5,
        trackable: true,
        parLevel: 15,
        category: 'Légumes',
        isComposite: false,
      },
    }),

    // Herbs & Spices
    prisma.product.create({
      data: {
        name: 'Persil frais',
        quantity: 8,
        unit: Unit.BUNCH,
        unitPrice: 2.5,
        trackable: true,
        parLevel: 5,
        category: 'Herbes',
        isComposite: false,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Thym frais',
        quantity: 6,
        unit: Unit.BUNCH,
        unitPrice: 3.0,
        trackable: true,
        parLevel: 4,
        category: 'Herbes',
        isComposite: false,
      },
    }),
  ]);
  console.log(`✅ Created ${products.length} base products\n`);

  // Store products by name for easy reference
  const productMap = Object.fromEntries(products.map((p) => [p.name, p]));

  // ============================================================================
  // COMPOSITE PRODUCTS (Prepared Ingredients)
  // ============================================================================
  console.log('🧪 Creating composite products...');

  // Crème pâtissière
  const cremePat = await prisma.product.create({
    data: {
      name: 'Crème pâtissière',
      quantity: 5,
      unit: Unit.L,
      unitPrice: null,
      trackable: true,
      parLevel: 3,
      category: 'Préparations',
      isComposite: true,
      yieldQuantity: 1, // 1L per batch
    },
  });

  await prisma.compositeIngredient.createMany({
    data: [
      {
        compositeProductId: cremePat.id,
        baseProductId: productMap['Lait entier'].id,
        quantity: 0.5,
        unit: Unit.L,
      },
      {
        compositeProductId: cremePat.id,
        baseProductId: productMap['Œufs frais'].id,
        quantity: 6,
        unit: Unit.PC,
      },
      {
        compositeProductId: cremePat.id,
        baseProductId: productMap['Sucre en poudre'].id,
        quantity: 0.15,
        unit: Unit.KG,
      },
      {
        compositeProductId: cremePat.id,
        baseProductId: productMap['Farine T55'].id,
        quantity: 0.05,
        unit: Unit.KG,
      },
    ],
  });

  // Sauce béchamel
  const bechamel = await prisma.product.create({
    data: {
      name: 'Sauce béchamel',
      quantity: 8,
      unit: Unit.L,
      unitPrice: null,
      trackable: true,
      parLevel: 5,
      category: 'Préparations',
      isComposite: true,
      yieldQuantity: 1,
    },
  });

  await prisma.compositeIngredient.createMany({
    data: [
      {
        compositeProductId: bechamel.id,
        baseProductId: productMap['Lait entier'].id,
        quantity: 0.9,
        unit: Unit.L,
      },
      {
        compositeProductId: bechamel.id,
        baseProductId: productMap['Beurre doux'].id,
        quantity: 0.05,
        unit: Unit.KG,
      },
      {
        compositeProductId: bechamel.id,
        baseProductId: productMap['Farine T55'].id,
        quantity: 0.05,
        unit: Unit.KG,
      },
    ],
  });

  console.log('✅ Created 2 composite products with ingredients\n');

  // ============================================================================
  // DISHES & RECIPES (from Sens Unique Restaurant)
  // ============================================================================
  console.log('🍽️ Creating dishes and recipes...');

  // ENTRÉES
  const laMer = await prisma.dish.create({
    data: {
      name: 'La mer',
      description: 'Croquant de chair de crabe, thon et haddock fumé, hareng mariné et douceur de choux fleurs aux betteraves multicolores',
      sellingPrice: 16.00,
      isActive: true,
      recipeIngredients: {
        create: [
          {
            productId: productMap['Saumon norvégien'].id, // Using as placeholder for fish
            quantityRequired: 0.1,
            unit: 'KG',
          },
        ],
      },
    },
  });

  const carpaccioVeau = await prisma.dish.create({
    data: {
      name: 'Le carpaccio de veau « cuit rosé »',
      description: 'Vitello tonnato à ma façon, aromates de saison au jambon cru et caviar aux aubergines confites',
      sellingPrice: 17.00,
      isActive: true,
      recipeIngredients: {
        create: [
          {
            productId: productMap['Filet de bœuf'].id, // Using beef as placeholder for veal
            quantityRequired: 0.12,
            unit: 'KG',
          },
        ],
      },
    },
  });

  const tarteVegetarienne = await prisma.dish.create({
    data: {
      name: 'La tarte sablée végétarienne',
      description: 'Douceurs asperges vertes, crème de burrata fumée, confit et bonbons de tomates cerises confits',
      sellingPrice: 17.00,
      isActive: true,
      recipeIngredients: {
        create: [
          {
            productId: productMap['Tomates'].id,
            quantityRequired: 0.15,
            unit: 'KG',
          },
          {
            productId: productMap['Farine T55'].id,
            quantityRequired: 0.1,
            unit: 'KG',
          },
        ],
      },
    },
  });

  const foieGras = await prisma.dish.create({
    data: {
      name: 'Le foie gras et le magret fumé de canard',
      description: 'Comme « un opéra », artichauts poivrades et craquants, caramel acidulé à la sauge',
      sellingPrice: 21.00,
      isActive: true,
      recipeIngredients: {
        create: [
          {
            productId: productMap['Poulet fermier (entier)'].id, // Placeholder for duck
            quantityRequired: 0.15,
            unit: 'PC',
          },
        ],
      },
    },
  });

  const escargots = await prisma.dish.create({
    data: {
      name: 'Les escargots de Bourgogne',
      description: 'Gâteau de pommes de terre croquillant aux aromates maison, pulpe de persil plat et jus onctueux au vin rouge',
      sellingPrice: 19.00,
      isActive: true,
      recipeIngredients: {
        create: [
          {
            productId: productMap['Pommes de terre'].id,
            quantityRequired: 0.2,
            unit: 'KG',
          },
          {
            productId: productMap['Persil frais'].id,
            quantityRequired: 1,
            unit: 'BUNCH',
          },
          {
            productId: productMap['Beurre doux'].id,
            quantityRequired: 0.05,
            unit: 'KG',
          },
        ],
      },
    },
  });

  const cevicheBar = await prisma.dish.create({
    data: {
      name: 'Le céviché de bar',
      description: 'Fine mousseline de petits pois frais, piquilllo farci au citron caviar, salicornes/poutargue et perles de harengs',
      sellingPrice: 20.00,
      isActive: true,
      recipeIngredients: {
        create: [
          {
            productId: productMap['Saumon norvégien'].id, // Placeholder for sea bass
            quantityRequired: 0.15,
            unit: 'KG',
          },
        ],
      },
    },
  });

  // PLATS
  const filetDaurade = await prisma.dish.create({
    data: {
      name: 'Le filet de daurade royale',
      description: 'Poêlé à l\'huile olive, condiment chimichurri au blanc de seiche, frégola sarda et petits légumes printaniers',
      sellingPrice: 30.00,
      isActive: true,
      recipeIngredients: {
        create: [
          {
            productId: productMap['Saumon norvégien'].id, // Placeholder for daurade
            quantityRequired: 0.25,
            unit: 'KG',
          },
        ],
      },
    },
  });

  const gambas = await prisma.dish.create({
    data: {
      name: 'Les grosses gambas « black tiger »',
      description: 'Marinées et grillées au thym frais, siphon à la tomate et mousseline de pommes de terre à l\'huile olive, primeurs de légumes verts',
      sellingPrice: 37.00,
      isActive: true,
      recipeIngredients: {
        create: [
          {
            productId: productMap['Tomates'].id,
            quantityRequired: 0.1,
            unit: 'KG',
          },
          {
            productId: productMap['Pommes de terre'].id,
            quantityRequired: 0.2,
            unit: 'KG',
          },
          {
            productId: productMap['Thym frais'].id,
            quantityRequired: 0.5,
            unit: 'BUNCH',
          },
        ],
      },
    },
  });

  const ongletBoeuf = await prisma.dish.create({
    data: {
      name: 'L\'onglet de bœuf « Black Angus »',
      description: 'Rôti au beurre frais, rissolée de pommes grenailles et légumes du moment, béarnaise maison',
      sellingPrice: 32.00,
      isActive: true,
      recipeIngredients: {
        create: [
          {
            productId: productMap['Filet de bœuf'].id,
            quantityRequired: 0.25,
            unit: 'KG',
          },
          {
            productId: productMap['Beurre doux'].id,
            quantityRequired: 0.03,
            unit: 'KG',
          },
          {
            productId: productMap['Pommes de terre'].id,
            quantityRequired: 0.25,
            unit: 'KG',
          },
          {
            productId: productMap['Œufs frais'].id,
            quantityRequired: 1,
            unit: 'PC',
          },
        ],
      },
    },
  });

  const epauleAgneau = await prisma.dish.create({
    data: {
      name: 'L\'épaule agneau française',
      description: 'Confite et pressée, crumble à la tomate/miel/épices, primeurs de pois gourmand et éryngii, jus court au thym frais',
      sellingPrice: 32.00,
      isActive: true,
      recipeIngredients: {
        create: [
          {
            productId: productMap['Tomates'].id,
            quantityRequired: 0.1,
            unit: 'KG',
          },
          {
            productId: productMap['Thym frais'].id,
            quantityRequired: 0.5,
            unit: 'BUNCH',
          },
        ],
      },
    },
  });

  const quasiVeau = await prisma.dish.create({
    data: {
      name: 'Le quasi de veau français',
      description: 'Rôti au thym frais, grosses asperges blanches rôties et primeurs de petits légumes, jus court',
      sellingPrice: 36.00,
      isActive: true,
      recipeIngredients: {
        create: [
          {
            productId: productMap['Filet de bœuf'].id, // Placeholder for veal
            quantityRequired: 0.28,
            unit: 'KG',
          },
          {
            productId: productMap['Thym frais'].id,
            quantityRequired: 0.5,
            unit: 'BUNCH',
          },
        ],
      },
    },
  });

  const poularde = await prisma.dish.create({
    data: {
      name: 'La poularde Arnaud Tauzin',
      description: 'À l\'ancienne, morilles et orges perlés, sauce gourmande émulsionnée',
      sellingPrice: 37.00,
      isActive: true,
      recipeIngredients: {
        create: [
          {
            productId: productMap['Poulet fermier (entier)'].id,
            quantityRequired: 0.6,
            unit: 'PC',
          },
          {
            productId: productMap['Crème fraîche 35%'].id,
            quantityRequired: 0.1,
            unit: 'L',
          },
        ],
      },
    },
  });

  const vegetal = await prisma.dish.create({
    data: {
      name: 'Le végétal',
      description: 'Lasagnes « ouvertes », bolognaise de petits légumes printaniers, condiments de pignons et citron confit aux herbes fraîches',
      sellingPrice: 24.00,
      isActive: true,
      recipeIngredients: {
        create: [
          {
            productId: productMap['Tomates'].id,
            quantityRequired: 0.2,
            unit: 'KG',
          },
          {
            productId: productMap['Carottes'].id,
            quantityRequired: 0.1,
            unit: 'KG',
          },
          {
            productId: productMap['Oignons'].id,
            quantityRequired: 0.1,
            unit: 'KG',
          },
        ],
      },
    },
  });

  const coteBoeuf = await prisma.dish.create({
    data: {
      name: 'La côte de bœuf Simmental (pour 2 personnes - 1kg)',
      description: 'Rôti au savoir, ail et thym frais, pommes grenailles et légumes de saison, béarnaise et jus court',
      sellingPrice: 92.00,
      isActive: true,
      recipeIngredients: {
        create: [
          {
            productId: productMap['Filet de bœuf'].id,
            quantityRequired: 1.0,
            unit: 'KG',
          },
          {
            productId: productMap['Pommes de terre'].id,
            quantityRequired: 0.4,
            unit: 'KG',
          },
          {
            productId: productMap['Thym frais'].id,
            quantityRequired: 1,
            unit: 'BUNCH',
          },
          {
            productId: productMap['Beurre doux'].id,
            quantityRequired: 0.05,
            unit: 'KG',
          },
          {
            productId: productMap['Œufs frais'].id,
            quantityRequired: 2,
            unit: 'PC',
          },
        ],
      },
    },
  });

  // DESSERTS
  const rhubarbe = await prisma.dish.create({
    data: {
      name: 'La rhubarbe',
      description: 'Marbré confit et chocolat dulcey, jus et sorbet à la groseille, gros sablé breton',
      sellingPrice: 14.00,
      isActive: true,
      recipeIngredients: {
        create: [
          {
            productId: productMap['Sucre en poudre'].id,
            quantityRequired: 0.08,
            unit: 'KG',
          },
          {
            productId: productMap['Farine T55'].id,
            quantityRequired: 0.06,
            unit: 'KG',
          },
          {
            productId: productMap['Beurre doux'].id,
            quantityRequired: 0.04,
            unit: 'KG',
          },
        ],
      },
    },
  });

  const primeursFrages = await prisma.dish.create({
    data: {
      name: 'Les primeurs de fraises',
      description: 'Jus et tartare, sablé croustillant et crème chiboust caramélisée aux oranges sanguines',
      sellingPrice: 14.00,
      isActive: true,
      recipeIngredients: {
        create: [
          {
            productId: productMap['Sucre en poudre'].id,
            quantityRequired: 0.07,
            unit: 'KG',
          },
          {
            productId: productMap['Œufs frais'].id,
            quantityRequired: 2,
            unit: 'PC',
          },
          {
            productId: productMap['Farine T55'].id,
            quantityRequired: 0.05,
            unit: 'KG',
          },
        ],
      },
    },
  });

  const milleFeuille = await prisma.dish.create({
    data: {
      name: 'Le véritable mille-feuille',
      description: 'Pâte caramélisée, à la vanille « bourbon» et caramel au beurre salé',
      sellingPrice: 14.00,
      isActive: true,
      recipeIngredients: {
        create: [
          {
            productId: productMap['Farine T55'].id,
            quantityRequired: 0.1,
            unit: 'KG',
          },
          {
            productId: productMap['Beurre doux'].id,
            quantityRequired: 0.08,
            unit: 'KG',
          },
          {
            productId: cremePat.id,
            quantityRequired: 0.15,
            unit: 'L',
          },
        ],
      },
    },
  });

  const madeleine = await prisma.dish.create({
    data: {
      name: 'La madeleine « de Proust » au citron',
      description: 'Confit agrumes au poivre de Timut, crémeux et perles de yuzu',
      sellingPrice: 15.00,
      isActive: true,
      recipeIngredients: {
        create: [
          {
            productId: productMap['Farine T55'].id,
            quantityRequired: 0.05,
            unit: 'KG',
          },
          {
            productId: productMap['Œufs frais'].id,
            quantityRequired: 2,
            unit: 'PC',
          },
          {
            productId: productMap['Beurre doux'].id,
            quantityRequired: 0.05,
            unit: 'KG',
          },
          {
            productId: productMap['Sucre en poudre'].id,
            quantityRequired: 0.06,
            unit: 'KG',
          },
        ],
      },
    },
  });

  const gourmand = await prisma.dish.create({
    data: {
      name: 'Le gourmand',
      description: 'Trois inspirations du moment de notre pâtissier',
      sellingPrice: 15.00,
      isActive: true,
      recipeIngredients: {
        create: [
          {
            productId: productMap['Sucre en poudre'].id,
            quantityRequired: 0.1,
            unit: 'KG',
          },
          {
            productId: productMap['Farine T55'].id,
            quantityRequired: 0.08,
            unit: 'KG',
          },
        ],
      },
    },
  });

  const chocolatXoco = await prisma.dish.create({
    data: {
      name: 'Le chocolat « Xoco »',
      description: 'Biscuit Marigny moelleux, ganache et crémeux au chocolat 70%, sorbet framboise et opaline croustillante',
      sellingPrice: 17.00,
      isActive: true,
      recipeIngredients: {
        create: [
          {
            productId: productMap['Œufs frais'].id,
            quantityRequired: 2,
            unit: 'PC',
          },
          {
            productId: productMap['Sucre en poudre'].id,
            quantityRequired: 0.12,
            unit: 'KG',
          },
          {
            productId: productMap['Farine T55'].id,
            quantityRequired: 0.06,
            unit: 'KG',
          },
          {
            productId: productMap['Beurre doux'].id,
            quantityRequired: 0.06,
            unit: 'KG',
          },
        ],
      },
    },
  });

  const fromages = await prisma.dish.create({
    data: {
      name: 'Les fromages « de la maison Guibert »',
      description: 'Composition de trois fromages à sélectionner, chutney à la figue et quelques pousses',
      sellingPrice: 15.00,
      isActive: true,
      recipeIngredients: {
        create: [],
      },
    },
  });

  console.log('✅ Created 21 dishes with recipe ingredients\n');

  // ============================================================================
  // MENUS (from Sens Unique Restaurant)
  // ============================================================================
  console.log('📋 Creating menus...');

  const menuCanaille = await prisma.menu.create({
    data: {
      name: 'Menu Canaille',
      description: 'Menu servi dans son intégralité',
      fixedPrice: 49.00,
      pricingType: PricingType.PRIX_FIXE,
      isActive: true,
      sections: {
        create: [
          {
            name: 'Nos Entrées',
            displayOrder: 1,
            isRequired: true,
            dishes: {
              create: [
                {
                  dishId: laMer.id,
                  displayOrder: 1,
                  priceOverride: 0,
                },
                {
                  dishId: carpaccioVeau.id,
                  displayOrder: 2,
                  priceOverride: 0,
                },
                {
                  dishId: tarteVegetarienne.id,
                  displayOrder: 3,
                  priceOverride: 0,
                },
              ],
            },
          },
          {
            name: 'Nos Plats',
            displayOrder: 2,
            isRequired: true,
            dishes: {
              create: [
                {
                  dishId: filetDaurade.id,
                  displayOrder: 1,
                  priceOverride: 0,
                },
                {
                  dishId: ongletBoeuf.id,
                  displayOrder: 2,
                  priceOverride: 0,
                },
                {
                  dishId: epauleAgneau.id,
                  displayOrder: 3,
                  priceOverride: 0,
                },
                {
                  dishId: vegetal.id,
                  displayOrder: 4,
                  priceOverride: 0,
                },
              ],
            },
          },
          {
            name: 'Nos Desserts',
            displayOrder: 3,
            isRequired: true,
            dishes: {
              create: [
                {
                  dishId: rhubarbe.id,
                  displayOrder: 1,
                  priceOverride: 0,
                },
                {
                  dishId: primeursFrages.id,
                  displayOrder: 2,
                  priceOverride: 0,
                },
                {
                  dishId: milleFeuille.id,
                  displayOrder: 3,
                  priceOverride: 0,
                },
              ],
            },
          },
        ],
      },
    },
  });

  const menuGourmand = await prisma.menu.create({
    data: {
      name: 'Menu Gourmand',
      description: 'Menu servi dans son intégralité',
      fixedPrice: 68.00,
      pricingType: PricingType.PRIX_FIXE,
      isActive: true,
      sections: {
        create: [
          {
            name: 'Nos Entrées',
            displayOrder: 1,
            isRequired: true,
            dishes: {
              create: [
                {
                  dishId: foieGras.id,
                  displayOrder: 1,
                  priceOverride: 0,
                },
                {
                  dishId: escargots.id,
                  displayOrder: 2,
                  priceOverride: 0,
                },
                {
                  dishId: cevicheBar.id,
                  displayOrder: 3,
                  priceOverride: 0,
                },
              ],
            },
          },
          {
            name: 'Nos Plats',
            displayOrder: 2,
            isRequired: true,
            dishes: {
              create: [
                {
                  dishId: gambas.id,
                  displayOrder: 1,
                  priceOverride: 0,
                },
                {
                  dishId: quasiVeau.id,
                  displayOrder: 2,
                  priceOverride: 0,
                },
                {
                  dishId: poularde.id,
                  displayOrder: 3,
                  priceOverride: 0,
                },
                {
                  dishId: vegetal.id,
                  displayOrder: 4,
                  priceOverride: 0,
                },
              ],
            },
          },
          {
            name: 'Nos Desserts',
            displayOrder: 3,
            isRequired: true,
            dishes: {
              create: [
                {
                  dishId: madeleine.id,
                  displayOrder: 1,
                  priceOverride: 0,
                },
                {
                  dishId: gourmand.id,
                  displayOrder: 2,
                  priceOverride: 0,
                },
                {
                  dishId: chocolatXoco.id,
                  displayOrder: 3,
                  priceOverride: 0,
                },
              ],
            },
          },
        ],
      },
    },
  });

  console.log('✅ Created 2 menus with sections and dishes\n');

  // ============================================================================
  // BILLS & STOCK MOVEMENTS
  // ============================================================================
  console.log('📄 Creating bills and stock movements...');

  const bill1 = await prisma.bill.create({
    data: {
      filename: 'facture_metro_20250115.pdf',
      supplier: 'Metro Cash & Carry',
      billDate: new Date('2025-01-15'),
      totalAmount: 1245.80,
      products: {
        create: [
          {
            productId: productMap['Lait entier'].id,
            quantityExtracted: 30,
            unitPriceExtracted: 1.2,
            totalValueExtracted: 36.0,
          },
          {
            productId: productMap['Farine T55'].id,
            quantityExtracted: 50,
            unitPriceExtracted: 1.1,
            totalValueExtracted: 55.0,
          },
          {
            productId: productMap['Poulet fermier (entier)'].id,
            quantityExtracted: 15,
            unitPriceExtracted: 12.5,
            totalValueExtracted: 187.5,
          },
        ],
      },
      stockMovements: {
        create: [
          {
            productId: productMap['Lait entier'].id,
            movementType: MovementType.IN,
            quantity: 30,
            balanceAfter: 50,
            reason: 'Livraison facture Metro',
            userId: admin.id,
          },
          {
            productId: productMap['Farine T55'].id,
            movementType: MovementType.IN,
            quantity: 50,
            balanceAfter: 100,
            reason: 'Livraison facture Metro',
            userId: admin.id,
          },
          {
            productId: productMap['Poulet fermier (entier)'].id,
            movementType: MovementType.IN,
            quantity: 15,
            balanceAfter: 30,
            reason: 'Livraison facture Metro',
            userId: admin.id,
          },
        ],
      },
    },
  });

  const bill2 = await prisma.bill.create({
    data: {
      filename: 'facture_rungis_20250116.pdf',
      supplier: 'Rungis Marée',
      billDate: new Date('2025-01-16'),
      totalAmount: 685.50,
      products: {
        create: [
          {
            productId: productMap['Saumon norvégien'].id,
            quantityExtracted: 15,
            unitPriceExtracted: 22.0,
            totalValueExtracted: 330.0,
          },
          {
            productId: productMap['Filet de bœuf'].id,
            quantityExtracted: 8,
            unitPriceExtracted: 35.0,
            totalValueExtracted: 280.0,
          },
        ],
      },
      stockMovements: {
        create: [
          {
            productId: productMap['Saumon norvégien'].id,
            movementType: MovementType.IN,
            quantity: 15,
            balanceAfter: 15,
            reason: 'Livraison Rungis',
            userId: user.id,
          },
          {
            productId: productMap['Filet de bœuf'].id,
            movementType: MovementType.IN,
            quantity: 8,
            balanceAfter: 12,
            reason: 'Livraison Rungis',
            userId: user.id,
          },
        ],
      },
    },
  });

  console.log('✅ Created 2 bills with stock movements\n');

  // ============================================================================
  // SALES
  // ============================================================================
  console.log('💰 Creating sales records...');

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  await prisma.sale.createMany({
    data: [
      // Today
      {
        dishId: ongletBoeuf.id,
        quantitySold: 12,
        saleDate: today,
        notes: 'Service midi + soir',
        userId: admin.id,
      },
      {
        dishId: gambas.id,
        quantitySold: 8,
        saleDate: today,
        notes: 'Service soir',
        userId: admin.id,
      },
      {
        dishId: filetDaurade.id,
        quantitySold: 10,
        saleDate: today,
        userId: admin.id,
      },
      {
        dishId: chocolatXoco.id,
        quantitySold: 15,
        saleDate: today,
        userId: admin.id,
      },
      {
        dishId: madeleine.id,
        quantitySold: 8,
        saleDate: today,
        userId: admin.id,
      },
      // Yesterday
      {
        dishId: poularde.id,
        quantitySold: 14,
        saleDate: yesterday,
        userId: user.id,
      },
      {
        dishId: foieGras.id,
        quantitySold: 11,
        saleDate: yesterday,
        userId: user.id,
      },
      {
        dishId: vegetal.id,
        quantitySold: 20,
        saleDate: yesterday,
        userId: user.id,
      },
      {
        dishId: milleFeuille.id,
        quantitySold: 12,
        saleDate: yesterday,
        userId: user.id,
      },
      // Two days ago
      {
        dishId: quasiVeau.id,
        quantitySold: 6,
        saleDate: twoDaysAgo,
        userId: admin.id,
      },
      {
        dishId: escargots.id,
        quantitySold: 9,
        saleDate: twoDaysAgo,
        userId: admin.id,
      },
      {
        dishId: rhubarbe.id,
        quantitySold: 11,
        saleDate: twoDaysAgo,
        userId: admin.id,
      },
    ],
  });

  console.log('✅ Created 12 sales records\n');

  // ============================================================================
  // DLC (Best Before Dates)
  // ============================================================================
  console.log('📅 Creating DLC records...');

  const futureDate1 = new Date();
  futureDate1.setDate(futureDate1.getDate() + 3);
  const futureDate2 = new Date();
  futureDate2.setDate(futureDate2.getDate() + 7);
  const futureDate3 = new Date();
  futureDate3.setDate(futureDate3.getDate() + 14);
  const expiredDate = new Date();
  expiredDate.setDate(expiredDate.getDate() - 2);

  await prisma.dLC.createMany({
    data: [
      {
        productId: productMap['Saumon norvégien'].id,
        expirationDate: futureDate1,
        quantity: 5,
        unit: Unit.KG,
        batchNumber: 'SAU-2025-001',
        supplier: 'Rungis Marée',
        status: DLCStatus.ACTIVE,
        notes: 'Arrivage du 16/01',
      },
      {
        productId: productMap['Poulet fermier (entier)'].id,
        expirationDate: futureDate2,
        quantity: 10,
        unit: Unit.PC,
        batchNumber: 'POU-2025-024',
        supplier: 'Metro',
        status: DLCStatus.ACTIVE,
      },
      {
        productId: productMap['Crème fraîche 35%'].id,
        expirationDate: futureDate3,
        quantity: 8,
        unit: Unit.L,
        batchNumber: 'CRE-2025-008',
        supplier: 'Lactalis',
        status: DLCStatus.ACTIVE,
      },
      {
        productId: productMap['Œufs frais'].id,
        expirationDate: expiredDate,
        quantity: 30,
        unit: Unit.PC,
        batchNumber: 'OEU-2025-002',
        status: DLCStatus.EXPIRED,
        notes: 'À retirer du stock',
      },
    ],
  });

  console.log('✅ Created 4 DLC records\n');

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✨ Database seeding completed successfully!\n');
  console.log('📊 Summary (Sens Unique Restaurant Menu):');
  console.log('  👤 Users: 2');
  console.log('     - admin@cocorico.fr (password: admin123)');
  console.log('     - user@cocorico.fr (password: user123)');
  console.log(`  📦 Base Products: ${products.length}`);
  console.log('  🧪 Composite Products: 2');
  console.log('  🍽️  Dishes: 21');
  console.log('     - 6 Entrées (La mer, Carpaccio veau, Tarte végétarienne, etc.)');
  console.log('     - 8 Plats (Daurade, Gambas, Onglet de bœuf, etc.)');
  console.log('     - 7 Desserts (Rhubarbe, Mille-feuille, Chocolat Xoco, etc.)');
  console.log('  📋 Menus: 2');
  console.log('     - Menu Canaille (49€)');
  console.log('     - Menu Gourmand (68€)');
  console.log('  📄 Bills: 2');
  console.log('  💰 Sales: 12');
  console.log('  📅 DLC Records: 4');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
