'use client';

import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

// Dynamically import the Share plugin only on native
let Share;
if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
  // Use dynamic import to avoid SSR issues
  import('@capacitor/share').then((mod) => {
    Share = mod.Share;
  });
}
import { useLanguage } from '@/contexts/LanguageContext';
import { getApiToken } from '@/utils/auth';
import { 
  MessageCircle, Image, QrCode, Send, Download, 
  Copy, Check, Loader2, X, ChevronDown, Settings
} from 'lucide-react';

const TEMPLATE_TYPES = {
  en: [
    { id: 'friendly', name: 'Friendly Reminder', emoji: '👋' },
    { id: 'formal', name: 'Formal Notice', emoji: '📋' },
    { id: 'urgent', name: 'Urgent Reminder', emoji: '⚠️' },
    { id: 'festive', name: 'Festival Greeting', emoji: '🎉' },
  ],
  ml: [
    { id: 'friendly', name: 'സൗഹൃദ റിമൈൻഡർ', emoji: '👋' },
    { id: 'formal', name: 'ഔദ്യോഗിക അറിയിപ്പ്', emoji: '📋' },
    { id: 'urgent', name: 'അടിയന്തിര റിമൈൻഡർ', emoji: '⚠️' },
    { id: 'festive', name: 'ഉത്സവ റിമൈൻഡർ', emoji: '🎉' },
  ],
};

