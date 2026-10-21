export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high';
export type ProjectRole = 'owner' | 'member';
export type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'revoked' | 'expired';

export interface Profile {
  id: string;
  display_name: string;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ProjectMember {
  project_id: string;
  user_id: string;
  role: ProjectRole;
  joined_at: string;
  profiles?: Profile;
}

export interface ProjectInvitation {
  id: string;
  project_id: string;
  email: string;
  invited_by: string;
  status: InvitationStatus;
  expires_at: string;
  created_at: string;
  updated_at: string;
  projects?: {
    id: string;
    name: string;
    description: string | null;
  };
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: string | null;
  created_by: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Profile | null;
}

export interface ActivityLog {
  id: string;
  project_id: string;
  actor_id: string | null;
  action: string;
  task_id: string | null;
  details: Record<string, any>;
  created_at: string;
  profiles?: Profile | null;
}
