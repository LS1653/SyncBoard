import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Project, ProjectMember } from '../types/database.types';
import { useAuth } from '../features/auth/AuthContext';
import { KanbanBoard } from '../features/tasks/KanbanBoard';
import { ActivityFeed } from '../features/activity/ActivityFeed';
import { ProjectSettingsModal } from '../features/projects/ProjectSettingsModal';
import { InviteMemberModal } from '../features/invitations/InviteMemberModal';
import { ArrowLeft, Settings, UserPlus, Trello, Activity, ShieldCheck } from 'lucide-react';

interface ProjectDetailPageProps {
  projectId: string;
  onBack: () => void;
}

export const ProjectDetailPage: React.FC<ProjectDetailPageProps> = ({ projectId, onBack }) => {
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'kanban' | 'activity'>('kanban');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const fetchProjectData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // 1. Fetch project info
      const { data: projData, error: projErr } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .is('deleted_at', null)
        .single();

      if (projErr || !projData) {
        throw new Error('Proyecto no encontrado o eliminado.');
      }
      setProject(projData as Project);

      // 2. Fetch members
      const { data: memData, error: memErr } = await supabase
        .from('project_members')
        .select(`
          project_id,
          user_id,
          role,
          joined_at,
          profiles:user_id (id, display_name)
        `)
        .eq('project_id', projectId);

      if (memErr) throw memErr;
      setMembers((memData as any) || []);
    } catch (err: any) {
      console.error('Error cargando proyecto:', err);
      setErrorMsg(err.message || 'Error cargando datos del proyecto.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProjectData();

    // Supabase Realtime subscription for project members and details
    const memberChannel = supabase
      .channel(`members-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_members',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          fetchProjectData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(memberChannel);
    };
  }, [projectId, fetchProjectData]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse space-y-4">
        <div className="h-8 bg-slate-200 rounded w-48" />
        <div className="h-4 bg-slate-200 rounded w-96" />
        <div className="h-96 bg-slate-200 rounded-2xl mt-6" />
      </div>
    );
  }

  if (errorMsg || !project) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h3 className="text-lg font-bold text-slate-800 mb-2">No se pudo abrir el proyecto</h3>
        <p className="text-sm text-slate-500 mb-6">{errorMsg || 'El proyecto ha sido eliminado.'}</p>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-semibold transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a mis proyectos
        </button>
      </div>
    );
  }

  const isOwner = project.owner_id === user?.id;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Barra Superior del Proyecto */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Todos los proyectos</span>
          </button>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{project.name}</h1>
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                isOwner
                  ? 'bg-purple-100 text-purple-700 border border-purple-200'
                  : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              {isOwner && <ShieldCheck className="w-3 h-3" />}
              {isOwner ? 'Propietario' : 'Integrante'}
            </span>
          </div>

          {project.description && (
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">{project.description}</p>
          )}
        </div>

        {/* Acciones del Proyecto e Integrantes */}
        <div className="flex items-center gap-3">
          {/* Mini avatares de integrantes */}
          <div className="hidden sm:flex items-center -space-x-2 overflow-hidden py-1">
            {members.slice(0, 4).map((m) => {
              const name = (m.profiles as any)?.display_name || 'U';
              return (
                <div
                  key={m.user_id}
                  title={`${name} (${m.role})`}
                  className="inline-block h-7 w-7 rounded-full ring-2 ring-white bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center uppercase"
                >
                  {name.charAt(0)}
                </div>
              );
            })}
            {members.length > 4 && (
              <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-slate-200 text-[10px] font-bold text-slate-600 ring-2 ring-white">
                +{members.length - 4}
              </span>
            )}
          </div>

          {isOwner && (
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-lg text-xs font-semibold shadow-sm transition"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invitar</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span>Configuración</span>
          </button>
        </div>
      </div>

      {/* Pestañas de Vista (Kanban / Actividad) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('kanban')}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            activeTab === 'kanban'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Trello className="w-4 h-4" />
          <span>Tablero Kanban</span>
        </button>

        <button
          onClick={() => setActiveTab('activity')}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            activeTab === 'activity'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Historial de Actividad</span>
        </button>
      </div>

      {/* Contenido según pestaña activa */}
      {activeTab === 'kanban' ? (
        <KanbanBoard projectId={project.id} members={members} />
      ) : (
        <ActivityFeed projectId={project.id} />
      )}

      {/* Modal de Configuración y Miembros */}
      <ProjectSettingsModal
        project={project}
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onProjectUpdated={(updated) => setProject((prev) => (prev ? { ...prev, ...updated } : null))}
        onProjectDeleted={() => onBack()}
        onOpenInviteMember={() => setInviteOpen(true)}
      />

      {/* Modal para Invitar Integrante */}
      <InviteMemberModal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        projectId={project.id}
        projectName={project.name}
      />
    </div>
  );
};
