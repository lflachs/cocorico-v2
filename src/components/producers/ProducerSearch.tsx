'use client';

import { useState, useCallback, useEffect } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { Producer, SearchProducersInput, ProductCategory, ActivityType } from '@/lib/validations/producer.schema';
import { ProducerMap } from './ProducerMap';
import { Card, CardContent } from '@/components/ui/card';

interface ProducerSearchProps {
  onProducerSelect?: (producer: Producer) => void;
}

export function ProducerSearch({ onProducerSelect }: ProducerSearchProps) {
  const [productCategory, setProductCategory] = useState<ProductCategory[]>([]);
  const [radius, setRadius] = useState(50);
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [useManualLocation, setUseManualLocation] = useState(false);
  const [producers, setProducers] = useState<Producer[]>([]);
  const [selectedProducer, setSelectedProducer] = useState<Producer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([46.603354, 1.888334]);
  const [mapZoom, setMapZoom] = useState(6);

  // Get user's location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
          setUserLocation(coords);
          setMapCenter(coords);
          setMapZoom(10);
        },
        (error) => {
          console.log('Location access denied or unavailable:', error);
        }
      );
    }
  }, []);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: Record<string, string> = {};

      // Use manual location (city/postal code) OR geolocation
      if (useManualLocation) {
        // Geocode the city/postal code to get coordinates
        let searchLocation = '';
        if (postalCode.trim()) {
          searchLocation = `${postalCode.trim()}, France`;
        } else if (city.trim()) {
          searchLocation = `${city.trim()}, France`;
        } else {
          setError('Veuillez entrer une ville ou un code postal');
          setLoading(false);
          return;
        }

        // Use Nominatim (OpenStreetMap) to geocode
        try {
          const geocodeResponse = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchLocation)}&format=json&limit=1`
          );
          const geocodeData = await geocodeResponse.json();

          if (geocodeData && geocodeData[0]) {
            params.lat = geocodeData[0].lat;
            params.lng = geocodeData[0].lon;
            params.radius_km = radius.toString();
            console.log('[Search] Geocoded location:', searchLocation, 'to', params.lat, params.lng);
          } else {
            // Fallback to client-side filtering if geocoding fails
            if (city.trim()) params.city = city.trim();
            if (postalCode.trim()) params.postal_code = postalCode.trim();
          }
        } catch (geocodeError) {
          console.error('[Search] Geocoding failed:', geocodeError);
          // Fallback to client-side filtering
          if (city.trim()) params.city = city.trim();
          if (postalCode.trim()) params.postal_code = postalCode.trim();
        }
      } else if (userLocation) {
        // Add geolocation
        params.lat = userLocation[0].toString();
        params.lng = userLocation[1].toString();
        params.radius_km = radius.toString();
      } else {
        setError('Veuillez activer la géolocalisation ou entrer une ville manuellement');
        setLoading(false);
        return;
      }

      // Add product category filter - this is the main search criteria
      if (productCategory.length > 0) {
        params.product_category = productCategory.join(',');
      }

      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(`/api/producers/search?${queryString}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Échec de la recherche des producteurs');
      }

      const data = await response.json();
      setProducers(data.items || []);

      // Update map center to show results
      if (data.items && data.items.length > 0) {
        // Find first producer with coordinates
        const firstWithCoords = data.items.find((p: any) => p.coordinates?.lat && p.coordinates?.lng);
        if (firstWithCoords && firstWithCoords.coordinates) {
          console.log('[Search] Zooming to:', firstWithCoords.coordinates);
          setMapCenter([firstWithCoords.coordinates.lat, firstWithCoords.coordinates.lng]);
          setMapZoom(12); // Closer zoom when we have specific results
        } else {
          console.log('[Search] No producers with coordinates found');
        }
      } else {
        // No results found
        setError('Aucun producteur trouvé pour cette recherche');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de la recherche des producteurs');
    } finally {
      setLoading(false);
    }
  }, [productCategory, radius, userLocation, useManualLocation, city, postalCode]);

  const handleProducerClick = (producer: Producer) => {
    setSelectedProducer(producer);
    onProducerSelect?.(producer);

    // Center map on selected producer
    if (producer.coordinates) {
      setMapCenter([producer.coordinates.lat, producer.coordinates.lng]);
      setMapZoom(12);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Trouver des producteurs bio près de chez vous</h3>
              <p className="text-sm text-muted-foreground">
                Recherchez par catégorie de produits pour trouver des producteurs locaux
              </p>
            </div>

            {/* Location Toggle */}
            <div className="flex items-center justify-center gap-4 pb-2 border-b">
              <Button
                type="button"
                variant={!useManualLocation ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUseManualLocation(false)}
                className="gap-2"
              >
                <MapPin className="w-4 h-4" />
                Ma position
              </Button>
              <Button
                type="button"
                variant={useManualLocation ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUseManualLocation(true)}
                className="gap-2"
              >
                <Search className="w-4 h-4" />
                Ville / Code postal
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Product Category */}
              <div className="space-y-2">
                <Label htmlFor="product-category">Que cherchez-vous ?</Label>
                <Select
                  value={productCategory[0] || ''}
                  onValueChange={(value) => setProductCategory(value ? [value as ProductCategory] : [])}
                >
                  <SelectTrigger id="product-category">
                    <SelectValue placeholder="Sélectionnez une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fruits">Fruits</SelectItem>
                    <SelectItem value="legumes">Légumes</SelectItem>
                    <SelectItem value="cereales">Céréales</SelectItem>
                    <SelectItem value="plantes_aromatiques">Plantes aromatiques</SelectItem>
                    <SelectItem value="viande">Viande</SelectItem>
                    <SelectItem value="produits_laitiers">Produits laitiers</SelectItem>
                    <SelectItem value="oeufs">Œufs</SelectItem>
                    <SelectItem value="miel">Miel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Radius (only for geolocation) or City/Postal (for manual) */}
              {!useManualLocation ? (
                <div className="space-y-2">
                  <Label htmlFor="radius">Dans un rayon de</Label>
                  <Select
                    value={radius.toString()}
                    onValueChange={(value) => setRadius(parseInt(value))}
                  >
                    <SelectTrigger id="radius">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 km</SelectItem>
                      <SelectItem value="25">25 km</SelectItem>
                      <SelectItem value="50">50 km</SelectItem>
                      <SelectItem value="100">100 km</SelectItem>
                      <SelectItem value="200">200 km</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="city">Ville</Label>
                    <Input
                      id="city"
                      placeholder="Paris, Lyon, Marseille..."
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postal-code">Code postal (optionnel)</Label>
                    <Input
                      id="postal-code"
                      placeholder="75001"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Search Button */}
          <div className="mt-4 flex items-center gap-2">
            <Button onClick={handleSearch} disabled={loading} className="gap-2">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Recherche...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Rechercher
                </>
              )}
            </Button>

            {userLocation && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                Autour de votre position
              </span>
            )}
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-800 text-sm rounded-md">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Map */}
      <ProducerMap
        key={`${mapCenter[0]}-${mapCenter[1]}-${mapZoom}`}
        producers={producers}
        center={mapCenter}
        zoom={mapZoom}
        onProducerClick={handleProducerClick}
        selectedProducerId={selectedProducer?.producer_id}
        className="h-[500px] w-full rounded-lg shadow-md"
      />

      {/* Results List */}
      {producers.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">
            {producers.length} producteur{producers.length > 1 ? 's' : ''} trouvé{producers.length > 1 ? 's' : ''}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {producers.map((producer) => (
              <Card
                key={producer.producer_id}
                className={`cursor-pointer transition-shadow hover:shadow-md ${
                  selectedProducer?.producer_id === producer.producer_id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => handleProducerClick(producer)}
              >
                <CardContent className="pt-6">
                  <h4 className="font-semibold text-sm mb-2">{producer.legal_name}</h4>

                  {producer.address.city && (
                    <p className="text-xs text-muted-foreground mb-2">
                      {producer.address.postal_code} {producer.address.city}
                    </p>
                  )}

                  {producer.activities.length > 0 && (
                    <div className="text-xs mb-2">
                      <span className="font-medium">Activités:</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {producer.activities.slice(0, 2).map((act, idx) => (
                          <span key={idx} className="bg-gray-100 px-2 py-0.5 rounded">
                            {act}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {producer.products.length > 0 && (
                    <div className="text-xs mb-2">
                      <span className="font-medium">Produits:</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {producer.products.slice(0, 3).map((prod, idx) => (
                          <span key={idx} className="bg-green-50 text-green-700 px-2 py-0.5 rounded">
                            {prod}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t mt-2">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs ${
                        producer.certification.state === 'AB'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {producer.certification.state}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
