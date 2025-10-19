"use client";

import { useState, useEffect } from "react";
import { Plus, Upload, Calendar, Package, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import Link from "next/link";

type DlcItem = {
  id: string;
  expirationDate: string;
  quantity: number;
  unit: string;
  status: string;
  batchNumber?: string;
  supplier?: string;
  product: {
    id: string;
    name: string;
  };
};

export default function DlcPage() {
  const [dlcs, setDlcs] = useState<DlcItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "expiring">("active");

  useEffect(() => {
    fetchDlcs();
  }, [filter]);

  const fetchDlcs = async () => {
    try {
      setLoading(true);
      const url = filter === "expiring"
        ? "/api/dlc?filter=upcoming&days=7"
        : "/api/dlc";
      const response = await fetch(url);
      const data = await response.json();

      const dlcArray = Array.isArray(data) ? data : [];

      if (filter === "active") {
        setDlcs(dlcArray.filter((d: DlcItem) => d.status === "ACTIVE"));
      } else {
        setDlcs(dlcArray);
      }
    } catch (error) {
      console.error("Error fetching DLCs:", error);
      setDlcs([]);
    } finally {
      setLoading(false);
    }
  };

  const getDaysUntilExpiration = (expirationDate: string) => {
    const now = new Date();
    const expDate = new Date(expirationDate);
    const diffTime = expDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusBadge = (dlc: DlcItem) => {
    const days = getDaysUntilExpiration(dlc.expirationDate);

    if (dlc.status === "CONSUMED") {
      return <Badge variant="secondary">Consumed</Badge>;
    }
    if (dlc.status === "DISCARDED") {
      return <Badge variant="secondary">Discarded</Badge>;
    }
    if (dlc.status === "EXPIRED" || days <= 0) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    if (days === 1) {
      return <Badge variant="destructive">Tomorrow</Badge>;
    }
    if (days <= 3) {
      return <Badge className="bg-orange-500">Urgent ({days}d)</Badge>;
    }
    if (days <= 7) {
      return <Badge className="bg-yellow-500">{days} days</Badge>;
    }
    return <Badge variant="secondary">{days} days</Badge>;
  };

  const handleConsumed = async (id: string) => {
    try {
      await fetch(`/api/dlc/${id}/consume`, { method: "POST" });
      fetchDlcs();
    } catch (error) {
      console.error("Error marking as consumed:", error);
    }
  };

  const handleDiscarded = async (id: string) => {
    try {
      await fetch(`/api/dlc/${id}/discard`, { method: "POST" });
      fetchDlcs();
    } catch (error) {
      console.error("Error marking as discarded:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with gradient background */}
      <PageHeader
        title="Best Before Dates"
        subtitle="Track product expiration dates"
        icon={Calendar}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                variant={filter === "active" ? "default" : "outline"}
                onClick={() => setFilter("active")}
                className="cursor-pointer"
              >
                Active
              </Button>
              <Button
                variant={filter === "expiring" ? "default" : "outline"}
                onClick={() => setFilter("expiring")}
                className="cursor-pointer"
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                Expiring Soon
              </Button>
              <Button
                variant={filter === "all" ? "default" : "outline"}
                onClick={() => setFilter("all")}
                className="cursor-pointer"
              >
                All
              </Button>
            </div>
            <Link href="/dlc/upload">
              <Button className="gap-2 cursor-pointer">
                <Upload className="h-4 w-4" />
                Scan Label
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>

          {loading ? (
            <div className="py-8">
              <p className="text-center text-gray-500">Loading...</p>
            </div>
          ) : dlcs.length === 0 ? (
            <div className="py-8">
              <div className="text-center">
                <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-gray-500">No expiration dates found</p>
                <Link href="/dlc/upload">
                  <Button className="mt-4 cursor-pointer" variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    Scan your first label
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {dlcs.map((dlc) => (
                <div key={dlc.id} className="border rounded-lg p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
                        <Package className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{dlc.product.name}</h3>
                        <div className="mt-1 flex items-center gap-4 text-sm text-gray-600">
                          <span>
                            {dlc.quantity} {dlc.unit}
                          </span>
                          <span>•</span>
                          <span>
                            Expires: {new Date(dlc.expirationDate).toLocaleDateString()}
                          </span>
                          {dlc.batchNumber && (
                            <>
                              <span>•</span>
                              <span>Lot: {dlc.batchNumber}</span>
                            </>
                          )}
                          {dlc.supplier && (
                            <>
                              <span>•</span>
                              <span>{dlc.supplier}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(dlc)}
                      {dlc.status === "ACTIVE" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleConsumed(dlc.id)}
                            className="cursor-pointer"
                          >
                            Mark Consumed
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDiscarded(dlc.id)}
                            className="cursor-pointer"
                          >
                            Discard
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
