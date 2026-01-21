const QRCode = require('qrcode');

// UPI QR Code generator
async function generateUPIQR(upiId, amount, name, note = 'Payment') {
  // UPI deep link format
  const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;
  
  const qrDataUrl = await QRCode.toDataURL(upiLink, {
    width: 200,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'M'
  });
  
  return qrDataUrl;
}

// Generate SVG-based reminder image (works without native dependencies)
async function generateReminderImage(options) {
  const {
    customerName,
    amount,
    dueDate,
    shopName = 'Shop',
    shopPhone,
    upiId,
    language = 'en'
  } = options;

  // Generate QR code
  let qrDataUrl = null;
  if (upiId) {
    qrDataUrl = await generateUPIQR(upiId, amount, shopName, `Payment to ${shopName}`);
  }

  const formattedAmount = `₹${Number(amount).toLocaleString('en-IN')}`;
  const dateStr = dueDate ? new Date(dueDate).toLocaleDateString(language === 'ml' ? 'ml-IN' : 'en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }) : null;

  const texts = {
    en: {
      reminder: 'Payment Reminder',
      customer: 'Customer',
      amountDue: 'Amount Due',
      dueLabel: 'Due Date:',
      scanToPay: 'Scan to Pay',
      footer: 'Please pay at your earliest convenience 🙏',
      contact: 'Contact:',
      poweredBy: 'Powered by Desklite'
    },
    ml: {
      reminder: 'പേയ്മെന്റ് റിമൈൻഡർ',
      customer: 'കസ്റ്റമർ',
      amountDue: 'ബാക്കി തുക',
      dueLabel: 'അവസാന തീയതി:',
      scanToPay: 'പേയ് ചെയ്യാൻ സ്കാൻ ചെയ്യുക',
      footer: 'ദയവായി എത്രയും വേഗം അടയ്ക്കുക 🙏',
      contact: 'ബന്ധപ്പെടുക:',
      poweredBy: 'Powered by Desklite'
    }
  };

  const t = texts[language] || texts.en;

  // Create SVG
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#1e3a5f"/>
          <stop offset="100%" style="stop-color:#0f172a"/>
        </linearGradient>
      </defs>
      
      <!-- Background -->
      <rect width="600" height="800" fill="url(#bg)"/>
      
      <!-- Header accent -->
      <rect width="600" height="8" fill="#f97316"/>
      
      <!-- Shop name -->
      <text x="300" y="60" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="white" text-anchor="middle">${escapeXml(shopName)}</text>
      
      <!-- Subtitle -->
      <text x="300" y="90" font-family="Arial, sans-serif" font-size="16" fill="#94a3b8" text-anchor="middle">${t.reminder}</text>
      
      <!-- Divider -->
      <line x1="40" y1="120" x2="560" y2="120" stroke="#334155" stroke-width="1"/>
      
      <!-- Customer label -->
      <text x="40" y="160" font-family="Arial, sans-serif" font-size="14" fill="#64748b">${t.customer}</text>
      
      <!-- Customer name -->
      <text x="40" y="190" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="white">${escapeXml(customerName || 'Customer')}</text>
      
      <!-- Amount label -->
      <text x="40" y="240" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#f97316">${t.amountDue}</text>
      
      <!-- Amount -->
      <text x="40" y="300" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="white">${formattedAmount}</text>
      
      <!-- Due date -->
      ${dateStr ? `<text x="40" y="340" font-family="Arial, sans-serif" font-size="14" fill="#ef4444">${t.dueLabel} ${dateStr}</text>` : ''}
      
      <!-- QR Section -->
      ${qrDataUrl ? `
        <text x="300" y="400" font-family="Arial, sans-serif" font-size="14" fill="#64748b" text-anchor="middle">${t.scanToPay}</text>
        
        <!-- QR Background -->
        <rect x="200" y="415" width="200" height="200" rx="12" fill="white"/>
        
        <!-- QR Code (placeholder - actual QR needs client-side rendering) -->
        <image href="${qrDataUrl}" x="210" y="425" width="180" height="180"/>
        
        <!-- UPI ID -->
        <text x="300" y="645" font-family="Arial, sans-serif" font-size="12" fill="#94a3b8" text-anchor="middle">${escapeXml(upiId)}</text>
      ` : ''}
      
      <!-- Footer message -->
      <text x="300" y="720" font-family="Arial, sans-serif" font-size="14" fill="#64748b" text-anchor="middle">${t.footer}</text>
      
      <!-- Contact -->
      ${shopPhone ? `<text x="300" y="750" font-family="Arial, sans-serif" font-size="12" fill="#94a3b8" text-anchor="middle">${t.contact} ${shopPhone}</text>` : ''}
      
      <!-- Powered by -->
      <text x="300" y="780" font-family="Arial, sans-serif" font-size="10" fill="#475569" text-anchor="middle">${t.poweredBy}</text>
    </svg>
  `;

  // Return SVG as base64 data URL (can be rendered as image)
  const base64Svg = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64Svg}`;
}

function escapeXml(str) {
  if (!str) return '';
  return str.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Reminder message templates
const reminderTemplates = {
  en: {
    // Friendly reminder
    friendly: {
      name: 'Friendly Reminder',
      template: `Hi {name}! 👋

This is a gentle reminder about your pending balance of *₹{amount}*.

{qrNote}

Thank you for your continued trust! 🙏

— {shopName}`,
    },
    // Formal reminder
    formal: {
      name: 'Formal Notice',
      template: `Dear {name},

We would like to remind you about your outstanding balance of *₹{amount}*.

{dueDateNote}

Kindly settle the amount at your earliest convenience.

{qrNote}

Thank you.
{shopName}`,
    },
    // Urgent reminder
    urgent: {
      name: 'Urgent Reminder',
      template: `⚠️ *PAYMENT REMINDER*

Dear {name},

Your payment of *₹{amount}* is overdue.

{dueDateNote}

Please settle this amount immediately to avoid any inconvenience.

{qrNote}

— {shopName}
📞 {shopPhone}`,
    },
    // Festival/Occasion
    festive: {
      name: 'Festival Reminder',
      template: `🎉 *Festive Greetings!*

Dear {name},

As we approach the festive season, we kindly request you to clear your pending balance of *₹{amount}*.

{qrNote}

Wishing you joy and prosperity! 🪔

— {shopName}`,
    },
  },
  ml: {
    // Friendly reminder (Malayalam)
    friendly: {
      name: 'സൗഹൃദ റിമൈൻഡർ',
      template: `ഹായ് {name}! 👋

നിങ്ങളുടെ *₹{amount}* ബാക്കി ഉണ്ടെന്ന് ഓർമ്മിപ്പിക്കാൻ ആഗ്രഹിക്കുന്നു.

{qrNote}

നന്ദി! 🙏

— {shopName}`,
    },
    // Formal reminder (Malayalam)
    formal: {
      name: 'ഔദ്യോഗിക അറിയിപ്പ്',
      template: `പ്രിയ {name},

നിങ്ങളുടെ *₹{amount}* കുടിശ്ശിക ഉണ്ടെന്ന് അറിയിക്കാൻ ആഗ്രഹിക്കുന്നു.

{dueDateNote}

ദയവായി എത്രയും വേഗം അടയ്ക്കുക.

{qrNote}

നന്ദി.
{shopName}`,
    },
    // Urgent reminder (Malayalam)
    urgent: {
      name: 'അടിയന്തിര റിമൈൻഡർ',
      template: `⚠️ *പേയ്മെന്റ് റിമൈൻഡർ*

പ്രിയ {name},

നിങ്ങളുടെ *₹{amount}* പേയ്മെന്റ് കാലഹരണപ്പെട്ടിരിക്കുന്നു.

{dueDateNote}

ദയവായി ഉടൻ തന്നെ അടയ്ക്കുക.

{qrNote}

— {shopName}
📞 {shopPhone}`,
    },
    // Festival (Malayalam)
    festive: {
      name: 'ഉത്സവ റിമൈൻഡർ',
      template: `🎉 *ഉത്സവാശംസകൾ!*

പ്രിയ {name},

ഉത്സവ സമയം അടുക്കുന്നതിനാൽ, നിങ്ങളുടെ *₹{amount}* ബാക്കി ക്ലിയർ ചെയ്യാൻ അഭ്യർത്ഥിക്കുന്നു.

{qrNote}

സന്തോഷവും സമൃദ്ധിയും നേരുന്നു! 🪔

— {shopName}`,
    },
  },
};

// Generate reminder message from template
function generateReminderMessage(options) {
  const {
    templateType = 'friendly',
    language = 'en',
    customerName,
    amount,
    dueDate,
    shopName = 'Shop',
    shopPhone = '',
    upiId,
    includeQR = true
  } = options;
  
  const templates = reminderTemplates[language] || reminderTemplates.en;
  const template = templates[templateType] || templates.friendly;
  
  let message = template.template;
  
  // Replace placeholders
  message = message.replace(/{name}/g, customerName || 'Customer');
  message = message.replace(/{amount}/g, Number(amount).toLocaleString('en-IN'));
  message = message.replace(/{shopName}/g, shopName);
  message = message.replace(/{shopPhone}/g, shopPhone);
  
  // Due date note
  if (dueDate) {
    const dateStr = new Date(dueDate).toLocaleDateString(language === 'ml' ? 'ml-IN' : 'en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    const dueDateNote = language === 'ml' 
      ? `📅 അവസാന തീയതി: ${dateStr}`
      : `📅 Due Date: ${dateStr}`;
    message = message.replace(/{dueDateNote}/g, dueDateNote);
  } else {
    message = message.replace(/{dueDateNote}\n?/g, '');
  }
  
  // QR note
  if (includeQR && upiId) {
    const qrNote = language === 'ml'
      ? '💳 പേയ് ചെയ്യാൻ അറ്റാച്ച്ഡ് QR സ്കാൻ ചെയ്യുക'
      : '💳 Scan the attached QR to pay instantly';
    message = message.replace(/{qrNote}/g, qrNote);
  } else {
    message = message.replace(/{qrNote}\n?/g, '');
  }
  
  // Clean up empty lines
  message = message.replace(/\n{3,}/g, '\n\n').trim();
  
  return message;
}

// Get available templates
function getAvailableTemplates(language = 'en') {
  const templates = reminderTemplates[language] || reminderTemplates.en;
  return Object.entries(templates).map(([key, value]) => ({
    id: key,
    name: value.name,
    preview: value.template.substring(0, 100) + '...'
  }));
}

module.exports = {
  generateUPIQR,
  generateReminderImage,
  generateReminderMessage,
  getAvailableTemplates,
  reminderTemplates
};
