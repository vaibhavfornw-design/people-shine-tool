
CREATE OR REPLACE FUNCTION public.set_employee_draft_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.status := 'Draft';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_employee_draft_status_trigger ON public.employees;
CREATE TRIGGER set_employee_draft_status_trigger
BEFORE INSERT ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.set_employee_draft_status();
