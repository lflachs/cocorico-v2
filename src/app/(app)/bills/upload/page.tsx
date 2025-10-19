'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileUpload } from '../_components/FileUpload';
import { useLanguage } from '@/providers/LanguageProvider';
import { toast } from 'sonner';

/**
 * Bill Upload Page
 * Upload and process delivery bills/invoices (supports multiple files)
 */

export default function BillUploadPage() {
  const { t } = useLanguage();
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
      // Create FormData with files
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });

      // Process with Azure OCR
      const response = await fetch('/api/bills/process', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Failed to process bill');
      }

      const data = await response.json();

      toast.success(t('bills.upload.success'));
      router.push(`/bills/${data.billId}/confirm`);
    } catch (error) {
      console.error('Error processing bill:', error);
      toast.error(error instanceof Error ? error.message : t('bills.upload.error'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <Link href="/bills">
          <Button variant="ghost" className="mb-4 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back')}
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          {t('bills.upload.pageTitle')}
        </h1>
        <p className="mt-2 text-gray-600">{t('bills.upload.pageDescription')}</p>
      </div>

      <FileUpload onFilesChange={handleFilesChange} />

      {selectedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('bills.upload.nextSteps')}</CardTitle>
            <CardDescription>{t('bills.upload.nextSteps.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">
                  {t('bills.upload.whatHappens')}
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• {t('bills.upload.step1')}</li>
                  <li>• {t('bills.upload.step2')}</li>
                  <li>• {t('bills.upload.step3')}</li>
                </ul>
              </div>

              <Button
                onClick={handleProcess}
                disabled={isProcessing}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('bills.upload.processing')}
                  </>
                ) : (
                  t('bills.upload.process')
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
