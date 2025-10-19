'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
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
import { ArrowLeft, Loader2, Check, AlertCircle, X } from 'lucide-react';
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
  sourceFile?: string;
  sourceFileIndex?: number;
};

type ExtractedData = {
  products: ExtractedProduct[];
  confidence: number;
  rawText: string;
};

type ExtractedFileData = {
  products: ExtractedProduct[];
  confidence: number;
  rawText: string;
};

type DlcEntry = ExtractedProduct & {
  id: string;
  productId: string;
  newProductName: string;
  createNewProduct: boolean;
};

function DlcConfirmContent() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [dlcEntries, setDlcEntries] = useState<DlcEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dataProcessed, setDataProcessed] = useState(false);

  useEffect(() => {
    const initData = async () => {
      if (dataProcessed) {
        console.log('Data already processed, skipping...');
        return;
      }

      await fetchProducts();
      await processUploadedFile();
      setDataProcessed(true);
      setLoading(false);
    };
    initData();
  }, []);

  useEffect(() => {
    console.log('useEffect triggered - extracted:', extracted, 'products:', products);

    // Create entries as soon as we have extracted data, don't wait for products
    if (extracted && extracted.products && extracted.products.length > 0) {
      console.log('Creating DLC entries from extracted.products:', extracted.products);

      // Initialize DLC entries from extracted data
      const entries: DlcEntry[] = extracted.products.map((product, index) => {
        // Try to match with existing products (if any are loaded)
        const matchedProduct = products.find(
          (p) =>
            p.name.toLowerCase().includes(product.productName?.toLowerCase() || '') ||
            (product.productName?.toLowerCase() || '').includes(p.name.toLowerCase())
        );

        console.log(`Product ${index}:`, product, 'matched:', matchedProduct);

        return {
          id: `dlc-${index}`,
          ...product,
          productId: matchedProduct?.id || '',
          newProductName: product.productName || '',
          createNewProduct: !matchedProduct,
          quantity: product.quantity || 1,
          unit: product.unit || 'PC',
        };
      });

      console.log('Created DLC entries:', entries);
      setDlcEntries(entries);
    }
  }, [extracted, products]);

  const processUploadedFile = async () => {
    try {
      const extractedDataJson = localStorage.getItem('dlc_extracted_data');

      if (!extractedDataJson) {
        toast.error('No file found. Please upload a label first.');
        setTimeout(() => router.push('/dlc/upload'), 1000);
        return;
      }

      console.log('Raw extracted data from localStorage:', extractedDataJson);

      // Parse the extracted data from all files
      const allFileData: ExtractedFileData[] = JSON.parse(extractedDataJson);

      console.log('Parsed file data:', allFileData);

      // Flatten all products from all files into a single array
      const allProducts: ExtractedProduct[] = [];
      let combinedRawText = '';

      allFileData.forEach((fileData, index) => {
        console.log(`File ${index} data:`, fileData);
        console.log(`File ${index} products:`, fileData.products);

        if (fileData.products && Array.isArray(fileData.products)) {
          allProducts.push(...fileData.products);
        }

        if (fileData.rawText) {
          combinedRawText += fileData.rawText + '\n\n';
        }
      });

      console.log('All products flattened:', allProducts);

      // Calculate average confidence
      const avgConfidence = allFileData.reduce((sum, fd) => sum + fd.confidence, 0) / allFileData.length;

      // Set the combined extracted data
      const extractedData = {
        products: allProducts,
        confidence: avgConfidence,
        rawText: combinedRawText.trim(),
      };

      console.log('Setting extracted data:', extractedData);
      setExtracted(extractedData);

      // DON'T remove localStorage yet - keep it until save or user navigates away
      // This prevents issues with React Strict Mode double-mounting

      toast.success(`Extracted ${allProducts.length} product(s) from ${allFileData.length} file(s)`);
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Failed to process label');
      setTimeout(() => router.push('/dlc/upload'), 1000);
    }
  };

  const fetchProducts = async () => {
    try {
      console.log('Fetching products...');
      const response = await fetch('/api/products');
      const data = await response.json();
      console.log('Fetched products:', data);
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    }
  };

  const updateEntry = (id: string, updates: Partial<DlcEntry>) => {
    setDlcEntries(prev =>
      prev.map(entry => (entry.id === id ? { ...entry, ...updates } : entry))
    );
  };

  const removeEntry = (id: string) => {
    setDlcEntries(prev => prev.filter(entry => entry.id !== id));
  };

  const handleSaveAll = async () => {
    // Validate all entries
    for (const entry of dlcEntries) {
      if (entry.createNewProduct && !entry.newProductName) {
        toast.error('Please fill in all product names');
        return;
      }
      if (!entry.createNewProduct && !entry.productId) {
        toast.error('Please select all products');
        return;
      }
      if (!entry.expirationDate) {
        toast.error('Please fill in all expiration dates');
        return;
      }
    }

    setSaving(true);
    try {
      let successCount = 0;

      for (const entry of dlcEntries) {
        let finalProductId = entry.productId;

        // Create new product if needed
        if (entry.createNewProduct && entry.newProductName) {
          const productResponse = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: entry.newProductName,
              quantity: 0,
              unit: entry.unit,
              trackable: true,
            }),
          });

          if (!productResponse.ok) throw new Error(`Failed to create product: ${entry.newProductName}`);

          const newProduct = await productResponse.json();
          finalProductId = newProduct.id;
        }

        // Save DLC
        const dlcResponse = await fetch('/api/dlc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: finalProductId,
            expirationDate: entry.expirationDate,
            quantity: entry.quantity || 1,
            unit: entry.unit,
            batchNumber: entry.batchNumber || undefined,
            supplier: entry.supplier || undefined,
            status: 'ACTIVE',
            ocrRawData: extracted?.rawText,
          }),
        });

        if (!dlcResponse.ok) throw new Error(`Failed to save DLC for: ${entry.newProductName || 'product'}`);

        successCount++;
      }

      toast.success(`Saved ${successCount} best before date(s)`);

      // Clean up localStorage after successful save
      localStorage.removeItem('dlc_extracted_data');

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
        <p className="mt-4 text-gray-600">Processing image...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <Link href="/dlc/upload">
          <Button variant="ghost" className="mb-4 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Review & Confirm ({dlcEntries.length} product{dlcEntries.length !== 1 ? 's' : ''})
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
            Extraction Summary
          </CardTitle>
          <CardDescription>
            Confidence: {Math.round(extracted.confidence * 100)}% • Found {dlcEntries.length} product(s)
          </CardDescription>
        </CardHeader>
      </Card>

      {/* DLC Entries */}
      <div className="space-y-4">
        {dlcEntries.map((entry, index) => (
          <Card key={entry.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Product {index + 1}</CardTitle>
                  {entry.sourceFile && (
                    <p className="text-xs text-gray-500 mt-1">From: {entry.sourceFile}</p>
                  )}
                </div>
                {dlcEntries.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeEntry(entry.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>
                    Product * {entry.productId && !entry.createNewProduct && (
                      <span className="text-green-600 text-sm">(Matched)</span>
                    )}
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => updateEntry(entry.id, {
                      createNewProduct: !entry.createNewProduct,
                      productId: entry.createNewProduct ? '' : entry.productId,
                    })}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    {entry.createNewProduct ? 'Select Existing' : 'Create New'}
                  </Button>
                </div>

                {entry.createNewProduct ? (
                  <div className="space-y-2">
                    <Input
                      value={entry.newProductName}
                      onChange={(e) => updateEntry(entry.id, { newProductName: e.target.value })}
                      placeholder="Enter product name"
                    />
                    <p className="text-sm text-blue-600 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Will create "{entry.newProductName || '...'}"
                    </p>
                  </div>
                ) : (
                  <>
                    <Select
                      value={entry.productId}
                      onValueChange={(value) => updateEntry(entry.id, { productId: value })}
                    >
                      <SelectTrigger>
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
                    {!entry.productId && (
                      <p className="mt-1 text-sm text-amber-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Detected "{entry.newProductName}" - select or create
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Expiration Date *</Label>
                  <Input
                    type="date"
                    value={entry.expirationDate}
                    onChange={(e) => updateEntry(entry.id, { expirationDate: e.target.value })}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={entry.quantity}
                    onChange={(e) => updateEntry(entry.id, { quantity: parseFloat(e.target.value) || 1 })}
                    className="mt-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Unit</Label>
                  <Select
                    value={entry.unit}
                    onValueChange={(value) => updateEntry(entry.id, { unit: value })}
                  >
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
                <div>
                  <Label>Batch/Lot</Label>
                  <Input
                    value={entry.batchNumber || ''}
                    onChange={(e) => updateEntry(entry.id, { batchNumber: e.target.value })}
                    placeholder="Optional"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Supplier</Label>
                  <Input
                    value={entry.supplier || ''}
                    onChange={(e) => updateEntry(entry.id, { supplier: e.target.value })}
                    placeholder="Optional"
                    className="mt-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={handleSaveAll}
          disabled={saving || dlcEntries.length === 0}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
          size="lg"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving {dlcEntries.length} product(s)...
            </>
          ) : (
            `Save ${dlcEntries.length} Best Before Date(s)`
          )}
        </Button>
        <Button variant="outline" size="lg" onClick={() => router.push('/dlc/upload')}>
          Cancel
        </Button>
      </div>
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
