import { DocumentAnalysisClient, AzureKeyCredential } from '@azure/ai-form-recognizer';

/**
 * OCR Service
 * Azure Document Intelligence integration for receipt/invoice processing
 */

type ExtractedLineItem = {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
};

type OcrResult = {
  supplierName: string;
  supplierEmail?: string;
  supplierPhone?: string;
  date: Date;
  totalAmount: number;
  items: ExtractedLineItem[];
};

type MenuTextResult = {
  content: string;
  paragraphs: string[];
  tables: { cells: string[][] }[];
};

export class OcrService {
  private client: DocumentAnalysisClient | null = null;

  constructor() {
    const endpoint = process.env.AZURE_DOC_INTELLIGENCE_ENDPOINT;
    const apiKey = process.env.AZURE_DOC_INTELLIGENCE_KEY;

    if (endpoint && apiKey) {
      this.client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(apiKey));
    }
  }

  async processReceipt(fileBuffer: Buffer): Promise<OcrResult> {
    if (!this.client) {
      throw new Error(
        'Azure Document Intelligence not configured. Please set AZURE_DOC_INTELLIGENCE_ENDPOINT and AZURE_DOC_INTELLIGENCE_KEY'
      );
    }

    // Use prebuilt receipt model
    const poller = await this.client.beginAnalyzeDocument('prebuilt-receipt', fileBuffer);
    const result = await poller.pollUntilDone();

    if (!result.documents || result.documents.length === 0) {
      throw new Error('No receipt data found in document');
    }

    const receipt = result.documents[0];
    const fields = receipt.fields;

    // Extract supplier name
    const supplierName =
      fields?.MerchantName?.content ||
      fields?.VendorName?.content ||
      'Unknown Supplier';

    // Extract supplier contact info
    const supplierEmail = fields?.MerchantEmail?.content || fields?.VendorEmail?.content;
    const supplierPhone = fields?.MerchantPhoneNumber?.content || fields?.VendorPhoneNumber?.content;

    // Extract date
    let date = new Date();
    if (fields?.TransactionDate?.value) {
      const dateValue = fields.TransactionDate.value;
      if (typeof dateValue === 'string') {
        date = new Date(dateValue);
      } else if (dateValue instanceof Date) {
        date = dateValue;
      }
    }

    // Extract total amount
    const totalAmount = fields?.Total?.value || 0;

    // Extract line items
    const items: ExtractedLineItem[] = [];

    if (fields?.Items?.values) {
      for (const item of fields.Items.values) {
        const itemFields = item.properties;

        let description = itemFields?.Description?.content || 'Unknown Item';
        let quantity = itemFields?.Quantity?.value || 1;
        let totalPriceValue = itemFields?.TotalPrice?.value || 0;

        // Handle totalPrice as object with amount property
        if (typeof totalPriceValue === 'object' && totalPriceValue !== null) {
          totalPriceValue = (totalPriceValue as any).amount || 0;
        }

        // Parse description to extract quantity if it contains pattern like "3 x 28.00€"
        // Description format: "Dish Name\n3 × 28.00€" or "Dish Name\n3 x 28.00€"
        const qtyMatch = description.match(/^(.+?)\n(\d+)\s*[x×]\s*([\d.,]+)\s*€?/i);
        if (qtyMatch) {
          description = qtyMatch[1].trim(); // Extract clean dish name
          quantity = parseInt(qtyMatch[2]) || 1; // Extract quantity
          const unitPriceFromDesc = parseFloat(qtyMatch[3].replace(',', '.')) || 0;

          // If we have unit price from description, use it
          if (unitPriceFromDesc > 0) {
            const unitPrice = unitPriceFromDesc;
            items.push({
              description,
              quantity,
              unit: 'pc',
              unitPrice,
              totalPrice: totalPriceValue,
            });
            continue;
          }
        }

        const unitPrice = quantity > 0 ? totalPriceValue / quantity : totalPriceValue;

        // Try to extract unit from description or default to 'pc'
        let unit = 'pc';
        const descLower = description.toLowerCase();
        if (descLower.includes('kg') || descLower.includes('kilo')) {
          unit = 'kg';
        } else if (descLower.includes('l') || descLower.includes('liter')) {
          unit = 'L';
        } else if (descLower.includes('g') || descLower.includes('gram')) {
          unit = 'g';
        }

        items.push({
          description,
          quantity,
          unit,
          unitPrice,
          totalPrice: totalPriceValue,
        });
      }
    }

    // If no items were extracted, try to parse from raw text
    if (items.length === 0 && result.content) {
      // Fallback: parse from text content
      const lines = result.content.split('\n');

      for (const line of lines) {
        // Try to match pattern: "Item Name" "Qty x Price" "Total"
        // Examples:
        // - "Item Name    3 x 28.00€    84.00€"
        // - "Item Name    2 x 26.00    52.00"
        const match = line.match(/^(.+?)\s+(\d+)\s*[x×]\s*([\d,.]+)\s*€?\s*([\d,.]+)\s*€?$/i);

        if (match) {
          const [, description, qtyStr, unitPriceStr, totalPriceStr] = match;

          const quantity = parseInt(qtyStr) || 1;
          const unitPrice = parseFloat(unitPriceStr.replace(',', '.')) || 0;
          const totalPrice = parseFloat(totalPriceStr.replace(',', '.')) || 0;

          items.push({
            description: description.trim(),
            quantity,
            unit: 'pc',
            unitPrice,
            totalPrice,
          });
        } else {
          // Try simpler pattern: just "Item Name" and "Price"
          const simpleMatch = line.match(/^(.+?)\s+([\d,.]+)\s*€$/i);
          if (simpleMatch) {
            const [, description, priceStr] = simpleMatch;
            const totalPrice = parseFloat(priceStr.replace(',', '.')) || 0;

            items.push({
              description: description.trim(),
              quantity: 1,
              unit: 'pc',
              unitPrice: totalPrice,
              totalPrice,
            });
          }
        }
      }
    }

    // If still no items, try to get them from tables
    if (items.length === 0 && result.tables && result.tables.length > 0) {
      // Fallback: extract from tables
      const table = result.tables[0];
      for (const cell of table.cells) {
        // This is a simplified extraction - in production you'd parse table structure
        if (cell.content && cell.content.trim()) {
          items.push({
            description: cell.content,
            quantity: 1,
            unit: 'pc',
            unitPrice: 0,
            totalPrice: 0,
          });
        }
      }
    }

    return {
      supplierName,
      supplierEmail,
      supplierPhone,
      date,
      totalAmount: typeof totalAmount === 'number' ? totalAmount : 0,
      items,
    };
  }

  async processInvoice(fileBuffer: Buffer): Promise<OcrResult> {
    if (!this.client) {
      throw new Error(
        'Azure Document Intelligence not configured. Please set AZURE_DOC_INTELLIGENCE_ENDPOINT and AZURE_DOC_INTELLIGENCE_KEY'
      );
    }

    // Use prebuilt invoice model
    const poller = await this.client.beginAnalyzeDocument('prebuilt-invoice', fileBuffer);
    const result = await poller.pollUntilDone();

    if (!result.documents || result.documents.length === 0) {
      throw new Error('No invoice data found in document');
    }

    const invoice = result.documents[0];
    const fields = invoice.fields;

    // Extract vendor name
    const supplierName =
      fields?.VendorName?.content ||
      fields?.MerchantName?.content ||
      'Unknown Supplier';

    // Extract vendor contact info
    const supplierEmail = fields?.VendorEmail?.content || fields?.VendorAddress?.content?.match(/[\w.-]+@[\w.-]+\.\w+/)?.[0];
    const supplierPhone = fields?.VendorPhoneNumber?.content || fields?.VendorPhone?.content;

    // Extract date
    let date = new Date();
    if (fields?.InvoiceDate?.value) {
      const dateValue = fields.InvoiceDate.value;
      if (typeof dateValue === 'string') {
        date = new Date(dateValue);
      } else if (dateValue instanceof Date) {
        date = dateValue;
      }
    }

    // Extract total amount
    const totalAmount = fields?.InvoiceTotal?.value || fields?.Total?.value || 0;

    // Extract line items
    const items: ExtractedLineItem[] = [];

    if (fields?.Items?.values) {
      for (const item of fields.Items.values) {
        const itemFields = item.properties;

        let description = itemFields?.Description?.content || 'Unknown Item';
        let quantity = itemFields?.Quantity?.value || 1;
        let amount = itemFields?.Amount?.value || 0;
        let unitPriceValue = itemFields?.UnitPrice?.value || 0;

        // Handle amount/price as object with amount property
        if (typeof amount === 'object' && amount !== null) {
          amount = (amount as any).amount || 0;
        }
        if (typeof unitPriceValue === 'object' && unitPriceValue !== null) {
          unitPriceValue = (unitPriceValue as any).amount || 0;
        }

        // Parse description to extract quantity if it contains pattern like "3 x 28.00€"
        const qtyMatch = description.match(/^(.+?)\n(\d+)\s*[x×]\s*([\d.,]+)\s*€?/i);
        if (qtyMatch) {
          description = qtyMatch[1].trim();
          quantity = parseInt(qtyMatch[2]) || 1;
          const parsedUnitPrice = parseFloat(qtyMatch[3].replace(',', '.')) || 0;
          if (parsedUnitPrice > 0) {
            unitPriceValue = parsedUnitPrice;
          }
        }

        const unitPrice = unitPriceValue || (quantity > 0 ? amount / quantity : 0);

        // Extract unit
        let unit = 'pc';
        const unitStr = itemFields?.Unit?.content?.toLowerCase() || '';
        if (unitStr.includes('kg') || unitStr.includes('kilo')) {
          unit = 'kg';
        } else if (unitStr.includes('l') || unitStr.includes('liter')) {
          unit = 'L';
        } else if (unitStr.includes('g') || unitStr.includes('gram')) {
          unit = 'g';
        }

        items.push({
          description,
          quantity,
          unit,
          unitPrice,
          totalPrice: amount,
        });
      }
    }

    return {
      supplierName,
      supplierEmail,
      supplierPhone,
      date,
      totalAmount: typeof totalAmount === 'number' ? totalAmount : 0,
      items,
    };
  }

  async processMenu(fileBuffer: Buffer): Promise<MenuTextResult> {
    if (!this.client) {
      throw new Error(
        'Azure Document Intelligence not configured. Please set AZURE_DOC_INTELLIGENCE_ENDPOINT and AZURE_DOC_INTELLIGENCE_KEY'
      );
    }

    // Use prebuilt-document model for general text extraction
    const poller = await this.client.beginAnalyzeDocument('prebuilt-document', fileBuffer);
    const result = await poller.pollUntilDone();

    // Extract full content in reading order
    const content = result.content || '';

    // Extract paragraphs
    const paragraphs: string[] = [];
    if (result.paragraphs) {
      for (const paragraph of result.paragraphs) {
        if (paragraph.content && paragraph.content.trim()) {
          paragraphs.push(paragraph.content.trim());
        }
      }
    }

    // Extract tables
    const tables: { cells: string[][] }[] = [];
    if (result.tables) {
      for (const table of result.tables) {
        const rows: string[][] = [];
        const maxRow = Math.max(...table.cells.map(cell => cell.rowIndex));
        const maxCol = Math.max(...table.cells.map(cell => cell.columnIndex));

        // Initialize 2D array
        for (let i = 0; i <= maxRow; i++) {
          rows[i] = new Array(maxCol + 1).fill('');
        }

        // Fill cells
        for (const cell of table.cells) {
          rows[cell.rowIndex][cell.columnIndex] = cell.content || '';
        }

        tables.push({ cells: rows });
      }
    }

    return {
      content,
      paragraphs,
      tables,
    };
  }
}

export const ocrService = new OcrService();
