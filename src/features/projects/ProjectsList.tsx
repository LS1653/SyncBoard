import React from 'react';
import { Project } from '../../types/database.types';
import { useAuth } from '../auth/AuthContext';
import { formatDate } from '../../lib/formatters';
import { Folder, Plus, Calendar, ArrowRight, ShieldCheck } from 'lucide-react';

interface ProjectsListProps {
  projects: Project[];
  loading: boolean;
  onSelectProject: (projectId: string) => void;
  onOpenCreateModal: () => void;
}

export const ProjectsList: React.FC<ProjectsListProps> = ({
  projects,
  loading,
  onSelectProject,
  onOpenCreateModal,
}) => {
  const { user } = useAuth();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 bg-slate-200 rounded-xl" />
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-teal-100">
          <Folder className="w-8 h-8 text-teal-600" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">Aún no tienes proyectos activos</h3>
        <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
          Comienza creando un nuevo proyecto para tu equipo académico o revisa tus invitaciones pendientes.
        </p>
        <button
          onClick={onOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          Crear mi primer proyecto
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Tus Proyectos Académicos</h2>
          <p className="text-sm text-slate-500">
            Tableros Kanban y espacios de trabajo colaborativos en los que participas.
          </p>
        </div>
        <button
          onClick={onOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold shadow-sm transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Nuevo Proyecto
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {projects.map((project) => {
          const isOwner = project.owner_id === user?.id;
          return (
            <div
              key={project.id}
              onClick={() => onSelectProject(project.id)}
              className="group bg-white rounded-xl border border-slate-200 hover:border-teal-400 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      isOwner
                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {isOwner && <ShieldCheck className="w-3 h-3" />}
                    {isOwner ? 'Propietario' : 'Integrante'}
                  </span>
                  <div className="flex items-center text-xs text-slate-400 gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatDate(project.created_at)}</span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-700 transition line-clamp-1 mb-1">
                  {project.name}
                </h3>

                <p className="text-xs text-slate-500 line-clamp-2 min-h-[2rem]">
                  {project.description || 'Sin descripción detallada.'}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-teal-600 group-hover:text-teal-700">
                <span>Abrir Tablero</span>
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
