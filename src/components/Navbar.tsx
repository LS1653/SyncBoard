import React, { useState } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { LayoutDashboard, LogOut, Bell, User as UserIcon, X, Check } from 'lucide-react';

interface NavbarProps {
  onGoHome: () => void;
  pendingInvitationsCount?: number;
  onOpenInvitations: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onGoHome,
  pendingInvitationsCount = 0,
  onOpenInvitations,
}) => {
  const { user, profile, signOut, updateDisplayName } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState(profile?.display_name || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDisplayName.trim()) return;

    setSavingProfile(true);
    setProfileMsg(null);
    const { error } = await updateDisplayName(newDisplayName.trim());
    setSavingProfile(false);

    if (error) {
      setProfileMsg({ type: 'error', text: error.message });
    } else {
      setProfileMsg({ type: 'success', text: 'Nombre actualizado correctamente.' });
      setTimeout(() => setShowProfileModal(false), 1200);
    }
  };

  return (
    <>
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo / Brand */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={onGoHome}>
              <div className="p-2 bg-teal-500/10 rounded-lg border border-teal-500/20">
                <LayoutDashboard className="w-5 h-5 text-teal-400" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                Sync<span className="text-teal-400">Board</span>
              </span>
            </div>

            {/* Acciones de usuario */}
            <div className="flex items-center gap-3">
              {/* Notificación de invitaciones */}
              <button
                type="button"
                onClick={onOpenInvitations}
                className="relative p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
                title="Invitaciones recibidas"
                aria-label="Invitaciones recibidas"
              >
                <Bell className="w-5 h-5" />
                {pendingInvitationsCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-teal-500 text-[10px] font-bold text-slate-950">
                    {pendingInvitationsCount}
                  </span>
                )}
              </button>

              {/* Perfil */}
              <button
                type="button"
                onClick={() => {
                  setNewDisplayName(profile?.display_name || '');
                  setProfileMsg(null);
                  setShowProfileModal(true);
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700/80 rounded-lg transition border border-slate-700"
              >
                <UserIcon className="w-4 h-4 text-teal-400" />
                <span className="max-w-[120px] sm:max-w-[180px] truncate">
                  {profile?.display_name || user?.email?.split('@')[0]}
                </span>
              </button>

              {/* Salir */}
              <button
                type="button"
                onClick={() => signOut()}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Modal de Edición de Perfil */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="text-base font-semibold text-slate-900">Perfil de Usuario</h3>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {profileMsg && (
              <div
                className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${
                  profileMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {profileMsg.type === 'success' ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <X className="w-4 h-4 text-red-600" />
                )}
                <span>{profileMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="text"
                  disabled
                  value={user?.email || ''}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Nombre Visible
                </label>
                <input
                  type="text"
                  required
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="Tu nombre y apellido"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-4 py-2 text-sm bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium shadow-sm transition disabled:opacity-50"
                >
                  {savingProfile ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
