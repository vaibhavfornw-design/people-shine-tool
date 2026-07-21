ALTER TABLE public.leave_requests
ADD COLUMN ageing integer GENERATED ALWAYS AS ((end_date - start_date)) STORED;