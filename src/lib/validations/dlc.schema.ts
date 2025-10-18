import { z } from "zod";

export const dlcSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  expirationDate: z.coerce.date({
    required_error: "Expiration date is required",
  }),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  unit: z.enum(["KG", "G", "L", "ML", "CL", "PC", "BUNCH", "CLOVE"]),
  batchNumber: z.string().optional(),
  supplier: z.string().optional(),
  status: z.enum(["ACTIVE", "CONSUMED", "EXPIRED", "DISCARDED"]).default("ACTIVE"),
  imageFilename: z.string().optional(),
  ocrRawData: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

export const updateDlcSchema = dlcSchema.partial();

export type DlcInput = z.infer<typeof dlcSchema>;
export type UpdateDlcInput = z.infer<typeof updateDlcSchema>;
