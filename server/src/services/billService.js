const QRCode = require('qrcode');

/**
 * Generate bill image as SVG
 */
async function generateBillImage(billData, shopData) {
  const {
    billNumber,
    billDate,
    customerName,
    customerPhone,
    customerAddress,
    items,
    subtotal,
    totalTax,
    totalDiscount,
    shippingCharges,
    otherCharges,
    roundOff,
    grandTotal,
    amountPaid,
    amountDue,
    paymentStatus,
    notes,
    termsAndConditions,
    verificationCode
  } = billData;

  const {
    shopName,
    phone,
    address,
    upiId
  } = shopData;

  // Generate QR code for verification
  const qrUrl = `${process.env.CLIENT_URL || 'https://desklite.com'}/bill/${verificationCode}`;
  let qrDataUrl = '';
  
  try {
    qrDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 120,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error('QR generation error:', err);
  }

  // Format date
  const formattedDate = new Date(billDate).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  // Build items rows
  let itemsHTML = '';
  let yPosition = 380;
  
  items.forEach((item, index) => {
    const itemTotal = item.total || (item.price * item.quantity - (item.discount || 0));
    
    itemsHTML += `
      <text x="30" y="${yPosition}" font-size="14" font-family="Arial, sans-serif" fill="#1f2937">${index + 1}</text>
      <text x="60" y="${yPosition}" font-size="14" font-family="Arial, sans-serif" fill="#1f2937">${item.name}</text>
      <text x="400" y="${yPosition}" text-anchor="middle" font-size="14" font-family="Arial, sans-serif" fill="#1f2937">${item.quantity} ${item.unit || 'pcs'}</text>
      <text x="500" y="${yPosition}" text-anchor="end" font-size="14" font-family="Arial, sans-serif" fill="#1f2937">&#x20B9;${item.price.toFixed(2)}</text>
      <text x="650" y="${yPosition}" text-anchor="end" font-size="14" font-family="Arial, sans-serif" fill="#1f2937">&#x20B9;${itemTotal.toFixed(2)}</text>
    `;
    
    yPosition += 30;
  });

  // Calculate summary position
  const summaryY = yPosition + 40;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="700" height="${summaryY + 350}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .header { font-size: 24px; font-weight: bold; fill: #1f2937; }
      .label { font-size: 12px; fill: #6b7280; }
      .value { font-size: 14px; fill: #1f2937; font-weight: 600; }
      .section-title { font-size: 16px; font-weight: bold; fill: #1f2937; }
      .divider { stroke: #e5e7eb; stroke-width: 1; }
      .total-box { fill: #dbeafe; }
      .total-label { font-size: 18px; font-weight: bold; fill: #1e40af; }
      .total-value { font-size: 24px; font-weight: bold; fill: #1e40af; }
    </style>
  </defs>
  
  <!-- Background -->
  <rect width="700" height="100%" fill="#ffffff"/>
  
  <!-- Header -->
  <rect width="700" height="80" fill="#2563eb"/>
  <text x="30" y="35" class="header" fill="#ffffff">${shopName || 'Shop Name'}</text>
  <text x="30" y="60" font-size="12" fill="#e0e7ff">${address || ''}</text>
  <text x="670" y="35" text-anchor="end" font-size="14" font-weight="600" fill="#ffffff">TAX INVOICE</text>
  <text x="670" y="60" text-anchor="end" font-size="12" fill="#e0e7ff">${phone || ''}</text>
  
  <!-- Bill Number & Date -->
  <rect x="20" y="100" width="320" height="70" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
  <text x="30" y="120" class="label">BILL NO.</text>
  <text x="30" y="140" class="value">${billNumber}</text>
  
  <rect x="360" y="100" width="320" height="70" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
  <text x="370" y="120" class="label">DATE</text>
  <text x="370" y="140" class="value">${formattedDate}</text>
  
  <!-- Customer Details -->
  <text x="30" y="200" class="section-title">BILLED TO:</text>
  <text x="30" y="225" class="value">${customerName}</text>
  ${customerPhone ? `<text x="30" y="245" font-size="12" fill="#6b7280">${customerPhone}</text>` : ''}
  ${customerAddress ? `<text x="30" y="265" font-size="12" fill="#6b7280">${customerAddress}</text>` : ''}
  
  <!-- Items Table Header -->
  <line x1="20" y1="310" x2="680" y2="310" class="divider"/>
  <text x="30" y="330" font-size="12" font-weight="600" fill="#6b7280">#</text>
  <text x="60" y="330" font-size="12" font-weight="600" fill="#6b7280">ITEM</text>
  <text x="400" y="330" text-anchor="middle" font-size="12" font-weight="600" fill="#6b7280">QTY</text>
  <text x="500" y="330" text-anchor="end" font-size="12" font-weight="600" fill="#6b7280">RATE</text>
  <text x="650" y="330" text-anchor="end" font-size="12" font-weight="600" fill="#6b7280">AMOUNT</text>
  <line x1="20" y1="340" x2="680" y2="340" class="divider"/>
  
  <!-- Items -->
  ${itemsHTML}
  
  <line x1="20" y1="${summaryY - 20}" x2="680" y2="${summaryY - 20}" class="divider"/>
  
  <!-- Summary -->
  <text x="450" y="${summaryY}" class="label">Subtotal:</text>
  <text x="670" y="${summaryY}" text-anchor="end" class="value">&#x20B9;${subtotal.toFixed(2)}</text>
  
  ${totalDiscount > 0 ? `
  <text x="450" y="${summaryY + 25}" class="label">Discount:</text>
  <text x="670" y="${summaryY + 25}" text-anchor="end" class="value" fill="#dc2626">- &#x20B9;${totalDiscount.toFixed(2)}</text>
  ` : ''}
  
  ${totalTax > 0 ? `
  <text x="450" y="${summaryY + (totalDiscount > 0 ? 50 : 25)}" class="label">Tax:</text>
  <text x="670" y="${summaryY + (totalDiscount > 0 ? 50 : 25)}" text-anchor="end" class="value">+ &#x20B9;${totalTax.toFixed(2)}</text>
  ` : ''}
  
  ${shippingCharges > 0 ? `
  <text x="450" y="${summaryY + (totalDiscount > 0 ? 75 : totalTax > 0 ? 50 : 25)}" class="label">Shipping:</text>
  <text x="670" y="${summaryY + (totalDiscount > 0 ? 75 : totalTax > 0 ? 50 : 25)}" text-anchor="end" class="value">+ &#x20B9;${shippingCharges.toFixed(2)}</text>
  ` : ''}
  
  ${roundOff !== 0 ? `
  <text x="450" y="${summaryY + 100}" class="label">Round Off:</text>
  <text x="670" y="${summaryY + 100}" text-anchor="end" class="value">${roundOff > 0 ? '+' : ''} &#x20B9;${roundOff.toFixed(2)}</text>
  ` : ''}
  
  <!-- Total Box -->
  <rect x="430" y="${summaryY + 120}" width="250" height="60" class="total-box" stroke="#2563eb" stroke-width="2"/>
  <text x="445" y="${summaryY + 145}" class="total-label">TOTAL</text>
  <text x="665" y="${summaryY + 155}" text-anchor="end" class="total-value">&#x20B9;${grandTotal.toFixed(2)}</text>
  
  ${amountPaid > 0 ? `
  <!-- Payment Details -->
  <text x="450" y="${summaryY + 200}" class="label">Paid:</text>
  <text x="670" y="${summaryY + 200}" text-anchor="end" class="value" fill="#16a34a">&#x20B9;${amountPaid.toFixed(2)}</text>
  
  <text x="450" y="${summaryY + 225}" class="label">Balance Due:</text>
  <text x="670" y="${summaryY + 225}" text-anchor="end" class="value" fill="${amountDue > 0 ? '#dc2626' : '#16a34a'}">&#x20B9;${amountDue.toFixed(2)}</text>
  ` : ''}
  
  <!-- QR Code -->
  ${qrDataUrl ? `
  <image x="30" y="${summaryY + 120}" width="120" height="120" href="${qrDataUrl}"/>
  <text x="90" y="${summaryY + 255}" text-anchor="middle" font-size="10" fill="#6b7280">Scan to verify</text>
  ` : ''}
  
  <!-- Notes -->
  ${notes ? `
  <text x="30" y="${summaryY + 290}" font-size="12" font-weight="600" fill="#1f2937">Notes:</text>
  <text x="30" y="${summaryY + 310}" font-size="11" fill="#6b7280">${notes}</text>
  ` : ''}
  
  <!-- Footer -->
  <line x1="20" y1="${summaryY + 320}" x2="680" y2="${summaryY + 320}" class="divider"/>
  <text x="350" y="${summaryY + 340}" text-anchor="middle" font-size="10" fill="#9ca3af">
    ${termsAndConditions || 'Thank you for your business!'}
  </text>
</svg>`;

  return svg;
}

/**
 * Generate QR code for bill verification
 */
async function generateBillQR(verificationCode) {
  const qrUrl = `${process.env.CLIENT_URL || 'https://desklite.com'}/bill/${verificationCode}`;
  
  try {
    const qrSVG = await QRCode.toString(qrUrl, {
      type: 'svg',
      width: 400,
      margin: 2,
      color: {
        dark: '#1f2937',
        light: '#ffffff'
      }
    });
    
    return qrSVG;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
}

/**
 * Generate simple bill receipt (thermal printer style)
 */
function generateThermalReceipt(billData, shopData) {
  const {
    billNumber,
    billDate,
    customerName,
    items,
    subtotal,
    totalTax,
    grandTotal,
    amountPaid,
    amountDue
  } = billData;

  const {
    shopName,
    phone,
    address
  } = shopData;

  const formattedDate = new Date(billDate).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const width = 300;
  const lineHeight = 20;
  let y = 20;

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="800" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="100%" fill="#ffffff"/>
  
  <!-- Header -->
  <text x="150" y="${y}" text-anchor="middle" font-size="18" font-weight="bold" font-family="monospace">${shopName}</text>`;
  
  y += lineHeight;
  
  if (address) {
    svg += `<text x="150" y="${y}" text-anchor="middle" font-size="10" font-family="monospace">${address}</text>`;
    y += lineHeight;
  }
  
  if (phone) {
    svg += `<text x="150" y="${y}" text-anchor="middle" font-size="10" font-family="monospace">${phone}</text>`;
    y += lineHeight;
  }
  
  svg += `<line x1="10" y1="${y}" x2="290" y2="${y}" stroke="#000" stroke-width="1"/>`;
  y += lineHeight;
  
  // Bill info
  svg += `
  <text x="10" y="${y}" font-size="10" font-family="monospace">Bill: ${billNumber}</text>
  <text x="290" y="${y}" text-anchor="end" font-size="10" font-family="monospace">${formattedDate}</text>`;
  y += lineHeight;
  
  svg += `<text x="10" y="${y}" font-size="10" font-family="monospace">Customer: ${customerName}</text>`;
  y += lineHeight;
  
  svg += `<line x1="10" y1="${y}" x2="290" y2="${y}" stroke="#000" stroke-width="1"/>`;
  y += lineHeight;
  
  // Items
  items.forEach(item => {
    svg += `<text x="10" y="${y}" font-size="10" font-family="monospace">${item.name}</text>`;
    y += lineHeight;
    
    const itemTotal = item.total || (item.price * item.quantity);
    svg += `
    <text x="10" y="${y}" font-size="9" font-family="monospace">  ${item.quantity} x &#x20B9;${item.price.toFixed(2)}</text>
    <text x="290" y="${y}" text-anchor="end" font-size="10" font-family="monospace">&#x20B9;${itemTotal.toFixed(2)}</text>`;
    y += lineHeight;
  });
  
  svg += `<line x1="10" y1="${y}" x2="290" y2="${y}" stroke="#000" stroke-width="1"/>`;
  y += lineHeight;
  
  // Summary
  svg += `
  <text x="10" y="${y}" font-size="10" font-family="monospace">Subtotal:</text>
  <text x="290" y="${y}" text-anchor="end" font-size="10" font-family="monospace">&#x20B9;${subtotal.toFixed(2)}</text>`;
  y += lineHeight;
  
  if (totalTax > 0) {
    svg += `
    <text x="10" y="${y}" font-size="10" font-family="monospace">Tax:</text>
    <text x="290" y="${y}" text-anchor="end" font-size="10" font-family="monospace">&#x20B9;${totalTax.toFixed(2)}</text>`;
    y += lineHeight;
  }
  
  svg += `<line x1="10" y1="${y}" x2="290" y2="${y}" stroke="#000" stroke-width="2"/>`;
  y += lineHeight;
  
  svg += `
  <text x="10" y="${y}" font-size="14" font-weight="bold" font-family="monospace">TOTAL:</text>
  <text x="290" y="${y}" text-anchor="end" font-size="14" font-weight="bold" font-family="monospace">&#x20B9;${grandTotal.toFixed(2)}</text>`;
  y += lineHeight * 1.5;
  
  if (amountPaid > 0) {
    svg += `
    <text x="10" y="${y}" font-size="10" font-family="monospace">Paid:</text>
    <text x="290" y="${y}" text-anchor="end" font-size="10" font-family="monospace">&#x20B9;${amountPaid.toFixed(2)}</text>`;
    y += lineHeight;
    
    svg += `
    <text x="10" y="${y}" font-size="10" font-family="monospace">Balance:</text>
    <text x="290" y="${y}" text-anchor="end" font-size="10" font-family="monospace">&#x20B9;${amountDue.toFixed(2)}</text>`;
    y += lineHeight;
  }
  
  svg += `<line x1="10" y1="${y}" x2="290" y2="${y}" stroke="#000" stroke-width="1" stroke-dasharray="2,2"/>`;
  y += lineHeight * 1.5;
  
  svg += `<text x="150" y="${y}" text-anchor="middle" font-size="10" font-family="monospace">Thank you! Visit again</text>`;
  
  svg += `</svg>`;
  
  return svg;
}

module.exports = {
  generateBillImage,
  generateBillQR,
  generateThermalReceipt
};
