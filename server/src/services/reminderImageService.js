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
// Professional clean design like Vyapar/Khatabook — white bg, no QR
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

  // Format amount — use Unicode &#x20B9; for rupee symbol in SVG
  const amountNum = Number(amount);
  const amountStr = amountNum.toLocaleString('en-IN');

  const dateStr = dueDate ? new Date(dueDate).toLocaleDateString(language === 'ml' ? 'ml-IN' : 'en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }) : null;

  const today = new Date().toLocaleDateString(language === 'ml' ? 'ml-IN' : 'en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const texts = {
    en: {
      reminder: 'PAYMENT REMINDER',
      to: 'To',
      amountDue: 'Amount Due',
      dueLabel: 'Due Date',
      dateIssued: 'Date',
      from: 'From',
      footer: 'Kindly clear the dues at the earliest.',
      contact: 'Contact',
      thankYou: 'Thank you for your business!',
      poweredBy: 'Powered by Desklite'
    },
    ml: {
      reminder: 'പേയ്‌മെന്റ് റിമൈൻഡർ',
      to: 'പേര്',
      amountDue: 'ബാക്കി തുക',
      dueLabel: 'അവസാന തീയതി',
      dateIssued: 'തീയതി',
      from: 'കട',
      footer: 'ദയവായി എത്രയും വേഗം ബാക്കി തീർക്കുക.',
      contact: 'ബന്ധപ്പെടുക',
      thankYou: 'നന്ദി!',
      poweredBy: 'Powered by Desklite'
    }
  };

  const t = texts[language] || texts.en;

  // Truncate long names to prevent overflow
  const displayName = (customerName || 'Customer').length > 24
    ? (customerName || 'Customer').substring(0, 22) + '…'
    : (customerName || 'Customer');

  const displayShop = (shopName || 'Shop').length > 28
    ? (shopName || 'Shop').substring(0, 26) + '…'
    : (shopName || 'Shop');

  // Professional WhatsApp-optimized image: 800x1000 portrait (better for mobile viewing)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
  <defs>
    <filter id="cardShadow" x="-5%" y="-3%" width="110%" height="108%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="6"/>
      <feOffset dx="0" dy="4"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.12"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- White background -->
  <rect width="800" height="1000" fill="#ffffff"/>

  <!-- Top accent bar -->
  <rect width="800" height="6" fill="#2563eb"/>

  <!-- Header section -->
  <rect x="0" y="6" width="800" height="130" fill="#f8fafc"/>
  <line x1="0" y1="136" x2="800" y2="136" stroke="#e2e8f0" stroke-width="1"/>

  <!-- Shop icon circle -->
  <circle cx="70" cy="71" r="32" fill="#2563eb"/>
  <text x="70" y="80" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700" fill="#ffffff">${escapeXml(displayShop.charAt(0).toUpperCase())}</text>

  <!-- Shop name -->
  <text x="116" y="62" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="#1e293b">${escapeXml(displayShop)}</text>
  ${shopPhone ? `<text x="116" y="90" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="#64748b">${escapeXml(shopPhone)}</text>` : ''}

  <!-- Date on right side -->
  <text x="755" y="62" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="#94a3b8">${t.dateIssued}</text>
  <text x="755" y="84" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="600" fill="#475569">${today}</text>

  <!-- PAYMENT REMINDER badge -->
  <rect x="240" y="160" width="320" height="44" rx="22" fill="#fef2f2"/>
  <rect x="240" y="160" width="320" height="44" rx="22" fill="none" stroke="#fca5a5" stroke-width="1"/>
  <text x="400" y="188" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" fill="#dc2626" letter-spacing="2">${t.reminder}</text>

  <!-- Amount card -->
  <g filter="url(#cardShadow)">
    <rect x="50" y="230" width="700" height="200" rx="16" fill="#ffffff"/>
    <rect x="50" y="230" width="700" height="200" rx="16" fill="none" stroke="#e2e8f0" stroke-width="1"/>
  </g>

  <text x="400" y="278" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#64748b" font-weight="500">${t.amountDue}</text>

  <!-- Rupee symbol + amount — using &#x20B9; for proper rendering -->
  <text x="400" y="370" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="80" font-weight="900" fill="#dc2626">&#x20B9;${amountStr}</text>

  <line x1="120" y1="400" x2="680" y2="400" stroke="#f1f5f9" stroke-width="2"/>

  <!-- Details section -->
  <g transform="translate(50, 470)">
    <!-- Customer row -->
    <rect x="0" y="0" width="700" height="70" rx="12" fill="#f8fafc"/>
    <text x="30" y="28" font-family="Arial, Helvetica, sans-serif" font-size="15" fill="#94a3b8" font-weight="500">${t.to}</text>
    <text x="30" y="54" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" fill="#1e293b">${escapeXml(displayName)}</text>

    ${dateStr ? `
    <!-- Due date row -->
    <rect x="0" y="85" width="700" height="70" rx="12" fill="#fff7ed"/>
    <text x="30" y="113" font-family="Arial, Helvetica, sans-serif" font-size="15" fill="#94a3b8" font-weight="500">${t.dueLabel}</text>
    <text x="30" y="140" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" fill="#ea580c">${dateStr}</text>
    <text x="670" y="130" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="28">&#x1F4C5;</text>
    ` : ''}
  </g>

  <!-- Divider -->
  <line x1="80" y1="${dateStr ? '670' : '590'}" x2="720" y2="${dateStr ? '670' : '590'}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="6,4"/>

  <!-- Footer message -->
  <text x="400" y="${dateStr ? '720' : '640'}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#475569" font-weight="500">${escapeXml(t.footer)}</text>
  <text x="400" y="${dateStr ? '755' : '675'}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="#94a3b8">${escapeXml(t.thankYou)}</text>

  ${upiId ? `
  <!-- UPI ID section -->
  <rect x="200" y="${dateStr ? '790' : '710'}" width="400" height="44" rx="10" fill="#f0fdf4"/>
  <rect x="200" y="${dateStr ? '790' : '710'}" width="400" height="44" rx="10" fill="none" stroke="#bbf7d0" stroke-width="1"/>
  <text x="400" y="${dateStr ? '818' : '738'}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="#16a34a" font-weight="600">UPI: ${escapeXml(upiId)}</text>
  ` : ''}

  <!-- Bottom bar -->
  <rect x="0" y="960" width="800" height="40" fill="#f8fafc"/>
  <line x1="0" y1="960" x2="800" y2="960" stroke="#e2e8f0" stroke-width="1"/>
  <text x="400" y="985" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="#cbd5e1">${t.poweredBy}</text>

</svg>`;

  // Return SVG as base64 data URL
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
