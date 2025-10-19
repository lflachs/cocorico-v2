import { PageHeader } from '@/components/PageHeader';
import { AlertCircle } from 'lucide-react';

/**
 * Disputes Page - Returns and complaints management
 */

export default function DisputesPage() {
  return (
    <div className="space-y-6">
      {/* Header with gradient background */}
      <PageHeader
        title="Disputes"
        subtitle="Manage returns and complaints"
        icon={AlertCircle}
      />

      <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
        <p className="text-gray-500">Disputes management coming soon...</p>
      </div>
    </div>
  );
}
