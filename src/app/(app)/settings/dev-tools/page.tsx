'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, Trash2, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DevToolsPage() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [seedOutput, setSeedOutput] = useState<string>('');

  const handleSeed = async () => {
    if (!confirm('Are you sure you want to seed the database? This will add a lot of test data.')) {
      return;
    }

    setIsSeeding(true);
    setSeedOutput('Seeding database...');

    try {
      const response = await fetch('/api/admin/seed', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to seed database');
      }

      setSeedOutput(data.output || 'Database seeded successfully!');
      toast.success('Database seeded successfully!', {
        description: 'All test data has been loaded.',
      });
    } catch (error: any) {
      console.error('Error seeding:', error);
      setSeedOutput(`Error: ${error.message}`);
      toast.error('Failed to seed database', {
        description: error.message,
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleReset = async () => {
    if (
      !confirm(
        '⚠️ WARNING: This will delete ALL data from the database (except users).\n\nAre you absolutely sure you want to continue?'
      )
    ) {
      return;
    }

    setIsResetting(true);

    try {
      const response = await fetch('/api/admin/reset', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to reset database');
      }

      toast.success('Database reset successfully!', {
        description: 'All data has been deleted.',
      });
      setSeedOutput('Database reset successfully! You can now seed fresh data.');
    } catch (error: any) {
      console.error('Error resetting:', error);
      toast.error('Failed to reset database', {
        description: error.message,
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="w-full space-y-4 overflow-hidden sm:space-y-6">
      <PageHeader
        title="Developer Tools"
        subtitle="Manage test data for development and staging"
        icon={Database}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Seed Database Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-green-600" />
              <CardTitle>Seed Database</CardTitle>
            </div>
            <CardDescription>
              Load comprehensive test data including products, dishes, menus, bills, sales, and more.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="font-medium">This will create:</p>
                  <ul className="ml-4 list-disc space-y-0.5">
                    <li>2 users (admin & user)</li>
                    <li>5 suppliers</li>
                    <li>16 base products + 2 composite products</li>
                    <li>21 dishes from Sens Unique Restaurant</li>
                    <li>2 menus (Menu Canaille & Menu Gourmand)</li>
                    <li>5 bills with stock movements</li>
                    <li>56 sales records over 7 days</li>
                    <li>6 DLC records</li>
                    <li>2 disputes</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button
              onClick={handleSeed}
              disabled={isSeeding}
              className="w-full"
              size="lg"
            >
              {isSeeding ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Seeding...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Seed Database
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Reset Database Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              <CardTitle>Reset Database</CardTitle>
            </div>
            <CardDescription>
              Delete all data from the database (except users). Use this to start fresh.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="font-medium">Warning:</p>
                  <p>
                    This action will permanently delete all products, dishes, menus, bills, sales,
                    and related data. User accounts will be preserved.
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleReset}
              disabled={isResetting}
              variant="destructive"
              className="w-full"
              size="lg"
            >
              {isResetting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Reset Database
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Output Console */}
      {seedOutput && (
        <Card>
          <CardHeader>
            <CardTitle>Output</CardTitle>
            <CardDescription>Operation logs and results</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="max-h-96 overflow-auto rounded-lg bg-gray-900 p-4 text-xs text-green-400">
              {seedOutput}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Environment Info */}
      <Card>
        <CardHeader>
          <CardTitle>Environment Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="font-medium text-muted-foreground">Node Environment:</span>
              <span className="font-mono">{process.env.NODE_ENV || 'unknown'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-muted-foreground">Access Level:</span>
              <span className="font-mono">Admin Required</span>
            </div>
            <div className="rounded-lg bg-amber-50 p-3 text-amber-800">
              <p className="text-xs">
                <strong>Note:</strong> These tools are only available in development and staging
                environments. They are automatically disabled in production.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
