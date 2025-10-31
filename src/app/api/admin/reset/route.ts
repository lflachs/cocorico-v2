import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';

export async function POST(request: NextRequest) {
  try {
    // Only allow in development or staging
    if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production') {
      return NextResponse.json(
        { error: 'Reset is not allowed in production environment' },
        { status: 403 }
      );
    }

    // Clean up all data (in reverse order of dependencies)
    await db.sale.deleteMany();
    await db.dLC.deleteMany();
    await db.menuDish.deleteMany();
    await db.menuSection.deleteMany();
    await db.menu.deleteMany();
    await db.recipeIngredient.deleteMany();
    await db.dish.deleteMany();
    await db.stockMovement.deleteMany();
    await db.billProduct.deleteMany();
    await db.disputeProduct.deleteMany();
    await db.dispute.deleteMany();
    await db.bill.deleteMany();
    await db.compositeIngredient.deleteMany();
    await db.product.deleteMany();
    await db.supplier.deleteMany();

    // Don't delete users so the admin can still log in

    return NextResponse.json({
      success: true,
      message: 'Database reset successfully. All data except users has been deleted.',
    });
  } catch (error: any) {
    console.error('Error resetting database:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to reset database',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
