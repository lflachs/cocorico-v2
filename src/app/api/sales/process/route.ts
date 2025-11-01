import { NextRequest, NextResponse } from 'next/server';
import { ocrService } from '@/lib/services/ocr.service';
import { db } from '@/lib/db/client';

/**
 * POST /api/sales/process
 * Process uploaded sales receipt with Azure OCR
 */

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files');

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    const file = files[0];
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Invalid file' }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine file type and process accordingly
    const fileType = file.type.toLowerCase();
    let ocrResult;

    try {
      // Use receipt model for POS receipts
      if (fileType.includes('pdf')) {
        ocrResult = await ocrService.processInvoice(buffer);
      } else {
        ocrResult = await ocrService.processReceipt(buffer);
      }
    } catch (ocrError) {
      console.error('OCR processing error:', ocrError);
      return NextResponse.json(
        {
          error: 'Failed to process document with OCR',
          details: ocrError instanceof Error ? ocrError.message : 'Unknown error',
        },
        { status: 500 }
      );
    }

    // Create a temporary receipt record (not saved to Sale table yet)
    // We'll use a simple ID for tracking during the flow
    const receiptId = `temp-receipt-${Date.now()}`;

    // Debug: Log OCR results
    console.log('=== OCR EXTRACTION DEBUG ===');
    console.log('Total items extracted:', ocrResult.items.length);
    ocrResult.items.forEach((item, index) => {
      console.log(`Item ${index + 1}:`, {
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      });
    });
    console.log('===========================');

    // Return extracted items
    return NextResponse.json({
      success: true,
      receiptId,
      date: ocrResult.date,
      totalAmount: typeof ocrResult.totalAmount === 'number'
        ? ocrResult.totalAmount
        : (ocrResult.totalAmount as any)?.amount || 0,
      items: ocrResult.items.map((item, index) => {
        // Ensure totalPrice is a number
        let totalPrice = item.totalPrice;
        if (typeof totalPrice === 'object' && totalPrice !== null) {
          totalPrice = (totalPrice as any).amount || 0;
        }

        return {
          id: `temp-${index}`,
          name: item.description,
          quantity: item.quantity,
          totalPrice: typeof totalPrice === 'number' ? totalPrice : 0,
        };
      }),
    });
  } catch (error) {
    console.error('Error processing receipt:', error);
    return NextResponse.json(
      {
        error: 'Failed to process receipt',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
