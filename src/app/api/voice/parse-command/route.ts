import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { db } from "@/lib/db/client";

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
      select: { id: true, name: true, quantity: true, unit: true },
      orderBy: { name: "asc" },
    });

    const productList = products.length > 0
      ? products.map((p) => `${p.name} (ID: ${p.id}, Stock actuel: ${p.quantity} ${p.unit})`).join(", ")
      : "Aucun produit dans l'inventaire";

    console.log("[Voice] Current inventory:", productList);
    console.log("[Voice] Full text to parse:", text);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Language-specific instructions and examples
    const systemPrompt = language === "fr"
      ? `Vous êtes un assistant vocal de gestion d'inventaire. Analysez les commandes de l'utilisateur et extrayez les données structurées.

IMPORTANT: L'utilisateur parle en FRANÇAIS. Vous DEVEZ répondre en FRANÇAIS dans le champ confirmationMessage.

Produits disponibles dans l'inventaire:
${productList}

UNITÉS VALIDES (utilisez UNIQUEMENT ces 3 unités):
- KG : pour les produits en poids (kilos, kilogrammes, kg)
- L : pour les liquides (litres, litre, l)
- PC : pour les pièces/unités (pièces, unité, bouteille, boîte, can)

Analysez la commande vocale de l'utilisateur et répondez UNIQUEMENT avec un JSON valide dans ce format exact:
{
  "action": "add" | "remove" | "check" | "list" | "unknown",
  "products": [
    {
      "product": "nom du produit extrait de la commande",
      "quantity": nombre (1 par défaut si non spécifié),
      "matchedProductId": "ID du produit si trouvé, ou null",
      "matchedProductName": "nom exact du produit dans l'inventaire si trouvé, ou null",
      "currentQuantity": nombre (stock actuel si trouvé, ou null),
      "unit": "KG" | "L" | "PC" (UNIQUEMENT ces 3 valeurs, détectez l'unité appropriée depuis la commande vocale)
    }
  ],
  "confidence": nombre (0.0 à 1.0, votre niveau de confiance),
  "needsConfirmation": boolean (true si l'utilisateur doit confirmer),
  "confirmationMessage": "Une question naturelle et amicale à poser à l'utilisateur en FRANÇAIS"
}

IMPORTANT: L'utilisateur peut mentionner PLUSIEURS produits dans une seule commande.
- "ajoute 3 kg de tomates et 2 kg de pommes de terre" → products: [{product: "tomates", quantity: 3, unit: "KG"}, {product: "pommes de terre", quantity: 2, unit: "KG"}]
- "ajoute 5 litres d'huile" → products: [{product: "huile", quantity: 5, unit: "L"}]
- Toujours retourner un tableau de produits, même s'il n'y en a qu'un seul

Types de commandes et détection d'unités (EXEMPLES):
- "ajoute 5 kilos de carottes" → unit: "KG"
- "ajoute 5 k de carottes" → unit: "KG"
- "ajoute 2 kg de tomates" → unit: "KG"
- "ajoute 3 litres d'huile d'olive" → unit: "L"
- "ajoute 10 bouteilles de coca" → unit: "PC"
- "retire 2 kg de tomates" → unit: "KG"
- "combien de litres d'huile on a" → unit: "L"

Règles pour les unités (TRÈS IMPORTANT):
- Si l'utilisateur mentionne "kilo", "kilos", "k", "kg", "kilogramme", "kilogrammes" → unit: "KG"
- Si l'utilisateur mentionne "litre", "litres", "l" → unit: "L"
- Si l'utilisateur mentionne "bouteille", "bouteilles", "boîte", "boîtes", "pièce", "pièces", "unité", "unités", ou AUCUNE unité spécifique → unit: "PC"
- ATTENTION: Si le contexte suggère un poids (comme pour les fruits, légumes, viandes), utilisez "KG"
- ATTENTION: Si le contexte suggère un liquide (comme pour l'huile, eau, lait), utilisez "L"

Règles de correspondance (CRITIQUES):
1. Essayez de correspondre aux produits existants (correspondance floue OK pour les fautes de frappe)
2. Si confiance élevée (>0.8) ET que le produit correspond vraiment, incluez l'ID et les détails RÉELS du produit
3. Si le produit N'EXISTE PAS dans l'inventaire, vous DEVEZ mettre matchedProductId=null, matchedProductName=null, currentQuantity=null
4. Pour les nouveaux produits (matchedProductId=null), mettez needsConfirmation à true et demandez s'ils veulent le créer

IMPORTANT:
- Utilisez UNIQUEMENT les données réelles de la liste d'inventaire ci-dessus
- NE PAS inventer de quantités ou d'IDs
- Si le produit demandé n'est PAS dans la liste, matchedProductId DOIT être null
- EXEMPLE: Si l'utilisateur dit "pommes de terre" et que la liste ne contient QUE "tomates, huile d'olive, vin rouge", alors matchedProductId=null

Exemples de format de réponse:
- Si le produit existe: Utilisez l'ID réel et le stock actuel de la liste d'inventaire
- Si le produit n'existe pas: Mettez matchedProductId=null, matchedProductName=null, currentQuantity=null`
      : `You are an inventory management voice assistant. Parse user commands and extract structured data.

IMPORTANT: The user speaks in ENGLISH. You MUST respond in ENGLISH in the confirmationMessage field.

Available products in inventory:
${productList}

VALID UNITS (use ONLY these 3 units):
- KG : for weight products (kilos, kilograms, kg)
- L : for liquids (liters, liter, l)
- PC : for pieces/units (pieces, unit, bottle, box, can)

Parse the user's voice command and respond with ONLY valid JSON in this exact format:
{
  "action": "add" | "remove" | "check" | "list" | "unknown",
  "products": [
    {
      "product": "product name extracted from command",
      "quantity": number (default to 1 if not specified),
      "matchedProductId": "product ID if matched, or null",
      "matchedProductName": "exact product name from inventory if matched, or null",
      "currentQuantity": number (current stock if matched, or null),
      "unit": "KG" | "L" | "PC" (ONLY these 3 values, detect the appropriate unit from the voice command)
    }
  ],
  "confidence": number (0.0 to 1.0, how confident you are in the match),
  "needsConfirmation": boolean (true if user should confirm before action),
  "confirmationMessage": "A natural, friendly question to ask the user for confirmation in ENGLISH"
}

IMPORTANT: The user can mention MULTIPLE products in a single command.
- "add 3 kg of tomatoes and 2 kg of potatoes" → products: [{product: "tomatoes", quantity: 3, unit: "KG"}, {product: "potatoes", quantity: 2, unit: "KG"}]
- "add 5 liters of oil" → products: [{product: "oil", quantity: 5, unit: "L"}]
- Always return an array of products, even if there's only one

Command types and unit detection:
- ADD: "add 5 kilos of carrots" → unit: "KG"
- ADD: "add 3 liters of olive oil" → unit: "L"
- ADD: "add 10 bottles of coke" → unit: "PC"
- REMOVE: "remove 2 kg of tomatoes" → unit: "KG"
- CHECK: "how many liters of oil do we have" → unit: "L"

Unit detection rules:
- If user mentions "kilo(s)", "kg", "kilogram(s)" → unit: "KG"
- If user mentions "liter(s)", "litre(s)", "l" → unit: "L"
- If user mentions "bottle(s)", "box(es)", "can(s)", "piece(s)", "unit(s)", or no unit → unit: "PC"

Matching rules (CRITICAL):
1. Try to match to existing products (fuzzy matching OK for typos only)
2. If high confidence (>0.8) AND product truly matches, include the REAL product ID and details
3. If the product DOES NOT EXIST in inventory, you MUST set matchedProductId=null, matchedProductName=null, currentQuantity=null
4. For new products (matchedProductId=null), set needsConfirmation to true and ask if they want to create it

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
