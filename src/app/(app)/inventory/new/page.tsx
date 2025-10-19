'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Upload, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AddProductDialog } from '../_components/AddProductDialog';

/**
 * Add Product Page
 * Choose between scanning a bill or manually adding a product
 */

export default function AddProductPage() {
  const router = useRouter();
  const [showManualDialog, setShowManualDialog] = useState(false);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <Link href="/inventory">
          <Button variant="ghost" className="mb-4 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Inventory
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Add Product
        </h1>
        <p className="mt-2 text-gray-600">Choose how you want to add products</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Scan Bill Option */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/bills/upload')}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
                <Upload className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle>Scan Delivery Bill</CardTitle>
                <CardDescription>Upload receipt or invoice</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Upload a photo or PDF of your delivery receipt. We'll automatically extract products, quantities, and prices.
            </p>
            <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700">
              <Upload className="w-4 h-4 mr-2" />
              Scan Bill
            </Button>
          </CardContent>
        </Card>

        {/* Manual Entry Option */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setShowManualDialog(true)}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50">
                <Plus className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <CardTitle>Manual Entry</CardTitle>
                <CardDescription>Add product manually</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Manually enter product details including name, quantity, unit, and price. Best for single items.
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
            You can also add products using the voice assistant in the inventory page. Just click the microphone and say "Add 5 kilos of tomatoes".
          </p>
        </CardContent>
      </Card>

      {/* Manual Entry Dialog */}
      <AddProductDialog open={showManualDialog} onOpenChange={setShowManualDialog} />
    </div>
  );
}
