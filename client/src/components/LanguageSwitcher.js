'use client';

import { useState } from 'react';
import { Globe, Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LanguageSwitcher({ compact = false }) {
  const { language, setLanguage, languages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (langCode) => {
    setLanguage(langCode);
    setIsOpen(false);
    // No need to reload - context will re-render everything
  };

  const currentLanguage = languages.find(l => l.code === language) || languages[0];

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
        >
          <span className="text-lg">{currentLanguage.flag}</span>
          <span className="text-sm font-bold text-slate-700">{currentLanguage.code.toUpperCase()}</span>
        </button>
        
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsOpen(false)} 
            />
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-20">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleSelect(lang.code)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors"
                >
                  <span className="text-lg">{lang.flag}</span>
                  <span className="flex-1 text-left font-medium text-slate-900">{lang.nativeName}</span>
                  {language === lang.code && (
                    <Check className="w-4 h-4 text-green-500" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
          <Globe className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900">Language / ഭാഷ</h3>
          <p className="text-xs text-slate-500">Choose your preferred language</p>
        </div>
      </div>
      
      <div className="divide-y divide-slate-100">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleSelect(lang.code)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <span className="text-2xl">{lang.flag}</span>
              <div className="text-left">
                <p className="font-bold text-slate-900">{lang.nativeName}</p>
                <p className="text-xs text-slate-500">{lang.name}</p>
              </div>
            </div>
            {language === lang.code && (
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
