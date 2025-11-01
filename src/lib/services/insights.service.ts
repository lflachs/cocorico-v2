import { db } from '@/lib/db/client';
import { getAllProducts } from './product.service';
import { getUpcomingDlcs } from './dlc.service';
import { getDishes } from './dish.service';

/**
 * Insights Service - Smart daily brief generation
 * Generates actionable insights for restaurant operations
 *
 * Two modes:
 * - MORNING (6am-2pm): Forward-looking - priorities for today
 * - EVENING (2pm-6am): Retrospective - sales recap + tomorrow prep
 */

type BriefMode = 'morning' | 'evening';

/**
 * Detect time of day and return appropriate mode
 */
function getBriefMode(): BriefMode {
  const hour = new Date().getHours();
  // Morning: 6am to 2pm (6-13)
  // Evening: 2pm to 6am (14-23, 0-5)
  return hour >= 6 && hour < 14 ? 'morning' : 'evening';
}

export interface ReorderAlert {
  productId: string;
  productName: string;
  currentQuantity: number;
  parLevel: number;
  unit: string;
  urgency: 'urgent' | 'high' | 'medium';
  usedInDishCount: number;
}

export interface ExpiringProduct {
  productId: string;
  productName: string;
  expirationDate: Date;
  daysUntilExpiration: number;
  quantity: number;
  unit: string;
  estimatedValue: number;
  usedInDishes: Array<{
    id: string;
    name: string;
  }>;
}

export interface MenuStatusItem {
  dishId: string;
  dishName: string;
  canMake: boolean;
  missingIngredients: Array<{
    name: string;
    needed: number;
    available: number;
    unit: string;
  }>;
}

export interface DailyInsights {
  briefSummary: string;
  reorderAlerts: ReorderAlert[];
  expiringProducts: ExpiringProduct[];
  menuStatus: {
    allReady: boolean;
    readyCount: number;
    totalActive: number;
    items: MenuStatusItem[];
    dishCapacities?: DishCapacity[];
  };
  stats: {
    totalReorderNeeded: number;
    urgentReorders: number;
    expiringValue: number;
    expiringCount: number;
  };
}

/**
 * Get products that need reordering (below par level)
 */
export async function getReorderAlerts(): Promise<ReorderAlert[]> {
  const products = await getAllProducts();
  const alerts: ReorderAlert[] = [];

  for (const product of products) {
    // Only trackable products with par levels
    if (!product.trackable || !product.parLevel) continue;

    // Check if below par level
    if (product.quantity < product.parLevel) {
      // Count how many dishes use this product
      const dishCount = await db.recipeIngredient.count({
        where: {
          productId: product.id,
          dish: { isActive: true },
        },
      });

      // Calculate urgency
      const percentageOfPar = (product.quantity / product.parLevel) * 100;
      let urgency: 'urgent' | 'high' | 'medium' = 'medium';

      if (percentageOfPar < 20) urgency = 'urgent';
      else if (percentageOfPar < 50) urgency = 'high';

      alerts.push({
        productId: product.id,
        productName: product.name,
        currentQuantity: product.quantity,
        parLevel: product.parLevel,
        unit: product.unit,
        urgency,
        usedInDishCount: dishCount,
      });
    }
  }

  // Sort by urgency (urgent first, then high, then medium)
  return alerts.sort((a, b) => {
    const urgencyOrder = { urgent: 0, high: 1, medium: 2 };
    return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
  });
}

/**
 * Get products expiring soon with dish suggestions
 */
