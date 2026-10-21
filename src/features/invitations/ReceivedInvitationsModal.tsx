import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ProjectInvitation } from '../../types/database.types';
import { useAuth } from '../auth/AuthContext';
import { formatDate } from '../../lib/formatters';
import { X, Mail, Check, AlertCircle, Inbox } from 'lucide-react';

interface ReceivedInvitationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvitationAccepted: () => void;
}

export const ReceivedInvitationsModal: React.FC<ReceivedInvitationsModalProps> = ({
  isOpen,
  onClose,
  onInvitationAccepted,
}) => {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchInvitations = async () => {
    if (!user?.email) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const normalizedEmail = user.email.toLowerCase();
      const { data, error } = await supabase
        .from('project_invitations')
        .select(`
          id,
          project_id,
          email,
          status,
          expires_at,
          created_at,
          projects:project_id (id, name, description)
        `)
        .eq('email', normalizedEmail)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations((data as any) || []);
    } catch (err: any) {
      console.error('Error cargando invitaciones:', err);
      setErrorMsg('No se pudieron consultar las invitaciones.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchInvitations();
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleAccept = async (invitationId: string) => {
    setActionLoadingId(invitationId);
    setErrorMsg(null);
    try {
      // Execute transactional RPC
      const { data, error } = await supabase.rpc('accept_project_invitation', {
        p_invitation_id: invitationId,
      });

      if (error) throw error;
      if (data && data.success) {
        setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
        onInvitationAccepted();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al aceptar la invitación.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (invitationId: string) => {
    setActionLoadingId(invitationId);
    setErrorMsg(null);
    try {
      const { error } = await supabase
        .from('project_invitations')
        .update({ status: 'rejected' })
        .eq('id', invitationId);

      if (error) throw error;
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al rechazar la invitación.');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
          <div className="flex items-center gap-2 text-teal-700">
            <Inbox className="w-5 h-5" />
            <h3 className="text-base font-semibold text-slate-900">Bandeja de Invitaciones</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500">Cargando invitaciones...</div>
        ) : invitations.length === 0 ? (
          <div className="py-10 text-center">
            <Mail className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">No tienes invitaciones pendientes</p>
            <p className="text-xs text-slate-400 mt-1">
              Cuando un líder de proyecto te invite por tu correo, aparecerá aquí.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {invitations.map((inv) => {
              const project = inv.projects;
              const isActionRunning = actionLoadingId === inv.id;

              return (
                <div
                  key={inv.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{project?.name || 'Proyecto'}</h4>
                    {project?.description && (
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{project.description}</p>
                    )}
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Expira: {formatDate(inv.expires_at)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      disabled={isActionRunning}
                      onClick={() => handleReject(inv.id)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                    <button
                      type="button"
                      disabled={isActionRunning}
                      onClick={() => handleAccept(inv.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isActionRunning ? 'Aceptando...' : 'Aceptar'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
