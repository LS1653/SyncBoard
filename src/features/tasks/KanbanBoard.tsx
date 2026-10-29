import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Task, TaskStatus, ProjectMember } from '../../types/database.types';
import { KanbanColumn } from './KanbanColumn';
import { TaskModal } from './TaskModal';
import { useAuth } from '../auth/AuthContext';
import { Filter, AlertCircle, RefreshCw, Plus } from 'lucide-react';

interface KanbanBoardProps {
  projectId: string;
  members: ProjectMember[];
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ projectId, members }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [modalDefaultStatus, setModalDefaultStatus] = useState<TaskStatus>('pending');
  const [recentlyUpdatedTaskId, setRecentlyUpdatedTaskId] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setErrorMsg(null);
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data as Task[] || []);
    } catch (err: any) {
      console.error('Error cargando tareas:', err);
      setErrorMsg('No se pudieron cargar las tareas del tablero.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTasks();

    // Supabase Realtime Subscription for PostgreSQL CDC events
    const channel = supabase
      .channel(`realtime-tasks-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTasks((prev) => [payload.new as Task, ...prev.filter((t) => t.id !== payload.new.id)]);
          } else if (payload.eventType === 'UPDATE') {
            setTasks((prev) =>
              prev.map((t) => (t.id === payload.new.id ? (payload.new as Task) : t))
            );
            
            // Activar el resaltado visual
            setRecentlyUpdatedTaskId(payload.new.id);
            
            // Limpiar el resaltado después de 2 segundos (2000 ms)
            setTimeout(() => {
              setRecentlyUpdatedTaskId((current) => 
                current === payload.new.id ? null : current
              );
            }, 2000);
            
          } else if (payload.eventType === 'DELETE') {
            setTasks((prev) => prev.filter((t) => t.id !== (payload.old as any).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, fetchTasks]);

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const originalTasks = [...tasks];

    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;

      // Log activity
      const task = tasks.find((t) => t.id === taskId);
      await supabase.from('activity_log').insert({
        project_id: projectId,
        actor_id: user?.id,
        action: 'task_status_changed',
        task_id: taskId,
        details: {
          title: task?.title || 'Tarea',
          new_status: newStatus,
        },
      });
    } catch (err: any) {
      // Rollback on failure
      setTasks(originalTasks);
      setErrorMsg(err.message || 'Error al actualizar el estado de la tarea.');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const taskToDelete = tasks.find((t) => t.id === taskId);
    if (!window.confirm(`¿Estás seguro de eliminar la tarea "${taskToDelete?.title}"?`)) return;

    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;

      setTasks((prev) => prev.filter((t) => t.id !== taskId));

      // Log activity
      await supabase.from('activity_log').insert({
        project_id: projectId,
        actor_id: user?.id,
        action: 'task_deleted',
        task_id: taskId,
        details: { title: taskToDelete?.title || 'Tarea' },
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo eliminar la tarea.');
    }
  };

  const handleOpenAddTask = useCallback((status: TaskStatus = 'pending') => {
    setEditingTask(null);
    setModalDefaultStatus(status);
    setModalOpen(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.toLowerCase() !== 'n') return;

      const target = e.target as HTMLElement | null;
      const activeEl = document.activeElement as HTMLElement | null;
      const interactiveTags = ['INPUT', 'TEXTAREA', 'SELECT'];

      if (
        (target && (interactiveTags.includes(target.tagName) || target.isContentEditable)) ||
        (activeEl && (interactiveTags.includes(activeEl.tagName) || activeEl.isContentEditable))
      ) {
        return;
      }

      if (!modalOpen) {
        e.preventDefault();
        handleOpenAddTask('pending');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [modalOpen, handleOpenAddTask]);

  const handleOpenEditTask = (task: Task) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  // Filter logic
  const filteredTasks = tasks.filter((task) => {
    if (assigneeFilter !== 'all') {
      if (assigneeFilter === 'unassigned' && task.assignee_id !== null) return false;
      if (assigneeFilter !== 'unassigned' && task.assignee_id !== assigneeFilter) return false;
    }
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
      return false;
    }
    return true;
  });

  const pendingTasks = filteredTasks.filter((t) => t.status === 'pending');
  const inProgressTasks = filteredTasks.filter((t) => t.status === 'in_progress');
  const completedTasks = filteredTasks.filter((t) => t.status === 'completed');

  return (
    <div className="space-y-4">
      {/* Barra de Filtros y Acciones */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros:</span>
          </div>

          {/* Filtro por Responsable */}
          <div className="relative">
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="all">Todos los responsables</option>
              <option value="unassigned">Sin asignar</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {(m.profiles as any)?.display_name || 'Integrante'}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Prioridad */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="all">Todas las prioridades</option>
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
            </select>
          </div>

          {(assigneeFilter !== 'all' || priorityFilter !== 'all') && (
            <button
              onClick={() => {
                setAssigneeFilter('all');
                setPriorityFilter('all');
              }}
              className="text-xs text-teal-600 hover:text-teal-700 font-semibold underline px-1"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={fetchTasks}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
            title="Sincronizar tareas"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleOpenAddTask('pending')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva Tarea</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Las 3 Columnas del Tablero Kanban */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
          <div className="h-96 bg-slate-200 rounded-2xl" />
          <div className="h-96 bg-slate-200 rounded-2xl" />
          <div className="h-96 bg-slate-200 rounded-2xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          <KanbanColumn
            status="pending"
            title="Pendiente"
            tasks={pendingTasks}
            members={members}
            onAddTask={handleOpenAddTask}
            onEditTask={handleOpenEditTask}
            onDeleteTask={handleDeleteTask}
            onStatusChange={handleStatusChange}
            colorScheme="slate"
            recentlyUpdatedTaskId={recentlyUpdatedTaskId}
          />

          <KanbanColumn
            status="in_progress"
            title="En progreso"
            tasks={inProgressTasks}
            members={members}
            onAddTask={handleOpenAddTask}
            onEditTask={handleOpenEditTask}
            onDeleteTask={handleDeleteTask}
            onStatusChange={handleStatusChange}
            colorScheme="amber"
            recentlyUpdatedTaskId={recentlyUpdatedTaskId}
          />

          <KanbanColumn
            status="completed"
            title="Completada"
            tasks={completedTasks}
            members={members}
            onAddTask={handleOpenAddTask}
            onEditTask={handleOpenEditTask}
            onDeleteTask={handleDeleteTask}
            onStatusChange={handleStatusChange}
            colorScheme="emerald"
            recentlyUpdatedTaskId={recentlyUpdatedTaskId}
          />
        </div>
      )}

      {/* Modal para Crear/Editar Tarea */}
      <TaskModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        projectId={projectId}
        taskToEdit={editingTask}
        members={members}
        onTaskSaved={fetchTasks}
        defaultStatus={modalDefaultStatus}
      />
    </div>
  );
};
