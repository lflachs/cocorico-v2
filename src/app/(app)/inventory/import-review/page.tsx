'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, FileSpreadsheet, AlertCircle, CheckCircle2, Trash2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

type ParsedProduct = {
  rowIndex: number;
  name: string;
  quantity: number;
  unit: 'KG' | 'L' | 'PC';
  unitPrice?: number;
  parLevel?: number;
  category?: string;
  error?: string;
};

export default function ImportReviewPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ParsedProduct[]>([]);
  const [invalidProducts, setInvalidProducts] = useState<ParsedProduct[]>([]);
  const [columnMappings, setColumnMappings] = useState<any>(null);
  const [totalRows, setTotalRows] = useState(0);
  const [importing, setImporting] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    // Load data from sessionStorage
    const dataStr = sessionStorage.getItem('excelImportData');
    if (!dataStr) {
      toast.error('No import data found');
      router.push('/inventory/new');
      return;
    }

    try {
      const data = JSON.parse(dataStr);
      setProducts(data.products || []);
      setInvalidProducts(data.invalidProducts || []);
      setColumnMappings(data.columnMappings || {});
      setTotalRows(data.totalRows || 0);
    } catch (error) {
      toast.error('Failed to load import data');
      router.push('/inventory/new');
    }
  }, [router]);

  const handleUpdateProduct = (index: number, field: string, value: any) => {
    const updatedProducts = [...products];
    updatedProducts[index] = { ...updatedProducts[index], [field]: value };
    setProducts(updatedProducts);
  };

  const handleRemoveProduct = (index: number) => {
    const updatedProducts = products.filter((_, i) => i !== index);
    setProducts(updatedProducts);
  };

  const handleImport = async () => {
    if (products.length === 0) {
      toast.error('No products to import');
      return;
    }

    setImporting(true);

    try {
      // Import products using the bulk import action
      const { bulkImportProductsAction } = await import('@/lib/actions/product.actions');

      const result = await bulkImportProductsAction(
        products.map((p) => ({
          name: p.name,
          quantity: p.quantity,
          unit: p.unit,
          unitPrice: p.unitPrice,
          parLevel: p.parLevel,
          category: p.category,
        }))
      );

      if (result.success) {
        toast.success(`Successfully imported ${result.data?.count || products.length} products`);
        sessionStorage.removeItem('excelImportData');
        router.push('/inventory');
      } else {
        throw new Error(result.error || 'Failed to import products');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to import products';
      toast.error(errorMessage);
    } finally {
      setImporting(false);
    }
  };

  if (products.length === 0 && invalidProducts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="bg-background border-b pb-6">
        <Link href="/inventory/new">
          <Button variant="ghost" className="mb-4 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
              <FileSpreadsheet className="w-8 h-8" />
              Review Import Data
            </h1>
            <p className="mt-2 text-gray-600">
              Review and edit the parsed data before importing to inventory
            </p>
          </div>
          <Button
            onClick={handleImport}
            disabled={products.length === 0 || importing}
            size="lg"
            className="bg-purple-600 hover:bg-purple-700"
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Import {products.length} Product{products.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Rows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRows}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              Valid Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{products.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              Invalid Rows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{invalidProducts.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Column Mappings */}
      {columnMappings && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-blue-900">Detected Columns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              {Object.entries(columnMappings).map(([key, value]) => (
                value && (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-blue-700 font-medium capitalize">{key}:</span>
                    <Badge variant="outline" className="bg-white">{value as string}</Badge>
                  </div>
                )
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invalid Products Warning */}
      {invalidProducts.length > 0 && (
        <Card className="bg-red-50 border-red-200">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-red-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {invalidProducts.length} Invalid Row{invalidProducts.length !== 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {invalidProducts.slice(0, 5).map((product, index) => (
                <div key={index} className="flex items-start gap-2 text-red-800">
                  <span className="font-mono bg-red-100 px-2 py-0.5 rounded">Row {product.rowIndex}</span>
                  <span>{product.error || 'Invalid data'}</span>
                </div>
              ))}
              {invalidProducts.length > 5 && (
                <p className="text-red-700 italic">
                  ... and {invalidProducts.length - 5} more invalid rows
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Products to Import ({products.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Row</TableHead>
                  <TableHead className="min-w-[200px]">Name</TableHead>
                  <TableHead className="w-[100px]">Quantity</TableHead>
                  <TableHead className="w-[80px]">Unit</TableHead>
                  <TableHead className="w-[120px]">Unit Price</TableHead>
                  <TableHead className="w-[100px]">Par Level</TableHead>
                  <TableHead className="min-w-[150px]">Category</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-xs text-gray-500">
                      {product.rowIndex}
                    </TableCell>
                    <TableCell>
                      {editingIndex === index ? (
                        <Input
                          value={product.name}
                          onChange={(e) => handleUpdateProduct(index, 'name', e.target.value)}
                          className="min-w-[180px]"
                        />
                      ) : (
                        <span className="font-medium">{product.name}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingIndex === index ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={product.quantity}
                          onChange={(e) => handleUpdateProduct(index, 'quantity', parseFloat(e.target.value))}
                          className="w-[90px]"
                        />
                      ) : (
                        product.quantity
                      )}
                    </TableCell>
                    <TableCell>
                      {editingIndex === index ? (
                        <Select
                          value={product.unit}
                          onValueChange={(value) => handleUpdateProduct(index, 'unit', value)}
                        >
                          <SelectTrigger className="w-[70px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="KG">KG</SelectItem>
                            <SelectItem value="L">L</SelectItem>
                            <SelectItem value="PC">PC</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline">{product.unit}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingIndex === index ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={product.unitPrice || ''}
                          onChange={(e) => handleUpdateProduct(index, 'unitPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
                          placeholder="Optional"
                          className="w-[110px]"
                        />
                      ) : (
                        product.unitPrice ? `€${product.unitPrice.toFixed(2)}` : '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {editingIndex === index ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={product.parLevel || ''}
                          onChange={(e) => handleUpdateProduct(index, 'parLevel', e.target.value ? parseFloat(e.target.value) : undefined)}
                          placeholder="Optional"
                          className="w-[90px]"
                        />
                      ) : (
                        product.parLevel || '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {editingIndex === index ? (
                        <Input
                          value={product.category || ''}
                          onChange={(e) => handleUpdateProduct(index, 'category', e.target.value || undefined)}
                          placeholder="Optional"
                          className="min-w-[140px]"
                        />
                      ) : (
                        product.category || '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {editingIndex === index ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingIndex(null)}
                          >
                            Done
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingIndex(index)}
                          >
                            Edit
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveProduct(index)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {products.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No valid products to import</p>
              <Link href="/inventory/new">
                <Button variant="outline" className="mt-4">
                  Try Again
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
