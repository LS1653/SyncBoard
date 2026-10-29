import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { validateProjectInput, sanitizeTitle } from '../../lib/validators';
import { X, FolderPlus, AlertCircle } from 'lucide-react';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (newProjectId: string) => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onProjectCreated,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const sanitizedName = sanitizeTitle(name);
    const validation = validateProjectInput(sanitizedName);
    if (!validation.valid) {
      setErrorMsg(validation.error || 'Nombre inválido.');
      return;
    }

    setLoading(true);
    try {
      // Call atomic RPC
      const { data: newProjectId, error } = await supabase.rpc('create_project_with_owner', {
        p_name: sanitizedName,
        p_description: description.trim() || null,
      });

      if (error) throw error;

      setName('');
      setDescription('');
      onClose();
      if (newProjectId) {
        onProjectCreated(newProjectId);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creando el proyecto.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
          <div className="flex items-center gap-2 text-teal-700">
            <FolderPlus className="w-5 h-5" />
            <h3 className="text-base font-semibold text-slate-900">Crear Nuevo Proyecto</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Nombre del Proyecto *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ej. Taller 1: Sistemas Distribuidos"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Descripción (opcional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Objetivos, entregables o temas del proyecto..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium shadow-sm transition disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear Proyecto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
