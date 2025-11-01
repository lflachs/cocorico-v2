'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Mail, Phone, MapPin, MapPinned, Loader2 } from 'lucide-react';
import type { Supplier } from '@prisma/client';
import dynamic from 'next/dynamic';
import { memo } from 'react';

// Dynamically import ProducerSearch to avoid SSR issues with Leaflet
const ProducerSearch = dynamic(
  () => import('@/components/producers/ProducerSearch').then((mod) => ({ default: mod.ProducerSearch })),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Chargement de la carte...</p>
        <div className="w-full max-w-3xl space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    )
  }
);

type ProducteursTabContentProps = {
  suppliers: Supplier[];
};

/**
 * ProducteursTabContent - Shows both existing suppliers and map to find new ones
 */
export const ProducteursTabContent = memo(function ProducteursTabContent({ suppliers }: ProducteursTabContentProps) {
  return (
    <div className="space-y-6">
      {/* Existing Suppliers Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Mes Fournisseurs
          </CardTitle>
          <CardDescription>
            {suppliers.length} fournisseur{suppliers.length !== 1 ? 's' : ''} enregistré{suppliers.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {suppliers.length === 0 ? (
            <div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed">
              <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold mb-2">Aucun fournisseur</h3>
              <p className="text-sm text-muted-foreground">
                Ajoutez vos fournisseurs depuis la page Factures
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {suppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className="p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <h3 className="font-semibold text-gray-900 truncate">{supplier.name}</h3>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        supplier.isActive
                          ? 'bg-green-50 text-green-700 border-green-300'
                          : 'bg-gray-50 text-gray-700 border-gray-300'
                      }
                    >
                      {supplier.isActive ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600">
                    {supplier.contactName && (
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-gray-700 min-w-[60px]">Contact:</span>
                        <span className="truncate">{supplier.contactName}</span>
                      </div>
                    )}
                    {supplier.email && (
                      <div className="flex items-start gap-2">
                        <Mail className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span className="truncate">{supplier.email}</span>
                      </div>
                    )}
                    {supplier.phone && (
                      <div className="flex items-start gap-2">
                        <Phone className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span className="truncate">{supplier.phone}</span>
                      </div>
                    )}
                    {supplier.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-2 text-xs">{supplier.address}</span>
                      </div>
                    )}
                  </div>

                  {supplier.notes && (
                    <div className="mt-3 text-xs text-gray-600 p-2 bg-gray-50 rounded">
                      <p className="italic line-clamp-2">{supplier.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Find New Producers Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPinned className="h-5 w-5 text-green-600" />
            Trouver de nouveaux producteurs
          </CardTitle>
          <CardDescription>
            Recherchez des producteurs bio près de chez vous
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProducerSearch />
        </CardContent>
      </Card>
    </div>
  );
});
