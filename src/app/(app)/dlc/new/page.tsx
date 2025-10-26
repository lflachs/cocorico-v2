'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Upload, Plus, ScanLine } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/**
 * Add Best Before Date Page
 * Choose between scanning a label or manually adding a best before date
 */

export default function AddDlcPage() {
  const router = useRouter();

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <Link href="/dlc">
          <Button variant="ghost" className="mb-4 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Best Before Dates
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Add Best Before Date
        </h1>
        <p className="mt-2 text-gray-600">Choose how you want to add expiration dates</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Scan Label Option */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/dlc/upload')}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
                <ScanLine className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle>Scan Label</CardTitle>
                <CardDescription>Photo of expiration date</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Take a photo of the product label. We'll automatically extract the expiration date and product information.
            </p>
            <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700">
              <Upload className="w-4 h-4 mr-2" />
              Scan Label
            </Button>
          </CardContent>
        </Card>

        {/* Manual Entry Option */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/dlc/confirm')}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50">
                <Plus className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <CardTitle>Manual Entry</CardTitle>
                <CardDescription>Add date manually</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Manually enter the product and expiration date. Best for when you already know all the details.
            </p>
            <Button variant="outline" className="w-full mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Add Manually
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Tip</h3>
          <p className="text-sm text-blue-800">
            Keep track of all your products with expiration dates to reduce waste. You'll get notifications when items are expiring soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
