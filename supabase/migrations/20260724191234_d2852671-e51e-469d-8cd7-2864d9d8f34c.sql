
ALTER FUNCTION public.set_employee_draft_status() SECURITY INVOKER;
REVOKE EXECUTE ON FUNCTION public.set_employee_draft_status() FROM PUBLIC, anon, authenticated;
