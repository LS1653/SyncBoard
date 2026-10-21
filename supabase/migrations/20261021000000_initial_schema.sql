-- ==============================================================================
-- SyncBoard Initial Schema Migration
-- Author: SyncBoard Architecture Team
-- Description: Complete schema with RLS, triggers, indexes, and transactional RPCs
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. Profiles Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Trigger to automatically populate public.profiles when an auth.users record is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name)
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'display_name',
            NEW.raw_user_meta_data->>'full_name',
            split_part(NEW.email, '@', 1)
        )
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 2. Projects Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
    description TEXT,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON public.projects(deleted_at);

-- ------------------------------------------------------------------------------
-- 3. Project Members Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_members (
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON public.project_members(user_id);

-- ------------------------------------------------------------------------------
-- 4. Project Invitations Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    email TEXT NOT NULL CHECK (position('@' in email) > 1),
    invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'revoked', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + INTERVAL '7 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Partial index to prevent duplicate pending invitations for same project and email
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_invitation 
ON public.project_invitations (project_id, lower(email)) 
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_project_invitations_email_status ON public.project_invitations(lower(email), status);
CREATE INDEX IF NOT EXISTS idx_project_invitations_project_id ON public.project_invitations(project_id);

-- ------------------------------------------------------------------------------
-- 5. Tasks Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    assignee_id UUID,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    due_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    -- Ensure assignee is a member of the same project
    CONSTRAINT fk_tasks_assignee_membership
        FOREIGN KEY (project_id, assignee_id)
        REFERENCES public.project_members(project_id, user_id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON public.tasks(project_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_project_assignee ON public.tasks(project_id, assignee_id);

-- ------------------------------------------------------------------------------
-- 6. Activity Log Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    task_id UUID,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_activity_log_project_date ON public.activity_log(project_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 7. Helper Security & Permission Functions
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.project_members pm
        JOIN public.projects p ON p.id = pm.project_id
        WHERE pm.project_id = p_project_id 
          AND pm.user_id = p_user_id
          AND p.deleted_at IS NULL
    );
$$;

CREATE OR REPLACE FUNCTION public.is_project_owner(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.projects p
        WHERE p.id = p_project_id 
          AND p.owner_id = p_user_id
          AND p.deleted_at IS NULL
    );
$$;

-- Generic update timestamp trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_projects_updated_at ON public.projects;
CREATE TRIGGER trigger_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_tasks_updated_at ON public.tasks;
CREATE TRIGGER trigger_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_invitations_updated_at ON public.project_invitations;
CREATE TRIGGER trigger_invitations_updated_at
    BEFORE UPDATE ON public.project_invitations
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------------------------
-- 8. Business Logic & Transactional Procedures (RPCs)
-- ------------------------------------------------------------------------------

-- Atomic Project Creation with Owner Membership and Activity
CREATE OR REPLACE FUNCTION public.create_project_with_owner(
    p_name TEXT,
    p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_project_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado.';
    END IF;

    IF trim(p_name) IS NULL OR char_length(trim(p_name)) = 0 THEN
        RAISE EXCEPTION 'El nombre del proyecto es obligatorio.';
    END IF;

    -- 1. Insert Project
    INSERT INTO public.projects (name, description, owner_id)
    VALUES (trim(p_name), trim(p_description), v_user_id)
    RETURNING id INTO v_project_id;

    -- 2. Insert Owner Membership
    INSERT INTO public.project_members (project_id, user_id, role)
    VALUES (v_project_id, v_user_id, 'owner');

    -- 3. Log Activity
    INSERT INTO public.activity_log (project_id, actor_id, action, details)
    VALUES (
        v_project_id,
        v_user_id,
        'project_created',
        jsonb_build_object('project_name', trim(p_name))
    );

    RETURN v_project_id;
END;
$$;

-- Atomic Soft Delete Project
CREATE OR REPLACE FUNCTION public.soft_delete_project(
    p_project_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_project_name TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado.';
    END IF;

    -- Check project exists, active and caller is owner
    SELECT name INTO v_project_name
    FROM public.projects
    WHERE id = p_project_id AND deleted_at IS NULL;

    IF v_project_name IS NULL THEN
        RAISE EXCEPTION 'El proyecto no existe o ya ha sido eliminado.';
    END IF;

    IF NOT public.is_project_owner(p_project_id, v_user_id) THEN
        RAISE EXCEPTION 'Solo el propietario puede eliminar el proyecto.';
    END IF;

    -- Mark project deleted
    UPDATE public.projects
    SET deleted_at = timezone('utc'::text, now())
    WHERE id = p_project_id;

    -- Invalidate pending invitations
    UPDATE public.project_invitations
    SET status = 'revoked', updated_at = timezone('utc'::text, now())
    WHERE project_id = p_project_id AND status = 'pending';

    -- Record activity
    INSERT INTO public.activity_log (project_id, actor_id, action, details)
    VALUES (
        p_project_id,
        v_user_id,
        'project_deleted',
        jsonb_build_object('project_name', v_project_name)
    );

    RETURN TRUE;
END;
$$;

-- Transactional Invitation Acceptance
CREATE OR REPLACE FUNCTION public.accept_project_invitation(
    p_invitation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_user_email TEXT;
    v_invitation RECORD;
    v_project RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado.';
    END IF;

    -- Get caller email from JWT claim
    v_user_email := lower(auth.jwt() ->> 'email');
    IF v_user_email IS NULL THEN
        RAISE EXCEPTION 'No se pudo verificar el correo del usuario actual.';
    END IF;

    -- Lock invitation row for update to prevent concurrent race conditions
    SELECT * INTO v_invitation
    FROM public.project_invitations
    WHERE id = p_invitation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invitación no encontrada.';
    END IF;

    IF v_invitation.status <> 'pending' THEN
        RAISE EXCEPTION 'La invitación ya no está pendiente (estado: %)', v_invitation.status;
    END IF;

    IF v_invitation.expires_at < timezone('utc'::text, now()) THEN
        UPDATE public.project_invitations
        SET status = 'expired'
        WHERE id = p_invitation_id;
        RAISE EXCEPTION 'La invitación ha expirado.';
    END IF;

    IF lower(v_invitation.email) <> v_user_email THEN
        RAISE EXCEPTION 'Esta invitación no fue emitida para su correo electrónico.';
    END IF;

    -- Verify project is active
    SELECT * INTO v_project
    FROM public.projects
    WHERE id = v_invitation.project_id AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El proyecto asociado ya no está activo.';
    END IF;

    -- Insert membership if not already present
    INSERT INTO public.project_members (project_id, user_id, role)
    VALUES (v_invitation.project_id, v_user_id, 'member')
    ON CONFLICT (project_id, user_id) DO NOTHING;

    -- Mark invitation accepted
    UPDATE public.project_invitations
    SET status = 'accepted', updated_at = timezone('utc'::text, now())
    WHERE id = p_invitation_id;

    -- Log activity
    INSERT INTO public.activity_log (project_id, actor_id, action, details)
    VALUES (
        v_invitation.project_id,
        v_user_id,
        'member_joined',
        jsonb_build_object('email', v_user_email)
    );

    RETURN jsonb_build_object(
        'success', true,
        'project_id', v_invitation.project_id,
        'project_name', v_project.name
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 9. Row Level Security (RLS) Policies
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Profiles: anyone authenticated can read basic profiles (to show teammate names)
CREATE POLICY "Profiles viewable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Projects:
-- Members can view active projects
CREATE POLICY "Members can view active projects"
ON public.projects FOR SELECT
TO authenticated
USING (
    deleted_at IS NULL 
    AND public.is_project_member(id, auth.uid())
);

-- Owners can update their active projects
CREATE POLICY "Owners can update their active projects"
ON public.projects FOR UPDATE
TO authenticated
USING (
    deleted_at IS NULL 
    AND owner_id = auth.uid()
)
WITH CHECK (
    deleted_at IS NULL 
    AND owner_id = auth.uid()
);

-- Project Members:
-- Members of the same project can see fellow members
CREATE POLICY "Members can view project members"
ON public.project_members FOR SELECT
TO authenticated
USING (
    public.is_project_member(project_id, auth.uid())
);

-- Owners can remove members (except themselves)
CREATE POLICY "Owners can delete project members"
ON public.project_members FOR DELETE
TO authenticated
USING (
    public.is_project_owner(project_id, auth.uid()) 
    AND user_id <> auth.uid()
);

-- Project Invitations:
-- Recipient or project owner can view invitations
CREATE POLICY "View project invitations"
ON public.project_invitations FOR SELECT
TO authenticated
USING (
    lower(email) = lower(auth.jwt() ->> 'email')
    OR public.is_project_owner(project_id, auth.uid())
);

-- Owners can create invitations
CREATE POLICY "Owners can create invitations"
ON public.project_invitations FOR INSERT
TO authenticated
WITH CHECK (
    public.is_project_owner(project_id, auth.uid())
    AND invited_by = auth.uid()
);

-- Owners or recipients can update invitations (e.g. reject / revoke)
CREATE POLICY "Update project invitations"
ON public.project_invitations FOR UPDATE
TO authenticated
USING (
    lower(email) = lower(auth.jwt() ->> 'email')
    OR public.is_project_owner(project_id, auth.uid())
);

-- Tasks:
-- Members can view tasks of active projects
CREATE POLICY "Members can view project tasks"
ON public.tasks FOR SELECT
TO authenticated
USING (
    public.is_project_member(project_id, auth.uid())
);

-- Members can insert tasks in active projects
CREATE POLICY "Members can insert project tasks"
ON public.tasks FOR INSERT
TO authenticated
WITH CHECK (
    public.is_project_member(project_id, auth.uid())
    AND created_by = auth.uid()
);

-- Members can update tasks in active projects
CREATE POLICY "Members can update project tasks"
ON public.tasks FOR UPDATE
TO authenticated
USING (
    public.is_project_member(project_id, auth.uid())
)
WITH CHECK (
    public.is_project_member(project_id, auth.uid())
);

-- Members can delete tasks in active projects
CREATE POLICY "Members can delete project tasks"
ON public.tasks FOR DELETE
TO authenticated
USING (
    public.is_project_member(project_id, auth.uid())
);

-- Activity Log:
-- Members can view activity of active projects
CREATE POLICY "Members can view project activity"
ON public.activity_log FOR SELECT
TO authenticated
USING (
    public.is_project_member(project_id, auth.uid())
);

-- Members can insert activity entries for active projects
CREATE POLICY "Members can insert project activity"
ON public.activity_log FOR INSERT
TO authenticated
WITH CHECK (
    public.is_project_member(project_id, auth.uid())
    AND (actor_id IS NULL OR actor_id = auth.uid())
);

-- ------------------------------------------------------------------------------
-- 10. Enable Supabase Realtime
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END;
$$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_log;
