import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './features/auth/AuthContext';
import { supabase } from './lib/supabase';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { ReceivedInvitationsModal } from './features/invitations/ReceivedInvitationsModal';

export const App: React.FC = () => {
  const { user } = useAuth();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [pendingInvitationsCount, setPendingInvitationsCount] = useState<number>(0);
  const [invitationsModalOpen, setInvitationsModalOpen] = useState<boolean>(false);

  const fetchPendingInvitationsCount = useCallback(async () => {
    if (!user?.email) {
      setPendingInvitationsCount(0);
      return;
    }

    try {
      const normalizedEmail = user.email.toLowerCase();
      const { count, error } = await supabase
        .from('project_invitations')
        .select('*', { count: 'exact', head: true })
        .eq('email', normalizedEmail)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString());

      if (!error && typeof count === 'number') {
        setPendingInvitationsCount(count);
      }
    } catch (err) {
      console.error('Error obteniendo conteo de invitaciones:', err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchPendingInvitationsCount();
    }
  }, [user, fetchPendingInvitationsCount]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar
          onGoHome={() => setSelectedProjectId(null)}
          pendingInvitationsCount={pendingInvitationsCount}
          onOpenInvitations={() => setInvitationsModalOpen(true)}
        />

        <main className="flex-1">
          {selectedProjectId ? (
            <ProjectDetailPage
              projectId={selectedProjectId}
              onBack={() => setSelectedProjectId(null)}
            />
          ) : (
            <DashboardPage
              onSelectProject={(id) => setSelectedProjectId(id)}
              pendingInvitationsCount={pendingInvitationsCount}
              onOpenInvitations={() => setInvitationsModalOpen(true)}
            />
          )}
        </main>

        <ReceivedInvitationsModal
          isOpen={invitationsModalOpen}
          onClose={() => setInvitationsModalOpen(false)}
          onInvitationAccepted={() => {
            fetchPendingInvitationsCount();
          }}
        />
      </div>
    </ProtectedRoute>
  );
};

export default App;
