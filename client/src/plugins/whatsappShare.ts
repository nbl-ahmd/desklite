import { registerPlugin } from '@capacitor/core';

export interface WhatsAppSharePlugin {
  shareToContact(options: {
    phone: string;
    imagePath?: string;
    text?: string;
  }): Promise<void>;
}

export const WhatsAppShare = registerPlugin<WhatsAppSharePlugin>('WhatsAppShare', {
  web: () => ({
    shareToContact: async ({ phone, text }) => {
      console.log('[WhatsAppShare Web] Called with:', { phone, text });
      // Web fallback - open WhatsApp Web
      const cleanPhone = phone.replace(/\D/g, '');
      const encodedText = text ? encodeURIComponent(text) : '';
      const url = `https://wa.me/${cleanPhone}${text ? `?text=${encodedText}` : ''}`;
      window.open(url, '_blank');
    },
  }),
});
