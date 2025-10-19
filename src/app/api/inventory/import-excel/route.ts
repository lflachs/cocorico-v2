import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

/**
 * POST /api/inventory/import-excel
 * Parse Excel/CSV file and extract product data
 * Supports multiple languages and flexible column detection
 */

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse Excel/CSV file
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Get first sheet
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return NextResponse.json({ error: 'No sheets found in file' }, { status: 400 });
    }

    const worksheet = workbook.Sheets[firstSheetName];

    // Convert to raw array format to detect headers
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '', header: 1 }) as any[][];

    if (!rawRows || rawRows.length === 0) {
      return NextResponse.json({ error: 'No data found in file' }, { status: 400 });
    }

    // Step 1: Find header row by looking for keywords in multiple languages
    const headerKeywords = {
      name: ['denomination', 'produit', 'product name', 'name', 'item', 'nom', 'article'],
      quantity: ['quantite', 'qté', 'quantity', 'qty', 'stock', 'amount'],
      unit: ['unite mesure', 'unite', 'mesure', 'unit of measure', 'uom', 'measure'],
      unitPrice: ['prix unit', 'prix', 'price', 'cost', 'unit price', 'unit cost'],
      parLevel: ['par level', 'par', 'minimum', 'min', 'min stock'],
      category: ['categorie', 'famille', 'category', 'type', 'group'],
    };

    let headerRowIndex = -1;
    let columnMappings: Record<string, number> = {};

    for (let i = 0; i < Math.min(10, rawRows.length); i++) {
      const row = rawRows[i];
      if (!row) continue;

      const mappings: Record<string, number> = {};
      let foundCount = 0;

      for (let colIndex = 0; colIndex < row.length; colIndex++) {
        const cellValue = String(row[colIndex] || '').toLowerCase().trim();
        if (!cellValue) continue;

        // Check each field type with priority order (more specific keywords first)
        // This prevents "prix unit" from matching "unit" before "unite mesure" is checked
        let matched = false;

        // Check for exact or high-priority matches first
        for (const [field, keywords] of Object.entries(headerKeywords)) {
          // Skip if already mapped (first match wins)
          if (mappings[field] !== undefined) continue;

          // For each keyword, check if it matches
          for (const keyword of keywords) {
            if (cellValue === keyword || cellValue.includes(keyword)) {
              // Special case: Don't match "unit" if it's part of "prix unit" or "price"
              if (field === 'unit' && (cellValue.includes('prix') || cellValue.includes('price'))) {
                continue;
              }

              mappings[field] = colIndex;
              foundCount++;
              matched = true;
              break;
            }
          }

          if (matched) break;
        }
      }

      // If we found at least 2 required fields (name, quantity, or unit), this is likely the header row
      if (
        foundCount >= 2 &&
        (mappings.name !== undefined || mappings.quantity !== undefined || mappings.unit !== undefined)
      ) {
        headerRowIndex = i;
        columnMappings = mappings;
        break;
      }
    }

    if (headerRowIndex === -1 || columnMappings.name === undefined) {
      return NextResponse.json(
        {
          error: 'Could not detect header row',
          details: 'Please ensure your Excel file has a header row with columns like "Name", "Quantity", "Unit", etc.',
        },
        { status: 400 }
      );
    }

    // Step 2: Parse products from data rows (skip header and any rows before it)
    const dataRows = rawRows.slice(headerRowIndex + 1);

    const products: any[] = [];
    const invalidProducts: any[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (!row || row.length === 0) continue;

      const excelRowNumber = headerRowIndex + i + 2; // +2 for Excel 1-indexing and header row

      // Extract values from mapped columns
      const name = String(row[columnMappings.name] || '').trim();
      const quantityValue = row[columnMappings.quantity];
      const unitValue = row[columnMappings.unit];

      // Skip empty rows or category/section headers
      // Category headers typically have a name but no quantity or unit
      if (!name) continue;

      // Check if this looks like a category/section header (has name but missing both quantity and unit)
      const hasQuantity = quantityValue !== undefined && quantityValue !== null && quantityValue !== '';
      const hasUnit = unitValue !== undefined && unitValue !== null && String(unitValue).trim() !== '';

      if (!hasQuantity && !hasUnit) {
        // This is likely a category header, skip it
        continue;
      }

      // Parse quantity
      let quantity: number | null = null;
      if (hasQuantity) {
        const quantityNum = typeof quantityValue === 'number' ? quantityValue : parseFloat(String(quantityValue));
        if (!isNaN(quantityNum)) {
          quantity = quantityNum;
        }
      }

      // Parse unit
      let unit: string = '';
      if (hasUnit) {
        unit = String(unitValue).trim().toUpperCase();

        // Normalize common unit variations
        const unitMappings: Record<string, string> = {
          'KG': 'KG',
          'KILOGRAM': 'KG',
          'KILO': 'KG',
          'L': 'L',
          'LITER': 'L',
          'LITRE': 'L',
          'PC': 'PC',
          'PIECE': 'PC',
          'PIECES': 'PC',
          'PCS': 'PC',
          'UNIT': 'PC',
          'UNITS': 'PC',
          'BOITE': 'PC',
          'BOÎTE': 'PC',
        };

        unit = unitMappings[unit] || unit;
      }

      // Validate required fields
      if (!quantity || quantity <= 0) {
        invalidProducts.push({
          rowIndex: excelRowNumber,
          name,
          error: 'Missing or invalid quantity',
        });
        continue;
      }

      // Validate unit
      const validUnits = ['KG', 'L', 'PC'];
      if (!unit || !validUnits.includes(unit)) {
        invalidProducts.push({
          rowIndex: excelRowNumber,
          name,
          quantity,
          unit: unit || 'missing',
          error: `Invalid or missing unit "${unit}". Must be KG, L, or PC`,
        });
        continue;
      }

      // Build product object
      const product: any = {
        rowIndex: excelRowNumber,
        name,
        quantity,
        unit: unit as 'KG' | 'L' | 'PC',
      };

      // Add optional fields if present
      if (columnMappings.unitPrice !== undefined) {
        const priceValue = row[columnMappings.unitPrice];
        if (priceValue !== undefined && priceValue !== null && priceValue !== '') {
          const price = typeof priceValue === 'number' ? priceValue : parseFloat(String(priceValue));
          if (!isNaN(price) && price > 0) {
            product.unitPrice = price;
          }
        }
      }

      if (columnMappings.parLevel !== undefined) {
        const parValue = row[columnMappings.parLevel];
        if (parValue !== undefined && parValue !== null && parValue !== '') {
          const parLevel = typeof parValue === 'number' ? parValue : parseFloat(String(parValue));
          if (!isNaN(parLevel) && parLevel >= 0) {
            product.parLevel = parLevel;
          }
        }
      }

      if (columnMappings.category !== undefined) {
        const categoryValue = row[columnMappings.category];
        if (categoryValue) {
          const category = String(categoryValue).trim();
          if (category) {
            product.category = category;
          }
        }
      }

      products.push(product);
    }

    if (products.length === 0 && invalidProducts.length === 0) {
      return NextResponse.json(
        { error: 'No valid products found in file' },
        { status: 400 }
      );
    }

    // Create readable column mapping labels for display
    const headerRow = rawRows[headerRowIndex];
    const columnMappingLabels: Record<string, string> = {};
    for (const [field, colIndex] of Object.entries(columnMappings)) {
      if (colIndex !== undefined) {
        columnMappingLabels[field] = String(headerRow[colIndex] || `Column ${colIndex + 1}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        products,
        invalidProducts,
        columnMappings: columnMappingLabels,
        headerRowIndex: headerRowIndex + 1, // 1-indexed for Excel
        totalRows: dataRows.length,
        validCount: products.length,
        invalidCount: invalidProducts.length,
      },
    });
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    return NextResponse.json(
      {
        error: 'Failed to parse Excel file',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
