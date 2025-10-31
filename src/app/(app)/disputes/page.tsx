'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, Plus, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { DisputeModal } from './_components/DisputeModal';
import { ResolveModal } from './_components/ResolveModal';
import { toast } from 'sonner';
import { useLanguage } from '@/providers/LanguageProvider';

/**
 * Disputes Page - Returns and complaints management
 */

type DisputeProduct = {
  id: string;
  productId: string;
  reason: string;
  quantityDisputed: number | null;
  description: string | null;
  product: {
    id: string;
    name: string;
    unit: string;
  };
};

type Dispute = {
  id: string;
  type: 'RETURN' | 'COMPLAINT' | 'REFUND';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  title: string;
  description: string | null;
  amountDisputed: number | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  bill: {
    id: string;
    filename: string;
    supplier: string | null;
    billDate: string | null;
    totalAmount: number | null;
  };
  products: DisputeProduct[];
};

export default function DisputesPage() {
  const { t } = useLanguage();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open'>('open');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);

  useEffect(() => {
    fetchDisputes();
  }, [filter]);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const url = filter === 'open' ? '/api/disputes?filter=open' : '/api/disputes';
      const response = await fetch(url);
      const data = await response.json();
      setDisputes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching disputes:', error);
      setDisputes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/disputes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        toast.success(t('common.success'));
        fetchDisputes();
      } else {
        toast.error(t('common.error'));
      }
    } catch (error) {
      console.error('Error updating dispute:', error);
      toast.error(t('common.error'));
    }
  };

  const handleResolve = (dispute: Dispute) => {
    setSelectedDispute(dispute);
    setResolveModalOpen(true);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`${t('common.confirmDelete')} "${title}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/disputes/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success(t('common.deleted'));
        fetchDisputes();
      } else {
        toast.error(t('common.error'));
      }
    } catch (error) {
      console.error('Error deleting dispute:', error);
      toast.error(t('common.error'));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            {t('disputes.status.open')}
          </Badge>
        );
      case 'IN_PROGRESS':
        return (
          <Badge className="gap-1 bg-yellow-500">
            <Clock className="h-3 w-3" />
            {t('disputes.status.inProgress')}
          </Badge>
        );
      case 'RESOLVED':
        return (
          <Badge variant="secondary" className="gap-1 bg-green-600 text-white">
            <CheckCircle className="h-3 w-3" />
            {t('disputes.status.resolved')}
          </Badge>
        );
      case 'CLOSED':
        return (
          <Badge variant="secondary" className="gap-1">
            <XCircle className="h-3 w-3" />
            {t('disputes.status.closed')}
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'RETURN':
        return <Badge variant="outline">{t('disputes.type.return')}</Badge>;
      case 'COMPLAINT':
        return <Badge variant="outline">{t('disputes.type.complaint')}</Badge>;
      case 'REFUND':
        return <Badge variant="outline">{t('disputes.type.refund')}</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getDaysSince = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-6">
      {/* Header with gradient background */}
      <PageHeader
        title={t('disputes.title')}
        subtitle={t('disputes.subtitle')}
        icon={AlertCircle}
      />

      <Card>
        <CardHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={filter === 'open' ? 'default' : 'outline'}
                onClick={() => setFilter('open')}
                className="cursor-pointer flex-1"
              >
                <AlertCircle className="mr-2 h-4 w-4" />
                {t('disputes.openDisputes')}
              </Button>
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                onClick={() => setFilter('all')}
                className="cursor-pointer flex-1"
              >
                {t('disputes.allDisputes')}
              </Button>
            </div>
            <Button onClick={() => setCreateModalOpen(true)} className="cursor-pointer gap-2 w-full">
              <Plus className="h-4 w-4" />
              {t('disputes.createDispute')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8">
              <p className="text-center text-gray-500">{t('common.loading')}</p>
            </div>
          ) : disputes.length === 0 ? (
            <div className="py-8">
              <div className="text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-gray-500">
                  {filter === 'open' ? t('disputes.noOpen') : t('disputes.noDisputes')}
                </p>
                <Button
                  onClick={() => setCreateModalOpen(true)}
                  className="mt-4 cursor-pointer"
                  variant="outline"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t('disputes.createFirst')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {disputes.map((dispute) => {
                const daysSince = getDaysSince(dispute.createdAt);
                const isUrgent = daysSince >= 7 && dispute.status === 'OPEN';

                return (
                  <div
                    key={dispute.id}
                    className={`rounded-lg border p-6 ${
                      isUrgent ? 'border-red-300 bg-red-50/30' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex flex-1 gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-50">
                          <AlertCircle className="h-6 w-6 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{dispute.title}</h3>
                            {getTypeBadge(dispute.type)}
                            {getStatusBadge(dispute.status)}
                            {isUrgent && (
                              <Badge variant="destructive" className="text-xs">
                                {t('disputes.urgent')} ({daysSince}d)
                              </Badge>
                            )}
                          </div>

                          {dispute.description && (
                            <p className="mt-1 text-sm text-gray-600">{dispute.description}</p>
                          )}

                          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <FileText className="h-4 w-4" />
                              <span>
                                {t('disputes.bill')}: {dispute.bill.filename}
                                {dispute.bill.supplier && ` • ${dispute.bill.supplier}`}
                              </span>
                            </div>
                            {dispute.amountDisputed && (
                              <span>{t('disputes.amount')}: €{dispute.amountDisputed.toFixed(2)}</span>
                            )}
                            {dispute.products.length > 0 && (
                              <span>
                                {dispute.products.length} {dispute.products.length > 1 ? t('disputes.products') : t('disputes.product')}
                              </span>
                            )}
                            <span>{t('disputes.createdAgo')} {daysSince}{t('disputes.daysOld')}</span>
                          </div>

                          {dispute.products.length > 0 && (
                            <div className="mt-3 space-y-1">
                              <p className="text-xs font-medium text-gray-500">
                                {t('disputes.disputedProducts')}:
                              </p>
                              {dispute.products.map((dp) => (
                                <div key={dp.id} className="text-sm text-gray-600">
                                  • {dp.product.name}
                                  {dp.quantityDisputed &&
                                    ` (${dp.quantityDisputed} ${dp.product.unit})`}
                                  : {dp.reason}
                                </div>
                              ))}
                            </div>
                          )}

                          {dispute.resolvedAt && dispute.resolutionNotes && (
                            <div className="mt-3 rounded-md border border-green-200 bg-green-50 p-3">
                              <p className="text-xs font-medium text-green-800">{t('disputes.resolution')}:</p>
                              <p className="text-sm text-green-700">{dispute.resolutionNotes}</p>
                              <p className="mt-1 text-xs text-green-600">
                                {t('disputes.resolvedOn')} {new Date(dispute.resolvedAt).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {dispute.status === 'OPEN' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(dispute.id, 'IN_PROGRESS')}
                              className="cursor-pointer"
                            >
                              {t('disputes.markInProgress')}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleResolve(dispute)}
                              className="cursor-pointer bg-green-600 hover:bg-green-700"
                            >
                              {t('disputes.resolve')}
                            </Button>
                          </>
                        )}
                        {dispute.status === 'IN_PROGRESS' && (
                          <Button
                            size="sm"
                            onClick={() => handleResolve(dispute)}
                            className="cursor-pointer bg-green-600 hover:bg-green-700"
                          >
                            {t('disputes.resolve')}
                          </Button>
                        )}
                        {(dispute.status === 'RESOLVED' || dispute.status === 'CLOSED') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(dispute.id, dispute.title)}
                            className="cursor-pointer text-red-600 hover:bg-red-50"
                          >
                            {t('common.delete')}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <DisputeModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={fetchDisputes}
      />

      {selectedDispute && (
        <ResolveModal
          open={resolveModalOpen}
          onOpenChange={setResolveModalOpen}
          dispute={selectedDispute}
          onSuccess={fetchDisputes}
        />
      )}
    </div>
  );
}
