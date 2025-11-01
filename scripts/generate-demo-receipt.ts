/**
 * Generate Demo Sales Receipt PDF
 *
 * Creates a realistic restaurant receipt PDF that can be imported
 * into the sales panel for testing the OCR flow.
 *
 * Usage: npx tsx scripts/generate-demo-receipt.ts
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// Demo sales data - one day's sales for testing
const demoReceipt = {
  restaurantName: 'Sens Unique',
  address: '12 Rue de la Gare, 75015 Paris',
  phone: '01 45 67 89 01',
  date: new Date(),
  items: [
    { name: "L'onglet de bœuf « Black Angus »", quantity: 3, unitPrice: 28.00 },
    { name: 'Le filet de daurade royale', quantity: 2, unitPrice: 26.00 },
    { name: 'La poularde Arnaud Tauzin', quantity: 2, unitPrice: 27.00 },
    { name: 'Le végétal', quantity: 1, unitPrice: 24.00 },
    { name: 'Les grosses gambas « black tiger »', quantity: 2, unitPrice: 32.00 },
    { name: 'Le véritable mille-feuille', quantity: 3, unitPrice: 12.00 },
    { name: 'Le chocolat « Xoco »', quantity: 4, unitPrice: 13.00 },
    { name: 'Les primeurs de fraises', quantity: 2, unitPrice: 11.00 },
  ],
};

function generateReceiptPDF(outputPath: string) {
  const doc = new PDFDocument({
    size: [226.77, 800], // 80mm width (thermal receipt width)
    margin: 20,
  });

  // Create output stream
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  // Header
  doc.fontSize(16).font('Helvetica-Bold').text(demoReceipt.restaurantName, { align: 'center' });
  doc.fontSize(9).font('Helvetica').text(demoReceipt.address, { align: 'center' });
  doc.text(`Tel: ${demoReceipt.phone}`, { align: 'center' });

  doc.moveDown();
  doc.fontSize(8).text('─'.repeat(40), { align: 'center' });
  doc.moveDown();

  // Date and time
  const dateStr = demoReceipt.date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeStr = demoReceipt.date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  doc.fontSize(9).text(`Date: ${dateStr}`, { align: 'left' });
  doc.text(`Heure: ${timeStr}`, { align: 'left' });
  doc.text(`Ticket: #${Math.floor(Math.random() * 9000) + 1000}`, { align: 'left' });

  doc.moveDown();
  doc.fontSize(8).text('─'.repeat(40), { align: 'center' });
  doc.moveDown();

  // Items
  doc.fontSize(9).font('Helvetica-Bold').text('Articles', { align: 'left' });
  doc.moveDown(0.5);

  let total = 0;

  demoReceipt.items.forEach((item) => {
    const itemTotal = item.quantity * item.unitPrice;
    total += itemTotal;

    // Item name
    doc.fontSize(9).font('Helvetica').text(item.name, { align: 'left' });

    // Quantity x Unit Price = Total
    const qtyLine = `  ${item.quantity} x ${item.unitPrice.toFixed(2)}€`;
    const totalLine = `${itemTotal.toFixed(2)}€`;

    // Position total on the right
    const lineY = doc.y;
    doc.text(qtyLine, 20, lineY, { width: 120, align: 'left' });
    doc.text(totalLine, 20, lineY, { width: 180, align: 'right' });

    doc.moveDown(0.3);
  });

  doc.moveDown();
  doc.fontSize(8).text('─'.repeat(40), { align: 'center' });
  doc.moveDown();

  // Subtotal
  const subtotalY = doc.y;
  doc.fontSize(10).font('Helvetica').text('Sous-total:', 20, subtotalY, { width: 120, align: 'left' });
  doc.text(`${total.toFixed(2)}€`, 20, subtotalY, { width: 180, align: 'right' });
  doc.moveDown();

  // TVA
  const tva = total * 0.1; // 10% VAT
  const tvaY = doc.y;
  doc.fontSize(9).text('TVA 10%:', 20, tvaY, { width: 120, align: 'left' });
  doc.text(`${tva.toFixed(2)}€`, 20, tvaY, { width: 180, align: 'right' });
  doc.moveDown();

  // Total
  const finalTotal = total + tva;
  const totalY = doc.y;
  doc.fontSize(12).font('Helvetica-Bold').text('TOTAL:', 20, totalY, { width: 120, align: 'left' });
  doc.text(`${finalTotal.toFixed(2)}€`, 20, totalY, { width: 180, align: 'right' });

  doc.moveDown(1.5);
  doc.fontSize(8).text('═'.repeat(40), { align: 'center' });
  doc.moveDown();

  // Payment method
  doc.fontSize(9).font('Helvetica').text('Mode de paiement: Carte Bancaire', { align: 'center' });
  doc.moveDown();

  // Footer
  doc.fontSize(8).text('─'.repeat(40), { align: 'center' });
  doc.moveDown();
  doc.fontSize(8).text('Merci de votre visite !', { align: 'center' });
  doc.text('À bientôt chez Sens Unique', { align: 'center' });
  doc.moveDown();
  doc.fontSize(7).text('TVA: FR12345678901', { align: 'center' });

  // Finalize PDF
  doc.end();

  return new Promise<void>((resolve, reject) => {
    stream.on('finish', () => {
      console.log('✅ PDF generated successfully!');
      console.log(`📄 File: ${outputPath}`);
      console.log(`📊 Total items: ${demoReceipt.items.length}`);
      console.log(`💰 Total amount: ${finalTotal.toFixed(2)}€`);
      console.log(`📅 Date: ${dateStr} ${timeStr}`);
      console.log('\n🎯 Ready to import in the Sales panel!');
      resolve();
    });
    stream.on('error', reject);
  });
}

// Main execution
async function main() {
  console.log('🎬 Generating demo sales receipt PDF...\n');

  const outputDir = path.join(process.cwd(), 'demo-receipts');

  // Create directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().split('T')[0];
  const outputPath = path.join(outputDir, `receipt-demo-${timestamp}.pdf`);

  await generateReceiptPDF(outputPath);

  console.log('\n📝 Next steps:');
  console.log('1. Go to /sales in your app');
  console.log('2. Click "Enregistrer des ventes"');
  console.log('3. Upload the generated PDF');
  console.log('4. Review and confirm the extracted dishes\n');
}

main()
  .catch((error) => {
    console.error('❌ Error generating receipt:', error);
    process.exit(1);
  });
