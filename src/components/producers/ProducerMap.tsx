'use client';

import { useEffect, useState } from 'react';
import type { Producer } from '@/lib/validations/producer.schema';

interface ProducerMapProps {
  producers: Producer[];
  center?: [number, number];
  zoom?: number;
  onProducerClick?: (producer: Producer) => void;
  selectedProducerId?: string;
  className?: string;
}

/**
 * Map component displaying producers on OpenStreetMap
 * Fully client-side rendered to avoid SSR issues with Leaflet
 */
export function ProducerMap({
  producers,
  center = [46.603354, 1.888334], // Center of France
  zoom = 6,
  onProducerClick,
  selectedProducerId,
  className = 'h-[500px] w-full rounded-lg',
}: ProducerMapProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [MapComponents, setMapComponents] = useState<any>(null);
  const [defaultIcon, setDefaultIcon] = useState<any>(null);

  useEffect(() => {
    // Only load map components on client side
    if (typeof window === 'undefined') return;

    let mounted = true;

    const loadMap = async () => {
      try {
        // Import Leaflet
        const L = await import('leaflet');

        // Import marker icons
        const markerIcon = await import('leaflet/dist/images/marker-icon.png');
        const markerIcon2x = await import('leaflet/dist/images/marker-icon-2x.png');
        const markerShadow = await import('leaflet/dist/images/marker-shadow.png');

        // Import CSS
        await import('leaflet/dist/leaflet.css');

        if (!mounted) return;

        // Get icon URLs and log them
        const iconUrl = markerIcon.default?.src || markerIcon.default;
        const iconRetinaUrl = markerIcon2x.default?.src || markerIcon2x.default;
        const shadowUrl = markerShadow.default?.src || markerShadow.default;

        console.log('[Map] Icon URLs:', { iconUrl, iconRetinaUrl, shadowUrl });
        console.log('[Map] markerIcon.default:', markerIcon.default);

        // Ensure we have valid URLs
        if (!iconUrl || typeof iconUrl !== 'string') {
          console.error('[Map] Invalid iconUrl:', iconUrl);
          throw new Error('Failed to load marker icons - iconUrl is not a valid string');
        }

        // Create a custom default icon explicitly
        const customIcon = L.default.icon({
          iconUrl,
          iconRetinaUrl,
          shadowUrl,
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        });

        console.log('[Map] Created custom icon:', customIcon);
        console.log('[Map] Icon options:', customIcon.options);

        // Import react-leaflet
        const reactLeaflet = await import('react-leaflet');

        if (!mounted) return;

        // Store components
        setMapComponents({
          MapContainer: reactLeaflet.MapContainer,
          TileLayer: reactLeaflet.TileLayer,
          Marker: reactLeaflet.Marker,
          Popup: reactLeaflet.Popup,
        });

        setDefaultIcon(customIcon);
        setIsLoaded(true);
      } catch (error) {
        console.error('Error loading map:', error);
      }
    };

    loadMap();

    return () => {
      mounted = false;
    };
  }, []);

  // Show loading state
  if (!isLoaded || !MapComponents || !defaultIcon) {
    return (
      <div className={className}>
        <div className="flex h-full items-center justify-center bg-gray-100 rounded-lg">
          <p className="text-gray-500">Chargement de la carte...</p>
        </div>
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup } = MapComponents;

  // Filter producers with valid coordinates
  const producersWithCoords = producers.filter(
    (p) => p.coordinates?.lat && p.coordinates?.lng
  );

  return (
    <div className={className}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {producersWithCoords.map((producer) => {
          if (!producer.coordinates) return null;

          return (
            <Marker
              key={producer.producer_id}
              position={[producer.coordinates.lat, producer.coordinates.lng]}
              icon={defaultIcon}
              eventHandlers={{
                click: () => onProducerClick?.(producer),
              }}
            >
              <Popup>
                <div className="min-w-[200px] space-y-2">
                  <h3 className="font-semibold text-sm">{producer.legal_name}</h3>

                  {producer.address.city && (
                    <p className="text-xs text-gray-600">
                      {producer.address.postal_code} {producer.address.city}
                    </p>
                  )}

                  {producer.activities.length > 0 && (
                    <div className="text-xs">
                      <span className="font-medium">Activités:</span>
                      <ul className="mt-1 ml-2 list-disc list-inside">
                        {producer.activities.slice(0, 3).map((activity, idx) => (
                          <li key={idx}>{activity}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {producer.products.length > 0 && (
                    <div className="text-xs">
                      <span className="font-medium">Produits:</span>
                      <ul className="mt-1 ml-2 list-disc list-inside">
                        {producer.products.slice(0, 3).map((product, idx) => (
                          <li key={idx}>{product}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="pt-2 border-t text-xs">
                    <span
                      className={`inline-block px-2 py-1 rounded ${
                        producer.certification.state === 'AB'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {producer.certification.state}
                    </span>
                    <span className="ml-2 text-gray-600">
                      {producer.certification.certifier}
                    </span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
