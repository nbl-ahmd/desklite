'use client';

import DashboardLayoutComponent from '@/components/DashboardLayout';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function DashboardLayout({ children }) {
  return (
    <ProtectedRoute>
      <DashboardLayoutComponent>
        {children}
      </DashboardLayoutComponent>
    </ProtectedRoute>
  );
}