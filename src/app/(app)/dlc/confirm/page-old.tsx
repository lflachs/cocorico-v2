'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2, Check, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

type Product = {
  id: string;
  name: string;
  unit: string;
};

type ExtractedProduct = {
  productName: string;
  expirationDate: string;
  batchNumber?: string;
  supplier?: string;
  quantity?: number;
  unit?: string;
};

type ExtractedData = {
  products: ExtractedProduct[];
  confidence: number;
  rawText: string;
};

type DlcFormData = {
  productId: string;
  newProductName: string;
  expirationDate: string;
  quantity: string;
  unit: string;
  batchNumber: string;
  supplier: string;
  createNewProduct: boolean;
};

function DlcConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Form state - array of forms for multiple products
  const [dlcForms, setDlcForms] = useState<DlcFormData[]>([]);

  useEffect(() => {
    // Prevent double-loading in React Strict Mode
    if (dataLoaded) return;

    const initData = async () => {
      await loadExtractedData();
      await fetchProducts();
      setLoading(false);
      setDataLoaded(true);
    };
    initData();
  }, [dataLoaded]);

  useEffect(() => {
    if (extracted && products.length > 0) {
      // Auto-fill form with extracted data
      setExpirationDate(extracted.expirationDate || '');
      setQuantity(extracted.quantity?.toString() || '');
      setUnit(extracted.unit || 'PC');
      setBatchNumber(extracted.batchNumber || '');
      setSupplier(extracted.supplier || '');
      setNewProductName(extracted.productName || '');

      // Try to match product
      if (extracted.productName) {
        const matchedProduct = products.find(
          (p) =>
            p.name.toLowerCase().includes(extracted.productName.toLowerCase()) ||
            extracted.productName.toLowerCase().includes(p.name.toLowerCase())
        );
        if (matchedProduct) {
          setProductId(matchedProduct.id);
          setCreateNewProduct(false);
        } else {
          // No match found, suggest creating new product
          setCreateNewProduct(true);
        }
      }
    }
  }, [extracted, products]);

  const loadExtractedData = async () => {
    try {
      const base64File = localStorage.getItem('dlc_upload_file');

      if (!base64File) {
        toast.error('No file found. Please upload a label first.');
        setTimeout(() => router.push('/dlc/upload'), 1000);
        return;
      }

      // DON'T clear localStorage yet - wait until after processing
      // This prevents issues with React Strict Mode double-mounting

      // Convert base64 back to blob
      const response = await fetch(base64File);
      const blob = await response.blob();
      const file = new File([blob], 'label.jpg', { type: blob.type });

      // Extract data from file
      const formData = new FormData();
      formData.append('file', file);

      const extractResponse = await fetch('/api/dlc/extract', {
        method: 'POST',
        body: formData,
      });

      if (!extractResponse.ok) {
        throw new Error('Failed to extract label information');
      }

      const result = await extractResponse.json();
      setExtracted(result.data);

      // Now clear localStorage after successful extraction
      localStorage.removeItem('dlc_upload_file');

      toast.success('Label information extracted');
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Failed to process label');
      setTimeout(() => router.push('/dlc/upload'), 1000);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleSave = async () => {
    // Validate
    if (createNewProduct) {
      if (!newProductName || !expirationDate || !quantity) {
        toast.error('Please fill in all required fields');
        return;
      }
    } else {
      if (!productId || !expirationDate || !quantity) {
        toast.error('Please fill in all required fields');
        return;
      }
    }

    setSaving(true);
    try {
      let finalProductId = productId;

      // Create new product if needed
      if (createNewProduct && newProductName) {
        const productResponse = await fetch('/api/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: newProductName,
            quantity: 0, // Start at 0, DLC tracks separately
            unit,
            trackable: true,
          }),
        });

        if (!productResponse.ok) {
          throw new Error('Failed to create product');
        }

        const newProduct = await productResponse.json();
        finalProductId = newProduct.id;
        toast.success(`Product "${newProductName}" created`);
      }

      // Save DLC
      const response = await fetch('/api/dlc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: finalProductId,
          expirationDate,
          quantity: parseFloat(quantity),
          unit,
          batchNumber: batchNumber || undefined,
          supplier: supplier || undefined,
          status: 'ACTIVE',
          ocrRawData: extracted?.rawText,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save best before date');
      }

      toast.success('Best before date saved successfully');
      router.push('/dlc');
    } catch (error) {
      console.error('Error saving:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !extracted) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-8 h-8 mx-auto animate-spin text-gray-400" />
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <Link href="/dlc/upload">
          <Button variant="ghost" className="mb-4 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Review & Confirm
        </h1>
        <p className="mt-2 text-gray-600">
          Review the extracted information and match to your inventory
        </p>
      </div>

      {/* Extraction Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            Extracted Information
          </CardTitle>
          <CardDescription>
            Confidence: {Math.round(extracted.confidence * 100)}%
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-semibold text-gray-700">Product:</span>
                <p className="text-gray-900">{extracted.productName || 'Not detected'}</p>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Expiration Date:</span>
                <p className="text-gray-900">
                  {extracted.expirationDate
                    ? new Date(extracted.expirationDate).toLocaleDateString()
                    : 'Not detected'}
                </p>
              </div>
              {extracted.batchNumber && (
                <div>
                  <span className="font-semibold text-gray-700">Batch/Lot:</span>
                  <p className="text-gray-900">{extracted.batchNumber}</p>
                </div>
              )}
              {extracted.supplier && (
                <div>
                  <span className="font-semibold text-gray-700">Supplier:</span>
                  <p className="text-gray-900">{extracted.supplier}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Best Before Information</CardTitle>
          <CardDescription>Review and adjust the information before saving</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="product">
                Product * {productId && !createNewProduct && <span className="text-green-600 text-sm">(Matched)</span>}
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCreateNewProduct(!createNewProduct);
                  if (!createNewProduct) {
                    setProductId('');
                  }
                }}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                {createNewProduct ? 'Select Existing' : 'Create New Product'}
              </Button>
            </div>

            {createNewProduct ? (
              <div className="space-y-2">
                <Input
                  id="newProductName"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  placeholder="Enter product name"
                  className="mt-2"
                />
                <p className="text-sm text-blue-600 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Will create new product "{newProductName || '...'}"
                </p>
              </div>
            ) : (
              <>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!productId && extracted.productName && (
                  <p className="mt-1 text-sm text-amber-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Detected "{extracted.productName}" - select or create product
                  </p>
                )}
              </>
            )}
          </div>

          <div>
            <Label htmlFor="expirationDate">Expiration Date *</Label>
            <Input
              id="expirationDate"
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              className="mt-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="unit">Unit *</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KG">KG</SelectItem>
                  <SelectItem value="L">L</SelectItem>
                  <SelectItem value="PC">PC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="batchNumber">Batch/Lot Number</Label>
            <Input
              id="batchNumber"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              placeholder="Optional"
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="supplier">Supplier</Label>
            <Input
              id="supplier"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="Optional"
              className="mt-2"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <Button
              onClick={handleSave}
              disabled={
                saving ||
                !expirationDate ||
                !quantity ||
                (createNewProduct ? !newProductName : !productId)
              }
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : createNewProduct ? (
                'Create Product & Save'
              ) : (
                'Confirm & Save'
              )}
            </Button>
            <Button variant="outline" size="lg" onClick={() => router.push('/dlc/upload')}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DlcConfirmPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DlcConfirmContent />
    </Suspense>
  );
}
