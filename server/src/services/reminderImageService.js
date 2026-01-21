const QRCode = require('qrcode');

// UPI QR Code generator
async function generateUPIQR(upiId, amount, name, note = 'Payment') {
  // Ensure amount has 2 decimal places (required by some UPI apps)
  const formattedAmount = parseFloat(amount).toFixed(2);
  
  // UPI deep link format - specific parameter ordering helps compatibility
  const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name)}&am=${formattedAmount}&cu=INR&tn=${encodeURIComponent(note)}`;
  
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

  // Create SVG optimized for WhatsApp (1200x630 landscape)
  // Modern Clean Professional Design - High Visibility Version
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#020617"/>
          <stop offset="100%" style="stop-color:#1e293b"/>
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="8"/>
          <feOffset dx="0" dy="8" result="offsetblur"/>
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.4"/>
          </feComponentTransfer>
          <feMerge> 
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/> 
          </feMerge>
        </filter>
        <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.5" fill="#ffffff" fill-opacity="0.05"/>
        </pattern>
      </defs>
      
      <!-- Background -->
      <rect width="1200" height="630" fill="url(#bgGradient)"/>
      <rect width="1200" height="630" fill="url(#grid)"/>
      
      <!-- Decorative Elements -->
      <circle cx="1150" cy="50" r="400" fill="#22c55e" fill-opacity="0.03"/>
      <circle cx="50" cy="580" r="300" fill="#3b82f6" fill-opacity="0.03"/>
      <rect width="1200" height="12" fill="#22c55e"/>
      
      <!-- Left Content Container -->
      <g transform="translate(100, 100)">
         <!-- Shop Name -->
         <text x="0" y="0" font-family="'Segoe UI', Roboto, sans-serif" font-size="36" font-weight="700" fill="#e2e8f0" letter-spacing="1">${escapeXml(shopName).toUpperCase()}</text>
         
         <line x1="0" y1="30" x2="550" y2="30" stroke="#334155" stroke-width="2"/>

         <!-- Title -->
         <text x="0" y="80" font-family="'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="500" fill="#94a3b8" letter-spacing="2" text-transform="uppercase">${t.reminder}</text>
         
         <!-- Customer Name (Larger) -->
         <text x="0" y="140" font-family="'Segoe UI', Roboto, sans-serif" font-size="64" font-weight="800" fill="white" style="text-shadow: 0 4px 12px rgba(0,0,0,0.3)">${escapeXml(customerName || 'Customer')}</text>
         
         <!-- Amount Section (Much Larger) -->
         <g transform="translate(0, 240)">
            <text x="0" y="0" font-family="'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="500" fill="#cbd5e1">${t.amountDue}</text>
            <text x="0" y="90" font-family="'Segoe UI', Roboto, sans-serif" font-size="110" font-weight="900" fill="#4ade80" style="text-shadow: 0 4px 20px rgba(34, 197, 94, 0.4)">${formattedAmount}</text>
         </g>

         <!-- Due Date Badge -->
         ${dateStr ? `
         <g transform="translate(0, 380)">
            <rect x="0" y="0" width="300" height="48" rx="12" fill="#ea580c" fill-opacity="0.15"/>
            <text x="16" y="32" font-family="'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="600" fill="#fb923c">📅 ${t.dueLabel} ${dateStr}</text>
         </g>
         ` : ''}

         <!-- Footer Contact -->
         <g transform="translate(0, 500)">
             <text x="0" y="0" font-family="'Segoe UI', Roboto, sans-serif" font-size="20" fill="#94a3b8">${t.footer}</text>
             ${shopPhone ? `<text x="0" y="35" font-family="'Segoe UI', Roboto, sans-serif" font-size="18" fill="#64748b">${t.contact} ${shopPhone}</text>` : ''}
         </g>
      </g>
      
      <!-- Right Section: QR Card -->
      ${qrDataUrl ? `
        <g transform="translate(780, 80)" filter="url(#shadow)">
          <rect x="0" y="0" width="340" height="470" rx="32" fill="white"/>
          
          <g transform="translate(170, 50)">
             <text text-anchor="middle" font-family="'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="800" fill="#0f172a">${t.scanToPay}</text>
          </g>
          
          <!-- QR Code Image -->
          <image href="${qrDataUrl}" x="35" y="85" width="270" height="270"/>
          
          <g transform="translate(170, 400)">
            <text text-anchor="middle" font-family="'Segoe UI', Roboto, sans-serif" font-size="16" fill="#64748b" font-weight="500">${escapeXml(upiId)}</text>
            <g transform="translate(0, 40)">
                <text text-anchor="middle" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" fill="#94a3b8">${t.poweredBy}</text>
            </g>
          </g>
        </g>
      ` : ''}
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
