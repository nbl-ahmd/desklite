import { Inter } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import '@/app/globals.css';
import Providers from '@/components/Providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Ledger Book - Transaction Management',
  description: 'A simple transaction management app for small businesses',
  manifest: '/manifest.json'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <AuthProvider>
            {children}
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
} 