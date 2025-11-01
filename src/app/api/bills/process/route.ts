import { NextRequest, NextResponse } from 'next/server';
import { ocrService } from '@/lib/services/ocr.service';
import { createBill, addProductsToBill } from '@/lib/services/bill.service';

/**
 * POST /api/bills/process
 * Process uploaded bill files with Azure OCR
 */

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files');

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    const processedBills = [];

    for (const file of files) {
      if (!(file instanceof File)) {
        continue;
      }

      // Convert file to buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Determine file type and process accordingly
      const fileType = file.type.toLowerCase();
      let ocrResult;

      try {
        if (fileType.includes('pdf') || fileType.includes('invoice')) {
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

      // Create bill in database
      const bill = await createBill({
        filename: file.name,
        supplier: ocrResult.supplierName,
        billDate: ocrResult.date,
        totalAmount: ocrResult.totalAmount,
        rawContent: JSON.stringify(ocrResult),
      });

      // Store extracted items as temporary data (not yet linked to products)
      // This will be used in the confirmation screen
      processedBills.push({
        billId: bill.id,
        filename: file.name,
        supplier: ocrResult.supplierName,
        supplierEmail: ocrResult.supplierEmail,
        supplierPhone: ocrResult.supplierPhone,
        date: ocrResult.date,
        totalAmount: ocrResult.totalAmount,
        items: ocrResult.items.map((item, index) => ({
          id: `temp-${index}`,
          name: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
      });
    }

    // For now, return the first processed bill
    // In production, you might want to handle multiple bills differently
    if (processedBills.length > 0) {
      return NextResponse.json({
        success: true,
        billId: processedBills[0].billId,
        ...processedBills[0],
      });
    }

    return NextResponse.json({ error: 'No bills were processed' }, { status: 400 });
  } catch (error) {
    console.error('Error processing bills:', error);
    return NextResponse.json(
      {
        error: 'Failed to process bills',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
