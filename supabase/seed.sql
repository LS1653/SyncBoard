-- ==============================================================================
-- SyncBoard Local Seed Data
-- ==============================================================================

-- Create mock authenticated users in auth.users if running in local Supabase
DO $$
DECLARE
    v_user1_id UUID := 'a1111111-1111-1111-1111-111111111111';
    v_user2_id UUID := 'b2222222-2222-2222-2222-222222222222';
    v_user3_id UUID := 'c3333333-3333-3333-3333-333333333333';
    v_project_id UUID := 'd4444444-4444-4444-4444-444444444444';
    v_task1_id UUID := 'e5555555-5555-5555-5555-555555555551';
    v_task2_id UUID := 'e5555555-5555-5555-5555-555555555552';
    v_task3_id UUID := 'e5555555-5555-5555-5555-555555555553';
    v_task4_id UUID := 'e5555555-5555-5555-5555-555555555554';
BEGIN
    -- Insert test auth users if not existing
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        -- Alice (Propietaria)
        INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
        VALUES (
            v_user1_id,
            '00000000-0000-0000-0000-000000000000',
            'alice@universidad.edu',
            '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEF', -- mock bcrypt hash
            now(),
            '{"provider":"email","providers":["email"]}',
            '{"display_name":"Alice Gómez (Líder)"}',
            now(), now(), 'authenticated', 'authenticated'
        ) ON CONFLICT (id) DO NOTHING;

        -- Bob (Integrante)
        INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
        VALUES (
            v_user2_id,
            '00000000-0000-0000-0000-000000000000',
            'bob@universidad.edu',
            '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEF',
            now(),
            '{"provider":"email","providers":["email"]}',
            '{"display_name":"Bob Martínez"}',
            now(), now(), 'authenticated', 'authenticated'
        ) ON CONFLICT (id) DO NOTHING;

        -- Carlos (Invitado pendiente)
        INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
        VALUES (
            v_user3_id,
            '00000000-0000-0000-0000-000000000000',
            'carlos@universidad.edu',
            '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEF',
            now(),
            '{"provider":"email","providers":["email"]}',
            '{"display_name":"Carlos Rodríguez"}',
            now(), now(), 'authenticated', 'authenticated'
        ) ON CONFLICT (id) DO NOTHING;
    END IF;

    -- Ensure profiles exist
    INSERT INTO public.profiles (id, display_name)
    VALUES 
        (v_user1_id, 'Alice Gómez (Líder)'),
        (v_user2_id, 'Bob Martínez'),
        (v_user3_id, 'Carlos Rodríguez')
    ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;

    -- Sample Project
    INSERT INTO public.projects (id, name, description, owner_id)
    VALUES (
        v_project_id,
        'Proyecto Final - Sistemas Interactivos Distribuidos',
        'Desarrollo e integración de SyncBoard con React, Supabase, PostgreSQL y Realtime.',
        v_user1_id
    ) ON CONFLICT (id) DO NOTHING;

    -- Project Memberships (Alice: Owner, Bob: Member)
    INSERT INTO public.project_members (project_id, user_id, role)
    VALUES 
        (v_project_id, v_user1_id, 'owner'),
        (v_project_id, v_user2_id, 'member')
    ON CONFLICT (project_id, user_id) DO NOTHING;

    -- Pending Invitation for Carlos
    INSERT INTO public.project_invitations (id, project_id, email, invited_by, status, expires_at)
    VALUES (
        'f6666666-6666-6666-6666-666666666666',
        v_project_id,
        'carlos@universidad.edu',
        v_user1_id,
        'pending',
        now() + interval '7 days'
    ) ON CONFLICT (id) DO NOTHING;

    -- Kanban Tasks
    INSERT INTO public.tasks (id, project_id, title, description, status, priority, assignee_id, created_by, due_date)
    VALUES 
        (
            v_task1_id,
            v_project_id,
            'Definir especificación de requisitos y backlog',
            'Redactar backlog.md con historias de usuario y criterios de aceptación.',
            'completed',
            'high',
            v_user1_id,
            v_user1_id,
            CURRENT_DATE - INTERVAL '2 days'
        ),
        (
            v_task2_id,
            v_project_id,
            'Implementar autenticación y perfiles con Supabase Auth',
            'Configurar registro, inicio de sesión y sincronización con tabla profiles.',
            'completed',
            'high',
            v_user2_id,
            v_user1_id,
            CURRENT_DATE - INTERVAL '1 day'
        ),
        (
            v_task3_id,
            v_project_id,
            'Construir columnas del tablero Kanban interactivo',
            'Permitir mover tareas entre Pendiente, En progreso y Completada.',
            'in_progress',
            'medium',
            v_user2_id,
            v_user1_id,
            CURRENT_DATE + INTERVAL '3 days'
        ),
        (
            v_task4_id,
            v_project_id,
            'Configurar suscripciones de Supabase Realtime',
            'Verificar sincronización bidireccional de tareas y miembros en clientes activos.',
            'pending',
            'high',
            v_user1_id,
            v_user1_id,
            CURRENT_DATE + INTERVAL '5 days'
        )
    ON CONFLICT (id) DO NOTHING;

    -- Activity Log
    INSERT INTO public.activity_log (project_id, actor_id, action, details, created_at)
    VALUES
        (v_project_id, v_user1_id, 'project_created', '{"project_name": "Proyecto Final - Sistemas Interactivos Distribuidos"}'::jsonb, now() - INTERVAL '3 days'),
        (v_project_id, v_user1_id, 'task_created', '{"title": "Definir especificación de requisitos y backlog"}'::jsonb, now() - INTERVAL '2 days'),
        (v_project_id, v_user2_id, 'task_status_changed', '{"title": "Implementar autenticación y perfiles", "old_status": "in_progress", "new_status": "completed"}'::jsonb, now() - INTERVAL '1 day'),
        (v_project_id, v_user1_id, 'invitation_created', '{"email": "carlos@universidad.edu"}'::jsonb, now() - INTERVAL '12 hours');
END;
$$;
