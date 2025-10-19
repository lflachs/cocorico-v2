import { z } from 'zod';

/**
 * Agence BIO API - Producer/Operator data types and validation schemas
 * Based on "API Professionnels BIO" - Official registry of organic operators in France
 */

// Certification states from Agence BIO
export const certificationStateSchema = z.enum([
  'AB',      // Agriculture Biologique (certified)
  'C1',      // Conversion year 1
  'C2',      // Conversion year 2
  'C3',      // Conversion year 3
  'SUSPENDU', // Suspended
  'RETIRE',   // Withdrawn
]);

export type CertificationState = z.infer<typeof certificationStateSchema>;

// Activity types (we'll map these to Agence BIO's internal codes)
export const activityTypeSchema = z.enum([
  'production_vegetale',  // Vegetable/crop production
  'maraichage',          // Market gardening
  'arboriculture',       // Fruit tree cultivation
  'vente_directe',       // Direct sales
  'transformation',      // Processing
  'distribution',        // Distribution/wholesale
  'restauration',        // Restaurant/catering
]);

export type ActivityType = z.infer<typeof activityTypeSchema>;

// Product categories
export const productCategorySchema = z.enum([
  'fruits',
  'legumes',
  'cereales',
  'plantes_aromatiques',
  'viande',
  'produits_laitiers',
  'oeufs',
  'miel',
  'autres',
]);

export type ProductCategory = z.infer<typeof productCategorySchema>;

// Core producer data from Agence BIO
export const producerSchema = z.object({
  producer_id: z.string().describe('Format: ab:<numero_bio>'),
  legal_name: z.string(),
  siret: z.string().optional(),
  numero_bio: z.string().optional(),

  activities: z.array(z.string()),
  products: z.array(z.string()),

  address: z.object({
    street: z.string().optional(),
    postal_code: z.string().optional(),
    city: z.string().optional(),
    department: z.string().optional(),
    region: z.string().optional(),
  }),

  coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),

  certification: z.object({
    certifier: z.string(),
    state: certificationStateSchema,
    certificate_url: z.string().url().optional(),
    engagement_date: z.string().optional(), // ISO date
  }),

  contact: z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    website: z.string().url().optional(),
  }).optional(),
});

export type Producer = z.infer<typeof producerSchema>;

// Search request validation
export const searchProducersSchema = z.object({
  // Geographic filters
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  radius_km: z.number().min(0).max(500).default(50),

  // Alternative geographic filters
  department: z.string().optional(),
  region: z.string().optional(),
  postal_code: z.string().optional(),
  city: z.string().optional(),

  // Activity and product filters
  activity: activityTypeSchema.optional(),
  product_category: z.array(productCategorySchema).optional(),

  // Certification filter
  certification_state: certificationStateSchema.optional(),

  // Search term (legal name, SIRET, etc.)
  search_term: z.string().optional(),

  // Pagination
  page: z.number().int().min(1).default(1),
  page_size: z.number().int().min(1).max(100).default(100), // Increased to 100 for better filtering
});

export type SearchProducersInput = z.infer<typeof searchProducersSchema>;

// Search response
export const searchProducersResponseSchema = z.object({
  items: z.array(producerSchema),
  page: z.number().int(),
  page_size: z.number().int(),
  total: z.number().int(),
  total_pages: z.number().int(),
});

export type SearchProducersResponse = z.infer<typeof searchProducersResponseSchema>;

// Get producer by ID request
export const getProducerByIdSchema = z.object({
  siret: z.string().optional(),
  numero_bio: z.string().optional(),
  legal_name: z.string().optional(),
}).refine(
  (data) => data.siret || data.numero_bio || data.legal_name,
  {
    message: 'At least one of siret, numero_bio, or legal_name must be provided',
  }
);

export type GetProducerByIdInput = z.infer<typeof getProducerByIdSchema>;

// Agence BIO API raw response types (for internal service use)
export interface AgenceBioOperator {
  numeroBio?: string;
  raisonSociale: string;
  siret?: string;
  adressesOperateurs?: Array<{
    lieu?: string;
    codePostal?: string;
    ville?: string;
    departement?: string;
    lat?: number;
    long?: number;
  }>;
  activites?: Array<{
    nom: string;
  }>;
  productions?: Array<{
    nom: string;
    code?: string;
  }>;
  certifications?: Array<{
    organisme?: string;
    etat?: string;
    url?: string;
    dateEngagement?: string;
  }>;
  contact?: {
    email?: string;
    telephonePrincipal?: string;
    siteInternet?: string;
  };
}

export interface AgenceBioSearchResponse {
  items: AgenceBioOperator[];
  numFound: number;
  start: number;
  numPerPage: number;
}
