'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Upload, Plus, FileSpreadsheet, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AddProductDialog } from '../_components/AddProductDialog';
import { toast } from 'sonner';

/**
 * Add Product Page
 * Choose between scanning a bill or manually adding a product
 */

export default function AddProductPage() {
  const router = useRouter();
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [showExcelUpload, setShowExcelUpload] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
      ];
      if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
        toast.error('Please upload an Excel file (.xlsx, .xls) or CSV file');
        return;
      }
      setExcelFile(selectedFile);
    }
  };

  const handleExcelUpload = async () => {
    if (!excelFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', excelFile);

      const response = await fetch('/api/inventory/import-excel', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to parse Excel file');
      }

      if (result.success && result.data) {
        // Save to sessionStorage and redirect to review page
        sessionStorage.setItem('excelImportData', JSON.stringify(result.data));
        router.push('/inventory/import-review');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload Excel file';
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

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

      {!showExcelUpload ? (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Scan Bill Option */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/bills/upload')}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
                  <Upload className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Scan Bill</CardTitle>
                  <CardDescription>Upload receipt/invoice</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Upload a photo or PDF of your delivery receipt. We'll automatically extract products.
              </p>
              <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700">
                <Upload className="w-4 h-4 mr-2" />
                Scan Bill
              </Button>
            </CardContent>
          </Card>

          {/* Excel Import Option */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setShowExcelUpload(true)}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-50">
                  <FileSpreadsheet className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle>Import Excel</CardTitle>
                  <CardDescription>Bulk import products</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Upload an Excel or CSV file with your product list. Perfect for importing multiple products at once.
              </p>
              <Button className="w-full mt-4 bg-purple-600 hover:bg-purple-700">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Import Excel
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
      ) : (
        /* Excel Upload Section */
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5" />
                  Import Excel File
                </CardTitle>
                <CardDescription>
                  Upload an Excel (.xlsx, .xls) or CSV file with your product data
                </CardDescription>
              </div>
              <Button variant="ghost" onClick={() => {
                setShowExcelUpload(false);
                setExcelFile(null);
              }}>
                Cancel
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Input
                type="file"
                accept=".xlsx,.xls,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                onChange={handleExcelFileChange}
                disabled={uploading}
              />

              {excelFile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileSpreadsheet className="w-4 h-4" />
                  {excelFile.name}
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-sm text-blue-900 mb-2">Expected Format</h4>
              <p className="text-xs text-blue-800 mb-2">
                Your file should have these columns (case-insensitive):
              </p>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• <strong>Name</strong> (required) - Product name</li>
                <li>• <strong>Quantity</strong> (required) - Stock quantity</li>
                <li>• <strong>Unit</strong> (required) - KG, L, or PC</li>
                <li>• <strong>Unit Price</strong> (optional) - Price per unit</li>
                <li>• <strong>Par Level</strong> (optional) - Minimum stock level</li>
                <li>• <strong>Category</strong> (optional) - Product category</li>
              </ul>
            </div>

            <Button
              onClick={handleExcelUpload}
              disabled={!excelFile || uploading}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Upload & Continue
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

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
