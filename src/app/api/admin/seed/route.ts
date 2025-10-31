import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    // Only allow in development or staging
    if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production') {
      return NextResponse.json(
        { error: 'Seeding is not allowed in production environment' },
        { status: 403 }
      );
    }

    // Run the seed script
    const { stdout, stderr } = await execAsync('npm run db:seed');

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully',
      output: stdout,
      errors: stderr || null,
    });
  } catch (error: any) {
    console.error('Error seeding database:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to seed database',
        details: error.message,
        output: error.stdout,
        stderr: error.stderr,
      },
      { status: 500 }
    );
  }
}
