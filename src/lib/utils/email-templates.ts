/**
 * Email Templates for Disputes and Orders
 */

type DisputeEmailParams = {
  supplierName: string;
  supplierEmail: string;
  billDate: string;
  disputes: Array<{
    productName: string;
    type: string;
    description: string;
    quantity: number;
    unit: string;
  }>;
  totalAmount?: number;
  restaurantName?: string;
};

/**
 * Generate a mailto link for dispute notification
 */
export function generateDisputeMailto(params: DisputeEmailParams): string {
  const {
    supplierName,
    supplierEmail,
    billDate,
    disputes,
    totalAmount,
    restaurantName = 'Notre Restaurant',
  } = params;

  // Email subject
  const subject = `Litige sur livraison du ${billDate}`;

  // Email body
  const disputeList = disputes
    .map((dispute, index) => {
      const typeLabel = getDisputeTypeLabel(dispute.type);
      return `${index + 1}. ${dispute.productName} (${dispute.quantity} ${dispute.unit})
   Problème: ${typeLabel}
   ${dispute.description ? `   Détails: ${dispute.description}` : ''}`;
    })
    .join('\n\n');

  const body = `Bonjour ${supplierName},

Nous avons constaté des problèmes avec notre livraison du ${billDate}${totalAmount ? ` (montant: ${totalAmount.toFixed(2)} €)` : ''}.

LITIGES À TRAITER:

${disputeList}

Pourriez-vous svp nous confirmer la prise en compte de ces litiges et les actions correctives prévues ?

Merci de votre collaboration.

Cordialement,
${restaurantName}`;

  // Encode for mailto
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);

  return `mailto:${supplierEmail}?subject=${encodedSubject}&body=${encodedBody}`;
}

/**
 * Get human-readable label for dispute type
 */
function getDisputeTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    MISSING: 'Produit manquant',
    DAMAGED: 'Produit endommagé',
    WRONG_QUANTITY: 'Mauvaise quantité',
    WRONG_PRODUCT: 'Mauvais produit',
    QUALITY: 'Problème de qualité',
  };
  return labels[type] || type;
}

/**
 * Generate plain text dispute email for copying
 */
export function generateDisputeEmailText(params: DisputeEmailParams): {
  subject: string;
  body: string;
} {
  const {
    supplierName,
    billDate,
    disputes,
    totalAmount,
    restaurantName = 'Notre Restaurant',
  } = params;

  const subject = `Litige sur livraison du ${billDate}`;

  const disputeList = disputes
    .map((dispute, index) => {
      const typeLabel = getDisputeTypeLabel(dispute.type);
      return `${index + 1}. ${dispute.productName} (${dispute.quantity} ${dispute.unit})
   Problème: ${typeLabel}
   ${dispute.description ? `   Détails: ${dispute.description}` : ''}`;
    })
    .join('\n\n');

  const body = `Bonjour ${supplierName},

Nous avons constaté des problèmes avec notre livraison du ${billDate}${totalAmount ? ` (montant: ${totalAmount.toFixed(2)} €)` : ''}.

LITIGES À TRAITER:

${disputeList}

Pourriez-vous svp nous confirmer la prise en compte de ces litiges et les actions correctives prévues ?

Merci de votre collaboration.

Cordialement,
${restaurantName}`;

  return { subject, body };
}
