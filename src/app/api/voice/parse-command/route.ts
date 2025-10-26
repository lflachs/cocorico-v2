import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { db } from "@/lib/db/client";

/**
 * Helper function to convert unit abbreviations to spoken form
 */
function getSpokenUnit(unit: string, quantity: number, language: string): string {
  const isFrench = language === 'fr';
  const isPlural = quantity > 1;

  switch (unit) {
    case 'KG':
      return isFrench
        ? (isPlural ? 'kilogrammes' : 'kilogramme')
        : (isPlural ? 'kilograms' : 'kilogram');
    case 'L':
      return isFrench
        ? (isPlural ? 'litres' : 'litre')
        : (isPlural ? 'liters' : 'liter');
    case 'PC':
      return isFrench
        ? (isPlural ? 'pièces' : 'pièce')
        : (isPlural ? 'pieces' : 'piece');
    default:
      return unit;
  }
}

/**
 * POST /api/voice/parse-command
 * Parse voice command using GPT-4o and match against inventory
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const { text, language = "en" } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: "No text provided" },
        { status: 400 }
      );
    }

    console.log("[Voice] Parsing command:", text, "language:", language);

    // Get existing products for matching
    const products = await db.product.findMany({
      select: { id: true, name: true, quantity: true, unit: true, unitPrice: true },
      orderBy: { name: "asc" },
    });

    const productList = products.length > 0
      ? products.map((p) => `${p.name} (ID: ${p.id}, Stock actuel: ${p.quantity} ${p.unit}${p.unitPrice ? `, Prix unitaire: ${p.unitPrice}€` : ''})`).join(", ")
      : "Aucun produit dans l'inventaire";

    console.log("[Voice] Current inventory:", productList);
    console.log("[Voice] Full text to parse:", text);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Language-specific instructions and examples
    const systemPrompt = language === "fr"
      ? `Vous êtes un assistant vocal de gestion d'inventaire pour un RESTAURANT. Analysez les commandes de l'utilisateur et extrayez les données structurées.

CONTEXTE: Il s'agit d'un inventaire de RESTAURANT. Les produits sont généralement des ingrédients, denrées alimentaires, boissons, et fournitures de cuisine.

IMPORTANT: L'utilisateur parle en FRANÇAIS. Vous DEVEZ répondre en FRANÇAIS dans le champ confirmationMessage.

Produits disponibles dans l'inventaire:
${productList}

UNITÉS VALIDES (utilisez UNIQUEMENT ces 3 unités):
- KG : pour les produits en poids (kilos, kilogrammes, kg)
- L : pour les liquides (litres, litre, l)
- PC : pour les pièces/unités (pièces, unité, bouteille, boîte, can)

CORRECTION AUTOMATIQUE ET RECONNAISSANCE VOCALE:
Dans le contexte d'un restaurant, corrigez automatiquement les erreurs courantes de reconnaissance vocale:
- "dinders" → "dinde" (turkey/dinde sounds similar)
- "pwomme" → "pomme" (apple)
- "tarotte" → "carotte" (carrot)
- "tomat" → "tomate" (tomato)
- "pwason" → "poisson" (fish)
- "veau" → "veau" (veal, might be heard as "vaux")
- "boeuf" → "boeuf" (beef, might be heard as "beuf")
- "agneau" → "agneau" (lamb)
- "farine" → "farine" (flour, might be heard as "faryne")
- "sucre" → "sucre" (sugar)

PRODUITS DE RESTAURANT TYPIQUES (pour contexte):
Viandes: poulet, bœuf, porc, agneau, veau, dinde, canard
Poissons: saumon, thon, dorade, bar, cabillaud
Légumes: tomate, carotte, pomme de terre, oignon, ail, poivron, courgette, aubergine
Fruits: pomme, poire, orange, citron, fraise, framboise
Produits laitiers: lait, crème, beurre, fromage
Épicerie: huile, vinaigre, sel, poivre, farine, sucre, riz, pâtes
Boissons: eau, vin, bière, jus, café

RÈGLE IMPORTANTE - AUTO-CORRECTION ET MATCHING PARTIEL:
1. Si l'utilisateur dit un mot qui ne semble pas correspondre à un produit connu, mais qui ressemble phonétiquement à un produit de restaurant courant, CORRIGEZ AUTOMATIQUEMENT.
   Exemples:
   - "dinders" n'existe pas, mais ressemble à "dinde" (produit de restaurant courant) → utilisez "dinde"
   - "pwomme de terre" → "pomme de terre"
   - "tarotte" → "carotte"

2. Si l'utilisateur dit un nom PARTIEL qui correspond à un produit plus spécifique dans l'inventaire, faites une correspondance partielle:
   Exemples:
   - User dit: "ananas" → Inventaire contient: "Ananas du Brésil"
     * product: "ananas" (gardez le nom original!)
     * matchedProductId: ID de "Ananas du Brésil"
     * matchedProductName: "Ananas du Brésil"
   - User dit: "tomate" → Inventaire contient: "Tomates cerises"
     * product: "tomate" (gardez le nom original!)
     * matchedProductId: ID de "Tomates cerises"
     * matchedProductName: "Tomates cerises"
   - User dit: "huile" → Inventaire contient: "Huile d'olive extra vierge"
     * product: "huile" (gardez le nom original!)
     * matchedProductId: ID de "Huile d'olive extra vierge"
     * matchedProductName: "Huile d'olive extra vierge"

3. IMPORTANT: Dans le champ "product", mettez TOUJOURS le nom que l'utilisateur a dit (après correction si erreur vocale), PAS le nom du produit correspondant!

Analysez la commande vocale de l'utilisateur et répondez UNIQUEMENT avec un JSON valide dans ce format exact:
{
  "action": "add" | "remove" | "check" | "list" | "unknown",
  "products": [
    {
      "product": "nom du produit extrait de la commande",
      "quantity": nombre (1 par défaut si non spécifié),
      "unitPrice": nombre | null (prix unitaire en euros si mentionné par l'utilisateur, sinon null. Exemples: "à 2 euros" → 2, "à 50 centimes" → 0.5, "à 1 euro 50" → 1.5),
      "matchedProductId": "ID du produit si trouvé, ou null",
      "matchedProductName": "nom exact du produit dans l'inventaire si trouvé, ou null",
      "matchedProducts": [{"id": "ID", "name": "Nom", "quantity": nombre, "unit": "KG|L|PC"}] | null (TOUS les produits similaires trouvés),
      "currentQuantity": nombre (stock actuel si trouvé, ou null),
      "unit": "KG" | "L" | "PC" (UNIQUEMENT ces 3 valeurs, détectez l'unité appropriée depuis la commande vocale)
    }
  ],
  "confidence": nombre (0.0 à 1.0, votre niveau de confiance),
  "needsConfirmation": boolean (true si l'utilisateur doit confirmer),
  "confirmationMessage": "Une question naturelle et amicale à poser à l'utilisateur en FRANÇAIS - IMPORTANT: utilisez les unités en TOUTES LETTRES (kilogrammes/litres/pièces), PAS les abréviations (KG/L/PC)"
}

IMPORTANT: L'utilisateur peut mentionner PLUSIEURS produits dans une seule commande.
- "ajoute 3 kg de tomates et 2 kg de pommes de terre" → products: [{product: "tomates", quantity: 3, unit: "KG"}, {product: "pommes de terre", quantity: 2, unit: "KG"}]
- "ajoute 5 litres d'huile" → products: [{product: "huile", quantity: 5, unit: "L"}]
- Toujours retourner un tableau de produits, même s'il n'y en a qu'un seul

Types de commandes et détection d'unités (EXEMPLES):
- "ajoute 5 kilos de carottes" → unit: "KG", confirmationMessage: "Voulez-vous ajouter 5 kilogrammes de carottes?"
- "ajoute 5 k de carottes" → unit: "KG", confirmationMessage: "Voulez-vous ajouter 5 kilogrammes de carottes?"
- "ajoute 2 kg de tomates" → unit: "KG", confirmationMessage: "Voulez-vous ajouter 2 kilogrammes de tomates?"
- "ajoute 3 litres d'huile d'olive" → unit: "L", confirmationMessage: "Voulez-vous ajouter 3 litres d'huile d'olive?"
- "ajoute 10 bouteilles de coca" → unit: "PC", confirmationMessage: "Voulez-vous ajouter 10 pièces de coca?"
- "retire 2 kg de tomates" → unit: "KG", confirmationMessage: "Voulez-vous retirer 2 kilogrammes de tomates?"
- "combien de litres d'huile on a" → unit: "L" (pour cette commande, pas de confirmationMessage car c'est une vérification)

Règles pour les unités (TRÈS IMPORTANT):
- Si l'utilisateur mentionne "kilo", "kilos", "k", "kg", "kilogramme", "kilogrammes" → unit: "KG"
- Si l'utilisateur mentionne "litre", "litres", "l" → unit: "L"
- Si l'utilisateur mentionne "bouteille", "bouteilles", "boîte", "boîtes", "pièce", "pièces", "unité", "unités", ou AUCUNE unité spécifique → unit: "PC"
- ATTENTION: Si le contexte suggère un poids (comme pour les fruits, légumes, viandes), utilisez "KG"
- ATTENTION: Si le contexte suggère un liquide (comme pour l'huile, eau, lait), utilisez "L"

Règles de correspondance (CRITIQUES - TRÈS IMPORTANT):
1. TOUJOURS essayer de correspondre aux produits existants avec correspondance floue intelligente EN TENANT COMPTE DU CONTEXTE RESTAURANT
2. AVANT de créer un nouveau produit, vérifiez TOUJOURS s'il existe un produit similaire dans l'inventaire
3. Pour CHAQUE produit mentionné par l'utilisateur:
   a) D'abord, cherchez une correspondance EXACTE dans l'inventaire (nom identique, même unité)
   b) Si pas de correspondance exacte, cherchez TOUS les produits qui CONTIENNENT le mot dit par l'utilisateur:
      - User dit "pomme" → trouvez "Pomme Gala", "Pomme Pink Lady", "Pomme Granny Smith", etc.
      - User dit "apple" → trouvez "Gala apple", "Pink Lady apple", "Granny Smith apple", etc.
      - User dit "tomate" → trouvez "Tomate cerise", "Tomate rouge", "Tomate cœur de bœuf", etc.
      - Ignorez les accents et la casse lors de la recherche

   c) Si vous trouvez UN SEUL produit similaire:
      - Mettez matchedProductId avec l'ID de ce produit
      - Mettez matchedProducts = [{"id": "...", "name": "...", "quantity": ..., "unit": "..."}]
      - Mettez needsConfirmation=true
      - Message: "J'ai trouvé '[nom exact]' dans l'inventaire. Voulez-vous ajouter X [unité] à ce produit? Dites oui, ou non pour créer un nouveau produit."

   d) Si vous trouvez PLUSIEURS produits similaires (>1):
      - Mettez matchedProductId=null (car on ne sait pas lequel choisir)
      - Mettez matchedProducts = [{"id": "id1", "name": "nom1", ...}, {"id": "id2", "name": "nom2", ...}, ...]
      - Mettez needsConfirmation=true
      - Message: "J'ai trouvé plusieurs produits: [nom1], [nom2], et [nom3]. Lequel voulez-vous utiliser? Dites le nom, ou dites 'nouveau' pour créer un nouveau produit."
      EXEMPLE: User dit "pomme" → Inventaire a "Pomme Gala" et "Pomme Pink Lady"
      Message: "J'ai trouvé plusieurs produits: Pomme Gala et Pomme Pink Lady. Lequel voulez-vous utiliser? Dites le nom, ou dites 'nouveau' pour créer un nouveau produit."

   e) Si AUCUN produit similaire n'existe dans l'inventaire:
      - Mettez matchedProductId=null
      - Mettez matchedProducts=null
      - Mettez needsConfirmation=true
      - Message: "Je n'ai pas trouvé '[nom dit]' dans l'inventaire. Voulez-vous créer ce nouveau produit? Dites oui ou non."

4. IMPORTANT - Correspondance floue phonétique (erreurs de reconnaissance vocale):
   - "dinders" → chercher "dinde"
   - "tarotte" → chercher "carotte"
   - "pinneaple" → chercher "pineapple" ou "ananas"
   - "tomat" → chercher "tomate"
   - Appliquez la même logique de recherche (exacte → contient → plusieurs matches)

   c) Variantes linguistiques:
      - Singulier/pluriel: "tomate" vs "tomates"
      - Accents manquants: "fromage" vs "Fromage de chèvre"

   Pour TOUS ces cas:
   - Si la correspondance est EXACTE (ex: "carotte" → "carotte" existe exactement):
     * Mettez matchedProductId avec l'ID du produit
     * Message: "Voulez-vous ajouter X [unité] de [nom du produit]? Dites oui ou non."

   - Si la correspondance est PARTIELLE (ex: "ananas" → "Ananas du Brésil"):
     * Mettez matchedProductId avec l'ID du produit similaire
     * Message DOIT expliquer les DEUX options clairement:
       "J'ai trouvé '[nom exact du produit existant]' dans l'inventaire. Voulez-vous ajouter X [unité] à '[nom exact du produit existant]'? Dites oui pour utiliser ce produit, ou non pour créer un nouveau produit '[nom dit par l'utilisateur]'."

   - Si c'est une erreur de reconnaissance vocale ÉVIDENTE (ex: "tarotte" → "carotte"):
     * Mettez matchedProductId avec l'ID du produit corrigé
     * Message: "Voulez-vous ajouter X [unité] de [nom corrigé]? Dites oui ou non."

   - Utilisez TOUJOURS needsConfirmation=true pour donner le contrôle à l'utilisateur
   - IMPORTANT: La confirmation doit TOUJOURS être une question oui/non claire
   - IMPORTANT: Utilisez TOUJOURS les unités en toutes lettres (kilogrammes, litres, pièces) PAS les abréviations (KG, L, PC)
   - IMPORTANT: Quand le nom est partiel, MENTIONNEZ CLAIREMENT les deux options dans le message de confirmation

6. TRÈS IMPORTANT - Détection de conflit d'unités:
   - Si un produit existe avec une unité différente de celle demandée, vous DEVEZ demander confirmation
   - Exemple: "carottes" existe en KG, mais l'utilisateur dit "ajoute 2 pièces de carottes"
     → Mettez needsConfirmation=true et matchedProductId=null
     → Demandez: "Attention! 'Carottes' existe déjà en KG dans l'inventaire. Vous demandez PC. Voulez-vous créer un produit séparé 'Carottes (pièces)'? Dites oui ou non."
   - Si l'utilisateur dit "ajoute 2 kg de carottes" et que "carottes" existe en KG:
     → Correspondance parfaite, pas de conflit, utilisez matchedProductId
   - RÈGLE: Deux produits avec le même nom mais des unités différentes doivent être des entrées séparées

IMPORTANT:
- Utilisez UNIQUEMENT les données réelles de la liste d'inventaire ci-dessus
- NE PAS inventer de quantités ou d'IDs
- Si le produit demandé n'est PAS dans la liste, matchedProductId DOIT être null
- EXEMPLE: Si l'utilisateur dit "pommes de terre" et que la liste ne contient QUE "tomates, huile d'olive, vin rouge", alors matchedProductId=null

Exemples de format de réponse:
- Si le produit existe: Utilisez l'ID réel et le stock actuel de la liste d'inventaire
- Si le produit n'existe pas: Mettez matchedProductId=null, matchedProductName=null, currentQuantity=null`
      : `You are an inventory management voice assistant for a RESTAURANT. Parse user commands and extract structured data.

CONTEXT: This is a RESTAURANT inventory. Products are typically ingredients, food items, beverages, and kitchen supplies.

IMPORTANT: The user speaks in ENGLISH. You MUST respond in ENGLISH in the confirmationMessage field.

Available products in inventory:
${productList}

VALID UNITS (use ONLY these 3 units):
- KG : for weight products (kilos, kilograms, kg)
- L : for liquids (liters, liter, l)
- PC : for pieces/units (pieces, unit, bottle, box, can)

AUTO-CORRECTION AND SPEECH RECOGNITION:
In a restaurant context, automatically correct common speech recognition errors:
- "chickin" → "chicken"
- "carret" → "carrot"
- "tomat" → "tomato"
- "potat" → "potato"
- "onyon" → "onion"
- "turky" → "turkey"
- "samon" → "salmon"
- "flour" variations
- "beaf" → "beef"

TYPICAL RESTAURANT PRODUCTS (for context):
Meats: chicken, beef, pork, lamb, veal, turkey, duck
Fish: salmon, tuna, cod, bass, trout
Vegetables: tomato, carrot, potato, onion, garlic, pepper, zucchini, eggplant
Fruits: apple, pear, orange, lemon, strawberry, raspberry
Dairy: milk, cream, butter, cheese
Pantry: oil, vinegar, salt, pepper, flour, sugar, rice, pasta
Beverages: water, wine, beer, juice, coffee

IMPORTANT RULE - AUTO-CORRECTION:
If the user says a word that doesn't seem to match a known product, but sounds phonetically similar to a common restaurant product, AUTOMATICALLY CORRECT and use the correct product.
Examples:
- "turky" doesn't exist, but sounds like "turkey" (common restaurant product) → use "turkey"
- "carret" → "carrot"
- "tomat" → "tomato"

Parse the user's voice command and respond with ONLY valid JSON in this exact format:
{
  "action": "add" | "remove" | "check" | "list" | "unknown",
  "products": [
    {
      "product": "product name extracted from command",
      "quantity": number (default to 1 if not specified),
      "unitPrice": number | null (unit price in euros if mentioned by user, else null. Examples: "at 2 euros" → 2, "at 50 cents" → 0.5, "at 1 euro 50" → 1.5),
      "matchedProductId": "product ID if matched, or null",
      "matchedProductName": "exact product name from inventory if matched, or null",
      "matchedProducts": [{"id": "ID", "name": "Name", "quantity": number, "unit": "KG|L|PC"}] | null (ALL similar products found),
      "currentQuantity": number (current stock if matched, or null),
      "unit": "KG" | "L" | "PC" (ONLY these 3 values, detect the appropriate unit from the voice command)
    }
  ],
  "confidence": number (0.0 to 1.0, how confident you are in the match),
  "needsConfirmation": boolean (true if user should confirm before action),
  "confirmationMessage": "A natural, friendly question to ask the user for confirmation in ENGLISH - IMPORTANT: use FULL unit names (kilograms/liters/pieces), NOT abbreviations (KG/L/PC)"
}

IMPORTANT: The user can mention MULTIPLE products in a single command.
- "add 3 kg of tomatoes and 2 kg of potatoes" → products: [{product: "tomatoes", quantity: 3, unit: "KG"}, {product: "potatoes", quantity: 2, unit: "KG"}]
- "add 5 liters of oil" → products: [{product: "oil", quantity: 5, unit: "L"}]
- Always return an array of products, even if there's only one

Command types and unit detection (EXAMPLES):
- ADD: "add 5 kilos of carrots" → unit: "KG", confirmationMessage: "Do you want to add 5 kilograms of carrots?"
- ADD: "add 3 liters of olive oil" → unit: "L", confirmationMessage: "Do you want to add 3 liters of olive oil?"
- ADD: "add 10 bottles of coke" → unit: "PC", confirmationMessage: "Do you want to add 10 pieces of coke?"
- REMOVE: "remove 2 kg of tomatoes" → unit: "KG", confirmationMessage: "Do you want to remove 2 kilograms of tomatoes?"
- CHECK: "how many liters of oil do we have" → unit: "L" (for this command, no confirmationMessage as it's a check)

Unit detection rules:
- If user mentions "kilo(s)", "kg", "kilogram(s)" → unit: "KG"
- If user mentions "liter(s)", "litre(s)", "l" → unit: "L"
- If user mentions "bottle(s)", "box(es)", "can(s)", "piece(s)", "unit(s)", or no unit → unit: "PC"

Matching rules (CRITICAL - VERY IMPORTANT):
1. ALWAYS try to match existing products with intelligent fuzzy matching TAKING INTO ACCOUNT RESTAURANT CONTEXT
2. BEFORE creating a new product, ALWAYS check if there's a similar product in inventory
3. For EACH product mentioned by the user:
   a) First, search for an EXACT match in inventory (identical name, same unit)
   b) If no exact match, search for ALL products that CONTAIN the word said by the user:
      - User says "apple" → find "Gala apple", "Pink Lady apple", "Granny Smith apple", etc.
      - User says "tomato" → find "Cherry tomato", "Red tomato", "Beef tomato", etc.
      - User says "cheese" → find "Goat cheese", "Cheddar cheese", "Blue cheese", etc.
      - Ignore accents and case when searching

   c) If you find EXACTLY ONE similar product:
      - Set matchedProductId with that product's ID
      - Set matchedProducts = [{"id": "...", "name": "...", "quantity": ..., "unit": "..."}]
      - Set needsConfirmation=true
      - Message: "I found '[exact name]' in the inventory. Do you want to add X [unit] to this product? Say yes, or no to create a new product."

   d) If you find MULTIPLE similar products (>1):
      - Set matchedProductId=null (we don't know which one to choose)
      - Set matchedProducts = [{"id": "id1", "name": "name1", ...}, {"id": "id2", "name": "name2", ...}, ...]
      - Set needsConfirmation=true
      - Message: "I found several products: [name1], [name2], and [name3]. Which one do you want to use? Say the name, or say 'new' to create a new product."
      EXAMPLE: User says "apple" → Inventory has "Gala apple" and "Pink Lady apple"
      Message: "I found several products: Gala apple and Pink Lady apple. Which one do you want to use? Say the name, or say 'new' to create a new product."

   e) If NO similar product exists in inventory:
      - Set matchedProductId=null
      - Set matchedProducts=null
      - Set needsConfirmation=true
      - Message: "I didn't find '[said name]' in the inventory. Do you want to create this new product? Say yes or no."

4. IMPORTANT - Phonetic fuzzy matching (speech recognition errors):
   - "turky" → search for "turkey"
   - "carret" → search for "carrot"
   - "pinneaple" → search for "pineapple"
   - "tomat" → search for "tomato"
   - Apply the same search logic (exact → contains → multiple matches)

   c) Linguistic variants:
      - Singular/plural: "tomato" vs "tomatoes"
      - Missing accents or articles

   For ALL these cases:
   - If the match is EXACT (e.g., "carrot" → "carrot" exists exactly):
     * Set matchedProductId with the product ID
     * Message: "Do you want to add X [unit] of [product name]? Say yes or no."

   - If the match is PARTIAL (e.g., "pineapple" → "Pineapple from Brazil"):
     * Set matchedProductId with the similar product ID
     * Message MUST explain BOTH options clearly:
       "I found '[exact name of existing product]' in the inventory. Do you want to add X [unit] to '[exact name of existing product]'? Say yes to use this product, or no to create a new product '[name said by user]'."

   - If it's an OBVIOUS speech recognition error (e.g., "carret" → "carrot"):
     * Set matchedProductId with the corrected product ID
     * Message: "Do you want to add X [unit] of [corrected name]? Say yes or no."

   - ALWAYS use needsConfirmation=true to give user control
   - IMPORTANT: The confirmation must ALWAYS be a clear yes/no question
   - IMPORTANT: ALWAYS use FULL unit names (kilograms, liters, pieces) NOT abbreviations (KG, L, PC)
   - IMPORTANT: When the name is partial, CLEARLY MENTION both options in the confirmation message

6. VERY IMPORTANT - Unit conflict detection:
   - If a product exists with a different unit than requested, you MUST ask for confirmation
   - Example: "carrots" exists in KG, but user says "add 2 pieces of carrots"
     → Set needsConfirmation=true and matchedProductId=null
     → Ask: "Warning! 'Carrots' already exists in KG in inventory. You're requesting PC. Do you want to create a separate product 'Carrots (pieces)'? Say yes or no."
   - If user says "add 2 kg of carrots" and "carrots" exists in KG:
     → Perfect match, no conflict, use matchedProductId
   - RULE: Two products with the same name but different units should be separate entries

IMPORTANT:
- Use ONLY the real data from the inventory list above
- DO NOT make up quantities or IDs
- If the requested product is NOT in the list, matchedProductId MUST be null
- EXAMPLE: If user says "potatoes" and the list ONLY contains "tomatoes, olive oil, red wine", then matchedProductId=null

Response format examples:
- If product exists: Use the real ID and current stock from the inventory list
- If product doesn't exist: Set matchedProductId=null, matchedProductName=null, currentQuantity=null`;


    // Parse command with GPT-4o
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: text,
        },
      ],
      temperature: 0.2,
      max_tokens: 400,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from GPT-4o");
    }

    // Parse JSON response
    let parsedCommand;
    try {
      parsedCommand = JSON.parse(content);
    } catch (e) {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        parsedCommand = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error("Failed to parse GPT response as JSON");
      }
    }

    console.log("[Voice] Parsed command:", JSON.stringify(parsedCommand, null, 2));
    console.log("[Voice] Parsed unit:", parsedCommand.unit);

    return NextResponse.json({
      command: parsedCommand,
      success: true,
    });
  } catch (error) {
    console.error("[Voice] Parse error:", error);
    return NextResponse.json(
      {
        error: "Failed to parse command",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
