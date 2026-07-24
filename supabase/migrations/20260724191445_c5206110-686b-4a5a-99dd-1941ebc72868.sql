
CREATE OR REPLACE FUNCTION public.on_leave_request_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set the related employee's status to 'Draft'
  UPDATE public.employees
    SET status = 'Draft'
    WHERE user_id = NEW.user_id;

  -- Duplicate the request with status 'Pending', guarding against recursion
  IF pg_trigger_depth() = 1 THEN
    INSERT INTO public.leave_requests
      (user_id, start_date, end_date, days, leave_type, reason, status)
    VALUES
      (NEW.user_id, NEW.start_date, NEW.end_date, NEW.days, NEW.leave_type, NEW.reason, 'Pending');
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.on_leave_request_insert() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_leave_request_insert_trigger ON public.leave_requests;
CREATE TRIGGER on_leave_request_insert_trigger
AFTER INSERT ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.on_leave_request_insert();
