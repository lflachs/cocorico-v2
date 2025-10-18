import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';

export async function GET() {
  try {
    const count = await db.product.count({
      where: {
        OR: [
          { unitPrice: null },
          { unitPrice: 0 },
        ],
        isComposite: false, // Only check base products, not composite ones
      },
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error checking missing prices:', error);
    return NextResponse.json({ count: 0 }, { status: 500 });
  }
}