export async function getExpiringProductsWithDishes(): Promise<ExpiringProduct[]> {
  const dlcs = await getUpcomingDlcs(3); // Next 3 days
  const expiringProducts: ExpiringProduct[] = [];

  for (const dlc of dlcs) {
    // Find dishes that use this product
    const recipes = await db.recipeIngredient.findMany({
      where: {
        productId: dlc.productId,
        dish: { isActive: true },
      },
      include: {
        dish: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const daysUntilExpiration = Math.ceil(
      (dlc.expirationDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    const estimatedValue = dlc.product.unitPrice
      ? dlc.product.unitPrice * dlc.quantity
      : 0;

    expiringProducts.push({
      productId: dlc.productId,
      productName: dlc.product.name,
      expirationDate: dlc.expirationDate,
      daysUntilExpiration,
      quantity: dlc.quantity,
      unit: dlc.unit,
      estimatedValue,
      usedInDishes: recipes.map((r) => ({
        id: r.dish.id,
        name: r.dish.name,
      })),
    });
  }

  // Sort by days until expiration (soonest first)
  return expiringProducts.sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration);
}

export interface DishCapacity {
  dishId: string;
  dishName: string;
  maxPortions: number;
  limitingIngredient?: string;
}

/**
 * Check menu readiness - can we make all active dishes?
 */
export async function getMenuStatus(): Promise<DailyInsights['menuStatus'] & { dishCapacities?: DishCapacity[] }> {
  const dishes = await getDishes({ isActive: true, includeRecipe: true });
  const items: MenuStatusItem[] = [];
  const dishCapacities: DishCapacity[] = [];

  for (const dish of dishes) {
    const missingIngredients = [];
    let canMake = true;
    let maxPortions = Infinity;
    let limitingIngredient = '';

    // Calculate how many portions we can make
    for (const ingredient of dish.recipeIngredients) {
      const possiblePortions = Math.floor(ingredient.product.quantity / ingredient.quantityRequired);

      if (possiblePortions < maxPortions) {
        maxPortions = possiblePortions;
        limitingIngredient = ingredient.product.name;
      }

      if (ingredient.product.quantity < ingredient.quantityRequired) {
        canMake = false;
        missingIngredients.push({
          name: ingredient.product.name,
          needed: ingredient.quantityRequired,
          available: ingredient.product.quantity,
          unit: ingredient.unit,
        });
      }
    }

    // Store capacity info
    if (dish.recipeIngredients.length > 0) {
      dishCapacities.push({
        dishId: dish.id,
        dishName: dish.name,
        maxPortions: maxPortions === Infinity ? 999 : maxPortions,
        limitingIngredient: maxPortions !== Infinity ? limitingIngredient : undefined,
      });
    }

    items.push({
      dishId: dish.id,
      dishName: dish.name,
      canMake,
      missingIngredients,
    });
  }

  const readyCount = items.filter((i) => i.canMake).length;

  return {
    allReady: readyCount === items.length,
    readyCount,
    totalActive: items.length,
    items: items.filter((i) => !i.canMake), // Only return items with issues
    dishCapacities: dishCapacities.sort((a, b) => a.maxPortions - b.maxPortions), // Sort by capacity, lowest first
  };
}

/**
 * Generate a multi-layered intelligent daily brief
 * Cocorico the rooster is your sous-chef telling you a complete story!
 *
 * Morning: Forward-looking priorities
 * Evening: Retrospective + tomorrow prep
 */
async function generateBriefSummary(
  insights: Omit<DailyInsights, 'briefSummary'>,
  language: 'en' | 'fr' = 'en',
  mode: BriefMode = 'morning'
): Promise<string> {
  // Route to appropriate mode
  if (mode === 'evening') {
    return generateEveningBrief(insights, language);
  }
  return generateMorningBrief(insights, language);
}

/**
 * Morning brief: Forward-looking priorities for today
 */
function generateMorningBrief(insights: Omit<DailyInsights, 'briefSummary'>, language: 'en' | 'fr' = 'en'): string {
  const { stats, menuStatus, reorderAlerts, expiringProducts } = insights;

  // === SCENARIO: ALL CLEAR - Multi-layered celebration ===
  if (stats.totalReorderNeeded === 0 && stats.expiringCount === 0 && menuStatus.allReady) {
    const readyDishCount = menuStatus.totalActive;
    const lowestCapacity = menuStatus.dishCapacities?.[0]; // Dish with lowest portions
    const highestCapacity = menuStatus.dishCapacities?.[menuStatus.dishCapacities.length - 1];

    if (language === 'fr') {
      if (readyDishCount > 0) {
        // Part 1: Greeting
        let brief = `Cocorico, Chef ! 🐓 Journée qui s'annonce au top.\n\n`;

        // Part 2: Stock status
        brief += `📦 **Niveau des stocks** : Tout est au vert. Les ${readyDishCount} plats du menu sont prêts à cuisiner, aucun ingrédient critique, rien n'expire dans les prochains jours.\n\n`;

        // Part 3: Capacity insights
        if (lowestCapacity && lowestCapacity.maxPortions < 999) {
          const avgCapacity = Math.round(
            (menuStatus.dishCapacities?.reduce((sum, d) => sum + Math.min(d.maxPortions, 100), 0) || 0) /
            (menuStatus.dishCapacities?.length || 1)
          );
          brief += `🔥 **Capacité de service** : En moyenne, vous pouvez réaliser ${avgCapacity} portions par plat. `;
          if (lowestCapacity.maxPortions < 20) {
            brief += `Attention Chef, ${lowestCapacity.dishName} est limité à ${lowestCapacity.maxPortions} portions (${lowestCapacity.limitingIngredient}).\n\n`;
          } else {
            brief += `Belle marge pour absorber les imprévus.\n\n`;
          }
        }

        // Part 4: Strategic recommendations
        if (highestCapacity && lowestCapacity && highestCapacity.maxPortions > lowestCapacity.maxPortions * 2) {
          brief += `💡 **Recommandation du jour** : ${highestCapacity.dishName} offre une excellente capacité (${highestCapacity.maxPortions} portions). Idéal pour un plat du jour ou une suggestion spéciale.\n\n`;
        } else {
          brief += `💡 **Conseil stratégique** : Stock équilibré sur tous les plats. Vous disposez d'une belle flexibilité pour vous adapter aux demandes.\n\n`;
        }

        // Part 5: Motivation
        brief += `✨ **Le mot de Cocorico** : Tout est sous contrôle, Chef. Concentrez-vous sur la qualité et l'expérience client. Je m'occupe du reste ! 👨‍🍳`;

        return brief;
      }
      return "Tout est en ordre, Chef ! Le stock est bien géré, rien n'expire dans l'immédiat. Continuez ainsi ! 👌";
    }

    // English version
    if (readyDishCount > 0) {
      // Part 1: Greeting
      let brief = `Cocorico, Chef! 🐓 Looking like a great day ahead.\n\n`;

      // Part 2: Stock status
      brief += `📦 **Stock levels**: Everything's green. All ${readyDishCount} menu dishes ready to cook, no critical ingredients, nothing expiring soon.\n\n`;

      // Part 3: Capacity insights
      if (lowestCapacity && lowestCapacity.maxPortions < 999) {
        const avgCapacity = Math.round(
          (menuStatus.dishCapacities?.reduce((sum, d) => sum + Math.min(d.maxPortions, 100), 0) || 0) /
          (menuStatus.dishCapacities?.length || 1)
        );
        brief += `🔥 **Service capacity**: On average, you can make ${avgCapacity} portions per dish. `;
        if (lowestCapacity.maxPortions < 20) {
          brief += `Watch out, ${lowestCapacity.dishName} is limited to ${lowestCapacity.maxPortions} portions (${lowestCapacity.limitingIngredient}).\n\n`;
        } else {
          brief += `Good buffer to handle surprises.\n\n`;
        }
      }

      // Part 4: Strategic recommendations
      if (highestCapacity && lowestCapacity && highestCapacity.maxPortions > lowestCapacity.maxPortions * 2) {
        brief += `💡 **Today's recommendation**: ${highestCapacity.dishName} has great capacity (${highestCapacity.maxPortions} portions). Perfect for a daily special or featured dish!\n\n`;
      } else {
        brief += `💡 **Strategic insight**: Balanced stock across all dishes. You've got great flexibility to adapt to demand.\n\n`;
      }

      // Part 5: Motivation
      brief += `✨ **Cocorico's word**: Everything's under control. Focus on quality and customer experience. We got the rest! 👨‍🍳`;

      return brief;
    }
    return "Looking good, Chef! Stock's well managed, nothing expiring soon. Keep it up! 👌";
  }

  // === SCENARIO: ISSUES TO ADDRESS - Multi-layered action plan ===

  if (language === 'fr') {
    // Part 1: Greeting with urgency level
    let brief = '';
    const hasUrgent = stats.urgentReorders > 0;
    const hasExpiring = stats.expiringCount > 0;

    if (hasUrgent) {
      brief = `Chef ! 🚨 Votre attention est requise.\n\n`;
    } else if (hasExpiring) {
      brief = `Bonjour Chef ! 🐓 Quelques points à noter ce matin.\n\n`;
    } else {
      brief = `Bonjour Chef ! 👋 Briefing du jour.\n\n`;
    }

    // Part 2: Stock alerts (most critical first)
    if (stats.urgentReorders > 0 || stats.totalReorderNeeded > 0) {
      const urgentItems = reorderAlerts.filter(a => a.urgency === 'urgent');
      const normalItems = reorderAlerts.filter(a => a.urgency !== 'urgent');

      brief += `⚠️ **Niveau des stocks** :\n`;

      if (urgentItems.length > 0) {
        urgentItems.slice(0, 2).forEach(item => {
          const dishInfo = item.usedInDishCount > 0 ? ` — ${item.usedInDishCount} plat${item.usedInDishCount > 1 ? 's' : ''} concerné${item.usedInDishCount > 1 ? 's' : ''}` : '';
          brief += `   • **${item.productName}** : ${Math.round(item.currentQuantity)}/${Math.round(item.parLevel)} ${item.unit}${dishInfo}\n`;
        });
      }

      if (normalItems.length > 0 && normalItems.length <= 3) {
        normalItems.forEach(item => {
          brief += `   • ${item.productName} : ${Math.round(item.currentQuantity)}/${Math.round(item.parLevel)} ${item.unit}\n`;
        });
      } else if (normalItems.length > 3) {
        brief += `   • +${normalItems.length} autres articles à surveiller\n`;
      }
      brief += `\n`;
    }

    // Part 3: Expiring products - simple list
    if (stats.expiringCount > 0) {
      const totalValue = Math.round(stats.expiringValue);
      brief += `💸 **Produits à utiliser** ${totalValue > 0 ? `(€${totalValue} en jeu)` : ''} :\n`;

      expiringProducts.slice(0, 4).forEach(product => {
        const when = product.daysUntilExpiration === 0
          ? "expire aujourd'hui"
          : product.daysUntilExpiration === 1
          ? 'expire demain'
          : `expire dans ${product.daysUntilExpiration} jours`;
        const value = product.unitPrice && product.quantity
          ? ` (€${Math.round(product.unitPrice * product.quantity)})`
          : '';
        brief += `   • ${product.productName} — ${when}${value}\n`;
      });

      if (expiringProducts.length > 4) {
        brief += `   • +${expiringProducts.length - 4} autre${expiringProducts.length - 4 > 1 ? 's' : ''}\n`;
      }
      brief += `\n`;
    }

    // Part 4: Menu readiness
    if (!menuStatus.allReady && menuStatus.items.length > 0) {
      brief += `🍽️ **État du menu** :\n`;
      brief += `   ${menuStatus.readyCount}/${menuStatus.totalActive} plats prêts\n`;
      menuStatus.items.slice(0, 2).forEach(item => {
        const missing = item.missingIngredients.map(i => i.name.toLowerCase()).join(', ');
        brief += `   • ${item.dishName} — manque ${missing}\n`;
      });
      if (menuStatus.items.length > 2) {
        brief += `   • +${menuStatus.items.length - 2} autre${menuStatus.items.length - 2 > 1 ? 's' : ''}\n`;
      }
      brief += `\n`;
    }

    // Part 5: Strategic action plan
    brief += `💡 **Plan d'action Cocorico** :\n`;
    let actionNumber = 1;

    if (hasUrgent) {
      const urgentProducts = reorderAlerts.filter(a => a.urgency === 'urgent').slice(0, 2).map(a => a.productName.toLowerCase()).join(' et ');
      brief += `   ${actionNumber}️⃣ Commander en urgence : ${urgentProducts}\n`;
      actionNumber++;
    }

    // Smart dish recommendations based on expiring products
    if (hasExpiring) {
      const criticalProducts = expiringProducts.filter(p => p.daysUntilExpiration <= 1);
      const soonProducts = expiringProducts.filter(p => p.daysUntilExpiration > 1 && p.daysUntilExpiration <= 3);

      // Build a map of dishes and which expiring products they use
      const dishUtilization = new Map<string, {
        dishName: string;
        criticalIngredients: string[];
        soonIngredients: string[];
        totalCount: number;
      }>();

      // Collect all dishes from critical products
      criticalProducts.forEach(product => {
        product.usedInDishes.forEach(dish => {
          if (!dishUtilization.has(dish.name)) {
            dishUtilization.set(dish.name, {
              dishName: dish.name,
              criticalIngredients: [],
              soonIngredients: [],
              totalCount: 0
            });
          }
          const entry = dishUtilization.get(dish.name)!;
          entry.criticalIngredients.push(product.productName.toLowerCase());
          entry.totalCount++;
        });
      });

      // Collect all dishes from soon-expiring products
      soonProducts.forEach(product => {
        product.usedInDishes.forEach(dish => {
          if (!dishUtilization.has(dish.name)) {
            dishUtilization.set(dish.name, {
              dishName: dish.name,
              criticalIngredients: [],
              soonIngredients: [],
              totalCount: 0
            });
          }
          const entry = dishUtilization.get(dish.name)!;
          entry.soonIngredients.push(product.productName.toLowerCase());
          entry.totalCount++;
        });
      });

      // Sort dishes: prioritize those using multiple expiring ingredients
      const sortedDishes = Array.from(dishUtilization.values())
        .sort((a, b) => b.totalCount - a.totalCount);

      // Show top 3 dish recommendations
      const maxRecommendations = Math.min(3, sortedDishes.length);
      for (let i = 0; i < maxRecommendations; i++) {
        const dish = sortedDishes[i];

        if (dish.criticalIngredients.length > 0) {
          // URGENT: has ingredients expiring today/tomorrow
          const ingredients = dish.criticalIngredients.join(' + ');
          const count = dish.criticalIngredients.length > 1 ? ` — ${dish.criticalIngredients.length} produits` : '';
          brief += `   ${actionNumber}️⃣ Suggérer en priorité : ${dish.dishName} (utilise ${ingredients}${count})\n`;
        } else {
          // SOON: only has ingredients expiring in 2-3 days
          const ingredients = dish.soonIngredients.join(' + ');
          const count = dish.soonIngredients.length > 1 ? ` — ${dish.soonIngredients.length} produits` : '';
          brief += `   ${actionNumber}️⃣ Proposer comme suggestion : ${dish.dishName} (utilise ${ingredients}${count})\n`;
        }
        actionNumber++;
      }
    }

    if (!menuStatus.allReady) {
      brief += `   ${actionNumber}️⃣ Réapprovisionner pour débloquer ${menuStatus.items.length} plat${menuStatus.items.length > 1 ? 's' : ''}\n`;
    }

    brief += `\n✨ **Le mot de Cocorico** : ${hasUrgent ? 'Je gère les urgences, le service sera impeccable !' : 'Quelques ajustements et tout sera parfait. Vous assurez, Chef ! 💪'}`;

    return brief;
  }

  // English version - multi-layered
  let brief = '';
  const hasUrgent = stats.urgentReorders > 0;
  const hasExpiring = stats.expiringCount > 0;

  if (hasUrgent) {
    brief = `Chef! 🚨 Need your attention here.\n\n`;
  } else if (hasExpiring) {
    brief = `Hey Chef! 🐓 Few things to note this morning.\n\n`;
  } else {
    brief = `Morning Chef! 👋 Quick daily brief.\n\n`;
  }

  // Part 2: Stock alerts
  if (stats.urgentReorders > 0 || stats.totalReorderNeeded > 0) {
    const urgentItems = reorderAlerts.filter(a => a.urgency === 'urgent');
    const normalItems = reorderAlerts.filter(a => a.urgency !== 'urgent');

    brief += `⚠️ **Stock levels**:\n`;

    if (urgentItems.length > 0) {
      urgentItems.slice(0, 2).forEach(item => {
        const dishInfo = item.usedInDishCount > 0 ? ` — ${item.usedInDishCount} dish${item.usedInDishCount > 1 ? 'es' : ''} affected` : '';
        brief += `   • **${item.productName}**: ${Math.round(item.currentQuantity)}/${Math.round(item.parLevel)} ${item.unit}${dishInfo}\n`;
      });
    }

    if (normalItems.length > 0 && normalItems.length <= 3) {
      normalItems.forEach(item => {
        brief += `   • ${item.productName}: ${Math.round(item.currentQuantity)}/${Math.round(item.parLevel)} ${item.unit}\n`;
      });
    } else if (normalItems.length > 3) {
      brief += `   • +${normalItems.length} other items to monitor\n`;
    }
    brief += `\n`;
  }

  // Part 3: Expiring products - simple list
  if (stats.expiringCount > 0) {
    const totalValue = Math.round(stats.expiringValue);
    brief += `💸 **Products to use** ${totalValue > 0 ? `(€${totalValue} at stake)` : ''}:\n`;

    expiringProducts.slice(0, 4).forEach(product => {
      const when = product.daysUntilExpiration === 0
        ? 'expires today'
        : product.daysUntilExpiration === 1
        ? 'expires tomorrow'
        : `expires in ${product.daysUntilExpiration} days`;
      const value = product.unitPrice && product.quantity
        ? ` (€${Math.round(product.unitPrice * product.quantity)})`
        : '';
      brief += `   • ${product.productName} — ${when}${value}\n`;
    });

    if (expiringProducts.length > 4) {
      brief += `   • +${expiringProducts.length - 4} more\n`;
    }
    brief += `\n`;
  }

  // Part 4: Menu readiness
  if (!menuStatus.allReady && menuStatus.items.length > 0) {
    brief += `🍽️ **Menu status**:\n`;
    brief += `   ${menuStatus.readyCount}/${menuStatus.totalActive} dishes ready\n`;
    menuStatus.items.slice(0, 2).forEach(item => {
      const missing = item.missingIngredients.map(i => i.name.toLowerCase()).join(', ');
      brief += `   • ${item.dishName} — missing ${missing}\n`;
    });
    if (menuStatus.items.length > 2) {
      brief += `   • +${menuStatus.items.length - 2} more\n`;
    }
    brief += `\n`;
  }

  // Part 5: Strategic action plan
  brief += `💡 **Cocorico's action plan**:\n`;
  let actionNumber = 1;

  if (hasUrgent) {
    const urgentProducts = reorderAlerts.filter(a => a.urgency === 'urgent').slice(0, 2).map(a => a.productName.toLowerCase()).join(' and ');
    brief += `   ${actionNumber}️⃣ Order urgently: ${urgentProducts}\n`;
    actionNumber++;
  }

  // Smart dish recommendations based on expiring products
  if (hasExpiring) {
    const criticalProducts = expiringProducts.filter(p => p.daysUntilExpiration <= 1);
    const soonProducts = expiringProducts.filter(p => p.daysUntilExpiration > 1 && p.daysUntilExpiration <= 3);

    // Build a map of dishes and which expiring products they use
    const dishUtilization = new Map<string, {
      dishName: string;
      criticalIngredients: string[];
      soonIngredients: string[];
      totalCount: number;
    }>();

    // Collect all dishes from critical products
    criticalProducts.forEach(product => {
      product.usedInDishes.forEach(dish => {
        if (!dishUtilization.has(dish.name)) {
          dishUtilization.set(dish.name, {
            dishName: dish.name,
            criticalIngredients: [],
            soonIngredients: [],
            totalCount: 0
          });
        }
        const entry = dishUtilization.get(dish.name)!;
        entry.criticalIngredients.push(product.productName.toLowerCase());
        entry.totalCount++;
      });
    });

    // Collect all dishes from soon-expiring products
    soonProducts.forEach(product => {
      product.usedInDishes.forEach(dish => {
        if (!dishUtilization.has(dish.name)) {
          dishUtilization.set(dish.name, {
            dishName: dish.name,
            criticalIngredients: [],
            soonIngredients: [],
            totalCount: 0
          });
        }
        const entry = dishUtilization.get(dish.name)!;
        entry.soonIngredients.push(product.productName.toLowerCase());
        entry.totalCount++;
      });
    });

    // Sort dishes: prioritize those using multiple expiring ingredients
    const sortedDishes = Array.from(dishUtilization.values())
      .sort((a, b) => b.totalCount - a.totalCount);

    // Show top 3 dish recommendations
    const maxRecommendations = Math.min(3, sortedDishes.length);
    for (let i = 0; i < maxRecommendations; i++) {
      const dish = sortedDishes[i];

      if (dish.criticalIngredients.length > 0) {
        // URGENT: has ingredients expiring today/tomorrow
        const ingredients = dish.criticalIngredients.join(' + ');
        const count = dish.criticalIngredients.length > 1 ? ` — ${dish.criticalIngredients.length} products` : '';
        brief += `   ${actionNumber}️⃣ Priority suggestion: ${dish.dishName} (uses ${ingredients}${count})\n`;
      } else {
        // SOON: only has ingredients expiring in 2-3 days
        const ingredients = dish.soonIngredients.join(' + ');
        const count = dish.soonIngredients.length > 1 ? ` — ${dish.soonIngredients.length} products` : '';
        brief += `   ${actionNumber}️⃣ Suggest as special: ${dish.dishName} (uses ${ingredients}${count})\n`;
      }
      actionNumber++;
    }
  }

  if (!menuStatus.allReady) {
    brief += `   ${actionNumber}️⃣ Restock to unblock ${menuStatus.items.length} dish${menuStatus.items.length > 1 ? 'es' : ''}\n`;
  }

  brief += `\n✨ **Cocorico's word**: ${hasUrgent ? 'We handle the urgent stuff and service will be perfect!' : 'Few adjustments and we are golden. You got this, Chef! 💪'}`;

  return brief;
}

/**
 * Evening brief: Retrospective + tomorrow prep
 */
async function generateEveningBrief(insights: Omit<DailyInsights, 'briefSummary'>, language: 'en' | 'fr' = 'en'): Promise<string> {
  const { stats, menuStatus, reorderAlerts, expiringProducts } = insights;

  // Get evening-specific data
  const [salesSummary, stockFreshness, wasteData] = await Promise.all([
    getTodaySalesSummary(),
    getStockFreshnessCheck(),
    getTodayWaste(),
  ]);

  // Categorize expiring products by urgency
  const criticalExpiring = expiringProducts.filter(p => p.daysUntilExpiration <= 1); // Tomorrow or today
  const soonExpiring = expiringProducts.filter(p => p.daysUntilExpiration > 1 && p.daysUntilExpiration <= 3); // 2-3 days
  const watchExpiring = expiringProducts.filter(p => p.daysUntilExpiration > 3 && p.daysUntilExpiration <= 5); // 4-5 days

  const urgentReorders = reorderAlerts.filter(a => a.urgency === 'urgent');
  const allReorders = reorderAlerts.filter(a => a.urgency === 'urgent' || a.urgency === 'high');

  // Comprehensive check for tomorrow's issues
  const hasTomorrowIssues =
    allReorders.length > 0 ||
    criticalExpiring.length > 0 ||
    soonExpiring.length > 0 ||
    !menuStatus.allReady;

  if (language === 'fr') {
    // Part 1: Evening greeting
    let brief = `Bonsoir Chef ! 🌙 Fin de journée, faisons le point.\n\n`;

    // Part 2: Sales recap with margin
    if (salesSummary.hasSales) {
      const marginColor = salesSummary.marginPercent >= 60 ? '💚' : salesSummary.marginPercent >= 40 ? '💛' : '🔴';
      brief += `📊 **Bilan du service** :\n`;
      brief += `   ${salesSummary.totalDishes} plat${salesSummary.totalDishes > 1 ? 's' : ''} vendus — €${Math.round(salesSummary.totalRevenue)} CA | ${marginColor} €${Math.round(salesSummary.totalMargin)} marge (${Math.round(salesSummary.marginPercent)}%)\n`;

      if (salesSummary.topDishes.length > 0) {
        brief += `   **Top ventes** :\n`;
        salesSummary.topDishes.slice(0, 3).forEach((dish, idx) => {
          brief += `   ${idx + 1}. ${dish.name} (${dish.quantity}x)\n`;
        });
      }
      brief += `\n`;
    } else {
      brief += `📊 **Bilan du service** : ⚠️ Aucune vente enregistrée aujourd'hui.\n`;
      brief += `   → Pensez à enregistrer vos ventes pour un suivi précis !\n\n`;
    }

    // Part 2.5: Waste tracking
    if (wasteData.wasteCount === 0) {
      brief += `♻️ **Gaspillage** : ✨ Zéro perte aujourd'hui ! Belle gestion des DLC. 👏\n\n`;
    } else {
      brief += `♻️ **Gaspillage** : ${wasteData.wasteCount} produit${wasteData.wasteCount > 1 ? 's' : ''} expiré${wasteData.wasteCount > 1 ? 's' : ''} aujourd'hui`;
      if (wasteData.wasteValue > 0) {
        brief += ` (€${Math.round(wasteData.wasteValue)} de perte)`;
      }
      brief += `\n`;
      wasteData.wastedItems.slice(0, 3).forEach(item => {
        brief += `   • ${item.productName} — ${item.quantity} ${item.unit}`;
        if (item.value > 0) {
          brief += ` (€${Math.round(item.value)})`;
        }
        brief += `\n`;
      });
      if (wasteData.wasteCount > 3) {
        brief += `   • +${wasteData.wasteCount - 3} autre${wasteData.wasteCount - 3 > 1 ? 's' : ''}\n`;
      }
      brief += `\n`;
    }

    // Part 3: Stock freshness warning
    if (stockFreshness.isStale) {
      brief += `⚠️ **Mise à jour des stocks** : Dernière modification il y a ${stockFreshness.hoursSinceUpdate}h. Pensez à actualiser les quantités pour avoir des données précises demain matin.\n\n`;
    }

    // Part 4: Tomorrow's preparation - Comprehensive and smart
    if (hasTomorrowIssues) {
      brief += `🔮 **Préparation pour demain** :\n\n`;

      // Stock alerts
      if (allReorders.length > 0) {
        brief += `⚠️ **Stocks à surveiller** :\n`;
        allReorders.slice(0, 3).forEach(alert => {
          const urgencyLabel = alert.urgency === 'urgent' ? '🚨 URGENT' : '⚡';
          const dishInfo = alert.usedInDishCount > 0 ? ` — ${alert.usedInDishCount} plat${alert.usedInDishCount > 1 ? 's' : ''}` : '';
          brief += `   ${urgencyLabel} ${alert.productName} : ${Math.round(alert.currentQuantity)}/${Math.round(alert.parLevel)} ${alert.unit}${dishInfo}\n`;
        });
        if (allReorders.length > 3) {
          brief += `   • +${allReorders.length - 3} autre${allReorders.length - 3 > 1 ? 's' : ''} produits\n`;
        }
        brief += `\n`;
      }

      // Expiring products - categorized by urgency
      const totalExpiringValue = Math.round(expiringProducts.reduce((sum, p) => sum + p.estimatedValue, 0));

      if (criticalExpiring.length > 0 || soonExpiring.length > 0) {
        brief += `💸 **Dates limites de consommation** ${totalExpiringValue > 0 ? `(€${totalExpiringValue} en jeu)` : ''} :\n`;

        // CRITICAL: Expires tomorrow or today
        if (criticalExpiring.length > 0) {
          brief += `   🚨 **URGENT** — À utiliser demain :\n`;
          criticalExpiring.slice(0, 3).forEach(p => {
            const when = p.daysUntilExpiration === 0 ? "expire demain" : "expire après-demain";
            const value = p.estimatedValue > 0 ? ` (€${Math.round(p.estimatedValue)})` : '';
            brief += `      • ${p.productName} — ${when}${value}`;
            if (p.usedInDishes.length > 0) {
              const dish = p.usedInDishes[0].name;
              brief += ` → ${dish}`;
            }
            brief += `\n`;
          });
          if (criticalExpiring.length > 3) {
            brief += `      • +${criticalExpiring.length - 3} autre${criticalExpiring.length - 3 > 1 ? 's' : ''}\n`;
          }
        }

        // SOON: Expires in 2-3 days - need to plan
        if (soonExpiring.length > 0) {
          brief += `   ⚡ **À planifier** — ${soonExpiring.length} produit${soonExpiring.length > 1 ? 's' : ''} expire${soonExpiring.length > 1 ? 'nt' : ''} dans 2-3 jours :\n`;
          soonExpiring.slice(0, 4).forEach(p => {
            const value = p.estimatedValue > 0 ? ` (€${Math.round(p.estimatedValue)})` : '';
            brief += `      • ${p.productName} — ${p.daysUntilExpiration} jour${p.daysUntilExpiration > 1 ? 's' : ''}${value}`;
            if (p.usedInDishes.length > 0) {
              const dishes = p.usedInDishes.slice(0, 2).map(d => d.name).join(', ');
              brief += ` → ${dishes}`;
            }
            brief += `\n`;
          });
          if (soonExpiring.length > 4) {
            brief += `      • +${soonExpiring.length - 4} autre${soonExpiring.length - 4 > 1 ? 's' : ''}\n`;
          }
        }

        // WATCH: Expires in 4-5 days - just awareness
        if (watchExpiring.length > 0) {
          const watchValue = Math.round(watchExpiring.reduce((sum, p) => sum + p.estimatedValue, 0));
          brief += `   👀 **À surveiller** — ${watchExpiring.length} produit${watchExpiring.length > 1 ? 's' : ''} (4-5 jours)`;
          if (watchValue > 0) {
            brief += ` — €${watchValue}`;
          }
          brief += `\n`;
        }

        brief += `\n`;
      }

      // Menu readiness for tomorrow
      if (!menuStatus.allReady && menuStatus.items.length > 0) {
        brief += `🍽️ **Plats à débloquer** :\n`;
        menuStatus.items.slice(0, 2).forEach(item => {
          const missing = item.missingIngredients.map(i => i.name.toLowerCase()).join(', ');
          brief += `   • ${item.dishName} — manque ${missing}\n`;
        });
        if (menuStatus.items.length > 2) {
          brief += `   • +${menuStatus.items.length - 2} autre${menuStatus.items.length - 2 > 1 ? 's' : ''}\n`;
        }
        brief += `\n`;
      }

      // Action plan for tomorrow
      brief += `💡 **Plan d'action pour demain** :\n`;
      let actionNum = 1;

      if (urgentReorders.length > 0) {
        const items = urgentReorders.slice(0, 2).map(a => a.productName.toLowerCase()).join(' et ');
        brief += `   ${actionNum}️⃣ Commander en urgence : ${items}\n`;
        actionNum++;
      }

      // Smart dish recommendations - GROUP BY INGREDIENT first, then suggest dishes
      const relevantExpiring = [...criticalExpiring, ...soonExpiring.slice(0, 2)];
      if (relevantExpiring.length > 0) {
        // Group by ingredient and collect all dishes that use it
        const ingredientToDishes = new Map<string, { productName: string; dishes: string[]; isCritical: boolean; value: number }>();

        relevantExpiring.forEach(product => {
          const isCritical = product.daysUntilExpiration <= 1;
          if (product.usedInDishes.length > 0) {
            ingredientToDishes.set(product.productName, {
              productName: product.productName,
              dishes: product.usedInDishes.map(d => d.name),
              isCritical,
              value: product.estimatedValue,
            });
          }
        });

        // Sort ingredients by: critical first, then by value, then by number of dishes
        const sortedIngredients = Array.from(ingredientToDishes.values())
          .sort((a, b) => {
            if (a.isCritical !== b.isCritical) return a.isCritical ? -1 : 1;
            if (b.value !== a.value) return b.value - a.value;
            return b.dishes.length - a.dishes.length;
          })
          .slice(0, 3);

        sortedIngredients.forEach(({ productName, dishes, isCritical }) => {
          const action = isCritical ? 'Suggérer en priorité' : 'Proposer comme suggestion';
          if (dishes.length === 1) {
            brief += `   ${actionNum}️⃣ ${action} : ${dishes[0]} (utilise ${productName.toLowerCase()})\n`;
          } else if (dishes.length === 2) {
            brief += `   ${actionNum}️⃣ ${action} : ${dishes.join(' ou ')} (utilisent ${productName.toLowerCase()})\n`;
          } else {
            // List all dishes with proper formatting
            const lastDish = dishes[dishes.length - 1];
            const otherDishes = dishes.slice(0, -1).join(', ');
            brief += `   ${actionNum}️⃣ ${action} : ${otherDishes} ou ${lastDish} (utilisent ${productName.toLowerCase()})\n`;
          }
          actionNum++;
        });
      }
    } else {
      brief += `🔮 **Demain matin** :\n`;
      brief += `   ✅ Excellent. Stocks au vert, aucune DLC critique. Tout est en ordre pour le service.\n`;
    }

    const closingMessage = hasTomorrowIssues
      ? 'Je vous ai préparé le plan pour demain.'
      : 'Tout est prêt pour demain.';
    brief += `\n✨ **Le mot de Cocorico** : Bonne soirée, Chef ! ${closingMessage} Reposez-vous bien ! 🌟`;

    return brief;
  }

  // English version
  let brief = `Good evening Chef! 🌙 End of day recap.\n\n`;

  // Part 2: Sales recap with margin
  if (salesSummary.hasSales) {
    const marginColor = salesSummary.marginPercent >= 60 ? '💚' : salesSummary.marginPercent >= 40 ? '💛' : '🔴';
    brief += `📊 **Service summary**:\n`;
    brief += `   ${salesSummary.totalDishes} dish${salesSummary.totalDishes > 1 ? 'es' : ''} sold — €${Math.round(salesSummary.totalRevenue)} revenue | ${marginColor} €${Math.round(salesSummary.totalMargin)} margin (${Math.round(salesSummary.marginPercent)}%)\n`;

    if (salesSummary.topDishes.length > 0) {
      brief += `   **Top sellers**:\n`;
      salesSummary.topDishes.slice(0, 3).forEach((dish, idx) => {
        brief += `   ${idx + 1}. ${dish.name} (${dish.quantity}x)\n`;
      });
    }
    brief += `\n`;
  } else {
    brief += `📊 **Service summary**: ⚠️ No sales recorded today.\n`;
    brief += `   → Remember to record your sales for accurate tracking!\n\n`;
  }

  // Part 2.5: Waste tracking
  if (wasteData.wasteCount === 0) {
    brief += `♻️ **Waste** : ✨ Zero waste today! Great DLC management. 👏\n\n`;
  } else {
    brief += `♻️ **Waste** : ${wasteData.wasteCount} product${wasteData.wasteCount > 1 ? 's' : ''} expired today`;
    if (wasteData.wasteValue > 0) {
      brief += ` (€${Math.round(wasteData.wasteValue)} loss)`;
    }
    brief += `\n`;
    wasteData.wastedItems.slice(0, 3).forEach(item => {
      brief += `   • ${item.productName} — ${item.quantity} ${item.unit}`;
      if (item.value > 0) {
        brief += ` (€${Math.round(item.value)})`;
      }
      brief += `\n`;
    });
    if (wasteData.wasteCount > 3) {
      brief += `   • +${wasteData.wasteCount - 3} more\n`;
    }
    brief += `\n`;
  }

  // Part 3: Stock freshness warning
  if (stockFreshness.isStale) {
    brief += `⚠️ **Stock update**: Last modified ${stockFreshness.hoursSinceUpdate}h ago. Remember to update quantities for accurate data tomorrow morning.\n\n`;
  }

  // Part 4: Tomorrow's preparation (hasTomorrowIssues already defined at top)
  if (hasTomorrowIssues) {
    brief += `🔮 **Tomorrow's prep**:\n\n`;

    // Stock alerts
    if (allReorders.length > 0) {
      brief += `⚠️ **Stock alerts**:\n`;
      allReorders.slice(0, 3).forEach(alert => {
        const urgencyLabel = alert.urgency === 'urgent' ? '🚨 URGENT' : '⚡';
        const dishInfo = alert.usedInDishCount > 0 ? ` — ${alert.usedInDishCount} dish${alert.usedInDishCount > 1 ? 'es' : ''}` : '';
        brief += `   ${urgencyLabel} ${alert.productName}: ${Math.round(alert.currentQuantity)}/${Math.round(alert.parLevel)} ${alert.unit}${dishInfo}\n`;
      });
      if (allReorders.length > 3) {
        brief += `   • +${allReorders.length - 3} more product${allReorders.length - 3 > 1 ? 's' : ''}\n`;
      }
      brief += `\n`;
    }

    // Expiring products - categorized by urgency
    const totalExpiringValue = Math.round(expiringProducts.reduce((sum, p) => sum + p.estimatedValue, 0));

    if (criticalExpiring.length > 0 || soonExpiring.length > 0) {
      brief += `💸 **Expiration dates** ${totalExpiringValue > 0 ? `(€${totalExpiringValue} at stake)` : ''}:\n`;

      // CRITICAL: Expires tomorrow or today
      if (criticalExpiring.length > 0) {
        brief += `   🚨 **URGENT** — Use tomorrow:\n`;
        criticalExpiring.slice(0, 3).forEach(p => {
          const when = p.daysUntilExpiration === 0 ? "expires tomorrow" : "expires day after";
          const value = p.estimatedValue > 0 ? ` (€${Math.round(p.estimatedValue)})` : '';
          brief += `      • ${p.productName} — ${when}${value}`;
          if (p.usedInDishes.length > 0) {
            const dish = p.usedInDishes[0].name;
            brief += ` → ${dish}`;
          }
          brief += `\n`;
        });
        if (criticalExpiring.length > 3) {
          brief += `      • +${criticalExpiring.length - 3} more\n`;
        }
      }

      // SOON: Expires in 2-3 days - need to plan
      if (soonExpiring.length > 0) {
        brief += `   ⚡ **Plan ahead** — ${soonExpiring.length} product${soonExpiring.length > 1 ? 's' : ''} expire${soonExpiring.length > 1 ? '' : 's'} in 2-3 days:\n`;
        soonExpiring.slice(0, 4).forEach(p => {
          const value = p.estimatedValue > 0 ? ` (€${Math.round(p.estimatedValue)})` : '';
          brief += `      • ${p.productName} — ${p.daysUntilExpiration} day${p.daysUntilExpiration > 1 ? 's' : ''}${value}`;
          if (p.usedInDishes.length > 0) {
            const dishes = p.usedInDishes.slice(0, 2).map(d => d.name).join(', ');
            brief += ` → ${dishes}`;
          }
          brief += `\n`;
        });
        if (soonExpiring.length > 4) {
          brief += `      • +${soonExpiring.length - 4} more\n`;
        }
      }

      // WATCH: Expires in 4-5 days - just awareness
      if (watchExpiring.length > 0) {
        const watchValue = Math.round(watchExpiring.reduce((sum, p) => sum + p.estimatedValue, 0));
        brief += `   👀 **Watch list** — ${watchExpiring.length} product${watchExpiring.length > 1 ? 's' : ''} (4-5 days)`;
        if (watchValue > 0) {
          brief += ` — €${watchValue}`;
        }
        brief += `\n`;
      }

      brief += `\n`;
    }

    // Menu readiness for tomorrow
    if (!menuStatus.allReady && menuStatus.items.length > 0) {
      brief += `🍽️ **Dishes to unblock**:\n`;
      menuStatus.items.slice(0, 2).forEach(item => {
        const missing = item.missingIngredients.map(i => i.name.toLowerCase()).join(', ');
        brief += `   • ${item.dishName} — missing ${missing}\n`;
      });
      if (menuStatus.items.length > 2) {
        brief += `   • +${menuStatus.items.length - 2} more\n`;
      }
      brief += `\n`;
    }

    // Action plan for tomorrow
    brief += `💡 **Action plan for tomorrow**:\n`;
    let actionNum = 1;

    if (urgentReorders.length > 0) {
      const items = urgentReorders.slice(0, 2).map(a => a.productName.toLowerCase()).join(' and ');
      brief += `   ${actionNum}️⃣ Order urgently: ${items}\n`;
      actionNum++;
    }

    // Smart dish recommendations based on expiring products
    const relevantExpiring = [...criticalExpiring, ...soonExpiring.slice(0, 2)];
    if (relevantExpiring.length > 0) {
      const dishUtilization = new Map<string, { ingredients: string[]; isCritical: boolean }>();

      relevantExpiring.forEach(product => {
        const isCritical = product.daysUntilExpiration <= 1;
        product.usedInDishes.forEach(dish => {
          if (!dishUtilization.has(dish.name)) {
            dishUtilization.set(dish.name, { ingredients: [], isCritical: false });
          }
          const entry = dishUtilization.get(dish.name)!;
          entry.ingredients.push(product.productName.toLowerCase());
          if (isCritical) entry.isCritical = true;
        });
      });

      const sortedDishes = Array.from(dishUtilization.entries())
        .sort((a, b) => {
          // Prioritize dishes using critical ingredients, then by number of ingredients
          if (a[1].isCritical !== b[1].isCritical) {
            return a[1].isCritical ? -1 : 1;
          }
          return b[1].ingredients.length - a[1].ingredients.length;
        })
        .slice(0, 3);

      sortedDishes.forEach(([dishName, data]) => {
        const action = data.isCritical ? 'Priority suggestion' : 'Suggest as special';
        if (data.ingredients.length > 1) {
          brief += `   ${actionNum}️⃣ ${action}: ${dishName} (uses ${data.ingredients.join(' + ')} — ${data.ingredients.length} products)\n`;
        } else {
          brief += `   ${actionNum}️⃣ ${action}: ${dishName} (uses ${data.ingredients[0]})\n`;
        }
        actionNum++;
      });
    }
  } else {
    brief += `🔮 **Tomorrow morning**:\n`;
    brief += `   ✅ Excellent. Stock is green, no critical expiration dates. All set for service.\n`;
  }

  const closingMessage = hasTomorrowIssues
    ? 'I have prepared the plan for tomorrow.'
    : 'Everything is ready for tomorrow.';
  brief += `\n✨ **Cocorico's word**: Good evening, Chef! ${closingMessage} Rest well! 🌟`;

  return brief;
}

/**
 * Get today's sales summary for evening mode
 */
async function getTodaySalesSummary() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sales = await db.sale.findMany({
    where: {
      saleDate: {
        gte: today,
      },
    },
    include: {
      dish: {
        include: {
          recipeIngredients: {
            include: {
              product: true,
            },
          },
        },
      },
    },
  });

  let totalRevenue = 0;
  let totalCost = 0;

  // Top 3 dishes by quantity
  const dishSales = new Map<string, { name: string; quantity: number; revenue: number; cost: number }>();

  sales.forEach(sale => {
    const dishPrice = sale.dish.sellingPrice || 0;
    const revenue = dishPrice * sale.quantitySold;

    // Calculate cost of goods sold (COGS) for this sale
    const dishCost = sale.dish.recipeIngredients.reduce((cost, ingredient) => {
      const unitPrice = ingredient.product.unitPrice || 0;
      return cost + (unitPrice * ingredient.quantityRequired * sale.quantitySold);
    }, 0);

    totalRevenue += revenue;
    totalCost += dishCost;

    const existing = dishSales.get(sale.dishId) || {
      name: sale.dish.name,
      quantity: 0,
      revenue: 0,
      cost: 0
    };
    existing.quantity += sale.quantitySold;
    existing.revenue += revenue;
    existing.cost += dishCost;
    dishSales.set(sale.dishId, existing);
  });

  const totalDishes = sales.reduce((sum, sale) => sum + sale.quantitySold, 0);
  const totalMargin = totalRevenue - totalCost;
  const marginPercent = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

  const topDishes = Array.from(dishSales.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 3);

  return {
    totalRevenue: totalRevenue || 0,
    totalCost: totalCost || 0,
    totalMargin: totalMargin || 0,
    marginPercent: marginPercent || 0,
    totalDishes: totalDishes || 0,
    topDishes,
    hasSales: sales.length > 0 && totalDishes > 0,
  };
}

/**
 * Get today's waste (products that expired)
 */
async function getTodayWaste() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get all DLCs that expired today
  const expiredDlcs = await db.dLC.findMany({
    where: {
      expirationDate: {
        gte: today,
        lt: tomorrow,
      },
    },
    include: {
      product: true,
    },
  });

  const wasteValue = expiredDlcs.reduce((sum, dlc) => {
    const unitPrice = dlc.product.unitPrice || 0;
    return sum + (unitPrice * dlc.quantity);
  }, 0);

  const wasteCount = expiredDlcs.length;

  return {
    wasteValue,
    wasteCount,
    wastedItems: expiredDlcs.map(dlc => ({
      productName: dlc.product.name,
      quantity: dlc.quantity,
      unit: dlc.unit,
      value: (dlc.product.unitPrice || 0) * dlc.quantity,
    })),
  };
}

/**
 * Check if stock data is stale (not updated recently)
 */
async function getStockFreshnessCheck() {
  const products = await db.product.findMany({
    where: { trackable: true },
    orderBy: { updatedAt: 'desc' },
    take: 1,
  });

  if (products.length === 0) return { isStale: false, hoursSinceUpdate: 0 };

  const lastUpdate = products[0].updatedAt;
  const hoursSinceUpdate = Math.floor((Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60));

  // Consider stale if no updates in last 6 hours during business hours
  const isStale = hoursSinceUpdate >= 6;

  return { isStale, hoursSinceUpdate };
}

/**
 * Get complete daily insights
 */
export async function getDailyInsights(language: 'en' | 'fr' = 'en'): Promise<DailyInsights> {
  const mode = getBriefMode();

  const [reorderAlerts, expiringProducts, menuStatus] = await Promise.all([
    getReorderAlerts(),
    getExpiringProductsWithDishes(),
    getMenuStatus(),
  ]);

  const stats = {
    totalReorderNeeded: reorderAlerts.length,
    urgentReorders: reorderAlerts.filter((a) => a.urgency === 'urgent').length,
    expiringValue: expiringProducts.reduce((sum, p) => sum + p.estimatedValue, 0),
    expiringCount: expiringProducts.length,
  };

  const insights = {
    reorderAlerts,
    expiringProducts,
    menuStatus,
    stats,
    briefSummary: '', // Will be generated next
  };

  insights.briefSummary = await generateBriefSummary(insights, language, mode);

  return insights as DailyInsights;
}
