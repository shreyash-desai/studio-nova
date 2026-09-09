ALTER TABLE public.transactions
ADD COLUMN added_by uuid REFERENCES public.operators(id) ON DELETE SET NULL;
