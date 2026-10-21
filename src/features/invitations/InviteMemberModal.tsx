import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { isValidEmail } from '../../lib/validators';
import { X, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectName,
}) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!isValidEmail(email)) {
      setErrorMsg('Introduce un correo electrónico válido.');
      return;
    }

    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();

      // Invoke Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('manage-project-invitation', {
        body: {
          action: 'create',
          project_id: projectId,
          email: normalizedEmail,
        },
      });

      if (error) {
        // Fallback: If edge functions not running in local test, perform direct RPC / DB insert
        const { error: directErr } = await supabase.from('project_invitations').insert({
          project_id: projectId,
          email: normalizedEmail,
          invited_by: (await supabase.auth.getUser()).data.user?.id,
          status: 'pending',
        });

        if (directErr) {
          throw new Error(directErr.message.includes('unique') ? 'Ya existe una invitación pendiente para este correo.' : directErr.message);
        }
      } else if (data?.error) {
        throw new Error(data.error);
      }

      setSuccessMsg(`Invitación registrada para ${normalizedEmail}. El usuario podrá aceptarla desde su bandeja.`);
      setEmail('');
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo enviar la invitación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
          <div className="flex items-center gap-2 text-teal-700">
            <UserPlus className="w-5 h-5" />
            <h3 className="text-base font-semibold text-slate-900">Invitar Integrante</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500 mb-4">
          Proyecto: <span className="font-semibold text-slate-800">{projectName}</span>. Introduce el correo de una cuenta ya registrada para que se una al equipo.
        </p>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Correo del Estudiante o Integrante
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="companero@universidad.edu"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
            >
              Cerrar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium shadow-sm transition disabled:opacity-50"
            >
              {loading ? 'Invitando...' : 'Registrar Invitación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
