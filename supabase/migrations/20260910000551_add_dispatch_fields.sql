ALTER TABLE public.transactions
ADD COLUMN dispatch_number text,
ADD COLUMN tick_item_photo boolean NOT NULL DEFAULT false,
ADD COLUMN tick_send_tracking boolean NOT NULL DEFAULT false,
ADD COLUMN tick_send_invoice boolean NOT NULL DEFAULT false;
