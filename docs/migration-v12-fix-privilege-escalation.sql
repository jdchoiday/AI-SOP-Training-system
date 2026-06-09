-- ============================================================
-- migration-v12: Fix privilege escalation on public.employees  (SECURITY, P0)
-- ============================================================
--
-- VULNERABILITY (live, confirmed):
--   The `authenticated` role has column-level UPDATE on employees.role,
--   employees.company_id and employees.auth_user_id, and the RLS policy
--   `employees_company_or_self` permits a user to UPDATE their own row
--   (auth_user_id = auth.uid()). There was NO trigger guarding which columns
--   may change. As a result, any logged-in staff member could run, via the
--   public (anon) PostgREST endpoint with their own session:
--
--       PATCH /rest/v1/employees?auth_user_id=eq.<self>   {"role":"super_admin"}
--
--   which passes RLS (own row) and flips auth_is_super_admin() to TRUE for
--   them -> full cross-company read/write/delete of the entire dataset.
--   A self-row company_id change is an equivalent cross-tenant escalation.
--
-- FIX:
--   A BEFORE UPDATE trigger enforces the application's existing authority
--   model (see api/auth.js authorizeRoleAssignment) at the database layer:
--     * role / company_id / auth_user_id may only change when the caller is
--       an admin-level granter (super_admin or admin);
--     * granting 'super_admin' requires the caller to BE super_admin;
--     * changing company_id or auth_user_id requires super_admin;
--     * the service/server context (no end-user JWT, auth.uid() IS NULL) is
--       trusted, so registration and the /api/auth service-key flows are
--       unaffected.
--   Normal admin role management (admin/index.html promoteToManager/demote)
--   keeps working; staff self-escalation is rejected.
--
-- ROLLBACK:
--   DROP TRIGGER IF EXISTS trg_guard_employee_privileged_cols ON public.employees;
--   DROP FUNCTION IF EXISTS public.guard_employee_privileged_cols();
--   DROP FUNCTION IF EXISTS public.auth_is_admin();
--
-- VERIFIED: simulating a staff JWT, an attempt to set role='super_admin' on
--   the own row raises "employees: changing role/company_id/auth_user_id is
--   not permitted", while a benign self-update (e.g. team) still succeeds.
-- ============================================================

-- caller is an admin-level role-granter (mirrors api/auth.js authority model)
create or replace function public.auth_is_admin()
returns boolean language sql stable security definer set search_path = public as $fn$
  select exists(
    select 1 from public.employees
    where auth_user_id = auth.uid() and role in ('super_admin','admin')
  );
$fn$;

create or replace function public.guard_employee_privileged_cols()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if NEW.role        is distinct from OLD.role
  or NEW.company_id  is distinct from OLD.company_id
  or NEW.auth_user_id is distinct from OLD.auth_user_id then

    -- server/service context (no end-user JWT): trusted (registration, /api/auth)
    if auth.uid() is null then
      return NEW;
    end if;

    -- end-user context must be an admin-level granter
    if not public.auth_is_admin() then
      raise exception 'employees: changing role/company_id/auth_user_id is not permitted';
    end if;

    -- only super_admin may grant super_admin
    if NEW.role = 'super_admin' and OLD.role is distinct from 'super_admin'
       and not public.auth_is_super_admin() then
      raise exception 'employees: only super_admin may grant super_admin';
    end if;

    -- only super_admin may move an employee across companies or rebind auth_user_id
    if NEW.company_id is distinct from OLD.company_id and not public.auth_is_super_admin() then
      raise exception 'employees: only super_admin may change company_id';
    end if;
    if NEW.auth_user_id is distinct from OLD.auth_user_id and not public.auth_is_super_admin() then
      raise exception 'employees: only super_admin may change auth_user_id';
    end if;
  end if;
  return NEW;
end;
$fn$;

drop trigger if exists trg_guard_employee_privileged_cols on public.employees;
create trigger trg_guard_employee_privileged_cols
  before update on public.employees
  for each row execute function public.guard_employee_privileged_cols();