export default function WhatsAppReminderModal({ 
  isOpen, 
  onClose, 
  customer, 
  onSent 
}) {
  const { language, t } = useLanguage();
  const [selectedTemplate, setSelectedTemplate] = useState('friendly');
  const [messageLanguage, setMessageLanguage] = useState(language);
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [reminderImage, setReminderImage] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [paymentLink, setPaymentLink] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [upiIdResp, setUpiIdResp] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [phone, setPhone] = useState('');
  const [includeImage, setIncludeImage] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [upiConfigured, setUpiConfigured] = useState(true);

  const templates = TEMPLATE_TYPES[messageLanguage] || TEMPLATE_TYPES.en;

  useEffect(() => {
    if (isOpen && customer) {
      const customerPhone = customer.phone || customer.customerPhone || '';
      setPhone(customerPhone);
      generateMessage();
      // Auto-generate the branded card when modal opens
      generateImage();
    }
  }, [isOpen, customer, selectedTemplate, messageLanguage]);

  const generateMessage = async () => {
    if (!customer) return;
    
    setGenerating(true);
    try {
      const token = await getApiToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reminders/generate-message`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          templateType: selectedTemplate,
          language: messageLanguage,
          customerName: customer._id || customer.customerName || customer.name,
          amount: customer.balance || customer.amount || 0,
          dueDate: customer.dueDate || customer.lastDueDate,
          includeQR: true
        })
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedMessage(data.message);
        setUpiConfigured(data.hasQR);
      }
    } catch (err) {
      console.error('Error generating message:', err);
    } finally {
      setGenerating(false);
    }
  };

  const generateImage = async () => {
    if (!customer) return;
    
    setLoading(true);
    try {
      const token = await getApiToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reminders/generate-image`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerName: customer._id || customer.customerName || customer.name,
          amount: customer.balance || customer.amount || 0,
          dueDate: customer.dueDate || customer.lastDueDate,
          language: messageLanguage
        })
      });

      if (res.ok) {
        const data = await res.json();
        const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
        const fallbackPayment = (!data.paymentLink && data.upiId)
          ? `upi://pay?pa=${encodeURIComponent(data.upiId)}&pn=${encodeURIComponent(data.shopName || 'Shop')}&am=${encodeURIComponent(customer.balance || customer.amount || 0)}&cu=INR`
          : data.paymentLink;
        const fallbackShare = data.shareUrl || (apiBase && data.upiId
          ? `${apiBase}/api/reminders/share-card?customerName=${encodeURIComponent(customer._id || customer.customerName || customer.name)}&amount=${encodeURIComponent(customer.balance || customer.amount || 0)}&dueDate=${encodeURIComponent(customer.dueDate || customer.lastDueDate || '')}&language=${messageLanguage}&shopName=${encodeURIComponent(data.shopName || 'Shop')}&shopPhone=${encodeURIComponent(data.shopPhone || '')}&upiId=${encodeURIComponent(data.upiId)}`
          : '');

        setReminderImage(data.image || data.qr);
        setQrCode(data.qr);
        setPaymentLink(fallbackPayment || '');
        setShareUrl(fallbackShare);
        setUpiIdResp(data.upiId || '');
        setUpiConfigured(true);
      } else {
        const error = await res.json();
        if (error.code === 'NO_UPI_ID') {
          setUpiConfigured(false);
        }
      }
    } catch (err) {
      console.error('Error generating image:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyMessage = async () => {
    await navigator.clipboard.writeText(generatedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadImage = () => {
    if (!reminderImage) return;
    
    const link = document.createElement('a');
    link.href = reminderImage;
    link.download = `upi-qr-${customer._id || customer.customerName || 'payment'}.png`;
    link.click();
  };

  const sendWhatsApp = async () => {
    const targetPhone = phone || customer.phone || customer.customerPhone;
    if (!targetPhone) {
      alert(language === 'ml' ? 'ഫോൺ നമ്പർ ചേർക്കുക' : 'Please enter a phone number');
      return;
    }

    setLoading(true);
    try {
      // Log the reminder
      const token = await getApiToken();
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reminders/send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transactionId: customer.transactionId || customer._id,
          method: 'whatsapp'
        })
      });

      // Format phone number
      const cleanPhone = targetPhone.replace(/\D/g, '');
      const formattedPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
      const linkPart = shareUrl ? `\n\nPay here: ${shareUrl}` : (paymentLink ? `\n\nPay via UPI: ${paymentLink}` : '');
      const messageToSend = `${generatedMessage}${linkPart}`;

      if (Capacitor.isNativePlatform()) {
        // Use native sharing intent for WhatsApp
        try {
          // Dynamically import Share plugin if not already loaded
          if (!Share) {
            const mod = await import('@capacitor/share');
            Share = mod.Share;
          }
          // If image is available, share both image and text
          if (reminderImage) {
            await Share.share({
              title: 'Payment Reminder',
              text: messageToSend,
              url: reminderImage,
              dialogTitle: 'Share via WhatsApp'
            });
          } else {
            await Share.share({
              title: 'Payment Reminder',
              text: messageToSend,
              dialogTitle: 'Share via WhatsApp'
            });
          }
        } catch (err) {
          alert('Native sharing failed. Please try again.');
          console.error('Native WhatsApp share error:', err);
        }
      } else {
        // Web/PWA: Open WhatsApp web link
        const whatsappUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(messageToSend)}`;
        window.open(whatsappUrl, '_blank');
      }

      onSent?.();
      onClose();
    } catch (err) {
      console.error('Error sending reminder:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const amount = customer?.balance || customer?.amount || 0;
  const customerName = customer?._id || customer?.customerName || customer?.name || 'Customer';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-lg">
                  {language === 'ml' ? 'WhatsApp റിമൈൻഡർ' : 'WhatsApp Reminder'}
                </h2>
                <p className="text-sm text-green-100">{customerName}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Amount Display */}
          <div className="bg-rose-50 rounded-2xl p-4 text-center">
            <p className="text-sm text-rose-600 font-medium">
              {language === 'ml' ? 'ബാക്കി തുക' : 'Amount Due'}
            </p>
            <p className="text-3xl font-black text-rose-700">
              ₹{amount.toLocaleString('en-IN')}
            </p>
          </div>

          {/* Phone Entry (for WhatsApp) */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">
              {language === 'ml' ? 'ഫോൺ നമ്പർ (WhatsApp)' : 'Phone (WhatsApp)'}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={language === 'ml' ? 'ഫോൺ നമ്പർ നൽകുക' : 'Enter phone number'}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-green-500/30 outline-none"
            />
            {!phone && (
              <p className="text-xs text-amber-600 font-semibold">
                {language === 'ml' ? 'WhatsApp അയയ്ക്കാൻ ഫോൺ ആവശ്യമാണ്' : 'Phone is required to send WhatsApp'}
              </p>
            )}
          </div>

          {/* Language Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setMessageLanguage('en')}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
                messageLanguage === 'en' 
                  ? 'bg-slate-900 text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setMessageLanguage('ml')}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
                messageLanguage === 'ml' 
                  ? 'bg-slate-900 text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              മലയാളം
            </button>
          </div>

          {/* Template Selection */}
          <div className="relative">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="w-full px-4 py-3 bg-slate-50 rounded-xl flex items-center justify-between hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{templates.find(t => t.id === selectedTemplate)?.emoji}</span>
                <span className="font-medium text-slate-700">
                  {templates.find(t => t.id === selectedTemplate)?.name}
                </span>
              </div>
              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
            </button>
            
            {showTemplates && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-10">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => {
                      setSelectedTemplate(template.id);
                      setShowTemplates(false);
                    }}
                    className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors ${
                      selectedTemplate === template.id ? 'bg-slate-50' : ''
                    }`}
                  >
                    <span className="text-lg">{template.emoji}</span>
                    <span className="font-medium text-slate-700">{template.name}</span>
                    {selectedTemplate === template.id && (
                      <Check className="w-4 h-4 text-green-500 ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Message Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-700">
                {language === 'ml' ? 'സന്ദേശം' : 'Message'}
              </label>
              <button
                onClick={copyMessage}
                className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-700"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
              {generating ? (
                <div className="flex items-center gap-2 text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {language === 'ml' ? 'ജനറേറ്റ് ചെയ്യുന്നു...' : 'Generating...'}
                </div>
              ) : (
                generatedMessage || (language === 'ml' ? 'സന്ദേശം ഇല്ല' : 'No message generated')
              )}
            </div>
          </div>

          {/* Image Option */}
          <div className="bg-blue-50 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Image className="w-5 h-5 text-blue-600" />
                <span className="font-bold text-slate-700">
                  {language === 'ml' ? 'ബ്രാൻഡഡ് പേയ്‌മെന്റ് കാർഡ്' : 'Branded payment card'}
                </span>
              </div>
              <button
                onClick={generateImage}
                disabled={loading || !upiConfigured}
                className="px-3 py-1.5 bg-blue-500 text-white text-xs font-bold rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <QrCode className="w-3 h-3" />}
                {language === 'ml' ? 'ജനറേറ്റ്' : 'Generate'}
              </button>
            </div>
            
            {!upiConfigured && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <Settings className="w-3 h-3" />
                {language === 'ml' 
                  ? 'UPI ID സെറ്റ് ചെയ്തിട്ടില്ല. ക്രമീകരണങ്ങളിൽ ചേർക്കുക.' 
                  : 'UPI ID not set. Add it in Settings.'}
              </p>
            )}

            {reminderImage && (
              <div className="space-y-3">
                <div className="bg-white rounded-xl p-3 text-center space-y-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {language === 'ml' ? 'പ്രിവ്യൂ' : 'Preview (WhatsApp optimized 1200×630)'}
                  </p>
                  <img 
                    src={reminderImage} 
                    alt="Payment Reminder" 
                    className="w-full rounded-lg border border-slate-100 aspect-[1200/630] object-cover"
                  />
                </div>
                
                {/* Share link with preview */}
                {shareUrl && (
                  <div className="bg-green-50 rounded-xl p-3 space-y-2 border border-green-100">
                    <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider">
                      {language === 'ml' ? 'പേയ്മെന്റ് പേജ് ലിങ്ക്' : 'Payment Page Link'}
                    </p>
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        value={shareUrl} 
                        readOnly 
                        className="flex-1 text-xs font-mono bg-white border border-green-200 rounded-lg px-2 py-2 text-slate-700 truncate"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(shareUrl);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="p-2 bg-white border border-green-200 rounded-lg text-green-700 hover:bg-green-50 flex-shrink-0"
                        title="Copy"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => window.open(shareUrl, '_blank')}
                        className="flex-1 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700"
                      >
                        {language === 'ml' ? 'പേജ് തുറക്കുക' : 'Open Page'}
                      </button>
                      <button
                        onClick={downloadImage}
                        className="flex-1 py-2 bg-white border border-green-200 text-green-700 rounded-lg text-xs font-bold hover:bg-green-50 flex items-center justify-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        {language === 'ml' ? 'ഡൗൺലോഡ്' : 'Download'}
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Direct UPI link fallback */}
                {paymentLink && !shareUrl && (
                  <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {language === 'ml' ? 'UPI ലിങ്ക്' : 'Direct UPI Link'}
                    </p>
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        value={paymentLink} 
                        readOnly 
                        className="flex-1 text-xs font-mono bg-white border border-slate-200 rounded-lg px-2 py-2 text-slate-700 truncate"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(paymentLink);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 flex-shrink-0"
                        title="Copy"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <button
                      onClick={downloadImage}
                      className="w-full py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100 flex items-center justify-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      {language === 'ml' ? 'ചിത്രം ഡൗൺലോഡ്' : 'Download Image'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button
            onClick={sendWhatsApp}
            disabled={loading || !generatedMessage}
            className="w-full py-3.5 bg-green-500 text-white font-bold rounded-2xl hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-green-500/30 transition-all active:scale-98"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Send className="w-5 h-5" />
                {language === 'ml' ? 'WhatsApp-ൽ അയയ്ക്കുക' : 'Send via WhatsApp'}
              </>
            )}
          </button>
          <p className="text-xs text-center text-slate-400 mt-2">
            {language === 'ml' 
              ? 'ലിങ്ക് മെസേജിൽ ഉൾപ്പെടുത്തും' 
              : 'Link will be included in the message'}
          </p>
        </div>
      </div>
    </div>
  );
}
