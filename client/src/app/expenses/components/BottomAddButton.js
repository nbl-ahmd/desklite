'use client';

import { useRouter } from 'next/navigation';

export default function BottomAddButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push('/expenses')}
      className="fixed bottom-6 right-6 md:hidden bg-primary-600 text-white p-4 rounded-full shadow-lg"
      aria-label="Open expense"
    >
      +
    </button>
  );
}
