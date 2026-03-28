'use client';

import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { WhatsAppShare } from '@/plugins/whatsappShare';
import { useLanguage } from '@/contexts/LanguageContext';
import { getApiToken } from '@/utils/auth';
import {
  MessageCircle, Send, Download,
  ChevronDown, X, Loader2
} from 'lucide-react';

/* ---------------- Templates ---------------- */

const TEMPLATE_TYPES = {
  en: [
    { id: 'friendly', name: 'Friendly Reminder', emoji: '👋' },
    { id: 'formal', name: 'Formal Notice', emoji: '📋' },
    { id: 'urgent', name: 'Urgent Reminder', emoji: '⚠️' },
    { id: 'festive', name: 'Festival Greeting', emoji: '🎉' },
  ],
  ml: [
    { id: 'friendly', name: 'സൗഹൃദ റിമൈൻഡർ', emoji: '👋' },
    { id: 'formal', name: 'ഔപചാരിക നോട്ടീസ്', emoji: '📋' },
    { id: 'urgent', name: 'അത്യാവശ്യ റിമൈൻഡർ', emoji: '⚠️' },
    { id: 'festive', name: 'ഉത്സവാശംസകൾ', emoji: '🎉' },
  ],
};

/* ========================================================= */

export default function WhatsAppReminderModal({
  isOpen,
  onClose,
  onSent,
  customer,
}) {
  const { language: messageLanguage } = useLanguage();

  const [selectedTemplate, setSelectedTemplate] = useState('friendly');
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const [reminderImage, setReminderImage] = useState(null);
  const [paymentLink, setPaymentLink] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [upiConfigured, setUpiConfigured] = useState(true);

  const [showTemplates, setShowTemplates] = useState(false);

  const templates = TEMPLATE_TYPES[messageLanguage] || TEMPLATE_TYPES.en;

  const amount = customer?.balance || customer?.amount || 0;
  const customerName =
    customer?._id ||
    customer?.customerName ||
    customer?.name ||
    'Customer';

  /* ---------------- Initial Load ---------------- */

  useEffect(() => {
    if (isOpen && customer) {
      const customerPhone = customer.phone || customer.customerPhone || '';
      setPhone(customerPhone);
      generateMessage();
      generateImage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, customer, selectedTemplate, messageLanguage]);

  if (!isOpen) return null;

  /* ---------------- Message Generation ---------------- */

  const generateMessage = async () => {
    if (!customer) return;

    setGenerating(true);
    try {
      const token = await getApiToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/reminders/generate-message`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            templateType: selectedTemplate,
            language: messageLanguage,
            customerName,
            amount,
            dueDate: customer.dueDate || customer.lastDueDate,
            includeQR: true,
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        setGeneratedMessage(data.message || '');
        setUpiConfigured(data.hasQR !== false);
      }
    } catch (err) {
      console.error('Error generating message:', err);
    } finally {
      setGenerating(false);
    }
  };

  /* ---------------- Image Generation ---------------- */

  const generateImage = async () => {
    if (!customer) return;

    setLoading(true);
    try {
      const token = await getApiToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/reminders/generate-image`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customerName,
            amount,
            dueDate: customer.dueDate || customer.lastDueDate,
            language: messageLanguage,
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();

        const apiBase = process.env.NEXT_PUBLIC_API_URL || '';

        const fallbackPayment = data.paymentLink ||
          (data.upiId
            ? `upi://pay?pa=${encodeURIComponent(data.upiId)}&pn=${encodeURIComponent(
                data.shopName || 'Shop'
              )}&am=${encodeURIComponent(amount)}&cu=INR`
            : '');

        const fallbackShare = data.shareUrl || '';

        setReminderImage(data.image || null);
        setPaymentLink(fallbackPayment);
        setShareUrl(fallbackShare);
        setUpiConfigured(data.hasQR !== false);
      } else {
        const error = await res.json().catch(() => ({}));
        console.error('Image generation error:', error);
      }
    } catch (err) {
      console.error('Error generating image:', err);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- Utilities ---------------- */

  const copyMessage = async () => {
    await navigator.clipboard.writeText(generatedMessage || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadImage = () => {
    if (!reminderImage) return;
    const link = document.createElement('a');
    link.href = reminderImage;
    link.download = `reminder-${customerName}.png`;
    link.click();
  };

  /* =========================================================
     CORE WHATSAPP LOGIC
     ========================================================= */

  const sendWhatsApp = async () => {
    const targetPhone = phone || customer?.phone || customer?.customerPhone;
    if (!targetPhone) {
      alert(messageLanguage === 'ml' ? 'ഫോൺ നമ്പർ നൽകുക' : 'Please enter a phone number');
      return;
    }

    setLoading(true);

    try {
      // Clean and format phone number
      const cleanPhone = targetPhone.replace(/\D/g, '');
      const formattedPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;

      // Prepare message text
      const linkPart = shareUrl
        ? `\n\nPay here: ${shareUrl}`
        : paymentLink
        ? `\n\nPay via UPI: ${paymentLink}`
        : '';
      const messageText = `${generatedMessage}${linkPart}`;

      const isNative = Capacitor.isNativePlatform();
      const platform = Capacitor.getPlatform();
      
      console.log('[WhatsAppShare] Platform check:', {
        isNative,
        platform,
        hasImage: !!reminderImage
      });

      if (!isNative) {
        // WEB: Open WhatsApp Web with text only
        console.log('[WhatsAppShare] Using web fallback');
        await WhatsAppShare.shareToContact({
          phone: formattedPhone,
          text: messageText,
        });
        onSent?.();
        onClose();
        return;
      }

      console.log('[WhatsAppShare] Using native Android sharing');

      // ANDROID: Share with image + text
      let imagePath = undefined;

      if (reminderImage) {
        try {
          // Convert image to proper format
          let imageDataUrl = reminderImage;

          // If SVG, convert to PNG
          if (reminderImage.startsWith('data:image/svg+xml')) {
            const svgText = atob(reminderImage.split(',')[1]);
            const svg = new Blob([svgText], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(svg);
            
            const img = new window.Image();
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              img.src = url;
            });

            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || 800;
            canvas.height = img.naturalHeight || 1000;
            const ctx = canvas.getContext('2d');
            // Fill white background for PNG (SVG transparency becomes white)
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            imageDataUrl = canvas.toDataURL('image/png');
            URL.revokeObjectURL(url);
          }

          // Extract base64 data
          const base64Data = imageDataUrl.split(',')[1];
          const fileName = `reminder_${Date.now()}.png`;

          // Save to cache directory
          const result = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Cache,
          });

          // Get the native file path (remove file:// prefix if present)
          imagePath = result.uri.replace('file://', '');
          
          console.log('Image saved to:', imagePath);

        } catch (err) {
          console.error('Failed to save image:', err);
          // Continue without image
        }
      }

      // Call plugin to share
      console.log('Calling WhatsAppShare.shareToContact with:', {
        phone: formattedPhone,
        imagePath: imagePath,
        hasText: !!messageText,
        textLength: messageText?.length
      });

      await WhatsAppShare.shareToContact({
        phone: formattedPhone,
        imagePath: imagePath,
        text: messageText,
      });

      console.log('WhatsApp share successful');
      onSent?.();
      onClose();

    } catch (err) {
      console.error('Error sending WhatsApp reminder:', err);
      console.error('Error details:', JSON.stringify(err));
      alert(
        messageLanguage === 'ml'
          ? 'WhatsApp തുറക്കാൻ കഴിഞ്ഞില്ല'
          : `Failed to open WhatsApp: ${err.message || err || 'Please try again'}`
      );
    } finally {
      setLoading(false);
    }
  };


  /* =========================================================
     UI
     ========================================================= */

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
                  {messageLanguage === 'ml' ? 'WhatsApp റിമൈൻഡർ' : 'WhatsApp Reminder'}
                </h2>
                <p className="text-sm text-green-100">{customerName}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* Amount */}
          <div className="bg-rose-50 rounded-2xl p-4 text-center">
            <p className="text-sm text-rose-600 font-medium">
              {messageLanguage === 'ml' ? 'ബാക്കി തുക' : 'Amount Due'}
            </p>
            <p className="text-3xl font-black text-rose-700">
              ₹{amount.toLocaleString('en-IN')}
            </p>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">
              {messageLanguage === 'ml' ? 'ഫോൺ നമ്പർ (WhatsApp)' : 'Phone (WhatsApp)'}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={messageLanguage === 'ml' ? 'ഫോൺ നമ്പർ നൽകുക' : 'Enter phone number'}
              className="w-full px-4 py-3 bg-slate-50 border rounded-xl"
            />
          </div>

          {/* Template Selector */}
          <div className="relative">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="w-full px-4 py-3 bg-slate-50 rounded-xl flex justify-between"
            >
              <span>
                {templates.find(t => t.id === selectedTemplate)?.emoji}{' '}
                {templates.find(t => t.id === selectedTemplate)?.name}
              </span>
              <ChevronDown />
            </button>

            {showTemplates && (
              <div className="absolute top-full left-0 right-0 bg-white border rounded-xl mt-2 z-10">
                {templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSelectedTemplate(t.id);
                      setShowTemplates(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-slate-50"
                  >
                    {t.emoji} {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Message Preview */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-sm font-bold">
                {messageLanguage === 'ml' ? 'സന്ദേശം' : 'Message'}
              </label>
              <button onClick={copyMessage} className="text-xs">
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-sm whitespace-pre-wrap">
              {generating ? 'Generating…' : generatedMessage}
            </div>
          </div>

          {/* Image Preview */}
          {reminderImage && (
            <div className="bg-blue-50 rounded-2xl p-4 space-y-3">
              <img
                src={reminderImage}
                alt="Reminder"
                className="w-full rounded-lg border"
              />
              <div className="flex gap-2">
                <button onClick={downloadImage} className="flex-1 bg-white border rounded-lg py-2">
                  <Download className="inline w-4 h-4" /> Download
                </button>
                <button onClick={generateImage} className="flex-1 bg-blue-500 text-white rounded-lg py-2">
                  Regenerate
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t">
          <button
            onClick={sendWhatsApp}
            disabled={loading || !generatedMessage}
            className="w-full py-3 bg-green-500 text-white font-bold rounded-2xl flex justify-center items-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            {messageLanguage === 'ml' ? 'WhatsApp-ൽ അയയ്ക്കുക' : 'Send via WhatsApp'}
          </button>
        </div>

      </div>
    </div>
  );
}
