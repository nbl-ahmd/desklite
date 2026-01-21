import { Inter } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import './globals.css';
import Providers from '@/components/Providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: {
    default: 'Desklite - Smart Business Management',
    template: '%s | Desklite'
  },
  description: 'Simple yet powerful transaction management for small businesses',
  keywords: ['PWA', 'business ledger', 'khata', 'inventory', 'billing', 'POS', 'receivables', 'payables'],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'),
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Desklite'
  },
  openGraph: {
    title: 'Desklite - Smart Business Management',
    description: 'Manage sales, expenses, receivables, and payables even offline.',
    url: 'https://desklite.vercel.app',
    siteName: 'Desklite',
    locale: 'en_US',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Desklite - Smart Business Management',
    description: 'Lightweight ledger, reminders, and reports that work offline.',
  }
};

export const viewport = {
  themeColor: '#2563eb'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={inter.className}>
        <Providers>
          <AuthProvider>
            <SubscriptionProvider>
              {children}
            </SubscriptionProvider>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}