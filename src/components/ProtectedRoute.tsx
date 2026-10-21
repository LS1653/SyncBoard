import React from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { AuthPage } from '../pages/AuthPage';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-teal-600 animate-spin" />
        <p className="mt-4 text-sm font-medium text-slate-600">Cargando SyncBoard...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <>{children}</>;
};
