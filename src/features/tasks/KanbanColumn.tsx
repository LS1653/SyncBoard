import React from 'react';
import { Task, TaskStatus, ProjectMember } from '../../types/database.types';
import { TaskCard } from './TaskCard';
import { Plus } from 'lucide-react';

interface KanbanColumnProps {
  status: TaskStatus;
  title: string;
  tasks: Task[];
  members: ProjectMember[];
  onAddTask: (status: TaskStatus) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  colorScheme: 'slate' | 'amber' | 'emerald';
  recentlyUpdatedTaskId: string | null; // <--- Agrega esto
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  status,
  title,
  tasks,
  members,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onStatusChange,
  colorScheme,
  recentlyUpdatedTaskId,
}) => {
  const memberMap = new Map<string, string>();
  members.forEach((m) => {
    memberMap.set(m.user_id, (m.profiles as any)?.display_name || 'Integrante');
  });

  const getHeaderClasses = () => {
    switch (colorScheme) {
      case 'amber':
        return 'border-amber-400/80 bg-amber-50/50 text-amber-900';
      case 'emerald':
        return 'border-emerald-500/80 bg-emerald-50/50 text-emerald-900';
      default:
        return 'border-slate-300 bg-slate-100/70 text-slate-800';
    }
  };

  const getBadgeClasses = () => {
    switch (colorScheme) {
      case 'amber':
        return 'bg-amber-200 text-amber-800';
      case 'emerald':
        return 'bg-emerald-200 text-emerald-800';
      default:
        return 'bg-slate-200 text-slate-700';
    }
  };

  return (
    <div className="flex flex-col bg-slate-100/70 rounded-2xl border border-slate-200/90 p-4 min-w-[280px] w-full h-full shadow-sm">
      {/* Cabecera de la columna */}
      <div className={`flex items-center justify-between pb-3 mb-3 border-b-2 px-1 ${getHeaderClasses()}`}>
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-sm tracking-tight">{title}</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${getBadgeClasses()}`}>
            {tasks.length}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onAddTask(status)}
          className="p-1 hover:bg-white/80 rounded-lg text-slate-600 hover:text-slate-900 transition"
          title={`Añadir tarea a ${title}`}
          aria-label={`Añadir tarea a ${title}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Lista de tarjetas */}
      <div className="flex-1 space-y-3 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
        {tasks.length === 0 ? (
          <div className="text-center py-8 px-4 border border-dashed border-slate-300 rounded-xl bg-white/40">
            <p className="text-xs text-slate-400">Sin tareas en esta etapa</p>
            <button
              type="button"
              onClick={() => onAddTask(status)}
              className="mt-2 text-xs text-teal-600 hover:text-teal-700 font-semibold inline-flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Añadir tarea
            </button>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
              onStatusChange={onStatusChange}
              assigneeName={task.assignee_id ? memberMap.get(task.assignee_id) : undefined}
              isRecentlyUpdated={recentlyUpdatedTaskId === task.id}
            />
          ))
        )}
      </div>
    </div>
  );
};
