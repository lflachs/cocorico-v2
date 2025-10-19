'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileUpload } from '@/app/(app)/bills/_components/FileUpload';
import { toast } from 'sonner';

/**
 * DLC Upload Page
 * Upload and process product labels (matches bill upload UX)
 */

export default function DlcUploadPage() {
  const router = useRouter();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFilesChange = (files: File[]) => {
    setSelectedFiles(files);
  };

  const handleProcess = async () => {
    if (selectedFiles.length === 0) return;

    setIsProcessing(true);

    try {
      // Process all selected files
      const allExtractedProducts = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];

        // Create FormData and upload to extract API
        const formData = new FormData();
        formData.append('file', file);

        const extractResponse = await fetch('/api/dlc/extract', {
          method: 'POST',
          body: formData,
        });

        if (!extractResponse.ok) {
          throw new Error(`Failed to extract from file ${i + 1}`);
        }

        const result = await extractResponse.json();

        // Add file source info to each product
        const productsWithSource = result.data.products.map((product: any) => ({
          ...product,
          sourceFile: file.name,
          sourceFileIndex: i,
        }));

        allExtractedProducts.push({
          products: productsWithSource,
          confidence: result.data.confidence,
          rawText: result.data.rawText,
        });
      }

      // Store all extracted data in localStorage
      localStorage.setItem('dlc_extracted_data', JSON.stringify(allExtractedProducts));

      toast.success(`Processed ${selectedFiles.length} file(s)`);

      // Navigate after storage is confirmed
      router.push('/dlc/confirm');
    } catch (error) {
      console.error('Error processing files:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process files');
      setIsProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/dlc">
          <Button variant="ghost" className="mb-4 -ml-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Scan Best Before Date</h1>
        <p className="mt-2 text-gray-600">Upload a photo of the product label</p>
      </div>

      <FileUpload onFilesChange={handleFilesChange} />

      {selectedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
            <CardDescription>What happens when you process this label</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <h4 className="mb-2 font-semibold text-blue-900">What will happen:</h4>
                <ul className="space-y-1 text-sm text-blue-800">
                  <li>• We extract the product name and expiration date from the label</li>
                  <li>• You review and match the product to your inventory</li>
                  <li>• The best before date is saved for tracking</li>
                </ul>
              </div>

              <Button
                onClick={handleProcess}
                disabled={selectedFiles.length === 0 || isProcessing}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Preparing...
                  </>
                ) : (
                  'Continue to Review'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
