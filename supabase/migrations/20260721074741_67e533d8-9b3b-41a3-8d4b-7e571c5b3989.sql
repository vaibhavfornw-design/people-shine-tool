CREATE OR REPLACE FUNCTION public.decide_leave_request(_id uuid, _status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.leave_requests;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.has_role(auth.uid(), 'hr') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF _status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status: %', _status;
  END IF;

  SELECT * INTO r FROM public.leave_requests WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Leave request not found';
  END IF;

  IF r.status <> 'pending' THEN
    RAISE EXCEPTION 'Leave request already %', r.status;
  END IF;

  UPDATE public.leave_requests
    SET status = _status,
        decided_by = auth.uid(),
        decided_at = now()
    WHERE id = _id;

  IF _status = 'approved' THEN
    UPDATE public.employees
      SET pto_balance = pto_balance - r.days
      WHERE user_id = r.user_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.decide_leave_request(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decide_leave_request(uuid, text) TO authenticated;