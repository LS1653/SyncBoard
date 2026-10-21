-- Add explicit foreign keys to public.profiles so PostgREST can resolve embeds

ALTER TABLE public.project_members
    DROP CONSTRAINT IF EXISTS fk_project_members_profile;

ALTER TABLE public.project_members
    ADD CONSTRAINT fk_project_members_profile
    FOREIGN KEY (user_id) REFERENCES public.profiles(id)
    ON DELETE CASCADE;

ALTER TABLE public.activity_log
    DROP CONSTRAINT IF EXISTS fk_activity_log_profile;

ALTER TABLE public.activity_log
    ADD CONSTRAINT fk_activity_log_profile
    FOREIGN KEY (actor_id) REFERENCES public.profiles(id)
    ON DELETE SET NULL;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
