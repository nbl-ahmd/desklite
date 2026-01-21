'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Kerala-focused translations - using local Malayalam terms
const translations = {
  en: {
    // Navigation
    home: 'Home',
    customers: 'Customers',
    khata: 'Khata',
    ledger: 'Ledger',
    transactions: 'Transactions',
    reports: 'Reports',
    settings: 'Settings',
    menu: 'Menu',
    overdue: 'Overdue',
    upgrade: 'Upgrade',
    
    // Dashboard
    todaySummary: "Today's Summary",
    totalIncome: 'Total Income',
    totalExpense: 'Total Expense',
    netBalance: 'Net Balance',
    recentActivity: 'Recent Activity',
    seeAll: 'See All',
    quickEntry: 'Quick Entry',
    dailyCollection: 'Daily Collection',
    
    // Khata Terms (Kerala Style - using local terms instead of Hindi)
    lena: 'Receivables',
    dena: 'Payables',
    toReceive: 'Receivables',
    toPay: 'Payables',
    totalReceivables: 'Total Receivables',
    totalPayables: 'Total Payables',
    pendingAmount: 'Pending Amount',
    clearedAmount: 'Cleared Amount',
    
    // Transactions
    income: 'Income',
    expense: 'Expense',
    sale: 'Sale',
    payment: 'Payment',
    cash: 'Cash',
    upi: 'UPI',
    online: 'Online',
    credit: 'Credit',
    kadam: 'Credit',
    amount: 'Amount',
    customerName: 'Customer Name',
    phoneNumber: 'Phone Number',
    note: 'Note',
    paymentMethod: 'Payment Method',
    dueDate: 'Due Date',
    paidOn: 'Paid On',
    
    // Customer/Khata
    totalCustomers: 'Total Customers',
    overdueBy: 'Overdue by',
    days: 'days',
    sendReminder: 'Send Reminder',
    viewLedger: 'View Ledger',
    addCustomer: 'Add Customer',
    customerDetails: 'Customer Details',
    transactionHistory: 'Transaction History',
    runningBalance: 'Running Balance',
    
    // Actions
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    filter: 'Filter',
    export: 'Export',
    download: 'Download',
    share: 'Share',
    print: 'Print',
    attachBill: 'Attach Bill',
    viewBill: 'View Bill',
    
    // Messages
    noTransactions: 'No transactions found',
    noCustomers: 'No customers found',
    transactionSaved: 'Transaction saved!',
    reminderSent: 'Reminder sent!',
    loading: 'Loading...',
    error: 'Something went wrong',
    success: 'Success!',
    confirmDelete: 'Are you sure you want to delete?',
    
    // Time
    today: 'Today',
    yesterday: 'Yesterday',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
    lastMonth: 'Last Month',
    allTime: 'All Time',
    custom: 'Custom Range',
    
    // Reports
    totalSales: 'Total Sales',
    totalExpenses: 'Total Expenses',
    profit: 'Profit',
    loss: 'Loss',
    summary: 'Summary',
    detailed: 'Detailed',
    customerWise: 'Customer Wise',
    modeWise: 'Mode Wise',
    dateWise: 'Date Wise',
    
    // Settings
    language: 'Language',
    notifications: 'Notifications',
    backup: 'Backup',
    restore: 'Restore',
    security: 'Security',
    about: 'About',
    logout: 'Sign Out',
    upiSettings: 'UPI Settings',
    shopDetails: 'Shop Details',
    
    // Plans
    freePlan: 'Free Plan',
    proPlan: 'Pro Plan',
    premiumPlan: 'Premium Plan',
    upgradeToPro: 'Upgrade to Pro',
    
    // Reminder Templates
    reminderTemplate: 'Hi {name}, this is a friendly reminder about your pending balance of ₹{amount}. Please clear it at your earliest convenience. Thank you! 🙏',
    reminderFriendly: 'Friendly Reminder',
    reminderFormal: 'Formal Notice',
    reminderUrgent: 'Urgent Reminder',
    reminderFestive: 'Festival Greeting',
    selectTemplate: 'Select Template',
    generateImage: 'Generate Image',
    downloadImage: 'Download Image',
    sendViaWhatsApp: 'Send via WhatsApp',
    attachImageNote: 'Attach the downloaded image manually in WhatsApp',
    amountDue: 'Amount Due',
    noUpiConfigured: 'UPI ID not configured. Add it in Settings.',
    scanToPay: 'Scan to Pay',
    
    // Shop Types
    grocery: 'Grocery Store',
    kirana: 'Kirana Store',
    bakery: 'Bakery',
    textiles: 'Textiles',
    hardware: 'Hardware',
    electronics: 'Electronics',
    wholesale: 'Wholesale',
    retail: 'Retail',
    barber: 'Barber Shop',
    salon: 'Beauty Salon',
    medical: 'Medical Store',
    stationery: 'Stationery',
    
    // Features
    cloudSync: 'Cloud Sync',
    offlineMode: 'Offline Mode',
    multiDevice: 'Multi-Device',
    whatsappReminders: 'WhatsApp Reminders',
    pdfExport: 'PDF Export',
    excelExport: 'Excel Export',
    billPhotos: 'Bill Photos',
    scheduledReminders: 'Scheduled Reminders',
  },
  
  ml: {
    // Navigation
    home: 'ഹോം',
    customers: 'കസ്റ്റമേഴ്സ്',
    khata: 'ഖാത',
    ledger: 'ലെഡ്ജർ',
    transactions: 'ഇടപാടുകൾ',
    reports: 'റിപ്പോർട്ടുകൾ',
    settings: 'ക്രമീകരണങ്ങൾ',
    menu: 'മെനു',
    overdue: 'കാലഹരണപ്പെട്ടത്',
    upgrade: 'അപ്ഗ്രേഡ്',
    
    // Dashboard
    todaySummary: 'ഇന്നത്തെ സംഗ്രഹം',
    totalIncome: 'ആകെ വരുമാനം',
    totalExpense: 'ആകെ ചെലവ്',
    netBalance: 'ബാക്കി',
    recentActivity: 'സമീപകാല ഇടപാടുകൾ',
    seeAll: 'എല്ലാം കാണുക',
    quickEntry: 'പെട്ടെന്ന് ചേർക്കുക',
    dailyCollection: 'ഇന്നത്തെ കളക്ഷൻ',
    
    // Khata Terms
    lena: 'കിട്ടാനുള്ളത്',
    dena: 'കൊടുക്കാനുള്ളത്',
    toReceive: 'കിട്ടാനുള്ളത്',
    toPay: 'കൊടുക്കാനുള്ളത്',
    totalReceivables: 'ആകെ കിട്ടാനുള്ളത്',
    totalPayables: 'ആകെ കൊടുക്കാനുള്ളത്',
    pendingAmount: 'ബാക്കി തുക',
    clearedAmount: 'അടച്ച തുക',
    
    // Transactions
    income: 'വരുമാനം',
    expense: 'ചെലവ്',
    sale: 'വിൽപ്പന',
    payment: 'പേയ്മെന്റ്',
    cash: 'കാശ്',
    upi: 'യുപിഐ',
    online: 'ഓൺലൈൻ',
    credit: 'കടം',
    kadam: 'കടം',
    amount: 'തുക',
    customerName: 'പേര്',
    phoneNumber: 'ഫോൺ നമ്പർ',
    note: 'കുറിപ്പ്',
    paymentMethod: 'പേയ്മെന്റ് രീതി',
    dueDate: 'അവസാന തീയതി',
    paidOn: 'അടച്ച തീയതി',
    
    // Customer/Khata
    totalCustomers: 'ആകെ കസ്റ്റമേഴ്സ്',
    overdueBy: 'കാലഹരണപ്പെട്ടത്',
    days: 'ദിവസങ്ങൾ',
    sendReminder: 'ഓർമ്മിപ്പിക്കൂ',
    viewLedger: 'ലെഡ്ജർ കാണുക',
    addCustomer: 'കസ്റ്റമർ ചേർക്കുക',
    customerDetails: 'കസ്റ്റമർ വിവരങ്ങൾ',
    transactionHistory: 'ഇടപാട് ചരിത്രം',
    runningBalance: 'ബാക്കി',
    
    // Actions
    save: 'സേവ് ചെയ്യുക',
    cancel: 'റദ്ദാക്കുക',
    delete: 'ഇല്ലാതാക്കുക',
    edit: 'എഡിറ്റ് ചെയ്യുക',
    add: 'ചേർക്കുക',
    search: 'തിരയുക',
    filter: 'ഫിൽറ്റർ',
    export: 'എക്സ്പോർട്ട്',
    download: 'ഡൗൺലോഡ്',
    share: 'ഷെയർ',
    print: 'പ്രിന്റ്',
    attachBill: 'ബിൽ ചേർക്കുക',
    viewBill: 'ബിൽ കാണുക',
    
    // Messages
    noTransactions: 'ഇടപാടുകൾ ഇല്ല',
    noCustomers: 'കസ്റ്റമേഴ്സ് ഇല്ല',
    transactionSaved: 'ഇടപാട് സേവ് ചെയ്തു!',
    reminderSent: 'ഓർമ്മിപ്പിക്കൽ അയച്ചു!',
    loading: 'ലോഡ് ചെയ്യുന്നു...',
    error: 'എന്തോ കുഴപ്പം സംഭവിച്ചു',
    success: 'വിജയം!',
    confirmDelete: 'ഇല്ലാതാക്കണോ?',
    
    // Time
    today: 'ഇന്ന്',
    yesterday: 'ഇന്നലെ',
    thisWeek: 'ഈ ആഴ്ച',
    thisMonth: 'ഈ മാസം',
    lastMonth: 'കഴിഞ്ഞ മാസം',
    allTime: 'എല്ലാ സമയവും',
    custom: 'ഇഷ്ടാനുസരണം',
    
    // Reports
    totalSales: 'ആകെ വിൽപ്പന',
    totalExpenses: 'ആകെ ചെലവ്',
    profit: 'ലാഭം',
    loss: 'നഷ്ടം',
    summary: 'സംഗ്രഹം',
    detailed: 'വിശദമായ',
    customerWise: 'കസ്റ്റമർ തിരിച്ച്',
    modeWise: 'മോഡ് തിരിച്ച്',
    dateWise: 'തീയതി തിരിച്ച്',
    
    // Settings
    language: 'ഭാഷ',
    notifications: 'അറിയിപ്പുകൾ',
    backup: 'ബാക്കപ്പ്',
    restore: 'റിസ്റ്റോർ',
    security: 'സുരക്ഷ',
    about: 'വിവരങ്ങൾ',
    logout: 'ലോഗ് ഔട്ട്',
    upiSettings: 'യുപിഐ ക്രമീകരണങ്ങൾ',
    shopDetails: 'കട വിവരങ്ങൾ',
    
    // Plans
    freePlan: 'ഫ്രീ പ്ലാൻ',
    proPlan: 'പ്രോ പ്ലാൻ',
    premiumPlan: 'പ്രീമിയം പ്ലാൻ',
    upgradeToPro: 'പ്രോയിലേക്ക് മാറുക',
    
    // Reminder Templates
    reminderTemplate: 'ഹായ് {name}, നിങ്ങളുടെ ₹{amount} ബാക്കി ഉണ്ട്. ദയവായി എത്രയും വേഗം അടയ്ക്കുക. നന്ദി! 🙏',
    reminderFriendly: 'സൗഹൃദ റിമൈൻഡർ',
    reminderFormal: 'ഔദ്യോഗിക അറിയിപ്പ്',
    reminderUrgent: 'അടിയന്തിര റിമൈൻഡർ',
    reminderFestive: 'ഉത്സവ റിമൈൻഡർ',
    selectTemplate: 'ടെംപ്ലേറ്റ് തിരഞ്ഞെടുക്കുക',
    generateImage: 'ചിത്രം ഉണ്ടാക്കുക',
    downloadImage: 'ഡൗൺലോഡ്',
    sendViaWhatsApp: 'WhatsApp-ൽ അയയ്ക്കുക',
    attachImageNote: 'ചിത്രം WhatsApp-ൽ മാനുവലായി ചേർക്കുക',
    amountDue: 'ബാക്കി തുക',
    noUpiConfigured: 'UPI ID സെറ്റ് ചെയ്തിട്ടില്ല. ക്രമീകരണങ്ങളിൽ ചേർക്കുക.',
    scanToPay: 'പേയ് ചെയ്യാൻ സ്കാൻ ചെയ്യുക',
    
    // Shop Types
    grocery: 'പലചരക്ക് കട',
    kirana: 'കിരാണ കട',
    bakery: 'ബേക്കറി',
    textiles: 'തുണിക്കട',
    hardware: 'ഹാർഡ്വെയർ',
    electronics: 'ഇലക്ട്രോണിക്സ്',
    wholesale: 'മൊത്തവ്യാപാരം',
    retail: 'ചില്ലറ വിൽപ്പന',
    barber: 'ബാർബർ ഷോപ്പ്',
    salon: 'ബ്യൂട്ടി സലൂൺ',
    medical: 'മെഡിക്കൽ സ്റ്റോർ',
    stationery: 'സ്റ്റേഷനറി',
    
    // Features
    cloudSync: 'ക്ലൗഡ് സിങ്ക്',
    offlineMode: 'ഓഫ്‌ലൈൻ മോഡ്',
    multiDevice: 'മൾട്ടി-ഡിവൈസ്',
    whatsappReminders: 'വാട്ട്സ്ആപ്പ് റിമൈൻഡർ',
    pdfExport: 'PDF എക്സ്പോർട്ട്',
    excelExport: 'Excel എക്സ്പോർട്ട്',
    billPhotos: 'ബിൽ ഫോട്ടോസ്',
    scheduledReminders: 'ഷെഡ്യൂൾഡ് റിമൈൻഡർ',
  }
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('en');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Only access localStorage on client side
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('desklite-language') || 'en';
      setLanguageState(savedLang);
      document.documentElement.lang = savedLang;
      if (savedLang === 'ml') {
        document.body.classList.add('font-malayalam');
      } else {
        document.body.classList.remove('font-malayalam');
      }
    }
    setMounted(true);
  }, []);

  const setLanguage = useCallback((lang) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('desklite-language', lang);
      document.documentElement.lang = lang;
      
      if (lang === 'ml') {
        document.body.classList.add('font-malayalam');
      } else {
        document.body.classList.remove('font-malayalam');
      }
    }
    setLanguageState(lang);
  }, []);

  const t = useCallback((key, params = {}) => {
    let text = translations[language]?.[key] || translations.en[key] || key;
    
    // Replace placeholders like {name} with actual values
    Object.keys(params).forEach(param => {
      text = text.replace(new RegExp(`{${param}}`, 'g'), params[param]);
    });
    
    return text;
  }, [language]);

  // Always render children - hooks must be called unconditionally
  // SSR will use default 'en' language

  return (
    <LanguageContext.Provider value={{ 
      language, 
      setLanguage, 
      t,
      mounted,
      languages: [
        { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
        { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳' }
      ]
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export default translations;
