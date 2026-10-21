import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ActivityLog } from '../../types/database.types';
import { formatDateTime, formatStatus } from '../../lib/formatters';
import { Clock, PlusCircle, CheckCircle2, UserCheck, Trash2, Edit3, Mail } from 'lucide-react';

export const ActivityFeed: React.FC<{ projectId: string }> = ({ projectId }) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_log')
        .select(`
          id,
          project_id,
          actor_id,
          action,
          task_id,
          details,
          created_at,
          profiles (id, display_name)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setLogs(data as any);
      } else {
        const { data: simpleLogs } = await supabase
          .from('activity_log')
          .select('id, project_id, actor_id, action, task_id, details, created_at')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (simpleLogs && simpleLogs.length > 0) {
          const actorIds = Array.from(new Set(simpleLogs.map((l: any) => l.actor_id).filter(Boolean)));
          const { data: profs } = await supabase
            .from('profiles')
            .select('id, display_name')
            .in('id', actorIds);

          const profMap = new Map((profs || []).map((p: any) => [p.id, p]));
          setLogs(
            simpleLogs.map((l: any) => ({
              ...l,
              profiles: l.actor_id ? profMap.get(l.actor_id) || null : null,
            })) as any
          );
        } else {
          setLogs([]);
        }
      }
    } catch (err) {
      console.error('Error cargando actividad:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    // Supabase Realtime subscription for activity
    const channel = supabase
      .channel(`realtime-activity-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_log',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          fetchLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const renderActionInfo = (log: ActivityLog) => {
    const actorName = (log.profiles as any)?.display_name || 'Sistema';
    const details = log.details || {};

    switch (log.action) {
      case 'project_created':
        return {
          icon: <PlusCircle className="w-4 h-4 text-purple-600" />,
          text: (
            <span>
              <strong className="text-slate-800">{actorName}</strong> creó el proyecto{' '}
              <em className="text-slate-700 font-semibold">{details.project_name}</em>.
            </span>
          ),
        };
      case 'task_created':
        return {
          icon: <PlusCircle className="w-4 h-4 text-teal-600" />,
          text: (
            <span>
              <strong className="text-slate-800">{actorName}</strong> creó la tarea{' '}
              <span className="font-semibold text-slate-700">"{details.title}"</span>.
            </span>
          ),
        };
      case 'task_status_changed':
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
          text: (
            <span>
              <strong className="text-slate-800">{actorName}</strong> cambió el estado de{' '}
              <span className="font-semibold text-slate-700">"{details.title}"</span> a{' '}
              <span className="font-bold text-teal-700">{formatStatus(details.new_status)}</span>.
            </span>
          ),
        };
      case 'task_updated':
        return {
          icon: <Edit3 className="w-4 h-4 text-blue-600" />,
          text: (
            <span>
              <strong className="text-slate-800">{actorName}</strong> editó la tarea{' '}
              <span className="font-semibold text-slate-700">"{details.title}"</span>.
            </span>
          ),
        };
      case 'task_deleted':
        return {
          icon: <Trash2 className="w-4 h-4 text-red-500" />,
          text: (
            <span>
              <strong className="text-slate-800">{actorName}</strong> eliminó una tarea:{' '}
              <span className="italic text-slate-600">"{details.title}"</span>.
            </span>
          ),
        };
      case 'invitation_created':
        return {
          icon: <Mail className="w-4 h-4 text-amber-600" />,
          text: (
            <span>
              <strong className="text-slate-800">{actorName}</strong> invitó a{' '}
              <span className="font-semibold text-slate-700">{details.email}</span>.
            </span>
          ),
        };
      case 'member_joined':
        return {
          icon: <UserCheck className="w-4 h-4 text-indigo-600" />,
          text: (
            <span>
              <strong className="text-slate-800">{actorName}</strong> aceptó la invitación y se unió al equipo.
            </span>
          ),
        };
      default:
        return {
          icon: <Clock className="w-4 h-4 text-slate-400" />,
          text: (
            <span>
              <strong className="text-slate-800">{actorName}</strong> ejecutó la acción{' '}
              <code>{log.action}</code>.
            </span>
          ),
        };
    }
  };

  if (loading) {
    return <div className="py-6 text-center text-xs text-slate-400">Cargando registro de actividad...</div>;
  }

  if (logs.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-slate-400">
        No se ha registrado actividad reciente en este proyecto.
      </div>
    );
  }

  return (
    <div className="flow-root bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
      <ul className="-mb-8">
        {logs.map((log, logIdx) => {
          const { icon, text } = renderActionInfo(log);
          const isLast = logIdx === logs.length - 1;

          return (
            <li key={log.id}>
              <div className="relative pb-8">
                {!isLast && (
                  <span
                    className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200"
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex space-x-3 items-start">
                  <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center ring-4 ring-white">
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <p className="text-xs text-slate-600">{text}</p>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {formatDateTime(log.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
