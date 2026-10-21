import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Project } from '../types/database.types';
import { useAuth } from '../features/auth/AuthContext';
import { ProjectsList } from '../features/projects/ProjectsList';
import { CreateProjectModal } from '../features/projects/CreateProjectModal';
import { Mail, ArrowRight } from 'lucide-react';

interface DashboardPageProps {
  onSelectProject: (projectId: string) => void;
  pendingInvitationsCount: number;
  onOpenInvitations: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onSelectProject,
  pendingInvitationsCount,
  onOpenInvitations,
}) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const fetchUserProjects = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Query projects where user is member and deleted_at is null
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          project_id,
          role,
          projects:project_id (
            id,
            name,
            description,
            owner_id,
            created_at,
            updated_at,
            deleted_at
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      const activeProjects: Project[] = [];
      data?.forEach((item: any) => {
        if (item.projects && item.projects.deleted_at === null) {
          activeProjects.push(item.projects);
        }
      });

      // Sort by creation desc
      activeProjects.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setProjects(activeProjects);
    } catch (err) {
      console.error('Error cargando proyectos del usuario:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUserProjects();
  }, [fetchUserProjects]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Banner de Invitaciones Pendientes */}
      {pendingInvitationsCount > 0 && (
        <div className="bg-gradient-to-r from-teal-500/10 via-teal-500/5 to-transparent border border-teal-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-500 text-slate-950 rounded-xl font-bold">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Tienes {pendingInvitationsCount} {pendingInvitationsCount === 1 ? 'invitación pendiente' : 'invitaciones pendientes'}
              </h4>
              <p className="text-xs text-slate-600">
                Has sido invitado a colaborar en proyectos académicos.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenInvitations}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <span>Ver bandeja</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Lista de Proyectos */}
      <ProjectsList
        projects={projects}
        loading={loading}
        onSelectProject={onSelectProject}
        onOpenCreateModal={() => setCreateModalOpen(true)}
      />

      {/* Modal para Crear Proyecto */}
      <CreateProjectModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onProjectCreated={(newProjectId) => {
          fetchUserProjects();
          onSelectProject(newProjectId);
        }}
      />
    </div>
  );
};
