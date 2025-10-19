import type {
  AgenceBioOperator,
  AgenceBioSearchResponse,
  Producer,
  SearchProducersInput,
  SearchProducersResponse,
  GetProducerByIdInput,
  ActivityType,
  ProductCategory,
} from '@/lib/validations/producer.schema';

/**
 * Agence BIO API Service
 *
 * Wrapper for the official "API Professionnels BIO" - French organic operators registry
 *
 * API Documentation: https://www.data.gouv.fr/fr/datasets/agence-bio-api-professionnels-bio/
 *
 * Rate Limit: 50 requests/second/IP
 * Access: Open (no API key required based on public documentation)
 */
class AgenceBioService {
  private baseUrl: string;
  private requestCache: Map<string, { data: any; timestamp: number }>;
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes cache

  constructor() {
    // Agence BIO API base URL
    // Official endpoint from data.gouv.fr documentation
    // https://www.data.gouv.fr/dataservices/api-professionnels-bio/
    this.baseUrl = process.env.AGENCE_BIO_API_URL || 'https://opendata.agencebio.org';
    this.requestCache = new Map();
  }

  /**
   * Search for organic producers using various filters
   */
  async searchProducers(params: SearchProducersInput): Promise<SearchProducersResponse> {
    const cacheKey = this.getCacheKey('search', params);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Build query parameters for Agence BIO API
      const queryParams = new URLSearchParams();

      // Geographic filters
      if (params.lat && params.lng) {
        queryParams.append('lat', params.lat.toString());
        queryParams.append('lng', params.lng.toString());
        queryParams.append('radius', (params.radius_km * 1000).toString()); // Convert km to meters
      }

      if (params.department) {
        queryParams.append('departement', params.department);
      }

      if (params.region) {
        queryParams.append('region', params.region);
      }

      // Note: The API's codePostal and commune parameters don't work properly
      // We'll do client-side filtering instead

      // Only add department/region for broader geographic filtering
      // if (params.postal_code) {
      //   queryParams.append('codePostal', params.postal_code);
      // }
      // if (params.city) {
      //   queryParams.append('commune', params.city);
      // }

      // Activity filter
      if (params.activity) {
        const activityCode = this.mapActivityToAgenceBioCode(params.activity);
        queryParams.append('activite', activityCode);
      }

      // Product categories filter
      if (params.product_category && params.product_category.length > 0) {
        const productCodes = params.product_category
          .map(cat => this.mapProductCategoryToAgenceBioCode(cat))
          .join(',');
        queryParams.append('produit', productCodes);
      }

      // Certification state
      if (params.certification_state) {
        queryParams.append('etat', params.certification_state);
      }

      // Search term
      if (params.search_term) {
        queryParams.append('q', params.search_term);
      }

      // Pagination
      const start = (params.page - 1) * params.page_size;
      queryParams.append('start', start.toString());
      queryParams.append('rows', params.page_size.toString());

      // Make request to Agence BIO API
      const url = `${this.baseUrl}/api/gouv/operateurs?${queryParams.toString()}`;

      console.log('[Agence BIO] Search URL:', url);

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Cocorico-App/1.0',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Agence BIO] API Error:', response.status, errorText);
        throw new Error(`Agence BIO API error: ${response.status} ${response.statusText}`);
      }

      const rawData = await response.json();
      console.log('[Agence BIO] Raw API response:', JSON.stringify(rawData).substring(0, 500));

      // The API might return different structures, handle both cases
      let data: AgenceBioSearchResponse;

      if (Array.isArray(rawData)) {
        // Direct array response
        data = {
          items: rawData,
          numFound: rawData.length,
          start: 0,
          numPerPage: rawData.length,
        };
      } else if (rawData.items && Array.isArray(rawData.items)) {
        // Wrapped response with items array - this is what Agence BIO uses
        data = {
          items: rawData.items,
          numFound: rawData.nbTotal || rawData.numFound || rawData.items.length,
          start: rawData.start || 0,
          numPerPage: rawData.numPerPage || rawData.items.length,
        };
      } else if (rawData.operateurs && Array.isArray(rawData.operateurs)) {
        // Alternative field name
        data = {
          items: rawData.operateurs,
          numFound: rawData.nbTotal || rawData.numFound || rawData.operateurs.length,
          start: rawData.start || 0,
          numPerPage: rawData.numPerPage || rawData.operateurs.length,
        };
      } else {
        // Unknown structure, log it
        console.error('[Agence BIO] Unexpected response structure:', rawData);
        data = {
          items: [],
          numFound: 0,
          start: 0,
          numPerPage: 0,
        };
      }

      console.log('[Agence BIO] Search results:', data.numFound, 'found,', data.items?.length, 'items in response');

      // Client-side filter for postal code if needed (API might not filter properly)
      let filteredItems = data.items;
      if (params.postal_code) {
        filteredItems = data.items.filter((item) => {
          const addresses = item.adressesOperateurs || [];
          return addresses.some((addr) => addr.codePostal === params.postal_code);
        });
        console.log('[Agence BIO] Filtered by postal code:', params.postal_code, '- from', data.items.length, 'to', filteredItems.length);
      }

      // Client-side filter for city if needed
      if (params.city) {
        const cityLower = params.city.toLowerCase();
        filteredItems = filteredItems.filter((item) => {
          const addresses = item.adressesOperateurs || [];
          return addresses.some((addr) => addr.ville?.toLowerCase().includes(cityLower));
        });
        console.log('[Agence BIO] Filtered by city:', params.city, '- result count:', filteredItems.length);
      }

      // Normalize response to our schema
      const normalizedResponse: SearchProducersResponse = {
        items: filteredItems.map(op => this.normalizeOperator(op)),
        page: params.page,
        page_size: params.page_size,
        total: filteredItems.length,
        total_pages: Math.ceil(filteredItems.length / params.page_size),
      };

      this.setCache(cacheKey, normalizedResponse);
      return normalizedResponse;

    } catch (error) {
      console.error('Error searching Agence BIO producers:', error);
      throw new Error('Failed to search producers. Please try again later.');
    }
  }

  /**
   * Get a specific producer by SIRET, numéro BIO, or legal name
   */
  async getProducerById(params: GetProducerByIdInput): Promise<Producer | null> {
    const cacheKey = this.getCacheKey('getById', params);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const queryParams = new URLSearchParams();

      if (params.siret) {
        queryParams.append('siret', params.siret);
      } else if (params.numero_bio) {
        queryParams.append('numeroBio', params.numero_bio);
      } else if (params.legal_name) {
        queryParams.append('raisonSociale', params.legal_name);
      }

      const url = `${this.baseUrl}/operateur?${queryParams.toString()}`;
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Cocorico-App/1.0',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Agence BIO API error: ${response.status} ${response.statusText}`);
      }

      const data: AgenceBioOperator = await response.json();
      const normalized = this.normalizeOperator(data);

      this.setCache(cacheKey, normalized);
      return normalized;

    } catch (error) {
      console.error('Error fetching Agence BIO producer:', error);
      throw new Error('Failed to fetch producer details. Please try again later.');
    }
  }

  /**
   * Normalize Agence BIO operator data to our schema
   */
  private normalizeOperator(operator: AgenceBioOperator): Producer {
    const mainAddress = operator.adressesOperateurs?.[0];
    const mainCertification = operator.certifications?.[0];

    return {
      producer_id: `ab:${operator.numeroBio || operator.siret || 'unknown'}`,
      legal_name: operator.raisonSociale,
      siret: operator.siret,
      numero_bio: operator.numeroBio,

      activities: operator.activites?.map(a => a.nom) || [],
      products: operator.productions?.map(p => p.nom) || [],

      address: {
        street: mainAddress?.lieu,
        postal_code: mainAddress?.codePostal,
        city: mainAddress?.ville,
        department: mainAddress?.departement,
        region: undefined, // May not be directly available
      },

      coordinates: mainAddress?.lat && mainAddress?.long ? {
        lat: mainAddress.lat,
        lng: mainAddress.long,
      } : undefined,

      certification: {
        certifier: mainCertification?.organisme || 'Unknown',
        state: this.normalizeCertificationState(mainCertification?.etat),
        certificate_url: mainCertification?.url,
        engagement_date: mainCertification?.dateEngagement,
      },

      contact: operator.contact ? {
        email: operator.contact.email,
        phone: operator.contact.telephonePrincipal,
        website: operator.contact.siteInternet,
      } : undefined,
    };
  }

  /**
   * Map our activity types to Agence BIO activity codes
   */
  private mapActivityToAgenceBioCode(activity: ActivityType): string {
    const mapping: Record<ActivityType, string> = {
      'production_vegetale': 'PRODUCTION_VEGETALE',
      'maraichage': 'MARAICHAGE',
      'arboriculture': 'ARBORICULTURE',
      'vente_directe': 'VENTE_DIRECTE',
      'transformation': 'TRANSFORMATION',
      'distribution': 'DISTRIBUTION',
      'restauration': 'RESTAURATION',
    };
    return mapping[activity] || activity;
  }

  /**
   * Map our product categories to Agence BIO product codes
   */
  private mapProductCategoryToAgenceBioCode(category: ProductCategory): string {
    const mapping: Record<ProductCategory, string> = {
      'fruits': 'FRUITS',
      'legumes': 'LEGUMES',
      'cereales': 'CEREALES',
      'plantes_aromatiques': 'PLANTES_AROMATIQUES',
      'viande': 'VIANDE',
      'produits_laitiers': 'PRODUITS_LAITIERS',
      'oeufs': 'OEUFS',
      'miel': 'MIEL',
      'autres': 'AUTRES',
    };
    return mapping[category] || category;
  }

  /**
   * Normalize certification state from Agence BIO
   */
  private normalizeCertificationState(state?: string): 'AB' | 'C1' | 'C2' | 'C3' | 'SUSPENDU' | 'RETIRE' {
    if (!state) return 'AB';

    const upperState = state.toUpperCase();
    if (['AB', 'C1', 'C2', 'C3', 'SUSPENDU', 'RETIRE'].includes(upperState)) {
      return upperState as any;
    }

    return 'AB'; // Default
  }

  /**
   * Simple caching mechanism to reduce API calls
   */
  private getCacheKey(operation: string, params: any): string {
    return `${operation}:${JSON.stringify(params)}`;
  }

  private getFromCache(key: string): any | null {
    const cached = this.requestCache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.cacheTTL;
    if (isExpired) {
      this.requestCache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any): void {
    // Limit cache size to prevent memory issues
    if (this.requestCache.size > 100) {
      const firstKey = this.requestCache.keys().next().value;
      if (firstKey) {
        this.requestCache.delete(firstKey);
      }
    }

    this.requestCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear the cache (useful for testing or forcing fresh data)
   */
  clearCache(): void {
    this.requestCache.clear();
  }
}

// Export singleton instance
export const agenceBioService = new AgenceBioService();
