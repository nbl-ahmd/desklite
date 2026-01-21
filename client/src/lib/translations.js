// Translations for the app - English and Malayalam
const translations = {
  en: {
    // Navigation
    home: 'Home',
    customers: 'Customers',
    khata: 'Khata',
    transactions: 'Transactions',
    reports: 'Reports',
    settings: 'Settings',
    menu: 'Menu',
    
    // Dashboard
    todaySummary: "Today's Summary",
    totalIncome: 'Total Income',
    totalExpense: 'Total Expense',
    netBalance: 'Net Balance',
    recentActivity: 'Recent Activity',
    seeAll: 'See All',
    
    // Transactions
    income: 'Income',
    expense: 'Expense',
    cash: 'Cash',
    upi: 'UPI',
    online: 'Online',
    credit: 'Credit',
    amount: 'Amount',
    customerName: 'Customer Name',
    phoneNumber: 'Phone Number',
    note: 'Note',
    paymentMethod: 'Payment Method',
    
    // Customer/Khata
    toReceive: 'Receivables',
    toPay: 'Payables',
    totalCustomers: 'Total Customers',
    overdueBy: 'Overdue by',
    days: 'days',
    sendReminder: 'Send Reminder',
    
    // Actions
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    
    // Messages
    noTransactions: 'No transactions found',
    noCustomers: 'No customers found',
    transactionSaved: 'Transaction saved!',
    reminderSent: 'Reminder sent!',
    
    // Misc
    today: 'Today',
    yesterday: 'Yesterday',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
    allTime: 'All Time',
  },
  
  ml: {
    // Navigation
    home: 'ഹോം',
    customers: 'കസ്റ്റമേഴ്സ്',
    khata: 'ഖാത',
    transactions: 'ഇടപാടുകൾ',
    reports: 'റിപ്പോർട്ടുകൾ',
    settings: 'ക്രമീകരണങ്ങൾ',
    menu: 'മെനു',
    
    // Dashboard
    todaySummary: 'ഇന്നത്തെ സംഗ്രഹം',
    totalIncome: 'ആകെ വരുമാനം',
    totalExpense: 'ആകെ ചെലവ്',
    netBalance: 'ബാക്കി',
    recentActivity: 'സമീപകാല ഇടപാടുകൾ',
    seeAll: 'എല്ലാം കാണുക',
    
    // Transactions
    income: 'വരുമാനം',
    expense: 'ചെലവ്',
    cash: 'കാശ്',
    upi: 'യുപിഐ',
    online: 'ഓൺലൈൻ',
    credit: 'കടം',
    amount: 'തുക',
    customerName: 'ഉപഭോക്താവിന്റെ പേര്',
    phoneNumber: 'ഫോൺ നമ്പർ',
    note: 'കുറിപ്പ്',
    paymentMethod: 'പേയ്മെന്റ് രീതി',
    
    // Customer/Khata
    toReceive: 'കിട്ടാനുള്ളത്',
    toPay: 'കൊടുക്കാനുള്ളത്',
    totalCustomers: 'ആകെ കസ്റ്റമേഴ്സ്',
    overdueBy: 'കാലഹരണപ്പെട്ടത്',
    days: 'ദിവസങ്ങൾ',
    sendReminder: 'ഓർമ്മിപ്പിക്കൂ',
    
    // Actions
    save: 'സേവ് ചെയ്യുക',
    cancel: 'റദ്ദാക്കുക',
    delete: 'ഇല്ലാതാക്കുക',
    edit: 'എഡിറ്റ് ചെയ്യുക',
    add: 'ചേർക്കുക',
    search: 'തിരയുക',
    
    // Messages
    noTransactions: 'ഇടപാടുകൾ ഇല്ല',
    noCustomers: 'കസ്റ്റമേഴ്സ് ഇല്ല',
    transactionSaved: 'ഇടപാട് സേവ് ചെയ്തു!',
    reminderSent: 'ഓർമ്മിപ്പിക്കൽ അയച്ചു!',
    
    // Misc
    today: 'ഇന്ന്',
    yesterday: 'ഇന്നലെ',
    thisWeek: 'ഈ ആഴ്ച',
    thisMonth: 'ഈ മാസം',
    allTime: 'എല്ലാ സമയവും',
  }
};

// Get the current language from localStorage
export function getCurrentLanguage() {
  if (typeof window === 'undefined') return 'en';
  return localStorage.getItem('language') || 'en';
}

// Set the language
export function setLanguage(lang) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('language', lang);
    window.dispatchEvent(new Event('languageChange'));
  }
}

// Get a translation
export function t(key) {
  const lang = getCurrentLanguage();
  return translations[lang]?.[key] || translations.en[key] || key;
}

// Hook for using translations in components
export function useTranslation() {
  return {
    t,
    currentLanguage: getCurrentLanguage(),
    setLanguage,
    languages: [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' }
    ]
  };
}

export default translations;
