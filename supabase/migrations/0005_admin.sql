-- Pantaker — Admin role & permission foundation
-- ---------------------------------------------------------------------------
-- AUDIT RESULT: before this migration Pantaker had NO admin role model, no
-- admin routes and no permission checks. The only admin concept was a single
-- value in Supabase Auth `app_metadata.role`, read by
-- src/features/admin/authorization.ts.
--
-- SCOPE. This migration adds the database half of that existing model — and
-- nothing more. It introduces NO table, NO column and NO data migration: the
-- admin role continues to live in the server-controlled `app_metadata.role`
-- claim, which only the service role (or the Supabase dashboard / Admin API) can
-- write. A signed-in user can never set that claim, so an ordinary account
-- cannot make itself — or anyone else — an admin.
--
-- ROLES. Two roles are recognised:
--   * 'super_admin' — full control, including managing admins.
--   * 'moderator'   — reviews listings, handles reports, views users/analytics.
-- The legacy claim 'admin' is still accepted and treated as 'super_admin', so
-- existing admins keep working with NO data migration (backward compatible).
--
-- PERMISSIONS. Permissions are actions on resources and are mirrored 1:1 by
-- ADMIN_PERMISSIONS in src/features/admin/roles.ts. Application code enforces
-- them server-side for every page, route handler and mutation via
-- src/features/admin/authorization.ts. These functions are the DB half so that
-- row-level security for future admin-only reads (moderation queue, reports,
-- people directory) can reuse the same vocabulary instead of drifting:
--
--     create policy "moderators read all listings"
--       on public.listings for select
--       using (public.has_admin_permission('listings.review'));
--
-- TRADE-OFF. Roles are read from the access token, so a role change takes effect
-- for an already-open session only when its token refreshes (Supabase refreshes
-- hourly). If immediate revocation or a queryable admin directory is needed
-- later, move the role into a dedicated `admins` table and have these functions
-- read it instead; the permission vocabulary would not change. Until then this
-- is the simplest model that reuses what Pantaker already has.
--
-- Apply AFTER 0001 (or any order — these functions touch no domain tables).

-- 1. Read helpers -------------------------------------------------------------
-- These read only the caller's own token claim, so there is nothing to hide and
-- no row-level security is involved. They are intentionally plain (not SECURITY
-- DEFINER) functions with a pinned search_path.

create or replace function public.admin_role()
returns text
language sql
stable
set search_path = public
as $$
  select case lower(coalesce(auth.jwt() -> 'app_metadata' ->> 'role', ''))
    when 'admin'       then 'super_admin'   -- legacy value, still accepted
    when 'super_admin' then 'super_admin'
    when 'moderator'   then 'moderator'
    else null
  end;
$$;

-- True for any recognized admin role.
create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = public
as $$
  select public.admin_role() is not null;
$$;

-- True only when the caller's role grants `p_permission`. Keep this list in step
-- with ROLE_PERMISSIONS in src/features/admin/roles.ts.
create or replace function public.has_admin_permission(p_permission text)
returns boolean
language sql
stable
set search_path = public
as $$
  select case public.admin_role()
    when 'super_admin' then p_permission in (
      'listings.review',
      'reports.manage',
      'users.view',
      'users.manage',
      'analytics.view',
      'admins.manage'
    )
    when 'moderator' then p_permission in (
      'listings.review',
      'reports.manage',
      'users.view',
      'analytics.view'
    )
    else false
  end;
$$;

-- 2. Notes --------------------------------------------------------------------
-- * No grant/revoke statements are needed: these functions only read the
--   caller's own JWT, exactly like `auth.uid()`, and are safe to expose.
-- * No table policies are added here on purpose. Each admin tool adds the RLS
--   policies it needs (using the helpers above) when it ships, so this migration
--   never widens access to data no admin surface can read yet.
-- * The service role is the only writer of `app_metadata.role`; see
--   src/features/admin/actions.ts, which also refuses to remove the last super
--   admin.
