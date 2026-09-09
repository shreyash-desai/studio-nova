ALTER TABLE public.transactions
ADD COLUMN invoice_item text,
ADD COLUMN delivered_by text,
ADD COLUMN delivery_ref_no text,
ADD COLUMN order_date date;
